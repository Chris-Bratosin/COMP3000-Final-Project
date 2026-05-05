import type {
  ActivityEntry,
  Finding,
  Issue,
  Metric,
  PostureOverview,
  RiskSlice,
  ScanSettingsState,
  SeverityLevel,
  Tip,
} from "@/lib/types";

const STORAGE_KEY = "cma:lastScan";
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

export interface BackendFinding {
  id: string;
  ruleId: string;
  title: string;
  severity: "high" | "medium" | "low" | "critical" | "informational";
  service: string;
  region: string;
  resourceId: string;
  evidence: unknown;
  remediation: string;
}

export interface BackendScanResult {
  startedAt: string;
  completedAt: string;
  durationMs: number;
  region: string;
  bucketSource?: "explicit" | "list-all";
  listAttempted?: boolean;
  listError?: { name: string; message: string } | null;
  summary: {
    totalChecks: number;
    checksDenied?: number;
    checksErrored?: number;
    checksSucceeded?: number;
    bucketsScanned: number;
    issuesFound: number;
    high: number;
    medium: number;
    low: number;
  };
  buckets: Array<{
    name: string;
    region: string;
    status?: string;
    deniedChecks?: string[];
    erroredChecks?: Array<{ ruleId: string; errorName: string; errorMessage: string }>;
  }>;
  bucketErrors?: Array<{ bucket: string; message: string }>;
  findings: BackendFinding[];
}

export interface DashboardScanData {
  metrics: Metric[];
  posture: PostureOverview;
  riskData: RiskSlice[];
  findings: Finding[];
  issues: Issue[];
  tips: Tip[];
  activity: ActivityEntry[];
  meta: {
    startedAt: string;
    completedAt: string;
    region: string;
    bucketsScanned: number;
    checksDenied: number;
    checksErrored: number;
    checksSucceeded: number;
    listError: string | null;
  };
}

function parseBucketNames(raw: string): string[] {
  return raw
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function runS3Scan(
  settings: ScanSettingsState,
): Promise<BackendScanResult> {
  const region =
    settings.regionScope === "single-region" && settings.singleRegion
      ? settings.singleRegion
      : settings.primaryRegion;

  const response = await fetch(`${BACKEND_URL}/api/scan/s3`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      connectionMethod: settings.connectionMethod,
      accessKeyId: settings.accessKeyId,
      secretAccessKey: settings.secretAccessKey,
      sessionToken: settings.sessionToken,
      assumeRoleArn: settings.assumeRoleArn,
      primaryRegion: region,
      bucketNames: parseBucketNames(settings.bucketNames),
    }),
  });

  const payload = (await response.json()) as
    | { ok: true; scan: BackendScanResult }
    | { ok: false; message: string; errorCode?: string };

  if (!response.ok || !("ok" in payload) || !payload.ok) {
    const message =
      "ok" in payload && !payload.ok
        ? payload.message
        : "S3 scan failed.";
    throw new Error(message);
  }

  return payload.scan;
}

function normaliseSeverity(s: BackendFinding["severity"]): SeverityLevel {
  if (s === "critical" || s === "high") return "high";
  if (s === "medium") return "medium";
  return "low";
}

function calculatePostureScore(summary: BackendScanResult["summary"]): number {
  const succeeded =
    summary.checksSucceeded ??
    summary.totalChecks - (summary.checksDenied ?? 0) - (summary.checksErrored ?? 0);
  if (succeeded <= 0) return 0;
  const weighted = summary.high * 10 + summary.medium * 4 + summary.low * 1;
  const maxPenalty = succeeded * 10;
  const score = Math.max(0, 100 - Math.round((weighted / maxPenalty) * 100));
  return score;
}

function gradeForScore(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  if (score >= 50) return "E";
  return "F";
}

function statusForScore(score: number): string {
  if (score >= 90) return "Excellent posture";
  if (score >= 75) return "Healthy posture";
  if (score >= 60) return "Needs attention";
  return "Action required";
}

export function mapScanToDashboard(scan: BackendScanResult): DashboardScanData {
  const { summary, findings, region, startedAt, completedAt } = scan;
  const succeeded =
    summary.checksSucceeded ??
    summary.totalChecks - (summary.checksDenied ?? 0) - (summary.checksErrored ?? 0);
  const hasUsefulData = succeeded > 0;
  const score = hasUsefulData ? calculatePostureScore(summary) : 0;

  const denied = summary.checksDenied || 0;
  const errored = summary.checksErrored || 0;
  const noChecksRan = summary.totalChecks === 0;
  const failedParts = [
    denied > 0 ? `${denied} denied by IAM` : null,
    errored > 0 ? `${errored} errored` : null,
  ].filter(Boolean);
  const metrics: Metric[] = [
    {
      label: "Total Checks",
      value: summary.totalChecks,
      color: "blue",
      supportingText: noChecksRan
        ? "No checks could be run"
        : failedParts.length > 0
          ? `${summary.bucketsScanned} bucket${summary.bucketsScanned === 1 ? "" : "s"} - ${failedParts.join(", ")}`
          : `Across ${summary.bucketsScanned} S3 bucket${summary.bucketsScanned === 1 ? "" : "s"}`,
    },
    {
      label: "Issues Found",
      value: summary.issuesFound,
      color: "red",
      supportingText:
        summary.totalChecks > 0
          ? `${Math.round((summary.issuesFound / summary.totalChecks) * 100)}% of all active checks`
          : "No checks were run",
    },
    {
      label: "High Risk",
      value: summary.high,
      color: "orange",
      supportingText: summary.high > 0 ? "Fix these first" : "No critical items",
    },
    {
      label: "Medium Risk",
      value: summary.medium,
      color: "yellow",
      supportingText: summary.medium > 0 ? "Schedule this sprint" : "No medium issues",
    },
  ];

  const posture: PostureOverview = {
    score,
    maxScore: 100,
    grade: hasUsefulData ? gradeForScore(score) : "-",
    statusText: hasUsefulData ? statusForScore(score) : "No data - all checks were denied or no buckets matched",
  };

  const totalSeverity = summary.high + summary.medium + summary.low;
  const pct = (n: number) =>
    totalSeverity === 0 ? 0 : Math.round((n / totalSeverity) * 1000) / 10;

  const riskData: RiskSlice[] = [
    { name: "High Risk", value: pct(summary.high), color: "#eb6a67", count: summary.high },
    { name: "Medium Risk", value: pct(summary.medium), color: "#f5a44a", count: summary.medium },
    { name: "Low Risk", value: pct(summary.low), color: "#7ac78d", count: summary.low },
  ];

  const severityRank: Record<SeverityLevel, number> = { high: 0, medium: 1, low: 2 };
  const sorted = [...findings].sort(
    (a, b) =>
      severityRank[normaliseSeverity(a.severity)] -
      severityRank[normaliseSeverity(b.severity)],
  );

  const findingsList: Finding[] = sorted.slice(0, 5).map((f) => ({
    id: f.id,
    title: f.title,
    metadata: `${f.resourceId} - ${f.region}`,
    severity: normaliseSeverity(f.severity),
  }));

  const issuesList: Issue[] = sorted.map((f) => ({
    id: f.id,
    title: f.title,
    metadata: `Amazon ${f.service} - ${f.region}`,
    severity: normaliseSeverity(f.severity),
  }));

  const tips: Tip[] = sorted.slice(0, 4).map((f, i) => ({
    id: `tip-${f.id}`,
    step: i + 1,
    severity: normaliseSeverity(f.severity),
    title: f.title,
    description: f.remediation || "Review the finding and apply the recommended remediation.",
    actionText: "View remediation",
  }));

  const startTime = new Date(startedAt).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const endTime = new Date(completedAt).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const activity: ActivityEntry[] = [
    { id: "act-1", time: startTime, message: `Scan started in ${region}`, tone: "info" },
    {
      id: "act-2",
      time: startTime,
      message: `Discovered ${summary.bucketsScanned} S3 bucket${summary.bucketsScanned === 1 ? "" : "s"}`,
      tone: "info",
    },
    {
      id: "act-3",
      time: endTime,
      message: `Completed ${summary.totalChecks} checks across S3`,
      tone: summary.issuesFound > 0 ? "warn" : "success",
    },
    {
      id: "act-4",
      time: endTime,
      message: `${summary.issuesFound} issue${summary.issuesFound === 1 ? "" : "s"} found (${summary.high} high, ${summary.medium} medium, ${summary.low} low)`,
      tone: summary.high > 0 ? "error" : summary.issuesFound > 0 ? "warn" : "success",
    },
  ];

  return {
    metrics,
    posture,
    riskData,
    findings: findingsList,
    issues: issuesList,
    tips,
    activity,
    meta: {
      startedAt,
      completedAt,
      region,
      bucketsScanned: summary.bucketsScanned,
      checksDenied: summary.checksDenied || 0,
      checksErrored: summary.checksErrored || 0,
      checksSucceeded: succeeded,
      listError: scan.listError ? scan.listError.message : null,
    },
  };
}

export function persistScanResult(scan: BackendScanResult): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(scan));
  } catch {
    // ignore quota errors
  }
}

export function loadScanResult(): BackendScanResult | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BackendScanResult;
  } catch {
    return null;
  }
}

export function clearScanResult(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
}
