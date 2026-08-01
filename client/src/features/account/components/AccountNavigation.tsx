import {
  ACCOUNT_SECTIONS,
  type AccountTab,
} from "../accountNavigation";

import AccountIcon from "./AccountSectionIcons";

interface AccountNavigationProps {
  activeTab: AccountTab;
  onChange(tab: AccountTab): void;
}

function AccountNavigation({
  activeTab,
  onChange,
}: AccountNavigationProps) {
  return (
    <nav
      aria-label="Account sections"
      className="rounded-2xl border border-white/10 bg-slate-900/70 p-2 shadow-xl shadow-black/15"
    >
      <div className="grid grid-cols-2 gap-1.5 lg:flex lg:flex-col lg:gap-1">
        {ACCOUNT_SECTIONS.map((section) => {
          const isActive = activeTab === section.id;

          return (
            <button
              key={section.id}
              type="button"
              aria-current={isActive ? "page" : undefined}
              onClick={() => {
                onChange(section.id);
              }}
              className={`group flex h-14 min-w-0 items-center gap-2.5 rounded-xl px-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 lg:w-full lg:px-3.5 ${
                isActive
                  ? "bg-sky-500/14 text-sky-100 shadow-inner shadow-sky-400/5"
                  : "text-slate-400 hover:bg-white/[0.045] hover:text-white"
              }`}
            >
              <span
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border transition ${
                  isActive
                    ? "border-sky-300/20 bg-sky-400/12 text-sky-300"
                    : "border-white/8 bg-white/[0.025] text-slate-500 group-hover:text-slate-300"
                }`}
              >
                <AccountIcon
                  name={section.icon}
                  className="h-4.5 w-4.5"
                />
              </span>

              <span className="min-w-0">
                <span className="block truncate text-sm font-bold">
                  {section.label}
                </span>
                <span className="sr-only">
                  {section.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default AccountNavigation;
