"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { SectionCard } from "@/components/shared/SectionCard";
import { lawPolicies } from "@/lib/policies";

export function PoliciesOverview() {
  const [activeId, setActiveId] = useState(lawPolicies[0].id);
  const active = lawPolicies.find((p) => p.id === activeId) ?? lawPolicies[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Policies & Compliance"
        subtitle="How the Cloud Misconfiguration Auditor handles data, respects legal boundaries, and aligns with widely used security frameworks."
      />

      {/* Top row — clickable law cards */}
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        {lawPolicies.map((law) => {
          const isActive = law.id === activeId;
          return (
            <button
              key={law.id}
              onClick={() => setActiveId(law.id)}
              className={[
                "rounded-[1.1rem] border px-4 py-4 text-left transition-all",
                isActive
                  ? "border-[#c4a96e] bg-[#fdf6e8] shadow-sm"
                  : "border-[#e4d8c4] bg-[#fffdfa] hover:border-[#c4a96e] hover:bg-[#fdf6e8]",
              ].join(" ")}
            >
              <p
                className={[
                  "text-[0.72rem] font-semibold uppercase tracking-[0.16em]",
                  isActive ? "text-[#8a6d3b]" : "text-[#9c886f]",
                ].join(" ")}
              >
                {law.short}
              </p>
              <p className="mt-1 text-sm font-semibold text-[#352d24] leading-snug">
                {law.name}
              </p>
              <p className="mt-1.5 text-xs text-[#9c886f]">{law.jurisdiction}</p>
            </button>
          );
        })}
      </div>

      {/* Content panel */}
      <SectionCard>
        <div className="space-y-6">
          {/* Header */}
          <div className="border-b border-[#ede4d3] pb-5">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-md bg-[#f1e8d4] px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-[#8a6d3b]">
                {active.short}
              </span>
              <span className="text-xs text-[#9c886f]">{active.jurisdiction}</span>
            </div>
            <h2 className="mt-3 text-xl font-semibold text-[#352d24]">{active.name}</h2>
            <p className="mt-2 text-sm leading-7 text-[#5e5144]">{active.summary}</p>
          </div>

          {/* Sections */}
          <div className="grid gap-5 md:grid-cols-2">
            {active.sections.map((section) => (
              <div key={section.heading} className="rounded-[1.1rem] border border-[#eadfce] bg-[#fcfaf6] px-5 py-5">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#9c886f]">
                  {section.heading}
                </p>
                <p className="mt-2 text-sm leading-7 text-[#5e5144]">{section.body}</p>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
