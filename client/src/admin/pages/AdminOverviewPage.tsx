import {
  useEffect,
  useState,
} from "react";
import { Link } from "react-router";

import { useAdminAuth } from "../auth/adminAuthContext";
import { getAdminOverview } from "../services/adminService";
import type { AdminOverview } from "../types/admin";

function MetricCard({
  eyebrow,
  value,
  label,
  detail,
}: {
  eyebrow: string;
  value: number;
  label: string;
  detail: string;
}) {
  return (
    <article className="rounded-2xl border border-white/9 bg-slate-900/62 p-5 shadow-lg shadow-black/10">
      <p className="text-[0.68rem] font-black uppercase tracking-[0.2em] text-sky-300">
        {eyebrow}
      </p>
      <div className="mt-3 flex items-end justify-between gap-4">
        <div>
          <p className="text-3xl font-black tracking-tight text-white">{value}</p>
          <p className="mt-1 text-sm font-bold text-slate-200">{label}</p>
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">{detail}</p>
    </article>
  );
}

export default function AdminOverviewPage() {
  const { security } = useAdminAuth();
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void getAdminOverview(controller.signal)
        .then((response) => {
          setOverview(response.overview);
          setErrorMessage(null);
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") {
            return;
          }

          setErrorMessage(
            error instanceof Error
              ? error.message
              : "The administrator overview could not be loaded.",
          );
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setIsLoading(false);
          }
        });
    }, 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, []);

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Loading administrator overview">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="skeleton-placeholder h-40 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (errorMessage || !overview) {
    return (
      <div className="rounded-2xl border border-red-300/20 bg-red-400/[0.07] p-5 text-sm leading-6 text-red-100">
        {errorMessage ?? "The administrator overview is unavailable."}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section>
        <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-300">
          Operations overview
        </p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white">
              FilmGeezer administration
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              A secure operational view of accounts, support activity, and the
              administration environment.
            </p>
          </div>
          <p className="text-xs text-slate-500">
            Updated {new Date(overview.generatedAt).toLocaleString()}
          </p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          eyebrow="Users"
          value={overview.users.active}
          label="Active accounts"
          detail={`${overview.users.total} total · ${overview.users.pending} awaiting verification`}
        />
        <MetricCard
          eyebrow="Support"
          value={overview.support.open}
          label="Open requests"
          detail={`${overview.support.new} new · ${overview.support.inReview} in review`}
        />
        <MetricCard
          eyebrow="Resolved"
          value={overview.support.resolved}
          label="Completed requests"
          detail={`${overview.support.spam} currently marked as spam`}
        />
        <MetricCard
          eyebrow="Security"
          value={overview.administration.activeAdminSessions}
          label="Active admin sessions"
          detail={`${overview.administration.activeAdministrators} active administrator account(s)`}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <article className="rounded-2xl border border-white/9 bg-slate-900/62 p-6">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-300">
            Operational module
          </p>
          <h2 className="mt-3 text-xl font-black text-white">
            Contact support inbox
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Review Contact requests, continue signed-in conversations, classify
            guest requests safely, and record every administrator action.
          </p>
          <Link
            to="/support"
            className="mt-5 inline-flex min-h-11 items-center rounded-full border border-sky-300/25 bg-sky-400/10 px-5 text-sm font-black text-sky-200 transition hover:bg-sky-400/15"
          >
            Open support inbox
          </Link>
        </article>

        <article
          className={`rounded-2xl border p-6 ${
            security?.mfaEnabled
              ? "border-emerald-300/15 bg-emerald-300/[0.05]"
              : "border-amber-300/15 bg-amber-300/[0.05]"
          }`}
        >
          <p
            className={`text-xs font-black uppercase tracking-[0.2em] ${
              security?.mfaEnabled
                ? "text-emerald-200"
                : "text-amber-200"
            }`}
          >
            Administrator security
          </p>
          <h2 className="mt-3 text-lg font-black text-white">
            {security?.mfaEnabled
              ? "MFA is protecting this account"
              : "Complete MFA before production"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            {security?.mfaEnabled
              ? `${security.recoveryCodesRemaining} recovery code(s) remain. Review security settings before adding destructive administration controls.`
              : "Password, role checks, short sessions, CSRF protection, and audit logging are active. Enroll an authenticator before exposing the admin subdomain publicly."}
          </p>
          <Link
            to="/settings"
            className="mt-5 inline-flex min-h-10 items-center rounded-full border border-white/10 px-4 text-sm font-black text-slate-200 transition hover:bg-white/[0.04]"
          >
            Open security settings
          </Link>
        </article>
      </section>
    </div>
  );
}
