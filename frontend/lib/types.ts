export type MetricColor = "blue" | "red" | "orange" | "yellow";

export interface Metric {
  label: string;
  value: number;
  color: MetricColor;
}

export interface RiskSlice {
  name: string;
  value: number;
  color: string;
}

export interface Finding {
  id: string;
  title: string;
  description: string;
  severity: "high" | "medium";
}

export interface Issue {
  id: string;
  title: string;
  severity: "High" | "Medium";
}

export interface Tip {
  id: string;
  text: string;
  color: "green" | "orange" | "red";
}

export interface ActivityEntry {
  id: string;
  time: string;
  message: string;
}

export type ConnectionMethod = "aws-profile" | "assume-role" | "env-vars";
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
  profileName: string;
  assumeRoleArn: string;
  primaryRegion: string;
  connectionStatus: "Connected" | "Pending" | "Disconnected";
  connectedAccount: string;
  scanLevel: ScanLevel;
  regionScope: RegionScope;
  singleRegion: string;
  selectedRegions: string[];
  maxFindingsPerService: number;
  includeLowSeverity: boolean;
  stopOnError: boolean;
  securityChecks: Record<string, boolean>;
  outputFormat: OutputFormat;
  severityThreshold: SeverityThreshold;
  includeRemediationAdvice: boolean;
  includeEvidence: boolean;
  saveScanLogs: boolean;
  emailNotifications: boolean;
  notificationEmail: string;
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
