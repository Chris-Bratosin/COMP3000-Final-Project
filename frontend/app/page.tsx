"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Play, SquareTerminal, RotateCcw } from "lucide-react";

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
import {
  clearScanResult,
  loadScanResult,
  mapScanToDashboard,
  type BackendScanResult,
} from "@/lib/scan";

type ViewMode = "live" | "sample" | "pre-scan";

export default function DashboardPage() {
  const router = useRouter();
  const [scan, setScan] = useState<BackendScanResult | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [forceMode, setForceMode] = useState<"sample" | "pre-scan" | null>(null);

  useEffect(() => {
    setScan(loadScanResult());
    setHydrated(true);
  }, []);

  const liveData = useMemo(() => (scan ? mapScanToDashboard(scan) : null), [scan]);

  const mode: ViewMode = forceMode ?? (liveData ? "live" : "sample");

  const dashboardState =
    mode === "live" && liveData
      ? liveData
      : mode === "sample"
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

  const handleClearScan = () => {
    clearScanResult();
    setScan(null);
    setForceMode(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Posture Overview"
        subtitle="A snapshot of your AWS misconfiguration risk, recent findings and recommended fixes."
        action={
          <Button
            className="h-11 rounded-xl bg-[#8b6949] px-5 text-white hover:bg-[#78583b]"
            onClick={() => router.push("/scan-settings")}
          >
            <Play size={16} />
            Run Scan
          </Button>
        }
      />

      {hydrated && liveData && mode === "live" && (
        <section className="rounded-[1.35rem] border border-[#cfe6d2] bg-[#eef7f0] px-5 py-4 shadow-[0_8px_24px_rgba(40,90,60,0.05)]">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-[#2f6a3d]">Live scan results</p>
              <p className="text-sm text-[#456a4d]">
                {liveData.meta.scopeLabel}
                {liveData.meta.scannerLabel !== "IAM"
                  ? ` scanned in ${liveData.meta.region}`
                  : " scanned"}
                {" - completed "}
                {new Date(liveData.meta.completedAt).toLocaleString("en-GB")}
              </p>
              {liveData.meta.checksDenied > 0 && (
                <p className="text-xs text-[#a26b3a]">
                  {liveData.meta.checksDenied} check
                  {liveData.meta.checksDenied === 1 ? " was" : "s were"} denied by your
                  IAM policy and could not be evaluated.
                </p>
              )}
              {liveData.meta.checksErrored > 0 && (
                <p className="text-xs text-[#b94a48]">
                  {liveData.meta.checksErrored} check
                  {liveData.meta.checksErrored === 1 ? "" : "s"} errored. See the
                  backend console for details.
                </p>
              )}
              {liveData.meta.checksSucceeded === 0 &&
                liveData.meta.bucketsScanned > 0 && (
                  <p className="text-xs text-[#b94a48]">
                    No check completed successfully - posture grade is unreliable.
                  </p>
                )}
              {liveData.meta.listError && (
                <p className="text-xs text-[#a26b3a]">
                  Could not auto-list buckets: {liveData.meta.listError}
                </p>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl border-[#cfe6d2] bg-white text-[#2f6a3d] hover:bg-[#e0f0e3]"
              onClick={handleClearScan}
            >
              <RotateCcw size={14} />
              Clear results
            </Button>
          </div>
        </section>
      )}

      {hydrated && (
        <section className="rounded-[1.35rem] border border-[#e4d8c4] bg-white px-5 py-4 shadow-[0_8px_24px_rgba(120,93,57,0.05)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-[#473b2e]">Preview Mode</p>
              <p className="max-w-3xl text-sm text-[#81715d]">
                {liveData
                  ? "Showing live scan results. Switch to sample or pre-scan view at any time."
                  : "Switch between sample scan results and the pre-scan dashboard state."}
              </p>
            </div>

            <div className="inline-flex flex-wrap gap-1 rounded-xl border border-[#e3d7c5] bg-[#f6f0e6] p-1">
              {liveData && (
                <button
                  type="button"
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    mode === "live" ? "bg-[#7cc486] text-white" : "text-[#755f46]"
                  }`}
                  onClick={() => setForceMode(null)}
                >
                  <Play size={15} />
                  Live Scan
                </button>
              )}
              <button
                type="button"
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  mode === "sample" ? "bg-[#8b6949] text-white" : "text-[#755f46]"
                }`}
                onClick={() => setForceMode("sample")}
              >
                <Play size={15} />
                Sample Scan Results
              </button>
              <button
                type="button"
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  mode === "pre-scan" ? "bg-[#8b6949] text-white" : "text-[#755f46]"
                }`}
                onClick={() => setForceMode("pre-scan")}
              >
                <SquareTerminal size={15} />
                Pre-Scan View
              </button>
            </div>
          </div>
        </section>
      )}

      <SummaryCards metrics={dashboardState.metrics} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,1fr)]">
        <RiskOverview data={dashboardState.riskData} posture={dashboardState.posture} />
        <RecentFindings findings={dashboardState.findings} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <RemediationTips tips={dashboardState.tips} />
        <DetailedIssues issues={dashboardState.issues} />
        <ActivityLog entries={dashboardState.activity} />
      </div>
    </div>
  );
}
