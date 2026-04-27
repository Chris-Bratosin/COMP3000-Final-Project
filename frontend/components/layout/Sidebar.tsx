"use client";

import { FileText, Info, LayoutGrid, ScrollText, ShieldCheck, SlidersHorizontal, X } from "lucide-react";

import { CloudIcon } from "@/components/CloudIcon";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const primaryNavItems = [
  { href: "/", label: "Dashboard", icon: LayoutGrid },
  { href: "/scan-settings", label: "Scan Settings", icon: SlidersHorizontal },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/logs", label: "Logs", icon: ScrollText },
  { href: "/policies", label: "Policies", icon: ShieldCheck },
  { href: "/about", label: "About", icon: Info },
];

interface SidebarProps {
  isMobileOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isMobileOpen, onClose }: SidebarProps) {
  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-30 bg-[#2f2417]/25 transition-opacity lg:hidden",
          isMobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[272px] flex-col border-r border-[#e1d3be] bg-[#f7f1e6] px-4 py-5 shadow-[16px_0_40px_rgba(71,51,27,0.08)] transition-transform lg:static lg:min-h-screen lg:w-[212px] lg:translate-x-0 lg:shadow-none",
          isMobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="mb-6 flex items-start justify-between gap-4 lg:block">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl border border-[#e6d8c1] bg-[#fcf8f2]">
              <CloudIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[0.64rem] font-semibold uppercase tracking-[0.24em] text-[#ab977a]">
                Cloud Security
              </p>
              <p className="text-lg font-semibold leading-5 text-[#3b3228]">
                Misconfig Auditor
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-xl text-[#6a5b49] lg:hidden"
            onClick={onClose}
          >
            <X size={18} />
          </Button>
        </div>

        <div className="flex flex-1 flex-col justify-between">
          <div className="space-y-6">
            <SidebarNav items={primaryNavItems} onNavigate={onClose} />
          </div>

          <div className="border-t border-[#e6dac6] pt-4">
            <p className="text-xs text-[#9c8b74]">v0.1.1 · Educational use</p>
          </div>
        </div>
      </aside>
    </>
  );
}
