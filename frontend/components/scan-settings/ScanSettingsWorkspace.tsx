"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";

import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import {
  awsRegions,
  initialScanSettings,
  securityCheckCategories,
  securityCheckOptions,
} from "@/lib/mock-data";
import type { ScanSettingsState } from "@/lib/types";
import { persistScanResult, runS3Scan } from "@/lib/scan";
import { loadSettings, saveSettings } from "@/lib/scan-settings-storage";
import { AwsConnectionCard } from "@/components/scan-settings/AwsConnectionCard";
import { BottomActionBar } from "@/components/scan-settings/BottomActionBar";
import { ReportSettingsCard } from "@/components/scan-settings/ReportSettingsCard";
import { ScanScopeCard } from "@/components/scan-settings/ScanScopeCard";
import { SecurityChecksCard } from "@/components/scan-settings/SecurityChecksCard";

export function ScanSettingsWorkspace() {
  const router = useRouter();
  const [settings, setSettings] = useState<ScanSettingsState>(() =>
    loadSettings(initialScanSettings),
  );
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isRunningScan, setIsRunningScan] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const updateField = (
    field: keyof ScanSettingsState,
    value: string | number | boolean | string[],
  ) => {
    setSettings((current) => ({ ...current, [field]: value }));
  };

  const updateConnectionField = (
    field: keyof ScanSettingsState,
    value: string,
  ) => {
    setSettings((current) => ({
      ...current,
      [field]: value,
      connectionStatus: "Pending",
      connectedAccount: "",
      connectionMessage: "Connection details changed. Test the connection again.",
    }));
  };

  const handleConnectionMethodChange = (value: ScanSettingsState["connectionMethod"]) => {
    setSettings((current) => ({
      ...current,
      connectionMethod: value,
      connectionStatus: "Pending",
      connectedAccount: "",
      connectionMessage: "Choose a connection method and test it against AWS STS.",
    }));
  };

  const handleToggleCheck = (checkId: string, checked: boolean) => {
    setSettings((current) => ({
      ...current,
      securityChecks: { ...current.securityChecks, [checkId]: checked },
    }));
  };

  const handleSelectAll = () => {
    setSettings((current) => ({
      ...current,
      securityChecks: Object.fromEntries(
        securityCheckOptions.map((option) => [option.id, true]),
      ),
    }));
  };

  const handleClearAll = () => {
    setSettings((current) => ({
      ...current,
      securityChecks: Object.fromEntries(
        securityCheckOptions.map((option) => [option.id, false]),
      ),
    }));
  };

  const handleRecommendedOnly = () => {
    setSettings((current) => ({
      ...current,
      securityChecks: Object.fromEntries(
        securityCheckOptions.map((option) => [option.id, option.recommended]),
      ),
    }));
  };

  const handleTestConnection = async () => {
    if (
      settings.connectionMethod === "temporary-credentials" &&
      (!settings.accessKeyId.trim() || !settings.secretAccessKey.trim())
    ) {
      setSettings((current) => ({
        ...current,
        connectionStatus: "Disconnected",
        connectedAccount: "",
        connectionMessage: "Access Key ID and Secret Access Key are required.",
      }));
      return;
    }

    if (
      settings.connectionMethod === "assume-role" &&
      !settings.assumeRoleArn.trim()
    ) {
      setSettings((current) => ({
        ...current,
        connectionStatus: "Disconnected",
        connectedAccount: "",
        connectionMessage: "Assume Role ARN is required.",
      }));
      return;
    }

    setIsTestingConnection(true);
    setSettings((current) => ({
      ...current,
      connectionStatus: "Pending",
      connectedAccount: "",
      connectionMessage: "Testing AWS credentials with STS...",
    }));

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"}/api/aws/test-connection`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            connectionMethod: settings.connectionMethod,
            accessKeyId: settings.accessKeyId,
            secretAccessKey: settings.secretAccessKey,
            sessionToken: settings.sessionToken,
            assumeRoleArn: settings.assumeRoleArn,
            primaryRegion: settings.primaryRegion,
          }),
        },
      );

      const result = (await response.json()) as {
        connected?: boolean;
        accountId?: string;
        message?: string;
      };

      if (!response.ok || !result.connected) {
        throw new Error(result.message || "AWS connection test failed.");
      }

      setSettings((current) => ({
        ...current,
        connectionStatus: "Connected",
        connectedAccount: result.accountId || "",
        connectionMessage:
          result.message || "Connection successful. AWS credentials were validated.",
      }));
    } catch (error) {
      setSettings((current) => ({
        ...current,
        connectionStatus: "Disconnected",
        connectedAccount: "",
        connectionMessage:
          error instanceof Error ? error.message : "AWS connection test failed.",
      }));
    } finally {
      setIsTestingConnection(false);
    }
  };

  const saveLabel = () =>
    `Saved locally on ${new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    })} at ${new Date().toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;

  const handleSave = () => {
    setSettings((current) => ({
      ...current,
      lastSaved: saveLabel(),
    }));
  };

  const handleRunScan = async () => {
    if (settings.connectionStatus !== "Connected") {
      setScanError("Test the AWS connection successfully before running a scan.");
      return;
    }

    setScanError(null);
    setIsRunningScan(true);
    setSettings((current) => ({
      ...current,
      lastSaved: `Scan started at ${new Date().toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      })}`,
    }));

    try {
      const scan = await runS3Scan(settings);
      persistScanResult(scan);
      setSettings((current) => ({
        ...current,
        lastSaved: `Scan complete - ${scan.summary.issuesFound} issue(s) across ${scan.summary.bucketsScanned} bucket(s)`,
      }));
      router.push("/");
    } catch (error) {
      setScanError(error instanceof Error ? error.message : "Scan failed.");
    } finally {
      setIsRunningScan(false);
    }
  };

  const handleReset = () => {
    setSettings(initialScanSettings);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Scan Settings"
        subtitle="Configure how the auditor connects to AWS and which checks are performed."
        action={
          <Button
            type="button"
            className="h-11 rounded-xl bg-[#8b6949] px-5 text-white hover:bg-[#78583b]"
            onClick={handleSave}
          >
            <Save size={16} />
            Save Settings
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <AwsConnectionCard
          regions={awsRegions}
          settings={settings}
          onConnectionMethodChange={handleConnectionMethodChange}
          onFieldChange={updateConnectionField}
          onTestConnection={handleTestConnection}
          isTestingConnection={isTestingConnection}
        />
        <ScanScopeCard
          regions={awsRegions}
          settings={settings}
          onValueChange={updateField}
        />
        <SecurityChecksCard
          categories={securityCheckCategories}
          options={securityCheckOptions}
          settings={settings}
          onToggle={handleToggleCheck}
          onSelectAll={handleSelectAll}
          onClearAll={handleClearAll}
          onRecommendedOnly={handleRecommendedOnly}
        />
        <ReportSettingsCard settings={settings} onValueChange={updateField} />
      </div>

      <BottomActionBar
        lastSaved={settings.lastSaved}
        onReset={handleReset}
        onSave={handleSave}
        onRunScan={handleRunScan}
        isRunningScan={isRunningScan}
        scanError={scanError}
      />
    </div>
  );
}
