import { EmptyStateCard } from "@/components/shared/EmptyStateCard";
import { SectionCard } from "@/components/shared/SectionCard";
import { SeverityBadge } from "@/components/shared/SeverityBadge";
import type { Issue } from "@/lib/types";

export function DetailedIssues({ issues }: { issues: Issue[] }) {
  return (
    <SectionCard
      title="Detailed Issues"
      description="Tap an item for evidence and history."
      className="h-full"
      contentClassName="space-y-3"
    >
      {issues.length === 0 ? (
        <EmptyStateCard
          title="No detailed issues"
          message="Issue rows will fill in here once a scan has generated findings."
        />
      ) : (
        issues.map((issue) => (
          <div
            key={issue.id}
            className="flex items-center justify-between gap-4 rounded-[1.1rem] border border-[#e8decd] bg-[#fffdfa] px-4 py-3"
          >
            <div className="min-w-0">
              <p className="font-medium text-[#352d24]">{issue.title}</p>
              <p className="text-sm text-[#8a7a66]">{issue.metadata}</p>
            </div>
            <SeverityBadge severity={issue.severity} />
          </div>
        ))
      )}
    </SectionCard>
  );
}
