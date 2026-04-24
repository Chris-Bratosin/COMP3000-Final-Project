import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface SectionCardProps {
  title?: string;
  description?: string;
  badge?: ReactNode;
  actions?: ReactNode;
  className?: string;
  contentClassName?: string;
  children: ReactNode;
}

export function SectionCard({
  title,
  description,
  badge,
  actions,
  className,
  contentClassName,
  children,
}: SectionCardProps) {
  return (
    <section
      className={cn(
        "rounded-[1.5rem] border border-[#e4d8c4] bg-white shadow-[0_8px_24px_rgba(120,93,57,0.06)]",
        className,
      )}
    >
      {(title || description || badge || actions) && (
        <div className="flex flex-col gap-4 border-b border-[#f1eadf] px-6 py-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            {title ? (
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-[1.05rem] font-semibold text-[#332c24]">{title}</h2>
                {badge}
              </div>
            ) : null}
            {description ? (
              <p className="text-sm leading-6 text-[#80715f]">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
      )}

      <div className={cn("px-6 py-5", contentClassName)}>{children}</div>
    </section>
  );
}
