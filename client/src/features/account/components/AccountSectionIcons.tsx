interface AccountIconProps {
  name:
    | "overview"
    | "profile"
    | "security"
    | "devices"
    | "mail"
    | "key"
    | "check"
    | "clock"
    | "calendar"
    | "logout"
    | "warning"
    | "chevron"
    | "refresh"
    | "edit"
    | "shield"
    | "account"
    | "more";
  className?: string;
}

function AccountIcon({
  name,
  className = "h-5 w-5",
}: AccountIconProps) {
  const commonProps = {
    viewBox: "0 0 24 24",
    "aria-hidden": true,
    className,
    fill: "none",
  } as const;

  if (name === "overview") {
    return (
      <svg {...commonProps}>
        <rect x="3.25" y="3.25" width="7.25" height="7.25" rx="2" stroke="currentColor" strokeWidth="1.7" />
        <rect x="13.5" y="3.25" width="7.25" height="7.25" rx="2" stroke="currentColor" strokeWidth="1.7" />
        <rect x="3.25" y="13.5" width="7.25" height="7.25" rx="2" stroke="currentColor" strokeWidth="1.7" />
        <rect x="13.5" y="13.5" width="7.25" height="7.25" rx="2" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    );
  }

  if (name === "profile") {
    return (
      <svg {...commonProps}>
        <circle cx="12" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.7" />
        <path d="M5.5 20c.65-4 2.85-6 6.5-6s5.85 2 6.5 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "security" || name === "shield") {
    return (
      <svg {...commonProps}>
        <path d="M12 3.5 19 6v5.4c0 4.45-2.75 7.75-7 9.1-4.25-1.35-7-4.65-7-9.1V6l7-2.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="m8.8 12 2.05 2.05 4.35-4.35" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === "devices") {
    return (
      <svg {...commonProps}>
        <rect x="3" y="4" width="15" height="10" rx="2" stroke="currentColor" strokeWidth="1.7" />
        <path d="M7 18h7M10.5 14v4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        <rect x="16" y="8" width="5" height="11" rx="1.5" fill="#020617" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    );
  }

  if (name === "account") {
    return (
      <svg {...commonProps}>
        <rect x="4" y="3.5" width="16" height="17" rx="3" stroke="currentColor" strokeWidth="1.7" />
        <path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "more") {
    return (
      <svg {...commonProps}>
        <circle cx="5" cy="12" r="1.25" fill="currentColor" />
        <circle cx="12" cy="12" r="1.25" fill="currentColor" />
        <circle cx="19" cy="12" r="1.25" fill="currentColor" />
      </svg>
    );
  }

  if (name === "mail") {
    return (
      <svg {...commonProps}>
        <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.7" />
        <path d="m4.5 7 7.5 6 7.5-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === "key") {
    return (
      <svg {...commonProps}>
        <circle cx="8.5" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.7" />
        <path d="M13 12h8M18 12v3M15.5 12v2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "check") {
    return (
      <svg {...commonProps}>
        <path d="m5 12.5 4.25 4.25L19 7" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === "clock") {
    return (
      <svg {...commonProps}>
        <circle cx="12" cy="12" r="8.75" stroke="currentColor" strokeWidth="1.7" />
        <path d="M12 7.5v5l3.5 2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === "calendar") {
    return (
      <svg {...commonProps}>
        <rect x="3.5" y="5.25" width="17" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.7" />
        <path d="M7.5 3v4.5M16.5 3v4.5M3.5 9.5h17" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "logout") {
    return (
      <svg {...commonProps}>
        <path d="M10 4H5.5A2.5 2.5 0 0 0 3 6.5v11A2.5 2.5 0 0 0 5.5 20H10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        <path d="M14.5 8 19 12l-4.5 4M8 12h11" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === "warning") {
    return (
      <svg {...commonProps}>
        <path d="M10.1 4.75 2.9 17.2A2 2 0 0 0 4.63 20h14.74a2 2 0 0 0 1.73-2.8L13.9 4.75a2.2 2.2 0 0 0-3.8 0Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M12 9v4M12 16.5h.01" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "refresh") {
    return (
      <svg {...commonProps}>
        <path d="M19.5 8.5A8 8 0 1 0 20 14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        <path d="M19.5 4.5v4h-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === "edit") {
    return (
      <svg {...commonProps}>
        <path d="m4 20 4.2-.9L19 8.3a2.15 2.15 0 0 0-3.05-3.05L5.15 16.05 4 20Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="m14.5 6.7 2.8 2.8" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <path d="m9 5 7 7-7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default AccountIcon;
