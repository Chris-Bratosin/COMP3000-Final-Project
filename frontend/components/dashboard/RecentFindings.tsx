import { ChevronRight } from "lucide-react";

import { EmptyStateCard } from "@/components/shared/EmptyStateCard";
import { SectionCard } from "@/components/shared/SectionCard";
import { SeverityBadge } from "@/components/shared/SeverityBadge";
import type { Finding } from "@/lib/types";

export function RecentFindings({ findings }: { findings: Finding[] }) {
  return (
    <SectionCard
      title="Recent Findings"
      description="From the latest scan."
      className="h-full"
      contentClassName="px-5 py-3"
    >
      {findings.length === 0 ? (
        <EmptyStateCard
          title="No findings yet"
          message="Run your first audit and the latest issues will appear here."
        />
      ) : (
        <ul className="divide-y divide-[#f0e8db]">
          {findings.map((finding) => (
            <li key={finding.id} className="flex items-center gap-3 py-4 first:pt-2 last:pb-2">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-[#342c24]">{finding.title}</p>
                <p className="mt-1 text-sm text-[#8a7a66]">{finding.metadata}</p>
              </div>

              <div className="flex items-center gap-2">
                <SeverityBadge severity={finding.severity} />
                <ChevronRight size={16} className="text-[#b39d82]" />
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
