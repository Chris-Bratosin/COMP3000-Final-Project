import type {
  ActivityEntry,
  Finding,
  Issue,
  LogRecord,
  Metric,
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
  { label: "Total Checks", value: 42, color: "blue" },
  { label: "Issues Found", value: 16, color: "red" },
  { label: "High Risk", value: 5, color: "orange" },
  { label: "Medium Risk", value: 7, color: "yellow" },
];

export const riskOverviewData: RiskSlice[] = [
  { name: "High Risk", value: 43.8, color: "#e74c4c" },
  { name: "Medium Risk", value: 25.2, color: "#f9a825" },
  { name: "Low Risk", value: 25.0, color: "#4caf50" },
  { name: "Informational", value: 6.0, color: "#4a7bbd" },
];

export const recentFindings: Finding[] = [
  {
    id: "finding-1",
    title: "Public S3 Bucket Detected",
    description: 'Bucket "audit-exports-prod" is publicly accessible.',
    severity: "high",
  },
  {
    id: "finding-2",
    title: "Root MFA Disabled",
    description: "The AWS root account does not have MFA enabled.",
    severity: "high",
  },
  {
    id: "finding-3",
    title: "Open SSH Port",
    description: "Port 22 is open to 0.0.0.0/0 on a public security group.",
    severity: "medium",
  },
  {
    id: "finding-4",
    title: "Unencrypted Secret",
    description: "A Secrets Manager policy allows overly broad access.",
    severity: "medium",
  },
];

export const detailedIssues: Issue[] = [
  { id: "issue-1", title: "Public S3 Bucket", severity: "High" },
  { id: "issue-2", title: "Root Account MFA Disabled", severity: "High" },
  { id: "issue-3", title: "Risky Port 22 Exposed", severity: "Medium" },
  { id: "issue-4", title: "Wildcard IAM Policy", severity: "Medium" },
];

export const remediationTips: Tip[] = [
  { id: "tip-1", text: "Enable S3 public access block for all production buckets.", color: "green" },
  { id: "tip-2", text: "Require MFA on the AWS root account and privileged IAM roles.", color: "green" },
  { id: "tip-3", text: "Restrict internet-facing ingress rules to approved office CIDRs.", color: "orange" },
  { id: "tip-4", text: "Review wildcard IAM permissions and reduce them to least privilege.", color: "red" },
];

export const activityLogEntries: ActivityEntry[] = [
  { id: "activity-1", time: "12:58 PM", message: "Scan started for production AWS account." },
  { id: "activity-2", time: "12:59 PM", message: 'S3 bucket "audit-exports-prod" flagged as public.' },
  { id: "activity-3", time: "1:02 PM", message: "Root MFA check returned non-compliant." },
];

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
  { id: "s3", title: "S3", checkIds: ["s3-public-bucket", "s3-public-block", "s3-encryption", "s3-policy"] },
  { id: "iam", title: "IAM", checkIds: ["iam-root-mfa", "iam-permissive", "iam-unused-keys", "iam-wildcard"] },
  { id: "network", title: "EC2 / Network", checkIds: ["ec2-public-sg", "ec2-risky-ports", "ec2-broad-ingress"] },
  { id: "secrets", title: "Secrets", checkIds: ["secrets-policy", "secrets-access"] },
];

export const initialScanSettings: ScanSettingsState = {
  connectionMethod: "aws-profile",
  profileName: "default",
  assumeRoleArn: "",
  primaryRegion: "eu-west-1",
  connectionStatus: "Connected",
  connectedAccount: "123456789012",
  scanLevel: "standard",
  regionScope: "single-region",
  singleRegion: "eu-west-1",
  selectedRegions: ["eu-west-1", "eu-central-1"],
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
