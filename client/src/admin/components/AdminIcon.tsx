import type { SVGProps } from "react";

export type AdminIconName =
  | "activity"
  | "alert"
  | "arrowUpRight"
  | "audit"
  | "check"
  | "chevronRight"
  | "clock"
  | "copy"
  | "close"
  | "content"
  | "device"
  | "external"
  | "filter"
  | "lock"
  | "inbox"
  | "key"
  | "logout"
  | "mail"
  | "menu"
  | "overview"
  | "refresh"
  | "search"
  | "send"
  | "settings"
  | "shield"
  | "support"
  | "unlock"
  | "userBlock"
  | "users";

interface AdminIconProps extends SVGProps<SVGSVGElement> {
  name: AdminIconName;
}

export default function AdminIcon({
  name,
  className = "h-5 w-5",
  ...props
}: AdminIconProps) {
  const commonProps = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    className,
    ...props,
  };

  switch (name) {
    case "activity":
      return (
        <svg {...commonProps}>
          <path d="M3 12h4l2.2-6 4.2 12 2.1-6H21" />
        </svg>
      );
    case "alert":
      return (
        <svg {...commonProps}>
          <path d="M10.3 3.6 2.4 17.3A2 2 0 0 0 4.1 20h15.8a2 2 0 0 0 1.7-2.7L13.7 3.6a2 2 0 0 0-3.4 0Z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
      );
    case "arrowUpRight":
      return (
        <svg {...commonProps}>
          <path d="M7 17 17 7" />
          <path d="M8 7h9v9" />
        </svg>
      );
    case "audit":
      return (
        <svg {...commonProps}>
          <path d="M9 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-3" />
          <path d="M9 3h6v4H9z" />
          <path d="m14.5 12.5 1.5 1.5 4-4" />
          <path d="M8 12h3" />
          <path d="M8 16h4" />
        </svg>
      );
    case "check":
      return (
        <svg {...commonProps}>
          <path d="m5 12 4 4L19 6" />
        </svg>
      );
    case "chevronRight":
      return (
        <svg {...commonProps}>
          <path d="m9 18 6-6-6-6" />
        </svg>
      );
    case "close":
      return (
        <svg {...commonProps}>
          <path d="m6 6 12 12" />
          <path d="M18 6 6 18" />
        </svg>
      );
    case "clock":
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
    case "copy":
      return (
        <svg {...commonProps}>
          <rect x="8" y="8" width="11" height="11" rx="2" />
          <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
        </svg>
      );
    case "content":
      return (
        <svg {...commonProps}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m10 9 5 3-5 3Z" />
        </svg>
      );
    case "device":
      return (
        <svg {...commonProps}>
          <rect x="4" y="3" width="16" height="13" rx="2" />
          <path d="M8 21h8" />
          <path d="M12 16v5" />
        </svg>
      );
    case "external":
      return (
        <svg {...commonProps}>
          <path d="M15 3h6v6" />
          <path d="m10 14 11-11" />
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        </svg>
      );
    case "filter":
      return (
        <svg {...commonProps}>
          <path d="M4 5h16" />
          <path d="M7 12h10" />
          <path d="M10 19h4" />
        </svg>
      );
    case "inbox":
      return (
        <svg {...commonProps}>
          <path d="M4 4h16v13a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3Z" />
          <path d="M4 14h4l2 3h4l2-3h4" />
        </svg>
      );
    case "key":
      return (
        <svg {...commonProps}>
          <circle cx="8.5" cy="10.5" r="4.5" />
          <path d="m12 13.5 8 7" />
          <path d="m17 17 2-2" />
        </svg>
      );
    case "lock":
      return (
        <svg {...commonProps}>
          <rect x="4" y="10" width="16" height="11" rx="2" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </svg>
      );
    case "logout":
      return (
        <svg {...commonProps}>
          <path d="M10 17 15 12 10 7" />
          <path d="M15 12H3" />
          <path d="M15 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
        </svg>
      );
    case "mail":
      return (
        <svg {...commonProps}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m4 7 8 6 8-6" />
        </svg>
      );
    case "menu":
      return (
        <svg {...commonProps}>
          <path d="M4 7h16" />
          <path d="M4 12h16" />
          <path d="M4 17h16" />
        </svg>
      );
    case "overview":
      return (
        <svg {...commonProps}>
          <rect x="3" y="3" width="7" height="7" rx="2" />
          <rect x="14" y="3" width="7" height="7" rx="2" />
          <rect x="3" y="14" width="7" height="7" rx="2" />
          <rect x="14" y="14" width="7" height="7" rx="2" />
        </svg>
      );
    case "refresh":
      return (
        <svg {...commonProps}>
          <path d="M20 6v5h-5" />
          <path d="M4 18v-5h5" />
          <path d="M18.5 9A7 7 0 0 0 6.7 6.7L4 11" />
          <path d="M5.5 15A7 7 0 0 0 17.3 17.3L20 13" />
        </svg>
      );
    case "search":
      return (
        <svg {...commonProps}>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4-4" />
        </svg>
      );
    case "send":
      return (
        <svg {...commonProps}>
          <path d="m22 2-7 20-4-9-9-4Z" />
          <path d="M22 2 11 13" />
        </svg>
      );
    case "settings":
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
        </svg>
      );
    case "shield":
      return (
        <svg {...commonProps}>
          <path d="M12 3 5 6v5c0 4.7 2.8 8 7 10 4.2-2 7-5.3 7-10V6Z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );
    case "support":
      return (
        <svg {...commonProps}>
          <path d="M4 5h16v11H8l-4 4Z" />
          <path d="M8 9h8" />
          <path d="M8 12h5" />
        </svg>
      );
    case "unlock":
      return (
        <svg {...commonProps}>
          <rect x="4" y="10" width="16" height="11" rx="2" />
          <path d="M8 10V7a4 4 0 0 1 7.4-2.1" />
        </svg>
      );
    case "userBlock":
      return (
        <svg {...commonProps}>
          <circle cx="9" cy="7" r="4" />
          <path d="M2 21v-2a4 4 0 0 1 4-4h5" />
          <circle cx="17" cy="17" r="4" />
          <path d="m14.2 14.2 5.6 5.6" />
        </svg>
      );
    case "users":
      return (
        <svg {...commonProps}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.9" />
          <path d="M16 3.1a4 4 0 0 1 0 7.8" />
        </svg>
      );
  }
}
