import AccountIcon from "./AccountSectionIcons";

interface AccountControlsProps {
  isSigningOutCurrent: boolean;
  currentSignOutError: string | null;
  onSignOutCurrent(): void;
  isSigningOutAll: boolean;
  onSignOutAll(): void;
  onDeactivate(): void;
}

function AccountControls({
  isSigningOutCurrent,
  currentSignOutError,
  onSignOutCurrent,
  isSigningOutAll,
  onSignOutAll,
  onDeactivate,
}: AccountControlsProps) {
  return (
    <div className="grid w-full gap-4">
      <section className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 shadow-xl shadow-black/15 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-stretch">
        <div className="border-b border-white/8 px-5 py-4 sm:px-6 lg:col-span-2">
          <h2 className="text-lg font-bold text-white">
            Sign out on this device
          </h2>
        </div>

        <div className="flex flex-1 flex-col gap-5 p-5 sm:px-6 lg:col-span-2 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
          <div className="flex min-w-0 items-start gap-3.5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-sky-300/15 bg-sky-400/10 text-sky-300">
              <AccountIcon name="logout" />
            </span>
            <div className="min-w-0">
              <p className="text-sm leading-6 text-slate-400">
                End only this browser or device. Your other FilmGeezer sign-ins stay connected.
              </p>
              {currentSignOutError && (
                <p
                  role="alert"
                  className="mt-2 text-sm font-medium text-rose-200"
                >
                  {currentSignOutError}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            disabled={isSigningOutCurrent}
            onClick={onSignOutCurrent}
            className="mt-auto min-h-11 w-full rounded-xl border border-rose-300/20 bg-rose-400/[0.07] px-4 text-sm font-semibold text-rose-100 transition hover:bg-rose-400/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 disabled:cursor-wait disabled:opacity-60 lg:mt-0 lg:w-auto lg:min-w-48"
          >
            {isSigningOutCurrent
              ? "Signing out…"
              : "Sign out on this device"}
          </button>
        </div>
      </section>

      <section className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 shadow-xl shadow-black/15 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-stretch">
        <div className="border-b border-white/8 px-5 py-4 sm:px-6 lg:col-span-2">
          <h2 className="text-lg font-bold text-white">
            Sign out everywhere
          </h2>
        </div>

        <div className="flex flex-1 flex-col gap-5 p-5 sm:px-6 lg:col-span-2 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
          <div className="flex min-w-0 items-start gap-3.5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-amber-300/15 bg-amber-400/10 text-amber-300">
              <AccountIcon name="logout" />
            </span>
            <p className="text-sm leading-6 text-slate-400">
              End every FilmGeezer sign-in, including this device.
            </p>
          </div>

          <button
            type="button"
            disabled={isSigningOutAll}
            onClick={onSignOutAll}
            className="mt-auto min-h-11 w-full rounded-xl border border-white/10 px-4 text-sm font-semibold text-slate-200 transition hover:border-amber-300/25 hover:bg-amber-400/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 disabled:cursor-wait disabled:opacity-50 lg:mt-0 lg:w-auto lg:min-w-48"
          >
            {isSigningOutAll
              ? "Signing out…"
              : "Sign out everywhere"}
          </button>
        </div>
      </section>

      <section className="flex h-full flex-col overflow-hidden rounded-2xl border border-rose-300/15 bg-slate-900/70 shadow-xl shadow-black/15 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-stretch">
        <div className="border-b border-rose-300/10 px-5 py-4 sm:px-6 lg:col-span-2">
          <h2 className="text-lg font-bold text-white">
            Deactivate account
          </h2>
        </div>

        <div className="flex flex-1 flex-col gap-5 p-5 sm:px-6 lg:col-span-2 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
          <div className="flex min-w-0 items-start gap-3.5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-rose-300/15 bg-rose-400/10 text-rose-300">
              <AccountIcon name="warning" />
            </span>
            <p className="text-sm leading-6 text-slate-400">
              Temporarily deactivate your account and sign out everywhere. Your Watchlist, preferences, and other saved information will stay in your account.
            </p>
          </div>

          <button
            type="button"
            onClick={onDeactivate}
            className="mt-auto min-h-11 w-full rounded-xl border border-rose-300/20 bg-rose-400/[0.07] px-4 text-sm font-semibold text-rose-100 transition hover:bg-rose-400/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 lg:mt-0 lg:w-auto lg:min-w-48"
          >
            Deactivate account
          </button>
        </div>
      </section>
    </div>
  );
}

export default AccountControls;