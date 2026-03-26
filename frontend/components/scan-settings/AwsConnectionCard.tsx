import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ConnectionMethod, RegionOption, ScanSettingsState } from "@/lib/types";

interface AwsConnectionCardProps {
  regions: RegionOption[];
  settings: ScanSettingsState;
  onConnectionMethodChange: (value: ConnectionMethod) => void;
  onFieldChange: (field: keyof ScanSettingsState, value: string) => void;
  onTestConnection: () => Promise<void>;
  isTestingConnection: boolean;
}

export function AwsConnectionCard({
  regions,
  settings,
  onConnectionMethodChange,
  onFieldChange,
  onTestConnection,
  isTestingConnection,
}: AwsConnectionCardProps) {
  const connectionBadgeClass =
    settings.connectionStatus === "Connected"
      ? "bg-[#5fa75f] text-white"
      : settings.connectionStatus === "Disconnected"
        ? "bg-[#e74c4c] text-white"
        : "bg-[#f9a825] text-white";

  return (
    <section className="rounded-lg bg-white p-6 shadow-sm">
      <div className="mb-6 space-y-2">
        <h2>AWS Connection</h2>
        <p className="text-[#4a5d7a]">
          Configure a simple AWS sandbox connection for read-only scanning and test
          that the supplied credentials are valid before running checks.
        </p>
      </div>

      <div className="grid gap-5">
        <div className="grid gap-2">
          <label htmlFor="connection-method">Connection Method</label>
          <Select
            value={settings.connectionMethod}
            onValueChange={(value) => onConnectionMethodChange(value as ConnectionMethod)}
          >
            <SelectTrigger id="connection-method">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="temporary-credentials">Temporary Credentials</SelectItem>
              <SelectItem value="assume-role">Assume Role</SelectItem>
              <SelectItem value="env-vars">Environment Variables</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {settings.connectionMethod === "temporary-credentials" && (
          <>
            <div className="grid gap-2">
              <label htmlFor="access-key-id">Access Key ID</label>
              <Input
                id="access-key-id"
                placeholder="ASIA..."
                value={settings.accessKeyId}
                onChange={(event) => onFieldChange("accessKeyId", event.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="secret-access-key">Secret Access Key</label>
              <Input
                id="secret-access-key"
                type="password"
                placeholder="Enter temporary secret key"
                value={settings.secretAccessKey}
                onChange={(event) => onFieldChange("secretAccessKey", event.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="session-token">Session Token</label>
              <Input
                id="session-token"
                placeholder="Paste sandbox session token if required"
                value={settings.sessionToken}
                onChange={(event) => onFieldChange("sessionToken", event.target.value)}
              />
              <p className="text-sm text-[#4a5d7a]">
                Recommended for short-lived AWS sandbox credentials.
              </p>
            </div>
          </>
        )}

        {settings.connectionMethod === "assume-role" && (
          <div className="grid gap-2">
            <label htmlFor="assume-role-arn">Assume Role ARN</label>
            <Input
              id="assume-role-arn"
              placeholder="arn:aws:iam::123456789012:role/CMAReadOnly"
              value={settings.assumeRoleArn}
              onChange={(event) => onFieldChange("assumeRoleArn", event.target.value)}
            />
          </div>
        )}

        <div className="grid gap-2">
          <label htmlFor="primary-region">Primary Region</label>
          <Select
            value={settings.primaryRegion}
            onValueChange={(value) => onFieldChange("primaryRegion", value)}
          >
            <SelectTrigger id="primary-region">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {regions.map((region) => (
                <SelectItem key={region.value} value={region.value}>
                  {region.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <label>Connection Status</label>
            <Badge className={connectionBadgeClass} variant="default">
              {settings.connectionStatus}
            </Badge>
          </div>

          <div className="grid gap-2">
            <label>Connected Account</label>
            <div className="rounded-md border bg-[#f5f7fa] px-3 py-2 text-[#4a5d7a]">
              {settings.connectedAccount}
            </div>
          </div>
        </div>

        <div className="rounded-md bg-[#f5f7fa] px-3 py-3 text-sm text-[#4a5d7a]">
          {settings.connectionMessage}
        </div>

        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-md text-[#4a5d7a]">
            CMA performs read-only checks and is designed to use short-lived sandbox
            credentials for testing.
          </p>
          <Button
            type="button"
            className="bg-[#3d5a7e] text-white hover:bg-[#2c4564]"
            onClick={onTestConnection}
            disabled={isTestingConnection}
          >
            {isTestingConnection ? "Testing..." : "Test Connection"}
          </Button>
        </div>
      </div>
    </section>
  );
}
