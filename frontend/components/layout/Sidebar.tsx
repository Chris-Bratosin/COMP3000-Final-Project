"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Home, Info, Settings, ScrollText } from "lucide-react";

import { cn } from "@/lib/utils";

const primaryNavItems = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/scan-settings", label: "Scan Settings", icon: Settings },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/logs", label: "Logs", icon: ScrollText },
];

const secondaryNavItems = [{ href: "/about", label: "About", icon: Info }];

export function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }

    return pathname.startsWith(href);
  };

  return (
    <aside className="w-full bg-[#2c4564] text-white md:flex md:min-h-screen md:w-[220px] md:flex-col md:justify-between md:border-r md:border-white/10">
      <nav className="flex gap-2 overflow-x-auto px-3 py-3 md:flex-1 md:flex-col md:gap-1 md:px-4 md:py-5">
        {primaryNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex min-w-fit items-center gap-3 rounded-md px-4 py-3 text-sm transition-colors hover:bg-[#3d5670]",
              isActive(item.href) && "bg-[#3d5670]",
            )}
          >
            <item.icon size={18} />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="px-3 pb-3 md:px-4 md:pb-4">
        {secondaryNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex min-w-fit items-center gap-3 rounded-md px-4 py-3 text-sm transition-colors hover:bg-[#3d5670]",
              isActive(item.href) && "bg-[#3d5670]",
            )}
          >
            <item.icon size={18} />
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
    </aside>
  );
}
