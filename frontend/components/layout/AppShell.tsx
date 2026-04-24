"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { Menu } from "lucide-react";

import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen lg:flex">
      <Sidebar isMobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-20 border-b border-[#e8decc] bg-[#f5efe4]/95 px-4 py-3 backdrop-blur lg:hidden">
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-xl border-[#ddcfb8] bg-white/90 text-[#4f4133] hover:bg-[#f7f0e6]"
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={18} />
            Menu
          </Button>
        </div>

        <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8 xl:px-10">{children}</main>
      </div>
    </div>
  );
}
