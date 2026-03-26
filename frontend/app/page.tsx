"use client";

import { useState } from "react";

import { ActivityLog } from "@/components/dashboard/ActivityLog";
import { DetailedIssues } from "@/components/dashboard/DetailedIssues";
import { RecentFindings } from "@/components/dashboard/RecentFindings";
import { RemediationTips } from "@/components/dashboard/RemediationTips";
import { RiskOverview } from "@/components/dashboard/RiskOverview";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  activityLogEntries,
  dashboardMetrics,
  detailedIssues,
  preScanActivityLogEntries,
  preScanDashboardMetrics,
  preScanDetailedIssues,
  preScanRecentFindings,
  preScanRemediationTips,
  preScanRiskOverviewData,
  recentFindings,
  remediationTips,
  riskOverviewData,
} from "@/lib/mock-data";

export default function DashboardPage() {
  const [showSampleResults, setShowSampleResults] = useState(true);

  const dashboardState = showSampleResults
    ? {
        metrics: dashboardMetrics,
        riskData: riskOverviewData,
        findings: recentFindings,
        issues: detailedIssues,
        tips: remediationTips,
        activity: activityLogEntries,
      }
    : {
        metrics: preScanDashboardMetrics,
        riskData: preScanRiskOverviewData,
        findings: preScanRecentFindings,
        issues: preScanDetailedIssues,
        tips: preScanRemediationTips,
        activity: preScanActivityLogEntries,
      };

  return (
    <div className="space-y-6">
      <section className="rounded-lg bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1>Dashboard</h1>
              <Badge variant={showSampleResults ? "secondary" : "outline"}>
                {showSampleResults ? "Sample Scan Results" : "Pre-Scan View"}
              </Badge>
            </div>
            <p className="max-w-3xl text-[#4a5d7a]">
              Toggle between example results and the empty dashboard state you would
              see before any AWS scan has been run.
            </p>
          </div>

          <label className="flex items-center gap-3 text-sm font-medium text-[#2c4564]">
            <span>Show sample results</span>
            <Switch
              checked={showSampleResults}
              onCheckedChange={setShowSampleResults}
              aria-label="Toggle sample dashboard data"
            />
          </label>
        </div>
      </section>

      <SummaryCards metrics={dashboardState.metrics} />

      <div className="grid gap-6 xl:grid-cols-2">
        <RiskOverview data={dashboardState.riskData} />
        <RecentFindings findings={dashboardState.findings} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <DetailedIssues issues={dashboardState.issues} />
        <RemediationTips tips={dashboardState.tips} />
      </div>

      <ActivityLog entries={dashboardState.activity} />
    </div>
  );
}
