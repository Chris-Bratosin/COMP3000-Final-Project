import {
  clusterScansByTime,
  inferScannerLabel,
  mapScanToDashboard,
  mapScanToLogs,
  mapScanToReport,
  mergeScanResults,
  selectedScannerTypes,
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

describe("selectedScannerTypes", () => {
  it("returns s3=true when any S3 checkbox is on", () => {
    const result = selectedScannerTypes({
      "s3-public-bucket": false,
      "s3-public-block": true, // <-- on
      "s3-encryption": false,
      "s3-policy": false,
      "iam-root-mfa": false,
    });
    expect(result.s3).toBe(true);
    expect(result.iam).toBe(false);
  });

  it("returns iam=true when any IAM checkbox is on", () => {
    const result = selectedScannerTypes({
      "iam-root-mfa": true,
      "iam-permissive": false,
      "iam-unused-keys": false,
      "iam-wildcard": false,
    });
    expect(result.iam).toBe(true);
    expect(result.s3).toBe(false);
  });

  it("returns both true when both categories have a checkbox on", () => {
    const result = selectedScannerTypes({
      "s3-public-bucket": true,
      "iam-root-mfa": true,
    });
    expect(result.s3).toBe(true);
    expect(result.iam).toBe(true);
  });

  it("returns both false when nothing is selected", () => {
    const result = selectedScannerTypes({});
    expect(result.s3).toBe(false);
    expect(result.iam).toBe(false);
  });

  it("ignores checkbox ids from unimplemented categories (EC2, Secrets)", () => {
    const result = selectedScannerTypes({
      "ec2-public-sg": true,
      "secrets-policy": true,
    });
    expect(result.s3).toBe(false);
    expect(result.iam).toBe(false);
  });
});

describe("mergeScanResults", () => {
  it("returns the single input unchanged when given one scan", () => {
    const scan = makeScan();
    expect(mergeScanResults([scan])).toBe(scan);
  });

  it("concatenates findings and recomputes severity counts", () => {
    const s3 = makeScan({
      findings: [
        makeFinding({ id: "s3:b", severity: "high", service: "S3" }),
        makeFinding({ id: "s3:c", severity: "low", service: "S3" }),
      ],
      summary: {
        totalChecks: 6,
        checksDenied: 0,
        checksErrored: 0,
        checksSucceeded: 6,
        bucketsScanned: 1,
        issuesFound: 2,
        high: 1,
        medium: 0,
        low: 1,
      },
    });
    const iam = makeScan({
      region: "global",
      findings: [
        makeFinding({ id: "iam:u", severity: "medium", service: "IAM" }),
      ],
      summary: {
        totalChecks: 5,
        checksDenied: 0,
        checksErrored: 0,
        checksSucceeded: 5,
        bucketsScanned: 0,
        issuesFound: 1,
        high: 0,
        medium: 1,
        low: 0,
      },
    });

    const merged = mergeScanResults([s3, iam]);

    expect(merged.findings.length).toBe(3);
    expect(merged.summary.totalChecks).toBe(11);
    expect(merged.summary.checksSucceeded).toBe(11);
    expect(merged.summary.issuesFound).toBe(3);
    expect(merged.summary.high).toBe(1);
    expect(merged.summary.medium).toBe(1);
    expect(merged.summary.low).toBe(1);
  });

  it("uses the earliest startedAt and the latest completedAt across inputs", () => {
    const earlier = makeScan({
      startedAt: "2026-05-07T12:00:00.000Z",
      completedAt: "2026-05-07T12:00:30.000Z",
    });
    const later = makeScan({
      startedAt: "2026-05-07T12:01:00.000Z",
      completedAt: "2026-05-07T12:01:45.000Z",
    });
    const merged = mergeScanResults([later, earlier]);
    expect(merged.startedAt).toBe("2026-05-07T12:00:00.000Z");
    expect(merged.completedAt).toBe("2026-05-07T12:01:45.000Z");
  });

  it("throws when called with an empty list", () => {
    expect(() => mergeScanResults([])).toThrow();
  });
});

describe("inferScannerLabel", () => {
  it("returns S3 for a region-scoped scan with bucket findings", () => {
    const scan = makeScan({
      buckets: [{ name: "b1", region: "eu-west-1", status: "scanned" }],
      findings: [makeFinding({ service: "S3" })],
    });
    expect(inferScannerLabel(scan)).toBe("S3");
  });

  it("returns IAM for a global scan with only IAM findings", () => {
    const scan = makeScan({
      region: "global",
      buckets: [],
      findings: [makeFinding({ service: "IAM", id: "i:u" })],
    });
    expect(inferScannerLabel(scan)).toBe("IAM");
  });

  it("returns AWS for a merged scan with both S3 and IAM findings", () => {
    const scan = makeScan({
      buckets: [{ name: "b1", region: "eu-west-1", status: "scanned" }],
      findings: [
        makeFinding({ service: "S3", id: "s:b" }),
        makeFinding({ service: "IAM", id: "i:u" }),
      ],
    });
    expect(inferScannerLabel(scan)).toBe("AWS");
  });

  it("returns IAM for a global scan even when there are no findings", () => {
    const scan = makeScan({
      region: "global",
      buckets: [],
      findings: [],
    });
    expect(inferScannerLabel(scan)).toBe("IAM");
  });

  it("returns S3 by default when buckets are present but no findings", () => {
    const scan = makeScan({
      buckets: [{ name: "b1", region: "eu-west-1", status: "scanned" }],
      findings: [],
    });
    expect(inferScannerLabel(scan)).toBe("S3");
  });
});

describe("clusterScansByTime", () => {
  function makeScanAt(startedAt: string, completedAt = startedAt): BackendScanResult {
    return makeScan({ startedAt, completedAt });
  }

  it("returns an empty list when given no scans", () => {
    expect(clusterScansByTime([])).toEqual([]);
  });

  it("groups two scans started 1 second apart into the same cluster", () => {
    const a = makeScanAt("2026-05-07T12:00:00.000Z");
    const b = makeScanAt("2026-05-07T12:00:01.000Z");
    const clusters = clusterScansByTime([a, b]);
    expect(clusters.length).toBe(1);
    expect(clusters[0].length).toBe(2);
  });

  it("splits scans more than the window apart into separate clusters", () => {
    const a = makeScanAt("2026-05-07T12:00:00.000Z");
    const b = makeScanAt("2026-05-07T12:05:00.000Z"); // 5 minutes later
    const clusters = clusterScansByTime([a, b]);
    expect(clusters.length).toBe(2);
    expect(clusters[0].length).toBe(1);
    expect(clusters[1].length).toBe(1);
  });

  it("handles scans arriving out of order by sorting before clustering", () => {
    const a = makeScanAt("2026-05-07T12:00:00.000Z");
    const b = makeScanAt("2026-05-07T12:00:02.000Z");
    const c = makeScanAt("2026-05-07T12:30:00.000Z");
    // Pass them shuffled.
    const clusters = clusterScansByTime([c, a, b]);
    expect(clusters.length).toBe(2);
    expect(clusters[0].map((s) => s.startedAt)).toEqual([
      "2026-05-07T12:00:00.000Z",
      "2026-05-07T12:00:02.000Z",
    ]);
    expect(clusters[1].map((s) => s.startedAt)).toEqual([
      "2026-05-07T12:30:00.000Z",
    ]);
  });

  it("respects a custom window when provided", () => {
    const a = makeScanAt("2026-05-07T12:00:00.000Z");
    const b = makeScanAt("2026-05-07T12:00:05.000Z"); // 5s later
    expect(clusterScansByTime([a, b], 3_000).length).toBe(2);
    expect(clusterScansByTime([a, b], 10_000).length).toBe(1);
  });
});

describe("mapScanToReport (post-IAM naming)", () => {
  it("names a merged S3+IAM scan as 'AWS Security Scan'", () => {
    const scan = makeScan({
      region: "eu-west-1",
      buckets: [{ name: "b1", region: "eu-west-1", status: "scanned" }],
      findings: [
        makeFinding({ service: "S3", id: "s:b" }),
        makeFinding({ service: "IAM", id: "i:u" }),
      ],
    });
    expect(mapScanToReport(scan).name).toBe("AWS Security Scan — eu-west-1");
  });

  it("names an IAM-only scan without a region suffix", () => {
    const scan = makeScan({
      region: "global",
      buckets: [],
      findings: [makeFinding({ service: "IAM", id: "i:u" })],
    });
    expect(mapScanToReport(scan).name).toBe("IAM Security Scan");
  });

  it("keeps the S3-only naming intact for region-scoped scans", () => {
    const scan = makeScan({
      region: "ap-southeast-2",
      buckets: [{ name: "b1", region: "ap-southeast-2", status: "scanned" }],
      findings: [makeFinding({ service: "S3" })],
    });
    expect(mapScanToReport(scan).name).toBe("S3 Security Scan — ap-southeast-2");
  });
});
