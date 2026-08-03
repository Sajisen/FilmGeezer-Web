function ContactPageSkeleton() {
  return (
    <div aria-live="polite" aria-busy="true">
      <p className="sr-only">Loading Contact support…</p>

      <div className="hidden border-b border-white/10 py-11 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,36rem)] lg:items-end lg:gap-10">
        <div>
          <div className="skeleton-placeholder h-8 w-36 rounded-full" />
          <div className="skeleton-placeholder mt-5 h-12 max-w-[36rem] rounded-2xl" />
          <div className="skeleton-placeholder mt-4 h-6 max-w-[31rem] rounded-xl" />
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/55 p-4">
          <div className="skeleton-placeholder h-3 w-28 rounded-full" />
          <div className="mt-4 grid grid-cols-2 gap-5">
            <div className="space-y-2">
              <div className="skeleton-placeholder h-4 w-24 rounded-full" />
              <div className="skeleton-placeholder h-10 rounded-xl" />
            </div>
            <div className="space-y-2 border-l border-white/8 pl-5">
              <div className="skeleton-placeholder h-4 w-28 rounded-full" />
              <div className="skeleton-placeholder h-10 rounded-xl" />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-slate-900/58 px-5 py-6 lg:hidden">
        <div className="skeleton-placeholder h-8 w-40 rounded-full" />
        <div className="skeleton-placeholder mt-5 h-16 rounded-2xl" />
        <div className="skeleton-placeholder mt-4 h-12 rounded-2xl" />
        <div className="skeleton-placeholder mt-5 h-14 rounded-2xl" />
      </div>

      <div className="mt-7 grid min-w-0 items-start gap-6 lg:grid-cols-[19.5rem_minmax(0,1fr)]">
        <aside className="hidden rounded-3xl border border-white/10 bg-slate-900/62 p-4 lg:block">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="skeleton-placeholder h-3 w-24 rounded-full" />
              <div className="skeleton-placeholder mt-2 h-6 w-36 rounded-lg" />
            </div>
            <div className="skeleton-placeholder h-8 w-8 rounded-full" />
          </div>

          <div className="mt-4 space-y-2">
            {[0, 1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="skeleton-placeholder h-[4.7rem] rounded-2xl"
              />
            ))}
          </div>
        </aside>

        <section className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/72">
          <div className="border-b border-white/8 px-5 py-5 sm:px-7">
            <div className="skeleton-placeholder h-3 w-36 rounded-full" />
            <div className="skeleton-placeholder mt-2 h-7 w-48 rounded-lg" />
            <div className="skeleton-placeholder mt-3 h-5 max-w-xl rounded-lg" />
          </div>

          <div className="space-y-5 px-5 py-5 sm:px-7 sm:py-6">
            <div className="skeleton-placeholder h-20 rounded-2xl" />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="skeleton-placeholder h-20 rounded-2xl" />
              <div className="skeleton-placeholder h-20 rounded-2xl" />
            </div>
            <div className="skeleton-placeholder h-20 rounded-2xl" />
            <div className="skeleton-placeholder h-40 rounded-2xl" />
            <div className="flex justify-end border-t border-white/8 pt-5">
              <div className="skeleton-placeholder h-12 w-36 rounded-full" />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default ContactPageSkeleton;
