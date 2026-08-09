export type AccountTab =
  | "profile"
  | "security"
  | "devices"
  | "account";

export type AccountSectionIcon =
  | "profile"
  | "security"
  | "devices"
  | "account";

export interface AccountSectionDefinition {
  id: AccountTab;
  label: string;
  description: string;
  icon: AccountSectionIcon;
}

export const ACCOUNT_SECTIONS = [
  {
    id: "profile",
    label: "Profile",
    description: "Your name and profile",
    icon: "profile",
  },
  {
    id: "security",
    label: "Security",
    description: "Email and password",
    icon: "security",
  },
  {
    id: "devices",
    label: "Your devices",
    description: "Where you are signed in",
    icon: "devices",
  },
  {
    id: "account",
    label: "Account",
    description: "Email preferences and account controls",
    icon: "account",
  },
] as const satisfies readonly AccountSectionDefinition[];

export function isAccountTab(
  value: string | null,
): value is AccountTab {
  return ACCOUNT_SECTIONS.some(
    (section) => section.id === value,
  );
}

export function getAccountSection(
  tab: AccountTab,
): AccountSectionDefinition {
  return (
    ACCOUNT_SECTIONS.find(
      (section) => section.id === tab,
    ) ?? ACCOUNT_SECTIONS[0]
  );
}
