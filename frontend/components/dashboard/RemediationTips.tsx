import { Circle } from "lucide-react";

import type { Tip } from "@/lib/types";

const colorClasses: Record<Tip["color"], string> = {
  green: "text-[#4caf50]",
  orange: "text-[#f9a825]",
  red: "text-[#e74c4c]",
};

export function RemediationTips({ tips }: { tips: Tip[] }) {
  return (
    <section className="rounded-lg bg-white p-6 shadow-sm">
      <h2 className="mb-4">Remediation Tips</h2>
      <div className="grid gap-3">
        {tips.map((tip) => (
          <div key={tip.id} className="flex items-center gap-3">
            <Circle className={colorClasses[tip.color]} size={12} fill="currentColor" />
            <span className="text-[#4a5d7a]">{tip.text}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
