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

export function BellIcon({
  className = "h-5 w-5",
}: NavigationIconProps) {
  return (
    <IconShell className={className}>
      <path
        d="M6.75 9.5a5.25 5.25 0 0 1 10.5 0c0 5.75 2.25 6.25 2.25 6.25h-15S6.75 15.25 6.75 9.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 19h4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
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
      <path
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6h.08A1.65 1.65 0 0 0 10 3.09V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9v.08A1.65 1.65 0 0 0 20.91 10H21a2 2 0 1 1 0 4h-.09A1.65 1.65 0 0 0 19.4 15Z"
        stroke="currentColor"
        strokeWidth="1.55"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="12"
        cy="12"
        r="3"
        stroke="currentColor"
        strokeWidth="1.7"
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

export function CheckIcon({
  className = "h-5 w-5",
}: NavigationIconProps) {
  return (
    <IconShell className={className}>
      <path
        d="m5 12.5 4.25 4.25L19 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </IconShell>
  );
}

export function WarningIcon({
  className = "h-5 w-5",
}: NavigationIconProps) {
  return (
    <IconShell className={className}>
      <path
        d="M10.5 4.75 3.6 17a1.5 1.5 0 0 0 1.3 2.25h14.2A1.5 1.5 0 0 0 20.4 17L13.5 4.75a1.72 1.72 0 0 0-3 0Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M12 9v4.25M12 16.5h.01"
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
