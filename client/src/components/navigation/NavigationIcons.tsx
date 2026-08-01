import type { ReactNode } from "react";

interface NavigationIconProps {
  className?: string;
}

function IconShell({
  children,
  className,
}: NavigationIconProps & {
  children: ReactNode;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
    >
      {children}
    </svg>
  );
}

export function MenuIcon({
  className = "h-6 w-6",
}: NavigationIconProps) {
  return (
    <IconShell className={className}>
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </IconShell>
  );
}

export function CloseIcon({
  className = "h-6 w-6",
}: NavigationIconProps) {
  return (
    <IconShell className={className}>
      <path
        d="m6 6 12 12M18 6 6 18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </IconShell>
  );
}

export function BookmarkIcon({
  className = "h-5 w-5",
}: NavigationIconProps) {
  return (
    <IconShell className={className}>
      <path
        d="M6.75 4.75A1.75 1.75 0 0 1 8.5 3h7a1.75 1.75 0 0 1 1.75 1.75v15l-5.25-3.5-5.25 3.5v-15Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </IconShell>
  );
}

export function UserIcon({
  className = "h-5 w-5",
}: NavigationIconProps) {
  return (
    <IconShell className={className}>
      <path
        d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7 8a7 7 0 0 0-14 0"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </IconShell>
  );
}

export function SearchIcon({
  className = "h-5 w-5",
}: NavigationIconProps) {
  return (
    <IconShell className={className}>
      <circle
        cx="11"
        cy="11"
        r="6.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="m16 16 4 4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </IconShell>
  );
}

export function ArrowRightIcon({
  className = "h-4 w-4",
}: NavigationIconProps) {
  return (
    <IconShell className={className}>
      <path
        d="M5 12h14m-5-5 5 5-5 5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </IconShell>
  );
}

export function FilterIcon({
  className = "h-5 w-5",
}: NavigationIconProps) {
  return (
    <IconShell className={className}>
      <path
        d="M4 6h16M7 12h10M10 18h4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </IconShell>
  );
}

export function SettingsIcon({
  className = "h-5 w-5",
}: NavigationIconProps) {
  return (
    <IconShell className={className}>
      <circle
        cx="12"
        cy="12"
        r="3.1"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M19 13.25v-2.5l-2.02-.56a7.1 7.1 0 0 0-.62-1.5l1.04-1.83-1.77-1.77-1.83 1.04a7.1 7.1 0 0 0-1.5-.62L11.75 3h-2.5l-.56 2.02a7.1 7.1 0 0 0-1.5.62L5.36 4.6 3.6 6.37 4.63 8.2a7.1 7.1 0 0 0-.62 1.5L2 10.25v2.5l2.02.56c.14.52.35 1.02.62 1.5L3.6 16.64l1.77 1.77 1.83-1.04c.48.27.98.48 1.5.62L9.25 21h2.5l.56-2.02c.52-.14 1.02-.35 1.5-.62l1.83 1.04 1.77-1.77-1.04-1.83c.27-.48.48-.98.62-1.5L19 13.25Z"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </IconShell>
  );
}

export function ContactIcon({
  className = "h-5 w-5",
}: NavigationIconProps) {
  return (
    <IconShell className={className}>
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="m4.5 7 7.5 6 7.5-6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </IconShell>
  );
}

export function InfoIcon({
  className = "h-5 w-5",
}: NavigationIconProps) {
  return (
    <IconShell className={className}>
      <circle
        cx="12"
        cy="12"
        r="8.75"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M12 10.5v5M12 7.5h.01"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </IconShell>
  );
}

export function LogOutIcon({
  className = "h-5 w-5",
}: NavigationIconProps) {
  return (
    <IconShell className={className}>
      <path
        d="M10 4H5.5A2.5 2.5 0 0 0 3 6.5v11A2.5 2.5 0 0 0 5.5 20H10"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M14.5 8 19 12l-4.5 4M8 12h11"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </IconShell>
  );
}
