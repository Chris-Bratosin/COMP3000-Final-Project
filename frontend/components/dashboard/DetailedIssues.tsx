"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { EmptyStateCard } from "@/components/shared/EmptyStateCard";
import { SectionCard } from "@/components/shared/SectionCard";
import { SeverityBadge } from "@/components/shared/SeverityBadge";
import { getIssueDescription } from "@/lib/issue-descriptions";
import { cn } from "@/lib/utils";
import type { Issue } from "@/lib/types";

export function DetailedIssues({ issues }: { issues: Issue[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
        issues.map((issue) => {
          const isOpen = expandedId === issue.id;
          return (
            <div
              key={issue.id}
              className="overflow-hidden rounded-[1.1rem] border border-[#e8decd] bg-[#fffdfa]"
            >
              <button
                type="button"
                onClick={() => setExpandedId(isOpen ? null : issue.id)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-[#fcf6e9]"
              >
                <div className="min-w-0">
                  <p className="font-medium text-[#352d24]">{issue.title}</p>
                  <p className="text-sm text-[#8a7a66]">{issue.metadata}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <SeverityBadge severity={issue.severity} />
                  <ChevronDown
                    size={16}
                    className={cn(
                      "text-[#8a7a66] transition-transform",
                      isOpen && "rotate-180",
                    )}
                  />
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-[#f0e7d5] bg-[#fdfaf3] px-4 py-4 text-sm">
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-[#9c886f]">
                    What this means
                  </p>
                  <p className="mt-1 leading-6 text-[#5e5144]">
                    {getIssueDescription(issue.ruleId) ??
                      "No additional detail is available for this finding."}
                  </p>
                </div>
              )}
            </div>
          );
        })
      )}
    </SectionCard>
  );
}

