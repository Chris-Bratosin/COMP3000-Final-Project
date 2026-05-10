import type {
  ActivityEntry,
  Finding,
  Issue,
  LogLevel,
  LogRecord,
  Metric,
  PostureOverview,
  ReportRecord,
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
  scanner?: "S3" | "IAM" | "EC2" | "Secrets" | "AWS";
  // Set by the frontend on every Run Scan click and round-tripped through the
  // backend. All scans sharing a runId came from the same click. Optional
  // because legacy ScanRecords persisted before this change have no runId.
  runId?: string | null;
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
    bucketsSkippedOutOfScope?: number;
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
    scopeLabel: string;
    scannerLabel: "S3" | "IAM" | "EC2" | "Secrets" | "AWS";
  };
}

function parseBucketNames(raw: string): string[] {
  return raw
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function credentialsBody(settings: ScanSettingsState, region: string) {
  return {
    connectionMethod: settings.connectionMethod,
    accessKeyId: settings.accessKeyId,
    secretAccessKey: settings.secretAccessKey,
    sessionToken: settings.sessionToken,
    assumeRoleArn: settings.assumeRoleArn,
    primaryRegion: region,
    severityThreshold: settings.severityThreshold,
    includeEvidence: settings.includeEvidence,
    includeRemediationAdvice: settings.includeRemediationAdvice,
    // When false the backend runs the scan but skips persisting to ScanRecord,
    // so the run never appears in the Reports table or scan history.
    saveScanLogs: settings.saveScanLogs,
  };
}

// Translates the user's regionScope choice into a concrete bucket-region
// allowlist for the S3 backend. all-enabled returns undefined (no filter).
function regionFilterFor(settings: ScanSettingsState): string[] | undefined {
  if (settings.regionScope === "single-region" && settings.singleRegion) {
    return [settings.singleRegion];
  }
  if (settings.regionScope === "multi-region" && settings.selectedRegions.length > 0) {
    return settings.selectedRegions;
  }
  return undefined;
}

async function postScan(
  endpoint: string,
  body: Record<string, unknown>,
): Promise<BackendScanResult> {
  const response = await fetch(`${BACKEND_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const payload = (await response.json()) as
    | { ok: true; scan: BackendScanResult }
    | { ok: false; message: string; errorCode?: string };

  if (!response.ok || !("ok" in payload) || !payload.ok) {
    const message =
      "ok" in payload && !payload.ok ? payload.message : "Scan failed.";
    throw new Error(message);
  }

  return payload.scan;
}

export async function runS3Scan(
  settings: ScanSettingsState,
  runId?: string,
): Promise<BackendScanResult> {
  const region =
    settings.regionScope === "single-region" && settings.singleRegion
      ? settings.singleRegion
      : settings.primaryRegion;
  return postScan("/api/scan/s3", {
    ...credentialsBody(settings, region),
    bucketNames: parseBucketNames(settings.bucketNames),
    regionFilter: regionFilterFor(settings),
    runId,
  });
}

export async function runIamScan(
  settings: ScanSettingsState,
  runId?: string,
): Promise<BackendScanResult> {
  return postScan("/api/scan/iam", {
    ...credentialsBody(settings, settings.primaryRegion),
    runId,
  });
}

export async function runEc2Scan(
  settings: ScanSettingsState,
  runId?: string,
): Promise<BackendScanResult> {
  // EC2 is per-region. all-enabled sends an empty array so the backend can
  // expand it via DescribeRegions; otherwise we forward the user's selection.
  const regions = regionFilterFor(settings) ?? [];
  return postScan("/api/scan/ec2", {
    ...credentialsBody(settings, settings.primaryRegion),
    regions,
    runId,
  });
}

export async function runSecretsScan(
  settings: ScanSettingsState,
  runId?: string,
): Promise<BackendScanResult> {
  // Same per-region model as EC2: empty array tells the backend to expand
  // via DescribeRegions, otherwise it scans only the selected regions.
  const regions = regionFilterFor(settings) ?? [];
  return postScan("/api/scan/secrets", {
    ...credentialsBody(settings, settings.primaryRegion),
    regions,
    runId,
  });
}

// Generates a per-click identifier shared across the parallel scanner POSTs.
// Uses the platform's crypto.randomUUID when available (modern browsers, Node
// 19+) and falls back to a timestamp-plus-random string otherwise so the
// frontend never needs to bring in an extra UUID dependency.
export function newRunId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// Categories whose scanners exist in the backend. Each entry is the set of
// checkbox IDs that, when any are ticked, dispatches that scanner.
const IMPLEMENTED_CATEGORIES = {
  s3: ["s3-public-bucket", "s3-public-block", "s3-encryption", "s3-policy"],
  iam: ["iam-root-mfa", "iam-permissive", "iam-unused-keys", "iam-wildcard"],
  ec2: ["ec2-public-sg", "ec2-risky-ports", "ec2-broad-ingress"],
  secrets: ["secrets-policy", "secrets-access", "secrets-rotation"],
} as const;

export function selectedScannerTypes(
  securityChecks: Record<string, boolean>,
): { s3: boolean; iam: boolean; ec2: boolean; secrets: boolean } {
  const anyOn = (ids: readonly string[]) => ids.some((id) => securityChecks[id]);
  return {
    s3: anyOn(IMPLEMENTED_CATEGORIES.s3),
    iam: anyOn(IMPLEMENTED_CATEGORIES.iam),
    ec2: anyOn(IMPLEMENTED_CATEGORIES.ec2),
    secrets: anyOn(IMPLEMENTED_CATEGORIES.secrets),
  };
}

// One Run Scan click can produce multiple ScanRecord rows on the backend (one
// per scanner type that was selected). For display in the Reports table we
// want those to appear as a single merged row, not N rows. Group by the runId
// the frontend stamped on every parallel scanner POST — this is deterministic
// and replaces the older time-window heuristic.
//
// Legacy ScanRecords persisted before runId existed have null runId; each of
// those becomes its own single-element cluster (we can't truthfully tell which
// historical click they belonged to, so we don't try to guess).
export function groupScansByRunId(
  scans: BackendScanResult[],
): BackendScanResult[][] {
  if (scans.length === 0) return [];
  const grouped = new Map<string, BackendScanResult[]>();
  const ungrouped: BackendScanResult[] = [];
  for (const scan of scans) {
    if (scan.runId) {
      const existing = grouped.get(scan.runId);
      if (existing) existing.push(scan);
      else grouped.set(scan.runId, [scan]);
    } else {
      ungrouped.push(scan);
    }
  }
  const clusters: BackendScanResult[][] = [];
  for (const group of grouped.values()) clusters.push(group);
  for (const scan of ungrouped) clusters.push([scan]);
  // Order clusters by their earliest start time so the table reads
  // chronologically regardless of insertion order.
  clusters.sort((a, b) => {
    const aStart = Math.min(...a.map((s) => new Date(s.startedAt).getTime()));
    const bStart = Math.min(...b.map((s) => new Date(s.startedAt).getTime()));
    return aStart - bStart;
  });
  return clusters;
}

export function mergeScanResults(
  results: BackendScanResult[],
): BackendScanResult {
  if (results.length === 0) {
    throw new Error("mergeScanResults requires at least one scan.");
  }
  if (results.length === 1) return results[0];

  const findings = results.flatMap((r) => r.findings);
  const buckets = results.flatMap((r) => r.buckets);
  const bucketErrors = results.flatMap((r) => r.bucketErrors || []);

  const earliestStart = results
    .map((r) => r.startedAt)
    .sort()[0];
  const latestEnd = results
    .map((r) => r.completedAt)
    .sort()
    .reverse()[0];

  const sumField = (field: keyof BackendScanResult["summary"]) =>
    results.reduce((acc, r) => acc + (Number(r.summary[field]) || 0), 0);

  const distinctScanners = new Set(
    results
      .map((r) => r.scanner)
      .filter((s): s is "S3" | "IAM" | "EC2" | "Secrets" | "AWS" => Boolean(s)),
  );
  const mergedScanner: "S3" | "IAM" | "EC2" | "Secrets" | "AWS" | undefined =
    distinctScanners.size === 0
      ? undefined
      : distinctScanners.size === 1
        ? (Array.from(distinctScanners)[0] as "S3" | "IAM" | "EC2" | "Secrets" | "AWS")
        : "AWS";

  // Within a cluster every scan shares the same runId (that is the cluster
  // criterion). Picking the first non-null value keeps us correct even if
  // legacy null-runId rows ever sneak in.
  const mergedRunId = results.find((r) => r.runId)?.runId ?? null;

  return {
    scanner: mergedScanner,
    runId: mergedRunId,
    startedAt: earliestStart,
    completedAt: latestEnd,
    durationMs:
      new Date(latestEnd).getTime() - new Date(earliestStart).getTime(),
    region: results[0].region,
    bucketSource: results[0].bucketSource,
    listAttempted: results.some((r) => r.listAttempted),
    listError: results.find((r) => r.listError)?.listError ?? null,
    summary: {
      totalChecks: sumField("totalChecks"),
      checksDenied: sumField("checksDenied"),
      checksErrored: sumField("checksErrored"),
      checksSucceeded: sumField("checksSucceeded"),
      bucketsScanned: sumField("bucketsScanned"),
      bucketsSkippedOutOfScope: sumField("bucketsSkippedOutOfScope"),
      issuesFound: findings.length,
      high: findings.filter((f) => f.severity === "high" || f.severity === "critical").length,
      medium: findings.filter((f) => f.severity === "medium").length,
      low: findings.filter((f) => f.severity === "low").length,
    },
    buckets,
    bucketErrors,
    findings,
  };
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

// Status text is aligned 1:1 with the grade thresholds above so the two never
// disagree (e.g. an old version graded a 78 as C but called the posture
// "Healthy", which read as a contradiction in the UI).
function statusForScore(score: number): string {
  if (score >= 90) return "Excellent posture";
  if (score >= 80) return "Healthy posture";
  if (score >= 70) return "Acceptable posture";
  if (score >= 60) return "Needs attention";
  if (score >= 50) return "Action required";
  return "Critical risk";
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
  const scannerLabel = inferScannerLabel(scan);
  const bucketsScope =
    summary.bucketsScanned > 0
      ? `${summary.bucketsScanned} S3 bucket${summary.bucketsScanned === 1 ? "" : "s"}`
      : null;
  const iamScope = scannerLabel === "IAM" || scannerLabel === "AWS" ? "IAM checks" : null;
  const scopeJoined = [bucketsScope, iamScope].filter(Boolean).join(" and ");
  const scopeLabel = scopeJoined || "no resources";
  const metrics: Metric[] = [
    {
      label: "Total Checks",
      value: summary.totalChecks,
      color: "blue",
      supportingText: noChecksRan
        ? "No checks could be run"
        : failedParts.length > 0
          ? `${scopeLabel} - ${failedParts.join(", ")}`
          : `Across ${scopeLabel}`,
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
    remediation: f.remediation,
    ruleId: f.ruleId,
    resourceId: f.resourceId,
    region: f.region,
  }));

  const dedupedByRule = sorted.filter(
    (f, idx, arr) => arr.findIndex((x) => x.ruleId === f.ruleId) === idx,
  );

  const highScoreImpact =
    summary.high > 0 && succeeded > 0
      ? Math.round((summary.high / succeeded) * 100)
      : 0;

  const tips: Tip[] = dedupedByRule.slice(0, 4).map((f, i) => ({
    id: `tip-${f.id}`,
    step: i + 1,
    severity: normaliseSeverity(f.severity),
    title: f.title,
    description: "",
    actionText: f.remediation || "Review the finding and apply the recommended remediation.",
    scoreImpact:
      i === 0 && highScoreImpact > 0
        ? `Fixing all high items improves score by ~${highScoreImpact}`
        : undefined,
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
      scopeLabel,
      scannerLabel,
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

export async function fetchScanHistory(): Promise<BackendScanResult[]> {
  const response = await fetch(`${BACKEND_URL}/api/scans`);
  if (!response.ok) {
    throw new Error(`Scan history request failed (${response.status}).`);
  }
  const payload = (await response.json()) as
    | { ok: true; scans: BackendScanResult[] }
    | { ok: false; message: string };
  if (!payload.ok) throw new Error(payload.message);
  return payload.scans;
}

function fmtTimestamp(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
}

export function mapScanToLogs(scan: BackendScanResult): LogRecord[] {
  const { summary, findings, region, startedAt, completedAt } = scan;
  const records: LogRecord[] = [];
  let i = 0;

  records.push({
    id: `scan-log-${i++}`,
    timestampLabel: fmtTimestamp(startedAt),
    createdAt: startedAt,
    level: "INFO",
    event: `Scan started in ${region}`,
    awsService: "Amazon S3",
  });

  records.push({
    id: `scan-log-${i++}`,
    timestampLabel: fmtTimestamp(startedAt),
    createdAt: startedAt,
    level: "INFO",
    event: `Discovered ${summary.bucketsScanned} S3 bucket${summary.bucketsScanned === 1 ? "" : "s"}`,
    awsService: "Amazon S3",
  });

  for (const f of findings) {
    const level: LogLevel =
      f.severity === "high" || f.severity === "critical" ? "ERROR" : f.severity === "medium" ? "WARN" : "INFO";
    records.push({
      id: `scan-log-${i++}`,
      timestampLabel: fmtTimestamp(completedAt),
      createdAt: completedAt,
      level,
      event: `${f.title} — ${f.resourceId}`,
      awsService: `Amazon ${f.service}`,
    });
  }

  if (summary.checksDenied && summary.checksDenied > 0) {
    records.push({
      id: `scan-log-${i++}`,
      timestampLabel: fmtTimestamp(completedAt),
      createdAt: completedAt,
      level: "WARN",
      event: `${summary.checksDenied} check${summary.checksDenied === 1 ? "" : "s"} denied by IAM policy`,
      awsService: "AWS IAM",
    });
  }

  if (summary.checksErrored && summary.checksErrored > 0) {
    records.push({
      id: `scan-log-${i++}`,
      timestampLabel: fmtTimestamp(completedAt),
      createdAt: completedAt,
      level: "ERROR",
      event: `${summary.checksErrored} check${summary.checksErrored === 1 ? "" : "s"} errored during scan`,
      awsService: "Amazon S3",
    });
  }

  records.push({
    id: `scan-log-${i++}`,
    timestampLabel: fmtTimestamp(completedAt),
    createdAt: completedAt,
    level: summary.issuesFound > 0 ? "WARN" : "INFO",
    event: `Scan completed — ${summary.issuesFound} issue${summary.issuesFound === 1 ? "" : "s"} found (${summary.high} high, ${summary.medium} medium, ${summary.low} low)`,
    awsService: "Amazon S3",
  });

  return records;
}

// Returns "S3", "IAM", "EC2", "Secrets", or "AWS" depending on which scanner(s)
// produced the result. Used for naming reports and labelling dashboard metadata.
//   - "AWS"     : merged scan covering more than one scanner type
//   - "Secrets" : Secrets Manager only (SecretsManager service findings)
//   - "EC2"     : EC2-only scan
//   - "IAM"     : IAM-only scan (region "global", no buckets)
//   - "S3"      : S3-only scan (has buckets, only S3 findings)
// Newer scans carry the scanner type explicitly on the envelope; older history
// rows don't, so we keep the heuristic as a fallback.
export function inferScannerLabel(scan: BackendScanResult): "S3" | "IAM" | "EC2" | "Secrets" | "AWS" {
  if (
    scan.scanner === "S3" ||
    scan.scanner === "IAM" ||
    scan.scanner === "EC2" ||
    scan.scanner === "Secrets" ||
    scan.scanner === "AWS"
  ) {
    return scan.scanner;
  }
  const services = new Set(scan.findings.map((f) => f.service));
  const hasS3Activity = services.has("S3") || (scan.buckets && scan.buckets.length > 0);
  const hasIamActivity =
    services.has("IAM") || (scan.region === "global" && (!scan.buckets || scan.buckets.length === 0));
  const hasEc2Activity = services.has("EC2");
  const hasSecretsActivity = services.has("SecretsManager");
  const activeCount = [hasS3Activity, hasIamActivity, hasEc2Activity, hasSecretsActivity].filter(Boolean).length;
  if (activeCount > 1) return "AWS";
  if (hasSecretsActivity) return "Secrets";
  if (hasEc2Activity) return "EC2";
  if (hasIamActivity) return "IAM";
  return "S3";
}

export function mapScanToReport(scan: BackendScanResult): ReportRecord {
  const label = inferScannerLabel(scan);
  // IAM scans report region as "global", which reads oddly in a name; drop the
  // " — region" suffix when the region is global.
  const suffix = scan.region && scan.region !== "global" ? ` — ${scan.region}` : "";
  return {
    id: "live-scan",
    dateLabel: new Date(scan.completedAt).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    createdAt: scan.completedAt,
    name: `${label} Security Scan${suffix}`,
    issues: scan.summary.issuesFound,
    high: scan.summary.high,
    medium: scan.summary.medium,
  };
}
