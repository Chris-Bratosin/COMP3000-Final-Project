import { EmptyStateCard } from "@/components/shared/EmptyStateCard";
import { SectionCard } from "@/components/shared/SectionCard";
import { activityLogEntries } from "@/lib/mock-data";
import type { ActivityEntry, TimelineTone } from "@/lib/types";

const toneClassByType: Record<TimelineTone, string> = {
  info: "bg-[#7db4ef]",
  warn: "bg-[#f2a242]",
  error: "bg-[#ea6963]",
  success: "bg-[#74be85]",
};

export function ActivityLog({ entries = activityLogEntries }: { entries?: ActivityEntry[] }) {
  return (
    <SectionCard
      title="Activity Log"
      actions={<p className="text-xs text-[#9b8871]">Today · {entries.length} events</p>}
    >
      {entries.length === 0 ? (
        <EmptyStateCard
          title="No recent activity"
          message="Execution history will show here after scans, exports, or settings changes."
        />
      ) : (
        <ul className="space-y-3">
          {entries.map((entry) => (
            <li key={entry.id} className="flex items-start gap-3">
              <span
                className={`mt-1.5 size-2.5 shrink-0 rounded-full ${toneClassByType[entry.tone]}`}
              />
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="font-medium text-[#a28d73]">{entry.time}</span>
                <span className="text-[#4f4335]">{entry.message}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
