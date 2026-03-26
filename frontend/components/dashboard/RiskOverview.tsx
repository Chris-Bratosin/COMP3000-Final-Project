"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

import type { RiskSlice } from "@/lib/types";

export function RiskOverview({ data }: { data: RiskSlice[] }) {
  const hasData = data.some((entry) => entry.value > 0);

  return (
    <section className="rounded-lg bg-white p-6 shadow-sm">
      <h2 className="mb-4">Risk Overview</h2>
      {hasData ? (
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
          <div className="h-[250px] w-full max-w-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  outerRadius={92}
                  dataKey="value"
                  labelLine={false}
                  label={({ value }) => `${value}%`}
                >
                  {data.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid gap-3">
            {data.map((entry) => (
              <div key={entry.name} className="flex items-center gap-3">
                <span
                  className="size-3 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm text-[#4a5d7a]">
                  {entry.name} ({entry.value}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-lg bg-[#f5f7fa] px-4 py-8 text-center text-[#4a5d7a]">
          No scan results yet. Run a scan to populate the dashboard risk breakdown.
        </div>
      )}
    </section>
  );
}
