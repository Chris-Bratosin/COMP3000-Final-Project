import { cn } from "@/lib/utils";

type SeverityTone =
  | "critical"
  | "high"
  | "medium"
  | "low"
  | "info"
  | "informational"
  | "warn"
  | "error";

const toneClasses: Record<SeverityTone, string> = {
  critical: "bg-[#f8dedd] text-[#cb5b57]",
  high: "bg-[#f8dedd] text-[#e16762]",
  medium: "bg-[#fde8cf] text-[#e59a39]",
  low: "bg-[#e2f4df] text-[#69af72]",
  info: "bg-[#deebfb] text-[#6596cf]",
  informational: "bg-[#deebfb] text-[#6596cf]",
  warn: "bg-[#fde8cf] text-[#e59a39]",
  error: "bg-[#f8dedd] text-[#e16762]",
};

interface SeverityBadgeProps {
  severity: SeverityTone;
  className?: string;
}

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em]",
        toneClasses[severity],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {severity}
    </span>
  );
}
