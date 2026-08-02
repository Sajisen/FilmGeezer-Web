import {
  useEffect,
  useRef,
  useState,
  type ComponentType,
} from "react";

import {
  NavLink,
} from "react-router";

import {
  ContactIcon,
  InfoIcon,
  LogOutIcon,
  SettingsIcon,
  UserIcon,
} from "./NavigationIcons";

import {
  useAuth,
} from "../../features/auth/authContext";

import ProfileAvatar from "../ProfileAvatar";

interface MenuLinkDefinition {
  label: string;
  to: string;
  icon: ComponentType<{
    className?: string;
  }>;
}

const ACCOUNT_LINKS: MenuLinkDefinition[] = [
  {
    label: "Profile",
    to: "/account?section=profile",
    icon: UserIcon,
  },
  {
    label: "Settings",
    to: "/account?section=security",
    icon: SettingsIcon,
  },
];

const SUPPORT_LINKS: MenuLinkDefinition[] = [
  {
    label: "Contact us",
    to: "/contact",
    icon: ContactIcon,
  },
  {
    label: "About FilmGeezer",
    to: "/about",
    icon: InfoIcon,
  },
];

function ProfileMenu() {
  const auth = useAuth();

  const [isOpen, setIsOpen] =
    useState(false);

  const [isSigningOut, setIsSigningOut] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const containerRef =
    useRef<HTMLDivElement>(null);

  const menuRef =
    useRef<HTMLDivElement>(null);

  const triggerRef =
    useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) {
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
        setIsOpen(false);
      }
    }

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
        return;
      }

      if (
        event.key !== "Tab" ||
        !menuRef.current
      ) {
        return;
      }

      const focusableElements =
        Array.from(
          menuRef.current.querySelectorAll<HTMLElement>(
            [
              "a[href]",
              "button:not([disabled])",
            ].join(","),
          ),
        );

      const firstElement =
        focusableElements[0];

      const lastElement =
        focusableElements[
          focusableElements.length - 1
        ];

      if (!firstElement || !lastElement) {
        return;
      }

      if (
        event.shiftKey &&
        document.activeElement === firstElement
      ) {
        event.preventDefault();
        lastElement.focus();
      } else if (
        !event.shiftKey &&
        document.activeElement === lastElement
      ) {
        event.preventDefault();
        firstElement.focus();
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

    window.setTimeout(() => {
      menuRef.current
        ?.querySelector<HTMLElement>(
          "a[href], button:not([disabled])",
        )
        ?.focus();
    }, 0);

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
  }, [isOpen]);

  if (
    auth.status !== "authenticated" ||
    !auth.user
  ) {
    return null;
  }

  async function handleSignOut() {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);
    setErrorMessage(null);

    try {
      await auth.signOut();
      setIsOpen(false);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "FilmGeezer could not sign you out.",
      );
    } finally {
      setIsSigningOut(false);
    }
  }

  function closeMenu() {
    setIsOpen(false);
  }

  function renderLinks(
    links: MenuLinkDefinition[],
  ) {
    return links.map((item) => {
      const Icon = item.icon;

      return (
        <NavLink
          key={item.to}
          to={item.to}
          role="menuitem"
          onClick={closeMenu}
          className="group flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.055] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/8 bg-white/[0.035] text-slate-400 transition group-hover:border-sky-300/15 group-hover:text-sky-300">
            <Icon className="h-4.5 w-4.5" />
          </span>
          <span>{item.label}</span>
        </NavLink>
      );
    });
  }

  return (
    <div
      ref={containerRef}
      className="relative hidden sm:block"
    >
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          setIsOpen((current) => !current);
        }}
        aria-label="Open account menu"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        title={auth.user.displayName}
        className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-sky-400 to-blue-600 p-0.5 text-white shadow-md shadow-sky-950/30 transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200"
      >
        <ProfileAvatar
          displayName={auth.user.displayName}
          profileImagePath={auth.user.profileImagePath}
          alt=""
          className="h-9 w-9 border-white/15 shadow-none"
          initialsClassName="text-xs tracking-wide"
        />
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="FilmGeezer account"
          className="absolute right-0 top-[calc(100%+0.75rem)] z-[70] w-[19rem] overflow-hidden rounded-2xl border border-white/10 bg-slate-900/98 p-2 shadow-2xl shadow-black/60 backdrop-blur-xl"
        >
          <NavLink
            to="/account?section=profile"
            role="menuitem"
            onClick={closeMenu}
            className="group block rounded-xl bg-slate-950/65 p-3.5 transition hover:bg-slate-950/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
          >
            <span className="flex items-center gap-3">
              <ProfileAvatar
                displayName={auth.user.displayName}
                profileImagePath={auth.user.profileImagePath}
                alt=""
                className="h-11 w-11 border-white/15 shadow-lg shadow-sky-950/25"
                initialsClassName="text-sm"
              />

              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold text-white">
                  {auth.user.displayName}
                </span>
                <span className="mt-0.5 block truncate text-xs text-slate-400">
                  {auth.user.email}
                </span>
              </span>

              <span className="text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-sky-300">
                →
              </span>
            </span>
          </NavLink>

          <div className="mt-2 grid gap-0.5">
            {renderLinks(ACCOUNT_LINKS)}
          </div>

          <div className="my-2 border-t border-white/8" />

          <div className="grid gap-0.5">
            {renderLinks(SUPPORT_LINKS)}
          </div>

          {errorMessage && (
            <p
              role="alert"
              className="mx-1 mt-2 rounded-xl bg-rose-400/10 px-3 py-2 text-xs leading-5 text-rose-200"
            >
              {errorMessage}
            </p>
          )}

          <div className="mt-2 border-t border-white/8 pt-2">
            <button
              type="button"
              role="menuitem"
              disabled={isSigningOut}
              onClick={() => {
                void handleSignOut();
              }}
              className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold text-rose-200 transition hover:bg-rose-400/10 hover:text-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 disabled:cursor-wait disabled:opacity-50"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-rose-300/10 bg-rose-400/[0.06]">
                <LogOutIcon className="h-4.5 w-4.5" />
              </span>
              {isSigningOut
                ? "Signing out…"
                : "Sign out"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfileMenu;
