import { PlugZap } from "lucide-react";

import { SectionCard } from "@/components/shared/SectionCard";
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

const statusTone: Record<ScanSettingsState["connectionStatus"], string> = {
  Connected: "border-[#d9eacb] bg-[#f0f7e8] text-[#6ea876]",
  Pending: "border-[#f1d8b8] bg-[#fbf1e1] text-[#ed9b37]",
  Disconnected: "border-[#f0c7c5] bg-[#fbe9e7] text-[#dc6f68]",
};

export function AwsConnectionCard({
  regions,
  settings,
  onConnectionMethodChange,
  onFieldChange,
  onTestConnection,
  isTestingConnection,
}: AwsConnectionCardProps) {
  return (
    <SectionCard
      title="AWS Connection"
      description="Configure a sandbox AWS connection for read-only scanning and validate credentials."
      className="h-full"
    >
      <div className="grid gap-5">
        <div className="grid gap-2">
          <label className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#987f62]">
            Connection Method
          </label>
          <Select
            value={settings.connectionMethod}
            onValueChange={(value) => onConnectionMethodChange(value as ConnectionMethod)}
          >
            <SelectTrigger className="h-11 rounded-xl border-[#e4d8c4] bg-[#fcfaf6]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="temporary-credentials">Temporary Credentials</SelectItem>
              <SelectItem value="assume-role">Assume Role</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {settings.connectionMethod === "temporary-credentials" ? (
          <>
            <FieldLabel htmlFor="access-key-id" label="Access Key ID" />
            <Input
              id="access-key-id"
              placeholder="ASIA..."
              value={settings.accessKeyId}
              onChange={(event) => onFieldChange("accessKeyId", event.target.value)}
              className="h-11 rounded-xl border-[#e4d8c4] bg-[#fcfaf6]"
            />

            <FieldLabel htmlFor="secret-access-key" label="Secret Access Key" />
            <Input
              id="secret-access-key"
              type="password"
              placeholder="Enter temporary secret key"
              value={settings.secretAccessKey}
              onChange={(event) => onFieldChange("secretAccessKey", event.target.value)}
              className="h-11 rounded-xl border-[#e4d8c4] bg-[#fcfaf6]"
            />

            <FieldLabel htmlFor="session-token" label="Session Token" />
            <Input
              id="session-token"
              placeholder="Paste sandbox session token if required"
              value={settings.sessionToken}
              onChange={(event) => onFieldChange("sessionToken", event.target.value)}
              className="h-11 rounded-xl border-[#e4d8c4] bg-[#fcfaf6]"
            />
          </>
        ) : null}

        {settings.connectionMethod === "assume-role" ? (
          <>
            <FieldLabel htmlFor="assume-role-arn" label="Assume Role ARN" />
            <Input
              id="assume-role-arn"
              placeholder="arn:aws:iam::123456789012:role/CMAReadOnly"
              value={settings.assumeRoleArn}
              onChange={(event) => onFieldChange("assumeRoleArn", event.target.value)}
              className="h-11 rounded-xl border-[#e4d8c4] bg-[#fcfaf6]"
            />
          </>
        ) : null}

        <div className="grid gap-2">
          <FieldLabel htmlFor="primary-region" label="Primary Region" />
          <Select
            value={settings.primaryRegion}
            onValueChange={(value) => onFieldChange("primaryRegion", value)}
          >
            <SelectTrigger
              id="primary-region"
              className="h-11 rounded-xl border-[#e4d8c4] bg-[#fcfaf6]"
            >
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

        <div
          className={`flex flex-col gap-3 rounded-[1.15rem] border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${statusTone[settings.connectionStatus]}`}
        >
          <div>
            <p className="font-semibold">Connection {settings.connectionStatus}</p>
            <p className="text-sm">{settings.connectionMessage}</p>
            {settings.connectedAccount ? (
              <p className="mt-1 text-sm">Connected account: {settings.connectedAccount}</p>
            ) : null}
          </div>

          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-xl border-current bg-white/70 text-inherit hover:bg-white"
            onClick={onTestConnection}
            disabled={isTestingConnection}
          >
            <PlugZap size={16} />
            {isTestingConnection ? "Testing..." : "Test Connection"}
          </Button>
        </div>
      </div>
    </SectionCard>
  );
}

function FieldLabel({ htmlFor, label }: { htmlFor: string; label: string }) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#987f62]"
    >
      {label}
    </label>
  );
}
