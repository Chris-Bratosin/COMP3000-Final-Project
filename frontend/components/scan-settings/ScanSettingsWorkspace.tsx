"use client";

import { useState } from "react";

import { awsRegions, initialScanSettings, securityCheckCategories, securityCheckOptions } from "@/lib/mock-data";
import type { ScanSettingsState } from "@/lib/types";
import { AwsConnectionCard } from "@/components/scan-settings/AwsConnectionCard";
import { BottomActionBar } from "@/components/scan-settings/BottomActionBar";
import { ReportSettingsCard } from "@/components/scan-settings/ReportSettingsCard";
import { ScanScopeCard } from "@/components/scan-settings/ScanScopeCard";
import { SecurityChecksCard } from "@/components/scan-settings/SecurityChecksCard";

export function ScanSettingsWorkspace() {
  const [settings, setSettings] = useState<ScanSettingsState>(initialScanSettings);

  const updateField = (
    field: keyof ScanSettingsState,
    value: string | number | boolean | string[],
  ) => {
    setSettings((current) => ({ ...current, [field]: value }));
  };

  const handleConnectionMethodChange = (value: ScanSettingsState["connectionMethod"]) => {
    setSettings((current) => ({
      ...current,
      connectionMethod: value,
      connectionStatus: "Pending",
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

  const handleTestConnection = () => {
    setSettings((current) => ({
      ...current,
      connectionStatus: "Connected",
    }));
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

  const handleRunScan = () => {
    setSettings((current) => ({
      ...current,
      lastSaved: `Local scan queued from saved settings at ${new Date().toLocaleTimeString(
        "en-GB",
        {
          hour: "2-digit",
          minute: "2-digit",
        },
      )}`,
    }));
  };

  const handleReset = () => {
    setSettings(initialScanSettings);
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1>Scan Settings</h1>
        <p className="max-w-3xl text-[#4a5d7a]">
          Configure how the Cloud Misconfiguration Auditor connects to AWS and which
          security checks are performed.
        </p>
      </header>

      <div className="grid gap-6 xl:grid-cols-2">
        <AwsConnectionCard
          regions={awsRegions}
          settings={settings}
          onConnectionMethodChange={handleConnectionMethodChange}
          onFieldChange={(field, value) => updateField(field, value)}
          onTestConnection={handleTestConnection}
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
      />
    </div>
  );
}
