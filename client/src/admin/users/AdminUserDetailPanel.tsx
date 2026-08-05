import { useState } from "react";

import ProfileAvatar from "../../components/ProfileAvatar";
import AdminIcon from "../components/AdminIcon";
import type {
  AdminManagedUserDetail,
  AdminManagedUserSession,
} from "../types/admin";
import {
  describeUserAgent,
  formatAdminUserDate,
  formatAdminUserRelativeDate,
  getAdminUserStatusClass,
  getAdminUserStatusLabel,
} from "./usersPresentation";

function DetailSkeleton() {
  return (
    <section className="animate-pulse rounded-[1.6rem] border border-white/[0.075] bg-slate-900/45 p-5 shadow-xl shadow-black/[0.08]">
      <div className="flex items-center gap-4">
        <span className="h-16 w-16 rounded-full bg-white/[0.06]" />
        <div className="min-w-0 flex-1">
          <span className="block h-4 w-1/3 rounded bg-white/[0.06]" />
          <span className="mt-3 block h-3 w-1/2 rounded bg-white/[0.04]" />
        </div>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <span
            key={index}
            className="h-20 rounded-2xl bg-white/[0.035]"
          />
        ))}
      </div>
    </section>
  );
}

function Fact({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-slate-950/25 px-4 py-3.5">
      <dt className="text-[0.58rem] font-black uppercase tracking-[0.15em] text-slate-600">
        {label}
      </dt>
      <dd className="mt-1.5 break-words text-sm font-bold text-slate-200">
        {value}
      </dd>
    </div>
  );
}

function SessionCard({
  session,
  isWorking,
  pending,
  onRequestRevoke,
  onCancelRevoke,
  onConfirmRevoke,
}: {
  session: AdminManagedUserSession;
  isWorking: boolean;
  pending: boolean;
  onRequestRevoke: () => void;
  onCancelRevoke: () => void;
  onConfirmRevoke: () => void;
}) {
  return (
    <article className="rounded-2xl border border-white/[0.065] bg-slate-950/25 p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-sky-300/12 bg-sky-400/[0.07] text-sky-200">
          <AdminIcon name="device" className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-white">
            {describeUserAgent(session.userAgentSummary)}
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Last active {formatAdminUserRelativeDate(session.lastSeenAt)}
            {" · "}
            Expires {formatAdminUserDate(session.expiresAt)}
          </p>
          <p className="mt-1 break-all text-[0.58rem] font-bold uppercase tracking-[0.1em] text-slate-700">
            Session {session.sessionId}
          </p>
        </div>
      </div>

      {pending ? (
        <div className="mt-4 rounded-xl border border-red-300/12 bg-red-400/[0.06] p-3">
          <p className="text-xs font-bold leading-5 text-red-100">
            Revoke this public session immediately? The device will need
            to sign in again.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isWorking}
              onClick={onConfirmRevoke}
              className="min-h-9 rounded-xl bg-red-500 px-3 text-xs font-black text-white transition hover:bg-red-400 disabled:opacity-50"
            >
              {isWorking ? "Revoking…" : "Revoke session"}
            </button>
            <button
              type="button"
              disabled={isWorking}
              onClick={onCancelRevoke}
              className="min-h-9 rounded-xl border border-white/[0.08] px-3 text-xs font-black text-slate-400 transition hover:bg-white/[0.04] hover:text-white disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={onRequestRevoke}
          disabled={isWorking}
          className="mt-4 inline-flex min-h-9 items-center gap-2 rounded-xl border border-red-300/12 bg-red-400/[0.05] px-3 text-xs font-black text-red-100 transition hover:bg-red-400/[0.1] disabled:opacity-50"
        >
          <AdminIcon name="logout" className="h-3.5 w-3.5" />
          Revoke this session
        </button>
      )}
    </article>
  );
}

export default function AdminUserDetailPanel({
  detail,
  isLoading,
  isWorking,
  onSuspend,
  onReactivate,
  onRevokeSession,
  onRevokeAllSessions,
}: {
  detail: AdminManagedUserDetail | null;
  isLoading: boolean;
  isWorking: boolean;
  onSuspend: (reason: string) => Promise<void>;
  onReactivate: (reason: string) => Promise<void>;
  onRevokeSession: (sessionId: string) => Promise<void>;
  onRevokeAllSessions: () => Promise<void>;
}) {
  const [action, setAction] = useState<
    "suspend" | "reactivate" | "revoke-all" | null
  >(null);
  const [reason, setReason] = useState("");
  const [pendingSessionId, setPendingSessionId] =
    useState<string | null>(null);


  if (isLoading) {
    return <DetailSkeleton />;
  }

  if (!detail) {
    return (
      <section className="grid min-h-[30rem] place-items-center rounded-[1.6rem] border border-white/[0.075] bg-slate-900/45 p-6 text-center shadow-xl shadow-black/[0.08]">
        <div>
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-white/[0.07] bg-slate-950/35 text-slate-500">
            <AdminIcon name="users" className="h-6 w-6" />
          </span>
          <h2 className="mt-4 text-base font-black text-white">
            Select an account
          </h2>
          <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
            Choose a FilmGeezer account to review its identity, status,
            active sessions, and protected administrator actions.
          </p>
        </div>
      </section>
    );
  }

  const { user, permissions, identities, activeSessions } = detail;

  async function submitStatusAction() {
    if (action === "suspend") {
      await onSuspend(reason);
    } else if (action === "reactivate") {
      await onReactivate(reason);
    } else if (action === "revoke-all") {
      await onRevokeAllSessions();
    }

    setAction(null);
    setReason("");
  }

  return (
    <section className="overflow-hidden rounded-[1.6rem] border border-white/[0.075] bg-slate-900/45 shadow-xl shadow-black/[0.08]">
      <header className="relative overflow-hidden border-b border-white/[0.06] px-5 py-5 sm:px-6">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-sky-400/[0.06] blur-3xl"
        />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <ProfileAvatar
              displayName={user.displayName}
              profileImagePath={user.profileImagePath}
              className="h-16 w-16"
              initialsClassName="text-base"
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-xl font-black text-white">
                  {user.displayName}
                </h2>
                <span
                  className={`rounded-full border px-2.5 py-1 text-[0.58rem] font-black uppercase tracking-[0.11em] ${getAdminUserStatusClass(user.status)}`}
                >
                  {getAdminUserStatusLabel(user.status)}
                </span>
                {user.roles.includes("admin") ? (
                  <span className="rounded-full border border-sky-300/15 bg-sky-400/[0.08] px-2.5 py-1 text-[0.58rem] font-black uppercase tracking-[0.11em] text-sky-200">
                    Administrator
                  </span>
                ) : null}
              </div>
              <p className="mt-1 truncate text-sm text-slate-400">
                {user.email}
              </p>
              <p className="mt-1 break-all text-[0.58rem] font-bold uppercase tracking-[0.12em] text-slate-700">
                {user.userId}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-[0.58rem] font-black uppercase tracking-[0.1em]">
            <span
              className={`rounded-full border px-2.5 py-1 ${
                user.emailVerified
                  ? "border-emerald-300/15 bg-emerald-400/[0.08] text-emerald-200"
                  : "border-amber-300/15 bg-amber-400/[0.08] text-amber-100"
              }`}
            >
              {user.emailVerified ? "Email verified" : "Unverified"}
            </span>
            {user.isCurrentAdministrator ? (
              <span className="rounded-full border border-sky-300/15 bg-sky-400/[0.08] px-2.5 py-1 text-sky-200">
                Your account
              </span>
            ) : null}
          </div>
        </div>
      </header>

      <div className="space-y-6 p-5 sm:p-6">
        {permissions.blockedReason ? (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-300/12 bg-amber-400/[0.055] p-4">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-amber-300/15 bg-amber-400/10 text-amber-100">
              <AdminIcon name="shield" className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-100">
                Protected account
              </p>
              <p className="mt-1 text-sm leading-6 text-amber-50/70">
                {permissions.blockedReason}
              </p>
            </div>
          </div>
        ) : null}

        <section>
          <h3 className="text-sm font-black text-white">
            Account summary
          </h3>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <Fact label="Created" value={formatAdminUserDate(user.createdAt)} />
            <Fact
              label="Last login"
              value={formatAdminUserDate(user.lastLoginAt)}
            />
            <Fact
              label="Last updated"
              value={formatAdminUserDate(user.updatedAt)}
            />
            <Fact
              label="Verified at"
              value={formatAdminUserDate(user.emailVerifiedAt)}
            />
            <Fact
              label="Suspended at"
              value={formatAdminUserDate(user.suspendedAt)}
            />
            <Fact
              label="Identity providers"
              value={
                identities.length > 0
                  ? identities
                      .map((identity) => identity.provider)
                      .join(", ")
                  : "None recorded"
              }
            />
          </dl>
        </section>

        <section>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-white">
                Active public sessions
              </h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                These are ordinary FilmGeezer website sessions, not
                administrator sessions.
              </p>
            </div>

            {permissions.canRevokeSessions &&
            activeSessions.length > 0 &&
            action !== "revoke-all" ? (
              <button
                type="button"
                disabled={isWorking}
                onClick={() => setAction("revoke-all")}
                className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-red-300/12 bg-red-400/[0.05] px-3 text-xs font-black text-red-100 transition hover:bg-red-400/[0.1] disabled:opacity-50"
              >
                <AdminIcon name="logout" className="h-3.5 w-3.5" />
                Revoke all sessions
              </button>
            ) : null}
          </div>

          {action === "revoke-all" ? (
            <div className="mt-3 rounded-2xl border border-red-300/12 bg-red-400/[0.06] p-4">
              <p className="text-sm font-black text-red-100">
                Revoke every public session?
              </p>
              <p className="mt-1 text-xs leading-5 text-red-100/65">
                All signed-in devices for this account will need to
                authenticate again.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={isWorking}
                  onClick={() => void submitStatusAction()}
                  className="min-h-9 rounded-xl bg-red-500 px-3 text-xs font-black text-white hover:bg-red-400 disabled:opacity-50"
                >
                  {isWorking ? "Revoking…" : "Revoke all"}
                </button>
                <button
                  type="button"
                  disabled={isWorking}
                  onClick={() => setAction(null)}
                  className="min-h-9 rounded-xl border border-white/[0.08] px-3 text-xs font-black text-slate-400 hover:bg-white/[0.04] hover:text-white disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}

          {activeSessions.length === 0 ? (
            <div className="mt-3 rounded-2xl border border-white/[0.06] bg-slate-950/20 px-4 py-6 text-center">
              <AdminIcon
                name="device"
                className="mx-auto h-5 w-5 text-slate-600"
              />
              <p className="mt-2 text-sm font-black text-slate-300">
                No active public sessions
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Expired and previously revoked sessions are not shown.
              </p>
            </div>
          ) : (
            <div className="mt-3 grid gap-3 xl:grid-cols-2">
              {activeSessions.map((session) => (
                <SessionCard
                  key={session.sessionId}
                  session={session}
                  isWorking={isWorking}
                  pending={pendingSessionId === session.sessionId}
                  onRequestRevoke={() =>
                    setPendingSessionId(session.sessionId)
                  }
                  onCancelRevoke={() => setPendingSessionId(null)}
                  onConfirmRevoke={() =>
                    void onRevokeSession(session.sessionId).then(() =>
                      setPendingSessionId(null),
                    )
                  }
                />
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-white/[0.065] bg-slate-950/22 p-4">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/[0.07] bg-slate-950/35 text-slate-400">
              <AdminIcon
                name={
                  user.status === "suspended"
                    ? "unlock"
                    : "userBlock"
                }
                className="h-4 w-4"
              />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-black text-white">
                Account access control
              </h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Suspension immediately revokes public and administrator
                sessions. Reactivation never creates a new session.
              </p>
            </div>
          </div>

          {action === "suspend" || action === "reactivate" ? (
            <div className="mt-4 rounded-2xl border border-white/[0.07] bg-slate-950/30 p-4">
              <label className="block">
                <span className="text-xs font-black text-slate-300">
                  Administrator reason
                </span>
                <textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  rows={3}
                  maxLength={300}
                  placeholder="Record a concise operational or security reason."
                  className="mt-2 w-full resize-y rounded-xl border border-white/[0.08] bg-slate-950/45 px-3 py-2.5 text-sm leading-6 text-white outline-none placeholder:text-slate-700 focus:border-sky-300/35"
                />
              </label>
              <p className="mt-2 text-[0.62rem] leading-5 text-slate-600">
                The reason is stored in administrator and account audit
                records. It is not sent as an email at this stage.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={isWorking || reason.trim().length < 5}
                  onClick={() => void submitStatusAction()}
                  className={`min-h-10 rounded-xl px-4 text-xs font-black text-white transition disabled:opacity-40 ${
                    action === "suspend"
                      ? "bg-red-500 hover:bg-red-400"
                      : "bg-emerald-500 hover:bg-emerald-400"
                  }`}
                >
                  {isWorking
                    ? "Applying…"
                    : action === "suspend"
                      ? "Confirm suspension"
                      : "Confirm reactivation"}
                </button>
                <button
                  type="button"
                  disabled={isWorking}
                  onClick={() => {
                    setAction(null);
                    setReason("");
                  }}
                  className="min-h-10 rounded-xl border border-white/[0.08] px-4 text-xs font-black text-slate-400 transition hover:bg-white/[0.04] hover:text-white disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              {permissions.canSuspend ? (
                <button
                  type="button"
                  disabled={isWorking}
                  onClick={() => setAction("suspend")}
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-red-300/15 bg-red-400/[0.07] px-4 text-xs font-black text-red-100 transition hover:bg-red-400/[0.12] disabled:opacity-50"
                >
                  <AdminIcon name="userBlock" className="h-4 w-4" />
                  Suspend account
                </button>
              ) : null}

              {permissions.canReactivate ? (
                <button
                  type="button"
                  disabled={isWorking}
                  onClick={() => setAction("reactivate")}
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-emerald-300/15 bg-emerald-400/[0.07] px-4 text-xs font-black text-emerald-100 transition hover:bg-emerald-400/[0.12] disabled:opacity-50"
                >
                  <AdminIcon name="unlock" className="h-4 w-4" />
                  Reactivate account
                </button>
              ) : null}

              {!permissions.canSuspend &&
              !permissions.canReactivate ? (
                <p className="text-xs leading-5 text-slate-600">
                  No account-status action is available for the current
                  state and protection rules.
                </p>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
