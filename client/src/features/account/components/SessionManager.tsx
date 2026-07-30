import type {
  AccountSession,
} from "../../../types/account";

interface SessionManagerProps {
  sessions: AccountSession[];
  maximumActiveSessions: number;
  isLoading: boolean;
  errorMessage: string | null;
  successMessage: string | null;
  revokingSessionReference: string | null;
  onRefresh(): void;
  onRevoke(session: AccountSession): void;
}

function formatDate(
  value: string,
): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat(
    undefined,
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(date);
}

function DeviceIcon({
  type,
}: {
  type: AccountSession["device"]["type"];
}) {
  if (type === "phone") {
    return (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="h-5 w-5"
        fill="none"
      >
        <rect
          x="7"
          y="2.75"
          width="10"
          height="18.5"
          rx="2.2"
          stroke="currentColor"
          strokeWidth="1.7"
        />
        <path
          d="M10 5h4M11 18.5h2"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (type === "tablet") {
    return (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="h-5 w-5"
        fill="none"
      >
        <rect
          x="4.5"
          y="3"
          width="15"
          height="18"
          rx="2.2"
          stroke="currentColor"
          strokeWidth="1.7"
        />
        <path
          d="M11 18.25h2"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
    >
      <rect
        x="3"
        y="4"
        width="18"
        height="12"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M8 20h8M12 16v4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SessionManager({
  sessions,
  maximumActiveSessions,
  isLoading,
  errorMessage,
  successMessage,
  revokingSessionReference,
  onRefresh,
  onRevoke,
}: SessionManagerProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-6 sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-300">
            Devices
          </p>

          <h2 className="mt-2 text-2xl font-black tracking-tight">
            Where you are signed in
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            FilmGeezer allows up to {maximumActiveSessions} active sessions. Device details are estimated from the browser information supplied during sign-in.
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="min-h-11 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-bold text-slate-200 transition hover:border-sky-300/25 hover:bg-sky-400/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 disabled:cursor-wait disabled:opacity-50"
        >
          {isLoading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {errorMessage && (
        <p
          role="alert"
          className="mt-5 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100"
        >
          {errorMessage}
        </p>
      )}

      {successMessage && (
        <p
          role="status"
          className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100"
        >
          {successMessage}
        </p>
      )}

      {isLoading && sessions.length === 0 ? (
        <div
          role="status"
          className="mt-6 rounded-2xl border border-white/8 bg-slate-950/55 p-5 text-sm text-slate-400"
        >
          Loading active sessions…
        </div>
      ) : sessions.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-white/8 bg-slate-950/55 p-5 text-sm text-slate-400">
          No active FilmGeezer sessions were found.
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {sessions.map((session) => {
            const isRevoking =
              revokingSessionReference ===
              session.sessionReference;

            return (
              <article
                key={session.sessionReference}
                className={`rounded-2xl border p-5 ${
                  session.current
                    ? "border-sky-300/25 bg-sky-400/[0.07]"
                    : "border-white/8 bg-slate-950/55"
                }`}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 items-start gap-4">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-sky-400/10 text-sky-300">
                      <DeviceIcon
                        type={session.device.type}
                      />
                    </span>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-white">
                          {session.device.label}
                        </h3>

                        {session.current && (
                          <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-xs font-bold text-emerald-200">
                            Current device
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-sm text-slate-400">
                        {session.device.browser} · {session.device.platform}
                      </p>

                      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
                        <div>
                          <dt className="text-slate-500">
                            Signed in
                          </dt>
                          <dd className="mt-1 font-medium text-slate-200">
                            {formatDate(session.createdAt)}
                          </dd>
                        </div>

                        <div>
                          <dt className="text-slate-500">
                            Last activity
                          </dt>
                          <dd className="mt-1 font-medium text-slate-200">
                            {formatDate(session.lastSeenAt)}
                          </dd>
                        </div>

                        <div>
                          <dt className="text-slate-500">
                            Session expires
                          </dt>
                          <dd className="mt-1 font-medium text-slate-200">
                            {formatDate(session.expiresAt)}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </div>

                  {!session.current && (
                    <button
                      type="button"
                      onClick={() => {
                        onRevoke(session);
                      }}
                      disabled={isRevoking}
                      className="min-h-11 shrink-0 rounded-xl border border-rose-300/20 bg-rose-400/10 px-4 text-sm font-bold text-rose-100 transition hover:bg-rose-400/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 disabled:cursor-wait disabled:opacity-50"
                    >
                      {isRevoking
                        ? "Signing out…"
                        : "Sign out device"}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default SessionManager;
