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
      description="Review report options reserved for future export customisation."
      className="xl:col-span-2"
      contentClassName="space-y-4"
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <LabeledSelect
          label="Output Format (future scope)"
          value={settings.outputFormat}
          onValueChange={(value) => onValueChange("outputFormat", value as OutputFormat)}
          disabled
          options={[
            { value: "json", label: "JSON" },
            { value: "html", label: "HTML" },
            { value: "json-html", label: "JSON + HTML" },
          ]}
        />

        <LabeledSelect
          label="Severity Threshold (future scope)"
          value={settings.severityThreshold}
          onValueChange={(value) =>
            onValueChange("severityThreshold", value as SeverityThreshold)
          }
          disabled
          options={[
            { value: "all", label: "All" },
            { value: "medium-and-above", label: "Medium and above" },
            { value: "high-only", label: "High only" },
          ]}
        />
      </div>

      <SettingsToggleRow
        title="Include Remediation Advice (future scope)"
        description="The current report always includes the scanner remediation text."
        checked={settings.includeRemediationAdvice}
        onCheckedChange={(value) => onValueChange("includeRemediationAdvice", value)}
        disabled
      />
      <SettingsToggleRow
        title="Include Evidence (future scope)"
        description="The current scanner stores evidence with each persisted finding."
        checked={settings.includeEvidence}
        onCheckedChange={(value) => onValueChange("includeEvidence", value)}
        disabled
      />
      <SettingsToggleRow
        title="Save Scan Logs (future scope)"
        description="Logs are derived from saved scan results in the current prototype."
        checked={settings.saveScanLogs}
        onCheckedChange={(value) => onValueChange("saveScanLogs", value)}
        disabled
      />
      <SettingsToggleRow
        title="Email Notifications (future scope)"
        description="No email provider is configured for the submitted local prototype."
        checked={settings.emailNotifications}
        onCheckedChange={(value) => onValueChange("emailNotifications", value)}
        disabled
      />

      {settings.emailNotifications ? (
        <div className="grid gap-2">
          <FieldLabel label="Notification Email (future scope)" />
          <Input
            type="email"
            placeholder="security-team@example.com"
            value={settings.notificationEmail}
            onChange={(event) => onValueChange("notificationEmail", event.target.value)}
            disabled
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
  disabled = false,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-2">
      <FieldLabel label={label} />
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
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
