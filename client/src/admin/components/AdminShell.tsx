import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  NavLink,
  Outlet,
  useLocation,
} from "react-router";

import ProfileAvatar from "../../components/ProfileAvatar";
import { getPublicAppOrigin } from "../adminRuntime";
import { useAdminAuth } from "../auth/adminAuthContext";
import AdminIcon, { type AdminIconName } from "./AdminIcon";

interface NavigationItem {
  to: string;
  label: string;
  description: string;
  icon: AdminIconName;
  end?: boolean;
  planned?: boolean;
}

const WORKSPACE_ITEMS: NavigationItem[] = [
  {
    to: "/",
    label: "Overview",
    description: "Operational summary",
    icon: "overview",
    end: true,
  },
  {
    to: "/support",
    label: "Support",
    description: "Contact conversations",
    icon: "support",
  },
  {
    to: "/users",
    label: "Users",
    description: "Accounts and access",
    icon: "users",
    planned: true,
  },
  {
    to: "/content",
    label: "Content",
    description: "Links and catalogue",
    icon: "content",
    planned: true,
  },
];

const SYSTEM_ITEMS: NavigationItem[] = [
  {
    to: "/audit",
    label: "Audit",
    description: "Security activity",
    icon: "audit",
    planned: true,
  },
  {
    to: "/settings",
    label: "Security",
    description: "Passkeys and MFA",
    icon: "settings",
  },
];

const ROUTE_TITLES: Array<{ prefix: string; title: string }> = [
  { prefix: "/support", title: "Support inbox" },
  { prefix: "/users", title: "User administration" },
  { prefix: "/content", title: "Content operations" },
  { prefix: "/audit", title: "Audit records" },
  { prefix: "/settings", title: "Administrator security" },
  { prefix: "/", title: "Operations overview" },
];

function AdminMark() {
  return (
    <span className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-2xl border border-sky-300/20 bg-sky-400/10 shadow-lg shadow-sky-950/30">
      <img
        src="/filmgeezer-logo7.png"
        alt=""
        className="h-full w-full object-cover"
      />
      <span className="sr-only">FilmGeezer</span>
    </span>
  );
}

function NavigationGroup({
  label,
  items,
  onNavigate,
}: {
  label: string;
  items: NavigationItem[];
  onNavigate?: () => void;
}) {
  return (
    <div>
      <p className="px-3 text-[0.62rem] font-black uppercase tracking-[0.22em] text-slate-600">
        {label}
      </p>
      <div className="mt-2 space-y-1">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `group relative flex min-h-[3.35rem] items-center gap-3 rounded-2xl border px-3 py-2.5 transition duration-200 ${
                isActive
                  ? "border-sky-300/15 bg-sky-400/[0.1] text-white shadow-lg shadow-sky-950/10"
                  : "border-transparent text-slate-400 hover:border-white/[0.06] hover:bg-white/[0.035] hover:text-slate-100"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border transition ${
                    isActive
                      ? "border-sky-300/20 bg-sky-400/12 text-sky-200"
                      : "border-white/[0.06] bg-slate-950/30 text-slate-500 group-hover:text-slate-300"
                  }`}
                >
                  <AdminIcon name={item.icon} className="h-[1.1rem] w-[1.1rem]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-black">
                      {item.label}
                    </span>
                    {item.planned ? (
                      <span className="rounded-full border border-white/[0.07] bg-slate-950/35 px-1.5 py-0.5 text-[0.52rem] font-black uppercase tracking-[0.12em] text-slate-600">
                        Soon
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-0.5 block truncate text-[0.68rem] font-medium text-slate-600 transition group-hover:text-slate-500">
                    {item.description}
                  </span>
                </span>
                <AdminIcon
                  name="chevronRight"
                  className={`h-4 w-4 shrink-0 transition ${
                    isActive
                      ? "translate-x-0 text-sky-300"
                      : "-translate-x-1 text-transparent group-hover:translate-x-0 group-hover:text-slate-600"
                  }`}
                />
              </>
            )}
          </NavLink>
        ))}
      </div>
    </div>
  );
}

function SidebarContent({
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
  const { user, security } = useAdminAuth();
  const securityLabel = security?.passkeysConfigured
    ? `${security.passkeyCount} passkey${security.passkeyCount === 1 ? "" : "s"}`
    : security?.mfaEnabled
      ? "Authenticator MFA"
      : "Password only";

  return (
    <>
      <div className="border-b border-white/[0.06] px-5 py-5">
        <div className="flex items-center gap-3">
          <AdminMark />
          <div className="min-w-0">
            <p className="truncate text-[0.95rem] font-black tracking-tight text-white">
              FilmGeezer
            </p>
            <p className="mt-0.5 truncate text-[0.62rem] font-black uppercase tracking-[0.2em] text-sky-300">
              Administration
            </p>
          </div>
        </div>
      </div>

      <nav
        className="admin-sidebar-scrollbar flex-1 space-y-6 overflow-y-auto px-3 py-5"
        aria-label="Administrator navigation"
      >
        <NavigationGroup
          label="Workspace"
          items={WORKSPACE_ITEMS}
          onNavigate={onNavigate}
        />
        <NavigationGroup
          label="System"
          items={SYSTEM_ITEMS}
          onNavigate={onNavigate}
        />
      </nav>

      <div className="border-t border-white/[0.06] p-3.5">
        <div className="rounded-2xl border border-white/[0.07] bg-slate-950/40 p-3">
          <div className="flex items-center gap-3">
            <ProfileAvatar
              displayName={user?.displayName ?? "Administrator"}
              profileImagePath={user?.profileImagePath ?? null}
              className="h-10 w-10"
              initialsClassName="text-xs"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black text-white">
                {user?.displayName ?? "Administrator"}
              </p>
              <p className="mt-0.5 truncate text-[0.68rem] text-slate-500">
                {user?.email}
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-300/10 bg-emerald-400/[0.055] px-3 py-2">
            <span className="grid h-6 w-6 place-items-center rounded-lg bg-emerald-400/10 text-emerald-300">
              <AdminIcon name="shield" className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0">
              <p className="text-[0.61rem] font-black uppercase tracking-[0.14em] text-emerald-300">
                Protected session
              </p>
              <p className="truncate text-[0.68rem] text-emerald-100/70">
                {securityLabel}
              </p>
            </div>
          </div>
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
  const { pathname } = useLocation();
  const { user, security, signOut } = useAdminAuth();
  const [isMobileNavigationOpen, setIsMobileNavigationOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const pageTitle = useMemo(
    () =>
      ROUTE_TITLES.find(({ prefix }) =>
        prefix === "/" ? pathname === "/" : pathname.startsWith(prefix),
      )?.title ?? "Administration",
    [pathname],
  );


  useEffect(() => {
    if (!isMobileNavigationOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMobileNavigationOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobileNavigationOpen]);

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
    <div className="admin-app-background min-h-screen text-white">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col border-r border-white/[0.06] bg-[#030b1a]/95 shadow-2xl shadow-black/20 backdrop-blur-2xl lg:flex">
        <SidebarContent />
      </aside>

      {isMobileNavigationOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close administrator navigation"
            onClick={() => setIsMobileNavigationOpen(false)}
            className="absolute inset-0 bg-[#010714]/80 backdrop-blur-sm"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Administrator navigation"
            className="relative flex h-full w-[min(20rem,90vw)] flex-col border-r border-white/10 bg-[#030b1a] shadow-2xl shadow-black/60"
          >
            <button
              type="button"
              aria-label="Close administrator navigation"
              onClick={() => setIsMobileNavigationOpen(false)}
              className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-xl border border-white/[0.08] bg-slate-950/55 text-slate-400 transition hover:text-white"
            >
              <AdminIcon name="close" className="h-4 w-4" />
            </button>
            <SidebarContent onNavigate={() => setIsMobileNavigationOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#020817]/82 backdrop-blur-2xl">
          <div className="mx-auto flex min-h-[4.5rem] max-w-[1520px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 xl:px-10">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                aria-label="Open administrator navigation"
                aria-expanded={isMobileNavigationOpen}
                onClick={() => setIsMobileNavigationOpen(true)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/[0.08] bg-slate-950/35 text-slate-300 transition hover:border-sky-300/20 hover:text-white lg:hidden"
              >
                <AdminIcon name="menu" className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[0.62rem] font-black uppercase tracking-[0.18em] text-slate-600">
                  <span>Administration</span>
                  <span aria-hidden="true">/</span>
                  <span className="truncate text-sky-300">{pageTitle}</span>
                </div>
                <p className="mt-1 truncate text-sm font-bold text-slate-300">
                  Secure operational workspace
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <span className="hidden items-center gap-2 rounded-full border border-emerald-300/10 bg-emerald-400/[0.055] px-3 py-2 text-xs font-bold text-emerald-200 sm:inline-flex">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.65)]" />
                {security?.passkeysConfigured
                  ? "Passkey ready"
                  : security?.mfaEnabled
                    ? "MFA active"
                    : "Session active"}
              </span>
              <a
                href={getPublicAppOrigin()}
                className="hidden min-h-10 items-center gap-2 rounded-xl border border-white/[0.08] bg-slate-950/30 px-3.5 text-xs font-black text-slate-300 transition hover:border-white/[0.14] hover:bg-white/[0.04] hover:text-white md:inline-flex"
              >
                Public site
                <AdminIcon name="external" className="h-3.5 w-3.5" />
              </a>
              <div className="hidden h-7 w-px bg-white/[0.07] sm:block" />
              <ProfileAvatar
                displayName={user?.displayName ?? "Administrator"}
                profileImagePath={user?.profileImagePath ?? null}
                className="hidden h-9 w-9 sm:grid"
                initialsClassName="text-[0.65rem]"
              />
              <button
                type="button"
                onClick={() => void handleSignOut()}
                disabled={isSigningOut}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-red-300/10 bg-red-400/[0.045] px-3.5 text-xs font-black text-red-100 transition hover:border-red-300/20 hover:bg-red-400/[0.09] disabled:cursor-wait disabled:opacity-50"
              >
                <AdminIcon name="logout" className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {isSigningOut ? "Signing out…" : "Sign out"}
                </span>
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto min-h-[calc(100vh-4.5rem)] max-w-[1520px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-10 xl:py-9">
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  );
}
