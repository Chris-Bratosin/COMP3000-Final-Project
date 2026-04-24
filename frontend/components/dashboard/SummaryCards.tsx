import { StatCard } from "@/components/shared/StatCard";
import type { Metric } from "@/lib/types";

export function SummaryCards({ metrics }: { metrics: Metric[] }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <StatCard key={metric.label} metric={metric} />
      ))}
    </section>
  );
}
