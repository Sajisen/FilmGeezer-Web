import {
  useEffect,
  useRef,
  useState,
} from "react";

import type {
  AccountSession,
} from "../../../types/account";

import AccountIcon from "./AccountSectionIcons";

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

function formatRelativeActivity(
  value: string,
): string {
  const date = new Date(value);
  const difference =
    Date.now() - date.getTime();

  if (Number.isNaN(date.getTime())) {
    return "Activity time unavailable";
  }

  if (difference < 60_000) {
    return "Active just now";
  }

  if (difference < 3_600_000) {
    const minutes = Math.max(
      1,
      Math.round(difference / 60_000),
    );

    return `Active ${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }

  if (difference < 86_400_000) {
    const hours = Math.max(
      1,
      Math.round(difference / 3_600_000),
    );

    return `Active ${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  return `Last used ${formatDate(value)}`;
}

function DeviceIcon({
  type,
}: {
  type: AccountSession["device"]["type"];
}) {
  if (type === "phone") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none">
        <rect x="7" y="2.75" width="10" height="18.5" rx="2.2" stroke="currentColor" strokeWidth="1.7" />
        <path d="M10 5h4M11 18.5h2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === "tablet") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none">
        <rect x="4.5" y="3" width="15" height="18" rx="2.2" stroke="currentColor" strokeWidth="1.7" />
        <path d="M11 18.25h2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none">
      <rect x="3" y="4" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 20h8M12 16v4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
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
  const [openMenuReference, setOpenMenuReference] =
    useState<string | null>(null);

  const containerRef =
    useRef<HTMLDivElement>(null);

  const menuTriggerRefs =
    useRef<Map<string, HTMLButtonElement>>(
      new Map(),
    );

  const menuItemRefs =
    useRef<Map<string, HTMLButtonElement>>(
      new Map(),
    );

  useEffect(() => {
    if (!openMenuReference) {
      return;
    }

    function handlePointerDown(
      event: PointerEvent,
    ) {
      if (
        !containerRef.current?.contains(
          event.target as Node,
        )
      ) {
        setOpenMenuReference(null);
      }
    }

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        const menuReference =
          openMenuReference;

        setOpenMenuReference(null);

        window.setTimeout(() => {
          menuTriggerRefs.current
            .get(menuReference)
            ?.focus();
        }, 0);
      }
    }

    document.addEventListener(
      "pointerdown",
      handlePointerDown,
    );
    document.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        handlePointerDown,
      );
      document.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [openMenuReference]);

  return (
    <section className="w-full rounded-2xl border border-white/10 bg-slate-900/70 shadow-xl shadow-black/15">
      <div className="flex flex-col gap-4 border-b border-white/8 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">
            Where you are signed in
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Up to {maximumActiveSessions} devices can stay signed in.
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-xl border border-white/10 bg-white/[0.035] px-4 text-sm font-semibold text-slate-300 transition hover:border-sky-300/25 hover:bg-sky-400/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 disabled:cursor-wait disabled:opacity-50"
        >
          <AccountIcon
            name="refresh"
            className="h-4 w-4"
          />
          {isLoading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <div
        ref={containerRef}
        className="p-4 sm:p-5"
      >
        {errorMessage && (
          <p
            role="alert"
            className="mb-4 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100"
          >
            {errorMessage}
          </p>
        )}

        {successMessage && (
          <p
            role="status"
            className="mb-4 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100"
          >
            {successMessage}
          </p>
        )}

        {isLoading && sessions.length === 0 ? (
          <div
            role="status"
            className="rounded-xl border border-white/8 bg-slate-950/45 p-4 text-sm text-slate-400"
          >
            Loading your devices…
          </div>
        ) : sessions.length === 0 ? (
          <div className="rounded-xl border border-white/8 bg-slate-950/45 p-4 text-sm text-slate-400">
            No signed-in devices were found.
          </div>
        ) : (
          <div className="divide-y divide-white/8 overflow-visible rounded-xl border border-white/8 bg-slate-950/40">
            {sessions.map((session) => {
              const isRevoking =
                revokingSessionReference ===
                session.sessionReference;

              const isMenuOpen =
                openMenuReference ===
                session.sessionReference;

              return (
                <article
                  key={session.sessionReference}
                  className={`relative flex gap-3.5 p-4 sm:items-center ${
                    session.current
                      ? "bg-sky-400/[0.045]"
                      : ""
                  }`}
                >
                  <span
                    className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border ${
                      session.current
                        ? "border-sky-300/20 bg-sky-400/12 text-sky-200"
                        : "border-white/8 bg-white/[0.035] text-slate-300"
                    }`}
                  >
                    <DeviceIcon
                      type={session.device.type}
                    />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="break-words font-bold text-white">
                        {session.device.label}
                      </h3>

                      {session.current && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2 py-0.5 text-[0.68rem] font-bold text-emerald-200">
                          <AccountIcon
                            name="check"
                            className="h-3.5 w-3.5"
                          />
                          This device
                        </span>
                      )}
                    </div>

                    <p className="mt-0.5 text-sm text-slate-400">
                      {session.device.browser} on {session.device.platform}
                    </p>

                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span title={formatDate(session.lastSeenAt)}>
                        {formatRelativeActivity(session.lastSeenAt)}
                      </span>
                      <span>
                        Signed in {formatDate(session.createdAt)}
                      </span>
                    </div>
                  </div>

                  {!session.current && (
                    <div className="relative shrink-0">
                      <button
                        ref={(node) => {
                          if (node) {
                            menuTriggerRefs.current.set(
                              session.sessionReference,
                              node,
                            );
                          } else {
                            menuTriggerRefs.current.delete(
                              session.sessionReference,
                            );
                          }
                        }}
                        type="button"
                        aria-label={`More options for ${session.device.label}`}
                        aria-haspopup="menu"
                        aria-expanded={isMenuOpen}
                        disabled={isRevoking}
                        onClick={() => {
                          if (isMenuOpen) {
                            setOpenMenuReference(null);
                            return;
                          }

                          setOpenMenuReference(
                            session.sessionReference,
                          );

                          window.setTimeout(() => {
                            menuItemRefs.current
                              .get(session.sessionReference)
                              ?.focus();
                          }, 0);
                        }}
                        className="grid h-10 w-10 place-items-center rounded-xl text-slate-400 transition hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 disabled:cursor-wait disabled:opacity-50"
                      >
                        <AccountIcon
                          name="more"
                          className="h-5 w-5"
                        />
                      </button>

                      {isMenuOpen && (
                        <div
                          role="menu"
                          aria-label={`Session options for ${session.device.label}`}
                          onKeyDown={(event) => {
                            if (event.key === "Tab") {
                              setOpenMenuReference(null);
                              return;
                            }

                            if (
                              event.key === "ArrowDown" ||
                              event.key === "ArrowUp" ||
                              event.key === "Home" ||
                              event.key === "End"
                            ) {
                              event.preventDefault();
                              menuItemRefs.current
                                .get(session.sessionReference)
                                ?.focus();
                            }
                          }}
                          className="absolute right-0 top-[calc(100%+0.35rem)] z-20 w-40 rounded-xl border border-white/10 bg-slate-900 p-1.5 shadow-2xl shadow-black/50"
                        >
                          <button
                            ref={(node) => {
                              if (node) {
                                menuItemRefs.current.set(
                                  session.sessionReference,
                                  node,
                                );
                              } else {
                                menuItemRefs.current.delete(
                                  session.sessionReference,
                                );
                              }
                            }}
                            type="button"
                            role="menuitem"
                            disabled={isRevoking}
                            onClick={() => {
                              menuTriggerRefs.current
                                .get(session.sessionReference)
                                ?.focus();
                              setOpenMenuReference(null);
                              onRevoke(session);
                            }}
                            className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-rose-200 transition hover:bg-rose-400/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 disabled:cursor-wait disabled:opacity-50"
                          >
                            {isRevoking
                              ? "Ending…"
                              : "End session"}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export default SessionManager;
