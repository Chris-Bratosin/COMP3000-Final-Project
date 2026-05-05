import type {
  ActivityEntry,
  ComplianceFramework,
  Finding,
  Issue,
  LogRecord,
  Metric,
  PostureOverview,
  RegionOption,
  ReportRecord,
  RiskSlice,
  ScanSettingsState,
  SecurityCheckCategory,
  SecurityCheckOption,
  StackBadge,
  Tip,
} from "@/lib/types";

export const dashboardMetrics: Metric[] = [
  { label: "Total Checks", value: 42, color: "blue", supportingText: "Across 4 AWS services" },
  { label: "Issues Found", value: 16, color: "red", supportingText: "38% of all active checks" },
  { label: "High Risk", value: 5, color: "orange", supportingText: "Fix these first" },
  { label: "Medium Risk", value: 7, color: "yellow", supportingText: "Schedule this sprint" },
];

export const preScanDashboardMetrics: Metric[] = [
  { label: "Total Checks", value: 0, color: "blue", supportingText: "No scan has been run yet" },
  { label: "Issues Found", value: 0, color: "red", supportingText: "Run a scan to populate this card" },
  { label: "High Risk", value: 0, color: "orange", supportingText: "No critical items recorded" },
  { label: "Medium Risk", value: 0, color: "yellow", supportingText: "No medium issues recorded" },
];

export const dashboardPostureOverview: PostureOverview = {
  score: 62,
  maxScore: 100,
  grade: "D",
  statusText: "Action required",
  sampleLabel: "Sample data",
};

export const preScanPostureOverview: PostureOverview = {
  score: 0,
  maxScore: 100,
  grade: "-",
  statusText: "Awaiting first scan",
};

export const riskOverviewData: RiskSlice[] = [
  { name: "High Risk", value: 31.25, color: "#eb6a67", count: 5 },
  { name: "Medium Risk", value: 43.75, color: "#f5a44a", count: 7 },
  { name: "Low Risk", value: 25, color: "#7ac78d", count: 4 },
];

export const preScanRiskOverviewData: RiskSlice[] = [
  { name: "High Risk", value: 0, color: "#eb6a67", count: 0 },
  { name: "Medium Risk", value: 0, color: "#f5a44a", count: 0 },
  { name: "Low Risk", value: 0, color: "#7ac78d", count: 0 },
];

export const recentFindings: Finding[] = [
  {
    id: "finding-1",
    title: "Public S3 Bucket Detected",
    metadata: "audit-exports-prod - us-east-1",
    severity: "high",
  },
  {
    id: "finding-2",
    title: "Root MFA Disabled",
    metadata: "AWS root account",
    severity: "high",
  },
  {
    id: "finding-3",
    title: "Open SSH Port (22)",
    metadata: "sg-03ba - Public security group",
    severity: "medium",
  },
  {
    id: "finding-4",
    title: "Unencrypted Secret",
    metadata: "Secrets Manager - prod/api-key",
    severity: "medium",
  },
  {
    id: "finding-5",
    title: "Wildcard IAM Policy",
    metadata: "AdminRole - inline policy",
    severity: "low",
  },
];

export const preScanRecentFindings: Finding[] = [];

export const detailedIssues: Issue[] = [
  { id: "issue-1", title: "Public S3 Bucket", metadata: "Amazon S3 - us-east-1", severity: "high" },
  { id: "issue-2", title: "Root Account MFA Disabled", metadata: "AWS IAM - global", severity: "high" },
  { id: "issue-3", title: "Risky Port 22 Exposed", metadata: "Amazon EC2 - eu-west-1", severity: "medium" },
  { id: "issue-4", title: "Wildcard IAM Policy", metadata: "AWS IAM - global", severity: "medium" },
  { id: "issue-5", title: "Unused Access Keys", metadata: "AWS IAM - global", severity: "low" },
];

export const preScanDetailedIssues: Issue[] = [];

export const remediationTips: Tip[] = [
  {
    id: "tip-1",
    step: 1,
    severity: "high",
    title: "Block public access on production S3 buckets",
    description:
      "Buckets exposed to the internet can leak sensitive data within minutes of misconfiguration.",
    actionText:
      'Enable "Block all public access" at the account level, then audit each bucket policy.',
    scoreImpact: "Fixing all high items improves score by +28",
  },
  {
    id: "tip-2",
    step: 2,
    severity: "high",
    title: "Require MFA on the AWS root account",
    description:
      "Root credentials bypass all IAM policies - a single leak compromises the whole account.",
    actionText:
      "Enroll a hardware MFA device in IAM -> Security credentials -> Multi-factor authentication.",
  },
  {
    id: "tip-3",
    step: 3,
    severity: "medium",
    title: "Restrict SSH (port 22) ingress to office CIDRs",
    description:
      "0.0.0.0/0 on port 22 invites brute-force attempts from the open internet.",
    actionText:
      "Update the security group to allow only your VPN or office IP ranges.",
  },
  {
    id: "tip-4",
    step: 4,
    severity: "low",
    title: "Review wildcard IAM permissions quarterly",
    description:
      "Star grants accumulate over time and break the principle of least privilege.",
    actionText:
      "Run an Access Analyzer review and replace wildcards with scoped resource ARNs.",
  },
];

export const preScanRemediationTips: Tip[] = [];

export const activityLogEntries: ActivityEntry[] = [
  { id: "activity-1", time: "12:58", message: "Scan started for production AWS account.", tone: "info" },
  { id: "activity-2", time: "12:59", message: 'S3 bucket "audit-exports-prod" flagged as public.', tone: "error" },
  { id: "activity-3", time: "13:02", message: "Root MFA check returned non-compliant.", tone: "error" },
  { id: "activity-4", time: "13:05", message: "Security group sg-03ba allows SSH from 0.0.0.0/0.", tone: "warn" },
  { id: "activity-5", time: "13:09", message: "Scan completed - 16 issues across 4 services.", tone: "success" },
];

export const preScanActivityLogEntries: ActivityEntry[] = [];

export const awsRegions: RegionOption[] = [
  { value: "us-east-1", label: "us-east-1 (N. Virginia)" },
  { value: "us-east-2", label: "us-east-2 (Ohio)" },
  { value: "us-west-2", label: "us-west-2 (Oregon)" },
  { value: "eu-west-1", label: "eu-west-1 (Ireland)" },
  { value: "eu-central-1", label: "eu-central-1 (Frankfurt)" },
  { value: "ap-southeast-2", label: "ap-southeast-2 (Sydney)" },
];

export const securityCheckOptions: SecurityCheckOption[] = [
  { id: "s3-public-bucket", label: "Public bucket access", recommended: true },
  { id: "s3-public-block", label: "Public access block disabled", recommended: true },
  { id: "s3-encryption", label: "Bucket encryption disabled", recommended: true },
  { id: "s3-policy", label: "Bucket policy overly permissive", recommended: true },
  { id: "iam-root-mfa", label: "Root MFA disabled", recommended: true },
  { id: "iam-permissive", label: "Overly permissive IAM policies", recommended: true },
  { id: "iam-unused-keys", label: "Unused access keys", recommended: false },
  { id: "iam-wildcard", label: "Wildcard permissions", recommended: true },
  { id: "ec2-public-sg", label: "Security groups open to 0.0.0.0/0", recommended: true },
  { id: "ec2-risky-ports", label: "Risky ports exposed (22, 3389)", recommended: true },
  { id: "ec2-broad-ingress", label: "Overly broad ingress rules", recommended: true },
  { id: "secrets-policy", label: "Secrets Manager secret policy review", recommended: true },
  { id: "secrets-access", label: "Weakly scoped secret access", recommended: false },
];

export const securityCheckCategories: SecurityCheckCategory[] = [
  {
    id: "s3",
    title: "S3",
    checkIds: ["s3-public-bucket", "s3-public-block", "s3-encryption", "s3-policy"],
  },
  {
    id: "iam",
    title: "IAM",
    checkIds: ["iam-root-mfa", "iam-permissive", "iam-unused-keys", "iam-wildcard"],
  },
  {
    id: "network",
    title: "EC2 / Network",
    checkIds: ["ec2-public-sg", "ec2-risky-ports", "ec2-broad-ingress"],
  },
  {
    id: "secrets",
    title: "Secrets",
    checkIds: ["secrets-policy", "secrets-access"],
  },
];

export const initialScanSettings: ScanSettingsState = {
  connectionMethod: "temporary-credentials",
  accessKeyId: "ASIAEXAMPLEKEY123",
  secretAccessKey: "",
  sessionToken: "",
  assumeRoleArn: "",
  primaryRegion: "eu-west-1",
  connectionStatus: "Pending",
  connectedAccount: "",
  connectionMessage: "Enter sandbox credentials and use Test Connection to validate them.",
  scanLevel: "standard",
  regionScope: "single-region",
  singleRegion: "eu-west-1",
  selectedRegions: ["eu-west-1", "eu-central-1"],
  bucketNames: "",
  maxFindingsPerService: 50,
  includeLowSeverity: false,
  stopOnError: false,
  securityChecks: Object.fromEntries(
    securityCheckOptions.map((option) => [option.id, option.recommended]),
  ),
  outputFormat: "json-html",
  severityThreshold: "medium-and-above",
  includeRemediationAdvice: true,
  includeEvidence: true,
  saveScanLogs: true,
  emailNotifications: false,
  notificationEmail: "",
  lastSaved: "Saved locally on 19 February 2026 at 09:18",
};

export const reportRecords: ReportRecord[] = [
  {
    id: "report-1",
    dateLabel: "19 Feb 2026",
    createdAt: "2026-02-19T09:18:00Z",
    name: "Weekly AWS Security Audit",
    issues: 16,
    high: 5,
    medium: 7,
  },
  {
    id: "report-2",
    dateLabel: "18 Feb 2026",
    createdAt: "2026-02-18T15:40:00Z",
    name: "IAM Baseline Review",
    issues: 9,
    high: 2,
    medium: 5,
  },
  {
    id: "report-3",
    dateLabel: "17 Feb 2026",
    createdAt: "2026-02-17T08:10:00Z",
    name: "Production Networking Audit",
    issues: 21,
    high: 6,
    medium: 10,
  },
  {
    id: "report-4",
    dateLabel: "14 Feb 2026",
    createdAt: "2026-02-14T11:25:00Z",
    name: "S3 Exposure Review",
    issues: 12,
    high: 4,
    medium: 4,
  },
  {
    id: "report-5",
    dateLabel: "10 Feb 2026",
    createdAt: "2026-02-10T10:05:00Z",
    name: "Full Environment Scan",
    issues: 24,
    high: 7,
    medium: 11,
  },
  {
    id: "report-6",
    dateLabel: "07 Feb 2026",
    createdAt: "2026-02-07T13:10:00Z",
    name: "Quarterly Compliance Snapshot",
    issues: 14,
    high: 3,
    medium: 6,
  },
];

export const logRecords: LogRecord[] = [
  {
    id: "log-1",
    timestampLabel: "19 Feb 2026 12:04",
    createdAt: "2026-02-19T12:04:00Z",
    level: "INFO",
    event: "Scan started for production AWS account.",
    awsService: "AWS Organizations",
  },
  {
    id: "log-2",
    timestampLabel: "19 Feb 2026 12:03",
    createdAt: "2026-02-19T12:03:00Z",
    level: "WARN",
    event: 'Testing bucket policy for "audit-exports-prod".',
    awsService: "Amazon S3",
  },
  {
    id: "log-3",
    timestampLabel: "19 Feb 2026 12:03",
    createdAt: "2026-02-19T12:03:00Z",
    level: "WARN",
    event: "AdminRole has wildcard permissions in inline policy.",
    awsService: "AWS IAM",
  },
  {
    id: "log-4",
    timestampLabel: "19 Feb 2026 12:02",
    createdAt: "2026-02-19T12:02:00Z",
    level: "WARN",
    event: "Security group sg-03ba allows SSH from 0.0.0.0/0.",
    awsService: "Amazon EC2",
  },
  {
    id: "log-5",
    timestampLabel: "19 Feb 2026 12:02",
    createdAt: "2026-02-19T12:02:00Z",
    level: "WARN",
    event: "Secrets Manager policy review returned non-compliant.",
    awsService: "AWS Secrets Manager",
  },
  {
    id: "log-6",
    timestampLabel: "19 Feb 2026 12:01",
    createdAt: "2026-02-19T12:01:00Z",
    level: "ERROR",
    event: "Evidence export failed for archived IAM snapshot.",
    awsService: "AWS IAM",
  },
  {
    id: "log-7",
    timestampLabel: "19 Feb 2026 12:00",
    createdAt: "2026-02-19T12:00:00Z",
    level: "INFO",
    event: "Region inventory loaded successfully.",
    awsService: "Amazon EC2",
  },
];

export const aboutStackBadges: StackBadge[] = [
  { id: "nextjs", label: "Next.js", tone: "navy" },
  { id: "react", label: "React", tone: "green" },
  { id: "typescript", label: "TypeScript", tone: "blue" },
  { id: "tailwind", label: "Tailwind CSS", tone: "blue" },
  { id: "aws-sdk", label: "AWS SDK", tone: "blue" },
  { id: "vercel", label: "Vercel", tone: "navy" },
  { id: "auth-placeholder", label: "Clerk / Supabase", tone: "green" },
];

export const complianceFrameworks: ComplianceFramework[] = [
  { id: "cis", label: "CIS" },
  { id: "nist", label: "NIST" },
  { id: "iso27001", label: "ISO 27001" },
  { id: "soc2", label: "SOC 2" },
];
