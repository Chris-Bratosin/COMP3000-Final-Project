import { ChevronRight } from "lucide-react";

import { CloudIcon } from "@/components/CloudIcon";
import { Button } from "@/components/ui/button";

interface TopHeaderProps {
  actionLabel: string;
}

export function TopHeader({ actionLabel }: TopHeaderProps) {
  return (
    <header className="sticky top-0 z-20 bg-[#3d5a7e] px-4 py-4 shadow-sm sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <CloudIcon className="h-10 w-auto shrink-0" />
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-white/70">
              Cloud Security Dashboard
            </p>
            <h1 className="text-xl font-semibold text-white">
              Cloud Misconfiguration Auditor
            </h1>
          </div>
        </div>

        <Button
          type="button"
          className="bg-[#5fa75f] px-6 py-2.5 text-white hover:bg-[#4e8f4e]"
        >
          {actionLabel}
          <ChevronRight size={18} />
        </Button>
      </div>
    </header>
  );
}
