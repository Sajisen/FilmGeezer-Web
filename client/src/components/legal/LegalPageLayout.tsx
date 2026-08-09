import type { ReactNode } from "react";
import { Link } from "react-router";

import ContentContainer from "../layout/ContentContainer";

type LegalPageLayoutProps = {
  eyebrow: string;
  title: string;
  intro: string;
  updatedLabel: string;
  children: ReactNode;
};

export default function LegalPageLayout({
  eyebrow,
  title,
  intro,
  updatedLabel,
  children,
}: LegalPageLayoutProps) {
  return (
    <main
      id="main-content"
      className="relative min-h-screen overflow-hidden bg-slate-950 py-12 text-white sm:py-16"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[32rem] bg-[radial-gradient(circle_at_12%_0%,rgba(14,165,233,0.12),transparent_38%),radial-gradient(circle_at_88%_8%,rgba(79,70,229,0.10),transparent_34%)]" />

      <ContentContainer className="relative max-w-[1000px]">
        <section className="rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(8,47,73,0.65),rgba(15,23,42,0.95)_55%,rgba(15,23,42,0.88))] p-6 shadow-2xl shadow-black/25 sm:p-9 lg:p-11">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-300">
            {eyebrow}
          </p>

          <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
            {title}
          </h1>

          <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300 sm:text-lg">
            {intro}
          </p>

          <p className="mt-5 text-sm text-slate-500">{updatedLabel}</p>
        </section>

        <div className="mt-6 space-y-5">{children}</div>

        <section className="mt-6 rounded-2xl border border-sky-300/15 bg-sky-400/5 p-6 sm:p-7">
          <h2 className="text-lg font-bold text-white">Questions?</h2>
          <p className="mt-2 text-sm leading-7 text-slate-300">
            Contact FilmGeezer through the support page for privacy, account,
            content-link, or terms questions.
          </p>
          <Link
            to="/contact"
            className="mt-4 inline-flex rounded-full bg-sky-400 px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-sky-300 focus:outline-none focus:ring-2 focus:ring-white"
          >
            Contact FilmGeezer
          </Link>
        </section>
      </ContentContainer>
    </main>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/65 p-6 sm:p-7">
      <h2 className="text-xl font-bold text-white">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-7 text-slate-300">
        {children}
      </div>
    </section>
  );
}
