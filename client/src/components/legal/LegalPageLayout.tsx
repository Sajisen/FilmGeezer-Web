import type { ReactNode } from "react";
import { Link } from "react-router";

import ContentContainer from "../layout/ContentContainer";

type LegalPageLayoutProps = {
  eyebrow: string;
  title: string;
  intro: string;
  updatedLabel: string;
  summary: readonly string[];
  children: ReactNode;
};

export default function LegalPageLayout({
  eyebrow,
  title,
  intro,
  updatedLabel,
  summary,
  children,
}: LegalPageLayoutProps) {
  return (
    <main
      id="main-content"
      className="relative min-h-screen overflow-hidden bg-slate-950 py-10 text-white sm:py-14"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[30rem] bg-[radial-gradient(circle_at_14%_0%,rgba(14,165,233,0.12),transparent_38%),radial-gradient(circle_at_86%_8%,rgba(79,70,229,0.09),transparent_34%)]" />

      <ContentContainer className="relative max-w-[1180px]">
        <div className="mx-auto max-w-[880px]">
          <header className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(135deg,rgba(8,47,73,0.58),rgba(15,23,42,0.94)_58%,rgba(15,23,42,0.88))] p-6 shadow-xl shadow-black/20 sm:p-8 lg:p-9">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-300 sm:text-sm">
              {eyebrow}
            </p>

            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl lg:text-[2.7rem]">
              {title}
            </h1>

            <p className="mt-4 max-w-[46rem] text-base leading-7 text-slate-300 sm:text-[1.05rem] sm:leading-8">
              {intro}
            </p>

            <p className="mt-4 text-xs text-slate-500 sm:text-sm">
              {updatedLabel}
            </p>
          </header>

          <section
            aria-labelledby="legal-summary-heading"
            className="mt-5 rounded-2xl border border-sky-300/15 bg-sky-400/[0.06] p-5 sm:p-6"
          >
            <h2
              id="legal-summary-heading"
              className="text-base font-bold text-white"
            >
              The short version
            </h2>

            <ul className="mt-3 space-y-2.5 text-sm leading-6 text-slate-300">
              {summary.map((item) => (
                <li key={item} className="flex gap-3">
                  <span
                    aria-hidden="true"
                    className="mt-[0.55rem] h-1.5 w-1.5 shrink-0 rounded-full bg-sky-300"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <div className="mt-5 space-y-4">{children}</div>

          <section className="mt-5 rounded-2xl border border-white/10 bg-slate-900/55 p-5 sm:p-6">
            <h2 className="text-base font-bold text-white">
              Need help or want to ask about your data?
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Use FilmGeezer Support for privacy, account, content-link, or
              terms questions.
            </p>
            <Link
              to="/contact"
              className="mt-4 inline-flex rounded-full bg-sky-400 px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-sky-300 focus:outline-none focus:ring-2 focus:ring-white"
            >
              Contact FilmGeezer
            </Link>
          </section>
        </div>
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
    <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 sm:p-6">
      <h2 className="text-lg font-bold tracking-tight text-white sm:text-xl">
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-[0.94rem] leading-7 text-slate-300">
        {children}
      </div>
    </section>
  );
}
