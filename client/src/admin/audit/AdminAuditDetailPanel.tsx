import { useState } from "react";

import ProfileAvatar from "../../components/ProfileAvatar";
import { copyTextToClipboard } from "../../utils/copyTextToClipboard";
import AdminIcon from "../components/AdminIcon";
import type {
  AdminAuditEntry,
  AdminAuditIdentity,
} from "../types/admin";
import {
  auditCategoryClass,
  auditCategoryLabel,
  auditDetailLabel,
  auditDetailValue,
  auditEventLabel,
  auditIdentitySecondary,
  formatAuditDateTime,
} from "./auditPresentation";

function IdentityCard({
  label,
  identity,
}: {
  label: string;
  identity: AdminAuditIdentity | null;
}) {
  if (!identity) {
    return (
      <div className="rounded-2xl border border-white/[0.06] bg-slate-950/25 p-4">
        <p className="text-[0.58rem] font-black uppercase tracking-[0.16em] text-slate-600">
          {label}
        </p>
        <p className="mt-2 text-sm font-black text-slate-400">
          No account target
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-slate-950/25 p-4">
      <p className="text-[0.58rem] font-black uppercase tracking-[0.16em] text-slate-600">
        {label}
      </p>
      <div className="mt-3 flex min-w-0 items-center gap-3">
        {identity.kind === "user" ? (
          <ProfileAvatar
            displayName={identity.displayName}
            profileImagePath={identity.profileImagePath}
            className="h-11 w-11"
            initialsClassName="text-xs"
          />
        ) : (
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/[0.07] bg-slate-950/45 text-slate-500">
            <AdminIcon
              name={identity.kind === "system" ? "settings" : "users"}
              className="h-4.5 w-4.5"
            />
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-white">
            {identity.displayName}
          </p>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {auditIdentitySecondary(identity)}
          </p>
          {identity.roles.includes("admin") ? (
            <span className="mt-2 inline-flex rounded-full border border-sky-300/15 bg-sky-400/[0.08] px-2 py-0.5 text-[0.52rem] font-black uppercase tracking-[0.1em] text-sky-200">
              Administrator
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <section
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="animate-pulse overflow-hidden rounded-[1.6rem] border border-white/[0.075] bg-slate-900/45 p-6 shadow-xl shadow-black/[0.08]"
    >
      <p className="sr-only">Loading audit record details.</p>
      <div className="h-3 w-28 rounded bg-white/[0.05]" />
      <div className="mt-4 h-7 w-3/5 rounded bg-white/[0.07]" />
      <div className="mt-3 h-3 w-4/5 rounded bg-white/[0.04]" />
      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        <div className="h-28 rounded-2xl bg-white/[0.035]" />
        <div className="h-28 rounded-2xl bg-white/[0.035]" />
      </div>
      <div className="mt-5 h-44 rounded-2xl bg-white/[0.035]" />
    </section>
  );
}

export default function AdminAuditDetailPanel({
  item,
  isLoading,
  errorMessage,
}: {
  item: AdminAuditEntry | null;
  isLoading: boolean;
  errorMessage: string | null;
}) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );

  if (isLoading) {
    return <DetailSkeleton />;
  }

  if (errorMessage) {
    return (
      <section role="alert" className="grid min-h-96 place-items-center rounded-[1.6rem] border border-red-300/10 bg-red-400/[0.035] px-6 py-12 text-center shadow-xl shadow-black/[0.08]">
        <div>
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-red-300/15 bg-red-400/[0.08] text-red-200">
            <AdminIcon name="alert" className="h-5 w-5" />
          </span>
          <p className="mt-4 text-sm font-black text-white">
            Audit record unavailable
          </p>
          <p className="mt-2 max-w-sm text-xs leading-5 text-slate-500">
            {errorMessage}
          </p>
        </div>
      </section>
    );
  }

  if (!item) {
    return (
      <section role="status" className="grid min-h-96 place-items-center rounded-[1.6rem] border border-white/[0.075] bg-slate-900/45 px-6 py-12 text-center shadow-xl shadow-black/[0.08]">
        <div>
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-white/[0.07] bg-slate-950/35 text-slate-500">
            <AdminIcon name="audit" className="h-5 w-5" />
          </span>
          <p className="mt-4 text-sm font-black text-white">
            Select an audit record
          </p>
          <p className="mt-2 max-w-sm text-xs leading-5 text-slate-500">
            Choose a record from the activity trail to inspect its safe
            operational summary.
          </p>
        </div>
      </section>
    );
  }

  const detailEntries = Object.entries(item.details);

  async function copyEventId(eventId: string) {
    const copied = await copyTextToClipboard(eventId);
    setCopyState(copied ? "copied" : "failed");
    window.setTimeout(() => setCopyState("idle"), 1_800);
  }

  return (
    <section className="overflow-hidden rounded-[1.6rem] border border-white/[0.075] bg-slate-900/45 shadow-xl shadow-black/[0.08]">
      <header className="relative overflow-hidden border-b border-white/[0.06] px-5 py-5 sm:px-6">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-sky-400/[0.06] blur-3xl"
        />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-1 text-[0.58rem] font-black uppercase tracking-[0.11em] ${auditCategoryClass(item.category)}`}
            >
              {auditCategoryLabel(item.category)}
            </span>
            <span
              className={`rounded-full border px-2.5 py-1 text-[0.58rem] font-black uppercase tracking-[0.11em] ${
                item.outcome === "success"
                  ? "border-emerald-300/15 bg-emerald-400/[0.08] text-emerald-200"
                  : "border-red-300/15 bg-red-400/[0.08] text-red-200"
              }`}
            >
              {item.outcome === "success" ? "Succeeded" : "Failed"}
            </span>
          </div>

          <h2 className="mt-3 text-xl font-black tracking-[-0.02em] text-white sm:text-2xl">
            {auditEventLabel(item.eventType)}
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            {formatAuditDateTime(item.createdAt)}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <code className="max-w-full break-all rounded-xl border border-white/[0.07] bg-slate-950/35 px-3 py-2 text-[0.65rem] text-slate-500">
              {item.auditEventId}
            </code>
            <button
              type="button"
              onClick={() => void copyEventId(item.auditEventId)}
              className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-white/[0.08] px-3 text-xs font-black text-slate-400 transition hover:bg-white/[0.04] hover:text-white"
            >
              <AdminIcon name="copy" className="h-3.5 w-3.5" />
              Copy record ID
            </button>
            {copyState !== "idle" ? (
              <span role="status" aria-live="polite" className="text-xs font-bold text-slate-400">
                {copyState === "copied"
                  ? "Record ID copied."
                  : "Record ID could not be copied."}
              </span>
            ) : null}
          </div>
        </div>
      </header>

      <div className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <IdentityCard label="Actor" identity={item.actor} />
          <IdentityCard label="Target" identity={item.target} />
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-slate-950/20 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[0.58rem] font-black uppercase tracking-[0.16em] text-slate-600">
                Safe event details
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Secrets, tokens, passkey material, challenges, recovery
                codes, and request bodies are excluded.
              </p>
            </div>
            <AdminIcon name="shield" className="h-5 w-5 text-sky-300" />
          </div>

          {detailEntries.length > 0 ? (
            <dl className="mt-4 grid gap-2 sm:grid-cols-2">
              {detailEntries.map(([key, value]) => (
                <div
                  key={key}
                  className="rounded-xl border border-white/[0.05] bg-slate-950/30 px-3 py-3"
                >
                  <dt className="text-[0.56rem] font-black uppercase tracking-[0.12em] text-slate-600">
                    {auditDetailLabel(key)}
                  </dt>
                  <dd className="mt-1 break-words text-sm font-bold text-slate-300">
                    {auditDetailValue(value)}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-4 rounded-xl border border-white/[0.05] bg-slate-950/30 px-4 py-4 text-xs leading-5 text-slate-500">
              This event has no additional safe details to display.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-slate-950/20 p-4">
          <p className="text-[0.58rem] font-black uppercase tracking-[0.16em] text-slate-600">
            Client environment
          </p>
          <p className="mt-2 break-words text-xs leading-5 text-slate-400">
            {item.userAgentSummary ??
              "No browser or command-line environment was recorded."}
          </p>
        </div>

        <div className="flex items-start gap-3 rounded-2xl border border-sky-300/10 bg-sky-400/[0.045] px-4 py-3">
          <AdminIcon name="lock" className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />
          <p className="text-xs leading-5 text-slate-400">
            This page is read-only. Audit records cannot be edited or
            removed from the administrator interface.
          </p>
        </div>
      </div>
    </section>
  );
}
