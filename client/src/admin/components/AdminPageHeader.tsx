import type { ReactNode } from "react";

import AdminIcon, { type AdminIconName } from "./AdminIcon";

interface AdminPageHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  icon: AdminIconName;
  actions?: ReactNode;
  meta?: ReactNode;
}

export default function AdminPageHeader({
  eyebrow,
  title,
  description,
  icon,
  actions,
  meta,
}: AdminPageHeaderProps) {
  return (
    <header className="relative overflow-hidden rounded-[1.75rem] border border-white/[0.08] bg-slate-900/55 px-5 py-5 shadow-2xl shadow-black/10 sm:px-7 sm:py-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-sky-400/[0.08] blur-3xl"
      />
      <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-sky-300/20 bg-sky-400/10 text-sky-200 shadow-lg shadow-sky-950/20">
            <AdminIcon name={icon} className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <p className="text-[0.68rem] font-black uppercase tracking-[0.24em] text-sky-300">
              {eyebrow}
            </p>
            <h1 className="mt-1.5 text-2xl font-black tracking-[-0.03em] text-white sm:text-3xl">
              {title}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              {description}
            </p>
            {meta ? <div className="mt-3">{meta}</div> : null}
          </div>
        </div>

        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2 xl:justify-end">
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}
