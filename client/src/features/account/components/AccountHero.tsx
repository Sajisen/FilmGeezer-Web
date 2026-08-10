import ProfileAvatar from "../../../components/ProfileAvatar";

import AccountIcon from "./AccountSectionIcons";

interface AccountHeroProps {
  displayName: string;
  email: string;
  profileImagePath: string | null;
  memberSinceLabel: string;
  isSigningOut: boolean;
  onSignOut: () => void;
}

function AccountHero({
  displayName,
  email,
  profileImagePath,
  memberSinceLabel,
  isSigningOut,
  onSignOut,
}: AccountHeroProps) {
  return (
    <section className="relative overflow-hidden rounded-[1.65rem] border border-white/10 bg-[linear-gradient(135deg,rgba(8,47,73,0.72),rgba(15,23,42,0.94)_55%,rgba(15,23,42,0.86))] shadow-xl shadow-black/20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(56,189,248,0.16),transparent_36%)]" />

      <button
        type="button"
        onClick={onSignOut}
        disabled={isSigningOut}
        className="absolute right-5 top-5 z-10 hidden min-h-10 items-center gap-2 rounded-xl border border-rose-300/20 bg-rose-400/10 px-3 text-sm font-bold text-rose-100 shadow-lg shadow-black/10 transition hover:border-rose-300/35 hover:bg-rose-400/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 disabled:cursor-wait disabled:opacity-60 lg:inline-flex"
      >
        <AccountIcon
          name="logout"
          className="h-4.5 w-4.5"
        />
        <span>
          {isSigningOut ? "Signing out…" : "Sign out"}
        </span>
      </button>

      <div className="relative flex flex-col items-center gap-4 px-5 py-7 text-center sm:flex-row sm:px-7 sm:py-6 sm:text-left lg:px-6 lg:py-5 lg:pr-36">
        <ProfileAvatar
          displayName={displayName}
          profileImagePath={profileImagePath}
          className="h-24 w-24 sm:h-20 sm:w-20 lg:h-16 lg:w-16"
          initialsClassName="text-3xl sm:text-2xl lg:text-xl"
          alt={`${displayName}'s profile picture`}
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <h2 className="break-words text-2xl font-black tracking-tight sm:text-3xl lg:text-2xl">
              {displayName}
            </h2>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2.5 py-1 text-xs font-bold text-emerald-200">
              <AccountIcon
                name="check"
                className="h-3.5 w-3.5"
              />
              Verified
            </span>
          </div>

          <p className="mt-1.5 break-all text-sm text-slate-300">
            {email}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Member since {memberSinceLabel}
          </p>
        </div>
      </div>
    </section>
  );
}

export default AccountHero;
