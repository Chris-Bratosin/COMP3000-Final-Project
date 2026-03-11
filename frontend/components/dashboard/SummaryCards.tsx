import type { Metric } from "@/lib/types";

const colorClasses: Record<Metric["color"], string> = {
  blue: "bg-[#4a7bbd]",
  red: "bg-[#e74c4c]",
  orange: "bg-[#f37d35]",
  yellow: "bg-[#f9a825]",
};

export function SummaryCards({ metrics }: { metrics: Metric[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className={`${colorClasses[metric.color]} rounded-lg px-6 py-4 shadow-sm`}
        >
          <p className="mb-1 text-white/90">{metric.label}</p>
          <p className="text-4xl font-bold text-white">{metric.value}</p>
        </div>
      ))}
    </div>
  );
}
