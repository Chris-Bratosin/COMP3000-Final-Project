import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
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
    <section className="rounded-lg bg-white p-6 shadow-sm">
      <div className="mb-6 space-y-2">
        <h2>Report Settings</h2>
        <p className="text-[#4a5d7a]">
          Choose how scan results are generated and stored.
        </p>
      </div>

      <div className="grid gap-5">
        <div className="grid gap-2">
          <label>Output Format</label>
          <Select
            value={settings.outputFormat}
            onValueChange={(value) => onValueChange("outputFormat", value as OutputFormat)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="json">JSON</SelectItem>
              <SelectItem value="html">HTML</SelectItem>
              <SelectItem value="json-html">JSON + HTML</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <label>Severity Threshold</label>
          <Select
            value={settings.severityThreshold}
            onValueChange={(value) =>
              onValueChange("severityThreshold", value as SeverityThreshold)
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="medium-and-above">Medium and above</SelectItem>
              <SelectItem value="high-only">High only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {[
          {
            field: "includeRemediationAdvice" as const,
            title: "Include Remediation Advice",
            description: "Attach practical fix guidance to each finding.",
          },
          {
            field: "includeEvidence" as const,
            title: "Include Evidence",
            description: "Store supporting evidence for each failing control.",
          },
          {
            field: "saveScanLogs" as const,
            title: "Save Scan Logs",
            description: "Keep structured logs from the local scan session.",
          },
          {
            field: "emailNotifications" as const,
            title: "Email Notifications",
            description: "Send a summary after each local scan completes.",
          },
        ].map((item) => (
          <div
            key={item.field}
            className="flex items-center justify-between rounded-lg border bg-[#f5f7fa] px-4 py-3"
          >
            <div>
              <p className="font-medium text-[#2c4564]">{item.title}</p>
              <p className="text-[#4a5d7a]">{item.description}</p>
            </div>
            <Switch
              checked={Boolean(settings[item.field])}
              onCheckedChange={(value) => onValueChange(item.field, value)}
            />
          </div>
        ))}

        {settings.emailNotifications && (
          <div className="grid gap-2">
            <label htmlFor="notification-email">Notification Email</label>
            <Input
              id="notification-email"
              type="email"
              placeholder="security-team@example.com"
              value={settings.notificationEmail}
              onChange={(event) => onValueChange("notificationEmail", event.target.value)}
            />
          </div>
        )}
      </div>
    </section>
  );
}
