import { Button } from "@/components/ui/button";
import type { Issue } from "@/lib/types";

const severityClasses: Record<Issue["severity"], string> = {
  High: "bg-[#e74c4c]",
  Medium: "bg-[#f9a825]",
};

export function DetailedIssues({ issues }: { issues: Issue[] }) {
  return (
    <section className="rounded-lg bg-white p-6 shadow-sm">
      <h2 className="mb-4">Detailed Issues</h2>
      <div className="flex flex-col gap-2">
        {issues.map((issue) => (
          <div
            key={issue.id}
            className="flex flex-col gap-3 border-b py-3 last:border-b-0 md:flex-row md:items-center md:justify-between"
          >
            <p className="text-[#4a5d7a]">{issue.title}</p>
            <div className="flex items-center gap-3">
              <span
                className={`${severityClasses[issue.severity]} rounded px-3 py-1 text-xs text-white`}
              >
                {issue.severity}
              </span>
              <Button className="bg-[#2c4564] text-white hover:bg-[#3d5670]">
                View Details
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
