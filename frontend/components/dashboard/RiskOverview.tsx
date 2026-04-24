import { SectionCard } from "@/components/shared/SectionCard";
import type { PostureOverview, RiskSlice } from "@/lib/types";

export function RiskOverview({
  data,
  posture,
}: {
  data: RiskSlice[];
  posture: PostureOverview;
}) {
  const total = data.reduce((sum, item) => sum + item.count, 0);
  const hasData = total > 0;
  const circumference = 2 * Math.PI * 52;
  const progress = posture.maxScore > 0 ? posture.score / posture.maxScore : 0;
  const dashOffset = circumference - circumference * progress;

  return (
    <SectionCard
      title="Risk Overview"
      description={`Calculated from ${hasData ? `${total} active findings` : "0 active checks"}`}
      badge={
        posture.sampleLabel ? (
          <span className="rounded-full bg-[#f3ede4] px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[#a18b6c]">
            {posture.sampleLabel}
          </span>
        ) : null
      }
    >
      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-center">
        <div className="mx-auto flex items-center justify-center">
          <div className="relative flex size-[168px] items-center justify-center">
            <svg viewBox="0 0 120 120" className="size-full -rotate-90">
              <circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                stroke="#efe6d7"
                strokeWidth="8"
              />
              <circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                stroke="#f2a242"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-4xl font-semibold text-[#f29b38]">{posture.score}</span>
              <span className="text-sm text-[#8b7b66]">/ {posture.maxScore} risk</span>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#9d8970]">
              Posture Grade
            </p>
            <div className="mt-1 flex items-center gap-3">
              <span className="text-5xl font-semibold text-[#f2a242]">{posture.grade}</span>
              <span className="text-sm text-[#7f715f]">{posture.statusText}</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="h-2.5 overflow-hidden rounded-full bg-[#f3ece1]">
              <div className="flex h-full w-full">
                {data.map((entry) => (
                  <div
                    key={entry.name}
                    style={{ width: `${hasData ? entry.value : 0}%`, backgroundColor: entry.color }}
                  />
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {data.map((entry) => (
                <div key={entry.name} className="flex items-center justify-between gap-3 text-sm">
                  <div className="flex items-center gap-2 text-[#7a6a57]">
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span>{entry.name.replace(" Risk", "")}</span>
                  </div>
                  <span className="font-semibold text-[#44392e]">{entry.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
