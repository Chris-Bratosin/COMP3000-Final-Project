import { AlertTriangle, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Finding } from "@/lib/types";

export function RecentFindings({ findings }: { findings: Finding[] }) {
  return (
    <section className="rounded-lg bg-white p-6 shadow-sm">
      <h2 className="mb-4">Recent Findings</h2>
      {findings.length > 0 ? (
        <div className="flex flex-col gap-3">
          {findings.map((finding) => (
            <div
              key={finding.id}
              className="flex flex-col gap-3 rounded-lg bg-[#f5f7fa] p-4 xl:flex-row xl:items-start"
            >
              <div className="flex items-start gap-3">
                {finding.severity === "high" ? (
                  <XCircle className="mt-0.5 text-[#e74c4c]" size={20} />
                ) : (
                  <AlertTriangle className="mt-0.5 text-[#f9a825]" size={20} />
                )}
                <div>
                  <p className="font-semibold text-[#2c4564]">{finding.title}</p>
                  <p className="text-[#4a5d7a]">{finding.description}</p>
                </div>
              </div>

              <Button className="bg-[#2c4564] text-white hover:bg-[#3d5670] xl:ml-auto">
                View Details
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg bg-[#f5f7fa] px-4 py-8 text-center text-[#4a5d7a]">
          No findings yet. This area will list the latest issues after the first scan.
        </div>
      )}
    </section>
  );
}
