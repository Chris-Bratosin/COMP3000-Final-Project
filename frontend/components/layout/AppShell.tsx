"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { Sidebar } from "@/components/layout/Sidebar";
import { TopHeader } from "@/components/layout/TopHeader";

const actionLabelByRoute: Record<string, string> = {
  "/": "Run Scan",
  "/scan-settings": "Save Settings",
  "/reports": "Generate Report",
  "/logs": "Export Logs",
  "/about": "About CMA",
};

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const actionLabel = actionLabelByRoute[pathname] ?? "Run Scan";

  return (
    <div className="min-h-screen bg-[#e8ecf1] md:flex">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopHeader actionLabel={actionLabel} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
