import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Gauge, ShieldCheck, Siren } from "lucide-react";

import type { Metric, MetricColor } from "@/lib/types";

const iconByColor: Record<MetricColor, LucideIcon> = {
  blue: ShieldCheck,
  red: Siren,
  orange: AlertTriangle,
  yellow: Gauge,
};

const iconToneByColor: Record<MetricColor, string> = {
  blue: "bg-[#e3eefb] text-[#74a1dc]",
  red: "bg-[#fde4e1] text-[#ec746d]",
  orange: "bg-[#f7f0e7] text-[#9f8363]",
  yellow: "bg-[#fdebd8] text-[#eea145]",
};

export function StatCard({ metric }: { metric: Metric }) {
  const Icon = iconByColor[metric.color];

  return (
    <article className="rounded-[1.35rem] border border-[#e4d8c4] bg-white px-5 py-4 shadow-[0_8px_20px_rgba(120,93,57,0.05)]">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-[#9b8871]">
            {metric.label}
          </p>
          <p className="text-4xl font-semibold tracking-tight text-[#3d352b]">
            {metric.value}
          </p>
          <p className="text-sm text-[#7f715f]">{metric.supportingText}</p>
        </div>

        <div
          className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${iconToneByColor[metric.color]}`}
        >
          <Icon size={18} />
        </div>
      </div>
    </article>
  );
}
