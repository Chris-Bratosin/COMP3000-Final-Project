import { ShieldCheck } from "lucide-react";

import { PageHeader } from "@/components/shared/PageHeader";
import { SectionCard } from "@/components/shared/SectionCard";

export default function PoliciesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Policies"
        subtitle="Compliance frameworks, internal policies, and governance guidance."
      />

      <SectionCard>
        <div className="flex items-start gap-4">
          <div className="flex size-12 items-center justify-center rounded-[1.1rem] border border-[#e3d8c8] bg-[#f8f3eb] text-[#a17952]">
            <ShieldCheck size={18} />
          </div>
          <div className="space-y-2">
            <h2 className="text-[1.65rem] font-semibold text-[#352d24]">
              Compliance & Policies
            </h2>
            <p className="max-w-4xl text-sm leading-7 text-[#7f715f]">
              This section will hold information about compliance frameworks
              (CIS, NIST, ISO 27001, SOC 2), internal security policies, and
              governance rules applied to scans.
            </p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
