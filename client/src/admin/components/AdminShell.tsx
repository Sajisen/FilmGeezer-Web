import {
  useState,
  type ReactNode,
} from "react";
import {
  NavLink,
  Outlet,
} from "react-router";

import { getPublicAppOrigin } from "../adminRuntime";
import { useAdminAuth } from "../auth/adminAuthContext";

const NAVIGATION_ITEMS = [
  { to: "/", label: "Overview", end: true },
  { to: "/support", label: "Support" },
  { to: "/users", label: "Users" },
  { to: "/content", label: "Content" },
  { to: "/audit", label: "Audit" },
  { to: "/settings", label: "Settings" },
] as const;

function AdminMark() {
  return (
    <span className="grid h-10 w-10 place-items-center rounded-xl border border-sky-300/20 bg-sky-400/10 text-sm font-black text-sky-200">
      FG
    </span>
  );
}

function SidebarContent({
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
  const { user } = useAdminAuth();

  return (
    <>
      <div className="border-b border-white/8 px-5 py-5">
        <div className="flex items-center gap-3">
          <AdminMark />
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-white">FilmGeezer</p>
            <p className="truncate text-xs font-bold uppercase tracking-[0.16em] text-sky-300">
              Administration
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Administrator navigation">
        {NAVIGATION_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={"end" in item ? item.end : false}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex min-h-11 items-center rounded-xl px-3.5 text-sm font-bold transition ${
                isActive
                  ? "bg-sky-400/12 text-sky-100"
                  : "text-slate-400 hover:bg-white/[0.04] hover:text-white"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/8 p-4">
        <div className="rounded-2xl border border-white/8 bg-slate-950/35 px-4 py-3">
          <p className="truncate text-sm font-bold text-white">
            {user?.displayName ?? "Administrator"}
          </p>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {user?.email}
          </p>
        </div>
      </div>
    </>
  );
}

export default function AdminShell({
  children,
}: {
  children?: ReactNode;
}) {
  const { user, signOut } = useAdminAuth();
  const [isMobileNavigationOpen, setIsMobileNavigationOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);

    try {
      await signOut();
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-white/8 bg-slate-950/95 backdrop-blur-xl lg:flex">
        <SidebarContent />
      </aside>

      {isMobileNavigationOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close administrator navigation"
            onClick={() => setIsMobileNavigationOpen(false)}
            className="absolute inset-0 bg-black/65 backdrop-blur-sm"
          />
          <aside className="relative flex h-full w-[min(19rem,88vw)] flex-col border-r border-white/10 bg-slate-950 shadow-2xl shadow-black/50">
            <SidebarContent onNavigate={() => setIsMobileNavigationOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-white/8 bg-slate-950/88 backdrop-blur-xl">
          <div className="mx-auto flex min-h-16 max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                aria-label="Open administrator navigation"
                onClick={() => setIsMobileNavigationOpen(true)}
                className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-slate-300 transition hover:bg-white/[0.04] hover:text-white lg:hidden"
              >
                <span aria-hidden="true">☰</span>
              </button>
              <div className="min-w-0">
                <p className="truncate text-xs font-black uppercase tracking-[0.2em] text-sky-300">
                  Secure operations
                </p>
                <p className="truncate text-sm font-bold text-slate-300">
                  Signed in as {user?.displayName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={getPublicAppOrigin()}
                className="hidden min-h-10 items-center rounded-full border border-white/10 px-4 text-sm font-bold text-slate-300 transition hover:bg-white/[0.04] hover:text-white sm:inline-flex"
              >
                Public site
              </a>
              <button
                type="button"
                onClick={() => void handleSignOut()}
                disabled={isSigningOut}
                className="min-h-10 rounded-full border border-red-300/15 bg-red-400/[0.05] px-4 text-sm font-bold text-red-100 transition hover:bg-red-400/10 disabled:opacity-50"
              >
                {isSigningOut ? "Signing out…" : "Sign out"}
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-[1440px] px-4 py-7 sm:px-6 sm:py-9 lg:px-8">
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  );
}
