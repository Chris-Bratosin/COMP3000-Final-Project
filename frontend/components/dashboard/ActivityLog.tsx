import type { ActivityEntry } from "@/lib/types";

import { activityLogEntries } from "@/lib/mock-data";

export function ActivityLog({
  entries = activityLogEntries,
}: {
  entries?: ActivityEntry[];
}) {
  return (
    <section className="rounded-lg bg-white p-6 shadow-sm">
      <h2 className="mb-4">Activity Log</h2>
      {entries.length > 0 ? (
        <div className="flex flex-col">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start gap-4 border-b py-2.5 last:border-b-0"
            >
              <span className="w-20 shrink-0 text-[#4a5d7a]">{entry.time}</span>
              <span className="shrink-0 text-[#9ca7b5]">|</span>
              <span className="flex-1 text-[#4a5d7a]">{entry.message}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg bg-[#f5f7fa] px-4 py-8 text-center text-[#4a5d7a]">
          No activity has been recorded yet. Scan events will appear here once a run starts.
        </div>
      )}
    </section>
  );
}
