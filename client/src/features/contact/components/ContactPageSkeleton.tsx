import type { AuthStateStatus } from "../../../types/auth";

interface ContactPageSkeletonProps {
  authStatus: AuthStateStatus;
}

function ContactHeroSkeleton() {
  return (
    <section className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/58 shadow-xl shadow-black/20 backdrop-blur-xl">
      <div className="px-5 py-6 sm:px-7 sm:py-7 lg:px-8 lg:py-8">
        <div className="skeleton-placeholder h-7 w-44 rounded-full" />

        <div className="mt-5 space-y-3">
          <div className="skeleton-placeholder h-9 w-full max-w-[34rem] rounded-xl sm:h-11" />
          <div className="skeleton-placeholder h-9 w-4/5 max-w-[26rem] rounded-xl sm:h-11" />
        </div>

        <div className="mt-4 space-y-2">
          <div className="skeleton-placeholder h-4 w-full max-w-[42rem] rounded-md" />
          <div className="skeleton-placeholder h-4 w-4/5 max-w-[34rem] rounded-md" />
        </div>

        <div className="mt-5 flex min-h-[3.1rem] items-center rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 sm:px-5">
          <div className="skeleton-placeholder h-4 w-4 rounded-full" />
          <div className="skeleton-placeholder ml-3 h-4 w-32 rounded-md" />
        </div>
      </div>
    </section>
  );
}

function ContactSidebarSkeleton({
  authStatus,
}: ContactPageSkeletonProps) {
  if (authStatus === "authenticated") {
    return (
      <aside className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
        <section className="rounded-3xl border border-white/10 bg-slate-900/62 p-4 shadow-xl shadow-black/18 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-3 border-b border-white/8 pb-3">
            <div className="min-w-0 flex-1">
              <div className="skeleton-placeholder h-3 w-24 rounded-full" />
              <div className="skeleton-placeholder mt-2 h-5 w-36 rounded-md" />
              <div className="skeleton-placeholder mt-2 h-3 w-full max-w-[13rem] rounded-md" />
              <div className="skeleton-placeholder mt-1.5 h-3 w-4/5 rounded-md" />
            </div>
            <div className="skeleton-placeholder h-7 w-9 rounded-full" />
          </div>

          <div className="mt-3 space-y-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="rounded-2xl border border-white/10 bg-slate-950/28 p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="skeleton-placeholder h-3 w-20 rounded-md" />
                  <div className="skeleton-placeholder h-5 w-14 rounded-full" />
                </div>
                <div className="skeleton-placeholder mt-2 h-4 w-full rounded-md" />
                <div className="skeleton-placeholder mt-2 h-3 w-3/4 rounded-md" />
              </div>
            ))}
          </div>
        </section>
      </aside>
    );
  }

  return (
    <aside className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
      <section className="rounded-3xl border border-sky-300/15 bg-[linear-gradient(145deg,rgba(14,165,233,0.1),rgba(15,23,42,0.72))] p-5 shadow-xl shadow-black/18">
        <div className="skeleton-placeholder h-11 w-11 rounded-2xl" />
        <div className="skeleton-placeholder mt-4 h-6 w-44 rounded-lg" />
        <div className="mt-3 space-y-2">
          <div className="skeleton-placeholder h-4 w-full rounded-md" />
          <div className="skeleton-placeholder h-4 w-11/12 rounded-md" />
          <div className="skeleton-placeholder h-4 w-4/5 rounded-md" />
        </div>
        <div className="skeleton-placeholder mt-5 h-11 w-full rounded-full" />
        <div className="skeleton-placeholder mx-auto mt-3 h-3 w-5/6 rounded-md" />
      </section>
    </aside>
  );
}

function ContactComposerSkeleton({ authStatus }: ContactPageSkeletonProps) {
  return (
    <section className="min-w-0">
      <div className="mb-3 flex min-h-11 items-center justify-between gap-4 px-1 lg:hidden">
        <div>
          <div className="skeleton-placeholder h-3 w-28 rounded-full" />
          <div className="skeleton-placeholder mt-2 h-4 w-40 rounded-md" />
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/72 shadow-2xl shadow-black/25 backdrop-blur-xl">
        <div className="border-b border-white/8 px-5 py-5 sm:px-7">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="skeleton-placeholder h-3 w-36 rounded-full" />
              <div className="skeleton-placeholder mt-2 h-6 w-44 rounded-lg" />
              <div className="mt-3 space-y-2">
                <div className="skeleton-placeholder h-4 w-full max-w-xl rounded-md" />
                <div className="skeleton-placeholder h-4 w-4/5 max-w-lg rounded-md" />
              </div>
            </div>

            {authStatus !== "loading" && (
              <div className="skeleton-placeholder h-9 w-44 shrink-0 rounded-full" />
            )}
          </div>
        </div>

        <div className="space-y-5 px-5 py-5 sm:px-7 sm:py-6">
          <div>
            <div className="skeleton-placeholder h-4 w-40 rounded-md" />
            <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(12rem,0.42fr)_minmax(0,0.58fr)] sm:items-stretch">
              <div className="skeleton-placeholder h-12 rounded-2xl" />
              <div className="skeleton-placeholder h-12 rounded-2xl" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {["name", "email"].map((field) => (
              <div key={field}>
                <div className="skeleton-placeholder h-4 w-24 rounded-md" />
                <div className="skeleton-placeholder mt-2 h-12 rounded-2xl" />
              </div>
            ))}
          </div>

          <div>
            <div className="skeleton-placeholder h-4 w-20 rounded-md" />
            <div className="skeleton-placeholder mt-2 h-12 rounded-2xl" />
          </div>

          <div>
            <div className="flex items-center justify-between gap-4">
              <div className="skeleton-placeholder h-4 w-20 rounded-md" />
              <div className="skeleton-placeholder h-3 w-16 rounded-md" />
            </div>
            <div className="skeleton-placeholder mt-2 h-32 rounded-2xl" />
          </div>

          <div className="flex flex-col gap-3 border-t border-white/8 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="skeleton-placeholder h-3 w-full max-w-md rounded-md" />
              <div className="skeleton-placeholder h-3 w-4/5 max-w-sm rounded-md" />
            </div>
            <div className="skeleton-placeholder h-12 w-full rounded-full sm:w-36" />
          </div>
        </div>
      </div>
    </section>
  );
}

function ContactPageSkeleton({ authStatus }: ContactPageSkeletonProps) {
  return (
    <div aria-live="polite" aria-busy="true">
      <p className="sr-only">Loading Contact support…</p>

      <ContactHeroSkeleton />

      {authStatus === "authenticated" && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-slate-900/58 px-4 py-3 lg:hidden">
          <div className="flex min-h-6 items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="skeleton-placeholder h-4 w-4 rounded-full" />
              <div className="skeleton-placeholder h-4 w-32 rounded-md" />
            </div>
            <div className="skeleton-placeholder h-7 w-9 rounded-full" />
          </div>
        </div>
      )}

      <div className="mt-7 grid min-w-0 items-start gap-6 lg:grid-cols-[19.5rem_minmax(0,1fr)]">
        <ContactSidebarSkeleton authStatus={authStatus} />
        <ContactComposerSkeleton authStatus={authStatus} />
      </div>
    </div>
  );
}

export default ContactPageSkeleton;
