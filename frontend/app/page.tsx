"use client";

import { useState } from "react";
import { Play, SquareTerminal } from "lucide-react";

import { ActivityLog } from "@/components/dashboard/ActivityLog";
import { DetailedIssues } from "@/components/dashboard/DetailedIssues";
import { RecentFindings } from "@/components/dashboard/RecentFindings";
import { RemediationTips } from "@/components/dashboard/RemediationTips";
import { RiskOverview } from "@/components/dashboard/RiskOverview";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import {
  activityLogEntries,
  dashboardPostureOverview,
  dashboardMetrics,
  detailedIssues,
  preScanPostureOverview,
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
          posture: dashboardPostureOverview,
          riskData: riskOverviewData,
          findings: recentFindings,
          issues: detailedIssues,
        tips: remediationTips,
        activity: activityLogEntries,
      }
      : {
          metrics: preScanDashboardMetrics,
          posture: preScanPostureOverview,
          riskData: preScanRiskOverviewData,
          findings: preScanRecentFindings,
          issues: preScanDetailedIssues,
        tips: preScanRemediationTips,
        activity: preScanActivityLogEntries,
      };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Posture Overview"
        subtitle="A snapshot of your AWS misconfiguration risk, recent findings and recommended fixes."
        action={
          <Button className="h-11 rounded-xl bg-[#8b6949] px-5 text-white hover:bg-[#78583b]">
            <Play size={16} />
            Run Scan
          </Button>
        }
      />

      <section className="rounded-[1.35rem] border border-[#e4d8c4] bg-white px-5 py-4 shadow-[0_8px_24px_rgba(120,93,57,0.05)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-[#473b2e]">Preview Mode</p>
            <p className="max-w-3xl text-sm text-[#81715d]">
              Switch between sample scan results and the pre-scan dashboard state.
            </p>
          </div>

          <div className="inline-flex rounded-xl border border-[#e3d7c5] bg-[#f6f0e6] p-1">
            <button
              type="button"
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                showSampleResults ? "bg-[#8b6949] text-white" : "text-[#755f46]"
              }`}
              onClick={() => setShowSampleResults(true)}
            >
              <Play size={15} />
              Sample Scan Results
            </button>
            <button
              type="button"
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                !showSampleResults ? "bg-[#8b6949] text-white" : "text-[#755f46]"
              }`}
              onClick={() => setShowSampleResults(false)}
            >
              <SquareTerminal size={15} />
              Pre-Scan View
            </button>
          </div>
        </div>
      </section>

      <SummaryCards metrics={dashboardState.metrics} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,1fr)]">
        <RiskOverview data={dashboardState.riskData} posture={dashboardState.posture} />
        <RecentFindings findings={dashboardState.findings} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,1fr)]">
        <RemediationTips tips={dashboardState.tips} />
        <DetailedIssues issues={dashboardState.issues} />
      </div>

      <ActivityLog entries={dashboardState.activity} />
    </div>
  );
}
