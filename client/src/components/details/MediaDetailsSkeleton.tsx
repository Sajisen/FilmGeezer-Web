import MediaDetailsContainer from "./MediaDetailsContainer";

function MediaDetailsSkeleton() {
  return (
    <main
      role="status"
      aria-live="polite"
      className="min-h-screen bg-slate-950 text-white"
    >
      <span className="sr-only">Loading media details</span>

      <section className="relative overflow-hidden border-b border-white/10">
        <div className="skeleton-shimmer absolute inset-0 opacity-55" />

        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/45 via-slate-950/80 to-slate-950" />

        <MediaDetailsContainer className="relative py-8 sm:py-10 lg:py-14">
            <div className="skeleton-placeholder h-5 w-28 rounded-md" />

            <div className="mt-8 grid gap-y-6 lg:mx-auto lg:w-fit lg:grid-cols-[260px_minmax(0,620px)] lg:gap-x-10 lg:gap-y-5 xl:grid-cols-[280px_minmax(0,720px)] 2xl:grid-cols-[300px_minmax(0,820px)] 2xl:gap-x-12">
              <div className="order-1 mx-auto w-full max-w-[220px] sm:max-w-[250px] lg:col-start-1 lg:row-start-2 lg:max-w-[300px]">
                <div className="skeleton-placeholder aspect-[2/3] rounded-3xl" />
              </div>

              <div className="order-2 flex justify-center gap-2 lg:col-start-2 lg:row-start-1 lg:justify-start">
                <div className="skeleton-placeholder h-7 w-20 rounded-full" />

                <div className="skeleton-placeholder h-7 w-20 rounded-full" />

                <div className="skeleton-placeholder h-7 w-24 rounded-full" />
              </div>

              <div className="order-3 min-w-0 text-center lg:col-start-2 lg:row-start-2 lg:text-left">
                <div className="space-y-3">
                  <div className="skeleton-placeholder mx-auto h-10 w-11/12 rounded-lg sm:h-12 lg:mx-0 lg:w-4/5" />

                  <div className="skeleton-placeholder mx-auto h-10 w-3/4 rounded-lg sm:h-12 lg:mx-0 lg:w-3/5" />
                </div>

                <div className="mt-4">
                  <div className="skeleton-placeholder mx-auto h-5 w-3/5 rounded-md lg:mx-0 lg:w-2/5" />
                </div>

                <div className="mt-6 flex justify-center gap-3 lg:justify-start">
                  <div className="skeleton-placeholder h-10 w-28 rounded-full" />

                  <div className="skeleton-placeholder h-5 w-32 rounded-md" />
                </div>

                <div className="mt-5 flex flex-wrap justify-center gap-2 lg:justify-start">
                  <div className="skeleton-placeholder h-8 w-20 rounded-full" />

                  <div className="skeleton-placeholder h-8 w-24 rounded-full" />

                  <div className="skeleton-placeholder h-8 w-28 rounded-full" />
                </div>

                <div className="mx-auto mt-7 max-w-[72ch] space-y-3 text-left lg:mx-0">
                  <div className="skeleton-placeholder h-4 w-full rounded-md" />

                  <div className="skeleton-placeholder h-4 w-11/12 rounded-md" />

                  <div className="skeleton-placeholder h-4 w-4/5 rounded-md" />
                </div>

                <div className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
                  <div className="skeleton-placeholder h-12 w-44 rounded-full" />

                  <div className="skeleton-placeholder h-12 w-36 rounded-full" />

                  <div className="skeleton-placeholder h-12 w-32 rounded-full" />
                </div>
              </div>
            </div>
          </MediaDetailsContainer>
      </section>

      <MediaDetailsContainer className="py-10 sm:py-12">
        <div className="skeleton-placeholder h-7 w-36 rounded-md" />

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({
            length: 4,
          }).map((_, index) => (
            <div
              key={index}
              className="rounded-2xl border border-white/10 bg-white/5 p-5"
            >
              <div className="skeleton-placeholder h-3 w-20 rounded-md" />

              <div className="skeleton-placeholder mt-3 h-5 w-28 rounded-md" />
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="skeleton-placeholder h-6 w-40 rounded-md" />

          <div className="skeleton-placeholder mt-3 h-4 w-72 max-w-full rounded-md" />

          <div className="mt-6 space-y-3">
            {Array.from({
              length: 2,
            }).map((_, index) => (
              <div
                key={index}
                className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-900/70 p-4"
              >
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="skeleton-placeholder h-4 w-40 max-w-full rounded-md" />

                  <div className="skeleton-placeholder h-3 w-28 rounded-md" />
                </div>

                <div className="skeleton-placeholder h-10 w-20 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </MediaDetailsContainer>
    </main>
  );
}

export default MediaDetailsSkeleton;
