import {
  mapScanToDashboard,
  mapScanToLogs,
  mapScanToReport,
  type BackendFinding,
  type BackendScanResult,
} from "@/lib/scan";

function makeFinding(overrides: Partial<BackendFinding> = {}): BackendFinding {
  return {
    id: "rule:bucket",
    ruleId: "s3-public-access-block-missing",
    title: "S3 bucket has no Public Access Block configured",
    severity: "high",
    service: "S3",
    region: "eu-west-1",
    resourceId: "demo-bucket",
    evidence: null,
    remediation: "Enable all four PAB settings on the bucket.",
    ...overrides,
  };
}

function makeScan(overrides: Partial<BackendScanResult> = {}): BackendScanResult {
  return {
    startedAt: "2026-05-06T12:42:00.000Z",
    completedAt: "2026-05-06T12:42:30.000Z",
    durationMs: 30_000,
    region: "eu-west-1",
    bucketSource: "explicit",
    listAttempted: false,
    listError: null,
    summary: {
      totalChecks: 12,
      checksDenied: 0,
      checksErrored: 0,
      checksSucceeded: 12,
      bucketsScanned: 2,
      issuesFound: 3,
      high: 1,
      medium: 1,
      low: 1,
    },
    buckets: [],
    bucketErrors: [],
    findings: [],
    ...overrides,
  };
}

describe("mapScanToDashboard", () => {
  it("normalises critical severity down to high", () => {
    const scan = makeScan({
      summary: {
        totalChecks: 4,
        checksDenied: 0,
        checksErrored: 0,
        checksSucceeded: 4,
        bucketsScanned: 1,
        issuesFound: 1,
        high: 1,
        medium: 0,
        low: 0,
      },
      findings: [makeFinding({ severity: "critical" })],
    });
    const dashboard = mapScanToDashboard(scan);
    expect(dashboard.issues[0].severity).toBe("high");
  });

  it("deduplicates remediation tips by ruleId", () => {
    const scan = makeScan({
      summary: {
        totalChecks: 6,
        checksDenied: 0,
        checksErrored: 0,
        checksSucceeded: 6,
        bucketsScanned: 3,
        issuesFound: 3,
        high: 3,
        medium: 0,
        low: 0,
      },
      findings: [
        makeFinding({ id: "r:b1", resourceId: "b1" }),
        makeFinding({ id: "r:b2", resourceId: "b2" }),
        makeFinding({ id: "r:b3", resourceId: "b3" }),
      ],
    });
    const dashboard = mapScanToDashboard(scan);
    // Three findings with the same ruleId should produce one tip, not three.
    expect(dashboard.tips.length).toBe(1);
  });

  it("attaches a score-impact pill only when high findings exist", () => {
    const withHighs = mapScanToDashboard(
      makeScan({
        summary: {
          totalChecks: 10,
          checksDenied: 0,
          checksErrored: 0,
          checksSucceeded: 10,
          bucketsScanned: 1,
          issuesFound: 2,
          high: 2,
          medium: 0,
          low: 0,
        },
        findings: [
          makeFinding({ id: "r1:b1", ruleId: "rule-1" }),
          makeFinding({ id: "r2:b1", ruleId: "rule-2" }),
        ],
      }),
    );
    expect(withHighs.tips[0].scoreImpact).toMatch(/Fixing all high items improves score by ~/);

    const withoutHighs = mapScanToDashboard(
      makeScan({
        summary: {
          totalChecks: 4,
          checksDenied: 0,
          checksErrored: 0,
          checksSucceeded: 4,
          bucketsScanned: 1,
          issuesFound: 1,
          high: 0,
          medium: 0,
          low: 1,
        },
        findings: [makeFinding({ severity: "low", ruleId: "rule-low" })],
      }),
    );
    expect(withoutHighs.tips[0].scoreImpact).toBeUndefined();
  });

  it("returns posture status 'No data' when every check was denied", () => {
    const dashboard = mapScanToDashboard(
      makeScan({
        summary: {
          totalChecks: 6,
          checksDenied: 6,
          checksErrored: 0,
          checksSucceeded: 0,
          bucketsScanned: 1,
          issuesFound: 0,
          high: 0,
          medium: 0,
          low: 0,
        },
      }),
    );
    expect(dashboard.posture.grade).toBe("-");
    expect(dashboard.posture.score).toBe(0);
  });

  it("computes a perfect score when no findings are reported", () => {
    const dashboard = mapScanToDashboard(
      makeScan({
        summary: {
          totalChecks: 6,
          checksDenied: 0,
          checksErrored: 0,
          checksSucceeded: 6,
          bucketsScanned: 1,
          issuesFound: 0,
          high: 0,
          medium: 0,
          low: 0,
        },
        findings: [],
      }),
    );
    expect(dashboard.posture.score).toBe(100);
    expect(dashboard.posture.grade).toBe("A");
  });
});

describe("mapScanToLogs", () => {
  it("emits one log line per finding plus scan-start/scan-completed bookends", () => {
    const scan = makeScan({
      findings: [
        makeFinding({ severity: "high" }),
        makeFinding({ id: "x:b", ruleId: "rule-x", severity: "low" }),
      ],
    });
    const logs = mapScanToLogs(scan);
    // 2 bookends at the start, 2 finding lines, 1 completion line = 5
    expect(logs.length).toBe(5);
    expect(logs[0].event).toMatch(/Scan started in/);
    expect(logs[logs.length - 1].event).toMatch(/Scan completed/);
  });

  it("maps high-severity findings to ERROR level", () => {
    const scan = makeScan({
      findings: [makeFinding({ severity: "high" })],
    });
    const logs = mapScanToLogs(scan);
    const findingLog = logs.find((l) => l.event.includes("Public Access Block"));
    expect(findingLog?.level).toBe("ERROR");
  });

  it("emits a WARN entry when checks were denied by IAM", () => {
    const scan = makeScan({
      summary: {
        totalChecks: 6,
        checksDenied: 3,
        checksErrored: 0,
        checksSucceeded: 3,
        bucketsScanned: 1,
        issuesFound: 0,
        high: 0,
        medium: 0,
        low: 0,
      },
    });
    const logs = mapScanToLogs(scan);
    const warnLog = logs.find((l) => l.event.includes("denied by IAM"));
    expect(warnLog).toBeDefined();
    expect(warnLog?.level).toBe("WARN");
  });
});

describe("mapScanToReport", () => {
  it("produces a single ReportRecord summary from a scan", () => {
    const scan = makeScan();
    const report = mapScanToReport(scan);
    expect(report.id).toBe("live-scan");
    expect(report.name).toContain("eu-west-1");
    expect(report.issues).toBe(scan.summary.issuesFound);
    expect(report.high).toBe(scan.summary.high);
    expect(report.medium).toBe(scan.summary.medium);
    expect(report.createdAt).toBe(scan.completedAt);
  });
});
