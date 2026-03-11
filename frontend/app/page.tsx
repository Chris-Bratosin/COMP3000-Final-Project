import { ActivityLog } from "@/components/dashboard/ActivityLog";
import { DetailedIssues } from "@/components/dashboard/DetailedIssues";
import { RecentFindings } from "@/components/dashboard/RecentFindings";
import { RemediationTips } from "@/components/dashboard/RemediationTips";
import { RiskOverview } from "@/components/dashboard/RiskOverview";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import {
  activityLogEntries,
  dashboardMetrics,
  detailedIssues,
  recentFindings,
  remediationTips,
  riskOverviewData,
} from "@/lib/mock-data";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <SummaryCards metrics={dashboardMetrics} />

      <div className="grid gap-6 xl:grid-cols-2">
        <RiskOverview data={riskOverviewData} />
        <RecentFindings findings={recentFindings} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <DetailedIssues issues={detailedIssues} />
        <RemediationTips tips={remediationTips} />
      </div>

      <ActivityLog entries={activityLogEntries} />
    </div>
  );
}
