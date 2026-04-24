import { cn } from "@/lib/utils";

interface TechBadgeProps {
  label: string;
  className?: string;
}

export function TechBadge({ label, className }: TechBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-[#e0d4c0] bg-[#f7f1e7] px-3 py-1 text-xs font-medium text-[#5c4d3d]",
        className,
      )}
    >
      {label}
    </span>
  );
}
