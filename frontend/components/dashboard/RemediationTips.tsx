import { ArrowRight } from "lucide-react";

import { EmptyStateCard } from "@/components/shared/EmptyStateCard";
import { SectionCard } from "@/components/shared/SectionCard";
import { SeverityBadge } from "@/components/shared/SeverityBadge";
import type { Tip } from "@/lib/types";

export function RemediationTips({ tips }: { tips: Tip[] }) {
  const scoreImpact = tips.find((tip) => tip.scoreImpact)?.scoreImpact;

  return (
    <SectionCard
      title="Remediation Tips"
      description="Prioritised steps to reduce your risk score quickly."
      badge={
        scoreImpact ? (
          <span className="rounded-full bg-[#e6f5e2] px-3 py-1 text-xs font-medium text-[#6da874]">
            {scoreImpact}
          </span>
        ) : null
      }
      className="xl:col-span-2"
      contentClassName="space-y-3"
    >
      {tips.length === 0 ? (
        <EmptyStateCard
          title="No remediation tips yet"
          message="Tips will appear after findings are grouped and prioritised."
        />
      ) : (
        tips.map((tip) => (
          <article
            key={tip.id}
            className="rounded-[1.25rem] border border-[#eadfce] bg-[#fffdfa] px-4 py-4"
          >
            <div className="flex items-start gap-4">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#f2ece3] text-sm font-semibold text-[#7f6d58]">
                {tip.step}
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <SeverityBadge severity={tip.severity} />
                  <h3 className="text-base font-semibold text-[#352d24]">{tip.title}</h3>
                </div>
                {tip.description && (
                  <p className="text-sm leading-6 text-[#7d6e5d]">{tip.description}</p>
                )}
                <div className="flex items-start gap-2 rounded-full bg-[#f5efe5] px-4 py-2 text-sm text-[#5f5347]">
                  <ArrowRight size={15} className="mt-0.5 shrink-0 text-[#a18563]" />
                  <span>
                    <span className="font-medium">Do this:</span> {tip.actionText}
                  </span>
                </div>
              </div>
            </div>
          </article>
        ))
      )}
    </SectionCard>
  );
}
