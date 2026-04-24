import type { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle: string;
  action?: ReactNode;
}

export function PageHeader({
  eyebrow = "Cloud Security Dashboard",
  title,
  subtitle,
  action,
}: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 border-b border-[#e8decc] pb-5 lg:flex-row lg:items-start lg:justify-between">
      <div className="space-y-2">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#9f8d76]">
          {eyebrow}
        </p>
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight text-[#3d352b] sm:text-[2.05rem]">
            {title}
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-[#7f715f]">{subtitle}</p>
        </div>
      </div>

      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
