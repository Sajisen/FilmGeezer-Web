import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link } from "react-router";

import { useAdminAuth } from "../auth/adminAuthContext";
import AdminIcon, {
  type AdminIconName,
} from "../components/AdminIcon";
import AdminPageHeader from "../components/AdminPageHeader";
import { getAdminOverview } from "../services/adminService";
import type { AdminOverview } from "../types/admin";

interface MetricCardProps {
  icon: AdminIconName;
  value: number;
  label: string;
  detail: string;
  tone: "sky" | "violet" | "emerald" | "amber";
}

const METRIC_TONES: Record<MetricCardProps["tone"], string> = {
  sky: "border-sky-300/10 bg-sky-400/[0.055] text-sky-200",
  violet: "border-violet-300/10 bg-violet-400/[0.055] text-violet-200",
  emerald: "border-emerald-300/10 bg-emerald-400/[0.055] text-emerald-200",
  amber: "border-amber-300/10 bg-amber-400/[0.055] text-amber-200",
};

function MetricCard({
  icon,
  value,
  label,
  detail,
  tone,
}: MetricCardProps) {
  return (
    <article className="group relative overflow-hidden rounded-[1.5rem] border border-white/[0.075] bg-slate-900/55 p-5 shadow-xl shadow-black/[0.08] transition duration-200 hover:-translate-y-0.5 hover:border-white/[0.12] hover:bg-slate-900/70">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-white/[0.025] blur-2xl"
      />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-3xl font-black tracking-[-0.045em] text-white sm:text-[2.15rem]">
            {value.toLocaleString()}
          </p>
          <p className="mt-1 text-sm font-black text-slate-200">{label}</p>
        </div>
        <span
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl border ${METRIC_TONES[tone]}`}
        >
          <AdminIcon name={icon} className="h-5 w-5" />
        </span>
      </div>
      <p className="relative mt-4 border-t border-white/[0.055] pt-3 text-xs leading-5 text-slate-500">
        {detail}
      </p>
    </article>
  );
}

function QueueRow({
  label,
  value,
  total,
  tone,
}: {
  label: string;
  value: number;
  total: number;
  tone: "sky" | "violet" | "emerald" | "slate";
}) {
  const percentage = total > 0 ? Math.min(100, (value / total) * 100) : 0;
  const barTone = {
    sky: "bg-sky-400",
    violet: "bg-violet-400",
    emerald: "bg-emerald-400",
    slate: "bg-slate-500",
  }[tone];

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-bold text-slate-300">{label}</span>
        <span className="text-sm font-black text-white">
          {value.toLocaleString()}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-950/70">
        <div
          className={`h-full rounded-full ${barTone}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function QuickAction({
  to,
  icon,
  title,
  description,
  planned = false,
}: {
  to: string;
  icon: AdminIconName;
  title: string;
  description: string;
  planned?: boolean;
}) {
  return (
    <Link
      to={to}
      className="group flex items-start gap-3 rounded-2xl border border-white/[0.065] bg-slate-950/30 p-4 transition hover:border-sky-300/15 hover:bg-sky-400/[0.045]"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/[0.07] bg-slate-900/70 text-slate-400 transition group-hover:border-sky-300/15 group-hover:text-sky-200">
        <AdminIcon name={icon} className="h-[1.1rem] w-[1.1rem]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="text-sm font-black text-white">{title}</span>
          {planned ? (
            <span className="rounded-full border border-white/[0.07] px-2 py-0.5 text-[0.55rem] font-black uppercase tracking-[0.12em] text-slate-600">
              Next
            </span>
          ) : null}
        </span>
        <span className="mt-1 block text-xs leading-5 text-slate-500">
          {description}
        </span>
      </span>
      <AdminIcon
        name="arrowUpRight"
        className="mt-1 h-4 w-4 shrink-0 text-slate-700 transition group-hover:text-sky-300"
      />
    </Link>
  );
}

function OverviewLoading() {
  return (
    <div className="space-y-6" aria-label="Loading administrator overview">
      <div className="skeleton-placeholder h-48 rounded-[1.75rem]" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="skeleton-placeholder h-40 rounded-[1.5rem]" />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(22rem,0.8fr)]">
        <div className="skeleton-placeholder h-96 rounded-[1.75rem]" />
        <div className="skeleton-placeholder h-96 rounded-[1.75rem]" />
      </div>
    </div>
  );
}

export default function AdminOverviewPage() {
  const { user, security, session } = useAdminAuth();
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

  const securitySummary = useMemo(() => {
    if (security?.passkeysConfigured) {
      return `${security.passkeyCount} registered passkey${security.passkeyCount === 1 ? "" : "s"}`;
    }

    if (security?.mfaEnabled) {
      return "Authenticator-app MFA is active";
    }

    return "Strong verification setup is incomplete";
  }, [security]);

  if (isLoading) {
    return <OverviewLoading />;
  }

  if (errorMessage || !overview) {
    return (
      <div className="space-y-6">
        <AdminPageHeader
          eyebrow="Operations center"
          title="FilmGeezer administration"
          description="Secure operational control for accounts, support, content, and administrator security."
          icon="overview"
        />
        <div className="rounded-2xl border border-red-300/20 bg-red-400/[0.07] p-5 text-sm leading-6 text-red-100">
          {errorMessage ?? "The administrator overview is unavailable."}
        </div>
      </div>
    );
  }

  const totalSupport =
    overview.support.new +
    overview.support.inReview +
    overview.support.resolved +
    overview.support.spam;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Operations center"
        title={`Welcome back, ${user?.displayName ?? "Administrator"}`}
        description="Monitor the application, resolve support work, and move into sensitive administration tasks from one protected workspace."
        icon="overview"
        meta={
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
              Storage and administrator services are available
            </span>
            <span>
              Updated {new Date(overview.generatedAt).toLocaleString()}
            </span>
          </div>
        }
        actions={
          <>
            <Link
              to="/support"
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-sky-500 px-4 text-xs font-black text-white shadow-lg shadow-sky-950/20 transition hover:bg-sky-400"
            >
              Open support
              <AdminIcon name="arrowUpRight" className="h-4 w-4" />
            </Link>
            <Link
              to="/settings"
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/[0.09] bg-slate-950/35 px-4 text-xs font-black text-slate-300 transition hover:border-white/[0.16] hover:text-white"
            >
              Security settings
            </Link>
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon="users"
          value={overview.users.active}
          label="Active accounts"
          detail={`${overview.users.total.toLocaleString()} total accounts · ${overview.users.pending.toLocaleString()} awaiting verification`}
          tone="sky"
        />
        <MetricCard
          icon="inbox"
          value={overview.support.open}
          label="Open support requests"
          detail={`${overview.support.new.toLocaleString()} new · ${overview.support.inReview.toLocaleString()} currently in review`}
          tone="violet"
        />
        <MetricCard
          icon="check"
          value={overview.support.resolved}
          label="Resolved requests"
          detail={`${overview.support.spam.toLocaleString()} request${overview.support.spam === 1 ? "" : "s"} currently classified as spam`}
          tone="emerald"
        />
        <MetricCard
          icon="shield"
          value={overview.administration.activeAdminSessions}
          label="Active admin sessions"
          detail={`${overview.administration.activeAdministrators.toLocaleString()} active administrator account${overview.administration.activeAdministrators === 1 ? "" : "s"}`}
          tone="amber"
        />
      </section>

      <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.18fr)_minmax(22rem,0.82fr)]">
        <article className="rounded-[1.75rem] border border-white/[0.075] bg-slate-900/55 p-5 shadow-xl shadow-black/[0.08] sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[0.66rem] font-black uppercase tracking-[0.22em] text-sky-300">
                Support workload
              </p>
              <h2 className="mt-2 text-xl font-black tracking-tight text-white">
                Current request distribution
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                A live operational snapshot of requests stored in the Contact
                support system.
              </p>
            </div>
            <span className="shrink-0 rounded-xl border border-white/[0.075] bg-slate-950/35 px-3 py-2 text-xs font-black text-slate-300">
              {totalSupport.toLocaleString()} total
            </span>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <QueueRow
              label="New"
              value={overview.support.new}
              total={totalSupport}
              tone="sky"
            />
            <QueueRow
              label="In review"
              value={overview.support.inReview}
              total={totalSupport}
              tone="violet"
            />
            <QueueRow
              label="Resolved"
              value={overview.support.resolved}
              total={totalSupport}
              tone="emerald"
            />
            <QueueRow
              label="Spam"
              value={overview.support.spam}
              total={totalSupport}
              tone="slate"
            />
          </div>

          <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-white/[0.06] bg-slate-950/30 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sky-400/10 text-sky-200">
                <AdminIcon name="support" className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-black text-white">
                  Continue support operations
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Signed-in conversations can receive replies immediately;
                  guest delivery remains a later email milestone.
                </p>
              </div>
            </div>
            <Link
              to="/support"
              className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-sky-300/15 bg-sky-400/[0.07] px-4 text-xs font-black text-sky-100 transition hover:bg-sky-400/[0.12]"
            >
              Review requests
              <AdminIcon name="chevronRight" className="h-4 w-4" />
            </Link>
          </div>
        </article>

        <div className="space-y-5">
          <article className="relative overflow-hidden rounded-[1.75rem] border border-emerald-300/10 bg-emerald-400/[0.045] p-5 shadow-xl shadow-black/[0.08] sm:p-6">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-300/[0.08] blur-3xl"
            />
            <div className="relative flex items-start gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-emerald-300/15 bg-emerald-400/10 text-emerald-200">
                <AdminIcon name="shield" className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[0.66rem] font-black uppercase tracking-[0.2em] text-emerald-300">
                  Security posture
                </p>
                <h2 className="mt-2 text-lg font-black text-white">
                  Strong administrator verification is active
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {securitySummary}. {security?.recoveryCodesRemaining ?? 0} one-time recovery code{security?.recoveryCodesRemaining === 1 ? " remains" : "s remain"}.
                </p>
              </div>
            </div>

            <dl className="relative mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/[0.06] bg-slate-950/25 p-3.5">
                <dt className="text-[0.61rem] font-black uppercase tracking-[0.16em] text-slate-600">
                  Recent confirmation
                </dt>
                <dd className="mt-1.5 text-xs font-bold text-slate-300">
                  {session
                    ? new Date(session.recentAuthenticationAt).toLocaleString()
                    : "Unavailable"}
                </dd>
              </div>
              <div className="rounded-2xl border border-white/[0.06] bg-slate-950/25 p-3.5">
                <dt className="text-[0.61rem] font-black uppercase tracking-[0.16em] text-slate-600">
                  Session expiry
                </dt>
                <dd className="mt-1.5 text-xs font-bold text-slate-300">
                  {session
                    ? new Date(session.expiresAt).toLocaleString()
                    : "Unavailable"}
                </dd>
              </div>
            </dl>

            <Link
              to="/settings"
              className="relative mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-emerald-300/15 bg-emerald-400/[0.07] px-4 text-xs font-black text-emerald-100 transition hover:bg-emerald-400/[0.12]"
            >
              Manage verification methods
              <AdminIcon name="arrowUpRight" className="h-4 w-4" />
            </Link>
          </article>

          <article className="rounded-[1.75rem] border border-white/[0.075] bg-slate-900/55 p-5 shadow-xl shadow-black/[0.08] sm:p-6">
            <p className="text-[0.66rem] font-black uppercase tracking-[0.22em] text-slate-500">
              Quick access
            </p>
            <div className="mt-4 grid gap-3">
              <QuickAction
                to="/support"
                icon="support"
                title="Support inbox"
                description="Review and reply to Contact conversations."
              />
              <QuickAction
                to="/settings"
                icon="key"
                title="Administrator security"
                description="Manage passkeys, TOTP, and recovery codes."
              />
              <QuickAction
                to="/users"
                icon="users"
                title="User administration"
                description="The next protected operational module."
                planned
              />
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
