import { FaAws } from "react-icons/fa";
import type { IconType } from "react-icons";
import {
  SiExpress,
  SiMongodb,
  SiNextdotjs,
  SiReact,
  SiTailwindcss,
  SiTypescript,
} from "react-icons/si";

import { cn } from "@/lib/utils";

const stackIcons: Record<string, IconType> = {
  nextjs: SiNextdotjs,
  react: SiReact,
  typescript: SiTypescript,
  tailwind: SiTailwindcss,
  express: SiExpress,
  mongodb: SiMongodb,
  "aws-sdk": FaAws,
};

interface TechBadgeProps {
  id: string;
  label: string;
  className?: string;
}

export function TechBadge({ id, label, className }: TechBadgeProps) {
  const Icon = stackIcons[id];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-[#e0d4c0] bg-[#f7f1e7] px-3 py-1 text-xs font-medium text-[#5c4d3d]",
        className,
      )}
    >
      {Icon ? <Icon aria-hidden="true" className="size-3.5 shrink-0" /> : null}
      {label}
    </span>
  );
}
