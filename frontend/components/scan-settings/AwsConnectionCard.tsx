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
  onTestConnection: () => void;
}

export function AwsConnectionCard({
  regions,
  settings,
  onConnectionMethodChange,
  onFieldChange,
  onTestConnection,
}: AwsConnectionCardProps) {
  return (
    <section className="rounded-lg bg-white p-6 shadow-sm">
      <div className="mb-6 space-y-2">
        <h2>AWS Connection</h2>
        <p className="text-[#4a5d7a]">
          Choose how CMA authenticates to AWS. Read-only access is recommended.
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
              <SelectItem value="aws-profile">AWS Profile</SelectItem>
              <SelectItem value="assume-role">Assume Role</SelectItem>
              <SelectItem value="env-vars">Environment Variables</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <label htmlFor="profile-name">Profile Name</label>
          <Input
            id="profile-name"
            placeholder="default"
            value={settings.profileName}
            onChange={(event) => onFieldChange("profileName", event.target.value)}
            disabled={settings.connectionMethod !== "aws-profile"}
          />
        </div>

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
            <Badge
              className="bg-[#5fa75f] text-white"
              variant="default"
            >
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

        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-md text-[#4a5d7a]">
            CMA performs read-only checks and does not modify cloud resources.
          </p>
          <Button
            type="button"
            className="bg-[#3d5a7e] text-white hover:bg-[#2c4564]"
            onClick={onTestConnection}
          >
            Test Connection
          </Button>
        </div>
      </div>
    </section>
  );
}
