import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SectionCard } from "@/components/shared/SectionCard";
import { SettingsToggleRow } from "@/components/shared/SettingsToggleRow";
import type { OutputFormat, ScanSettingsState, SeverityThreshold } from "@/lib/types";

interface ReportSettingsCardProps {
  settings: ScanSettingsState;
  onValueChange: (field: keyof ScanSettingsState, value: string | boolean) => void;
}

export function ReportSettingsCard({
  settings,
  onValueChange,
}: ReportSettingsCardProps) {
  return (
    <SectionCard
      title="Report Settings"
      description="Choose how scan results are generated and stored."
      className="xl:col-span-2"
      contentClassName="space-y-4"
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <LabeledSelect
          label="Output Format"
          value={settings.outputFormat}
          onValueChange={(value) => onValueChange("outputFormat", value as OutputFormat)}
          options={[
            { value: "json", label: "JSON" },
            { value: "html", label: "HTML" },
            { value: "json-html", label: "JSON + HTML" },
          ]}
        />

        <LabeledSelect
          label="Severity Threshold"
          value={settings.severityThreshold}
          onValueChange={(value) =>
            onValueChange("severityThreshold", value as SeverityThreshold)
          }
          options={[
            { value: "all", label: "All" },
            { value: "medium-and-above", label: "Medium and above" },
            { value: "high-only", label: "High only" },
          ]}
        />
      </div>

      <SettingsToggleRow
        title="Include Remediation Advice"
        description="Attach practical fix guidance to each finding."
        checked={settings.includeRemediationAdvice}
        onCheckedChange={(value) => onValueChange("includeRemediationAdvice", value)}
      />
      <SettingsToggleRow
        title="Include Evidence"
        description="Store supporting evidence for each failing control."
        checked={settings.includeEvidence}
        onCheckedChange={(value) => onValueChange("includeEvidence", value)}
      />
      <SettingsToggleRow
        title="Save Scan Logs"
        description="Keep structured logs from the local scan session."
        checked={settings.saveScanLogs}
        onCheckedChange={(value) => onValueChange("saveScanLogs", value)}
      />
      <SettingsToggleRow
        title="Email Notifications"
        description="Send a summary after each local scan completes."
        checked={settings.emailNotifications}
        onCheckedChange={(value) => onValueChange("emailNotifications", value)}
      />

      {settings.emailNotifications ? (
        <div className="grid gap-2">
          <FieldLabel label="Notification Email" />
          <Input
            type="email"
            placeholder="security-team@example.com"
            value={settings.notificationEmail}
            onChange={(event) => onValueChange("notificationEmail", event.target.value)}
            className="h-11 rounded-xl border-[#e4d8c4] bg-[#fcfaf6]"
          />
        </div>
      ) : null}
    </SectionCard>
  );
}

function FieldLabel({ label }: { label: string }) {
  return (
    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#987f62]">
      {label}
    </p>
  );
}

function LabeledSelect({
  label,
  value,
  onValueChange,
  options,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="grid gap-2">
      <FieldLabel label={label} />
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="h-11 rounded-xl border-[#e4d8c4] bg-[#fcfaf6]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
