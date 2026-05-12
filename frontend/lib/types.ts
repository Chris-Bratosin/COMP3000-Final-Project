export type MetricColor = "blue" | "red" | "orange" | "yellow";
export type SeverityLevel = "high" | "medium" | "low";
export type TimelineTone = "info" | "warn" | "error" | "success";

export interface Metric {
  label: string;
  value: number;
  color: MetricColor;
  supportingText: string;
}

export interface RiskSlice {
  name: string;
  value: number;
  color: string;
  count: number;
}

export interface PostureOverview {
  score: number;
  maxScore: number;
  grade: string;
  statusText: string;
  sampleLabel?: string;
}

export interface Finding {
  id: string;
  title: string;
  metadata: string;
  severity: SeverityLevel;
}

export interface Issue {
  id: string;
  title: string;
  metadata: string;
  severity: SeverityLevel;
  description?: string;
  remediation?: string;
  ruleId?: string;
  resourceId?: string;
  region?: string;
}

export interface Tip {
  id: string;
  step: number;
  severity: SeverityLevel;
  title: string;
  description: string;
  actionText: string;
  scoreImpact?: string;
}

export interface ActivityEntry {
  id: string;
  time: string;
  message: string;
  tone: TimelineTone;
}

export type ConnectionMethod = "temporary-credentials" | "assume-role";
export type ScanLevel = "quick" | "standard" | "deep";
export type RegionScope = "single-region" | "multi-region" | "all-enabled";
export type OutputFormat = "json" | "html" | "json-html";
export type SeverityThreshold = "all" | "medium-and-above" | "high-only";

export interface RegionOption {
  value: string;
  label: string;
}

export interface SecurityCheckCategory {
  id: string;
  title: string;
  checkIds: string[];
}

export interface SecurityCheckOption {
  id: string;
  label: string;
  recommended: boolean;
}

export interface ScanSettingsState {
  connectionMethod: ConnectionMethod;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
  assumeRoleArn: string;
  primaryRegion: string;
  connectionStatus: "Connected" | "Pending" | "Disconnected";
  connectedAccount: string;
  connectionMessage: string;
  scanLevel: ScanLevel;
  regionScope: RegionScope;
  singleRegion: string;
  selectedRegions: string[];
  bucketNames: string;
  maxFindingsPerService: number;
  includeLowSeverity: boolean;
  stopOnError: boolean;
  securityChecks: Record<string, boolean>;
  outputFormat: OutputFormat;
  severityThreshold: SeverityThreshold;
  includeRemediationAdvice: boolean;
  includeEvidence: boolean;
  saveScanLogs: boolean;
  lastSaved: string;
}

export interface ReportRecord {
  id: string;
  dateLabel: string;
  createdAt: string;
  name: string;
  issues: number;
  high: number;
  medium: number;
}

export type LogLevel = "INFO" | "WARN" | "ERROR";

export interface LogRecord {
  id: string;
  timestampLabel: string;
  createdAt: string;
  level: LogLevel;
  event: string;
  awsService: string;
}

export interface StackBadge {
  id: string;
  label: string;
  tone: "blue" | "navy" | "green";
}

export interface ComplianceFramework {
  id: string;
  label: string;
}

