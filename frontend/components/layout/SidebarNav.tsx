"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface SidebarNavProps {
  items: NavItem[];
  onNavigate?: () => void;
}

export function SidebarNav({ items, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }

    return pathname.startsWith(href);
  };

  return (
    <nav className="space-y-1.5">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#5b4f41] transition-colors hover:bg-[#efe5d3]",
            isActive(item.href) &&
              "bg-[#eadfc9] text-[#3f3429] shadow-[inset_0_0_0_1px_rgba(161,132,96,0.14)]",
          )}
        >
          <item.icon size={16} />
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
