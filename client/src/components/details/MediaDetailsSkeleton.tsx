import ContentContainer from "../layout/ContentContainer";
import MediaCardSkeleton from "../skeletons/MediaCardSkeleton";
import MediaDetailsContainer from "./MediaDetailsContainer";

interface MediaDetailsSkeletonProps {
  mediaType?: string;
}


function SectionHeadingSkeleton({
  width = "w-52",
  showDescription = true,
}: {
  width?: string;
  showDescription?: boolean;
}) {
  return (
    <header className="mb-6 space-y-3">
      <div className="skeleton-placeholder h-3 w-28 rounded-md" />
      <div className={`skeleton-placeholder h-8 ${width} rounded-lg`} />
      {showDescription && (
        <div className="skeleton-placeholder h-4 w-full max-w-2xl rounded-md" />
      )}
    </header>
  );
}


function MediaDetailsSkeleton({ mediaType }: MediaDetailsSkeletonProps) {
  const showEpisodeExplorer = mediaType === "tv";

  return (
    <main
      role="status"
      aria-live="polite"
      className="min-h-screen overflow-x-clip bg-slate-950 text-white"
    >
      <span className="sr-only">Loading media details</span>

      <section className="relative overflow-hidden border-b border-white/10">
        <div className="skeleton-shimmer absolute inset-0 opacity-55" />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/45 via-slate-950/82 to-slate-950" />

        <MediaDetailsContainer className="relative py-8 sm:py-10 lg:py-14">
          <div className="skeleton-placeholder h-11 w-11 rounded-full sm:h-5 sm:w-28 sm:rounded-md" />

          <div className="mt-6 grid gap-y-6 lg:mx-auto lg:w-fit lg:grid-cols-[260px_minmax(0,620px)] lg:gap-x-10 lg:gap-y-5 xl:grid-cols-[280px_minmax(0,720px)] 2xl:grid-cols-[300px_minmax(0,820px)] 2xl:gap-x-12">
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
                <div className="skeleton-placeholder mx-auto h-11 w-11/12 rounded-lg sm:h-14 lg:mx-0 lg:w-4/5" />
                <div className="skeleton-placeholder mx-auto h-11 w-3/4 rounded-lg sm:h-14 lg:mx-0 lg:w-3/5" />
              </div>

              <div className="skeleton-placeholder mx-auto mt-4 h-5 w-3/5 rounded-md lg:mx-0 lg:w-2/5" />
              <div className="skeleton-placeholder mx-auto mt-5 h-5 w-4/5 rounded-md lg:mx-0 lg:w-1/2" />

              <div className="mt-6 flex justify-center gap-3 lg:justify-start">
                <div className="skeleton-placeholder h-10 w-24 rounded-full" />
                <div className="skeleton-placeholder h-5 w-28 rounded-md" />
              </div>

              <div className="mt-5 flex flex-wrap justify-center gap-2 lg:justify-start">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="skeleton-placeholder h-8 w-20 rounded-full"
                  />
                ))}
              </div>

              <div className="mx-auto mt-7 max-w-[72ch] space-y-3 lg:mx-0">
                <div className="skeleton-placeholder h-3 w-24 rounded-md" />
                <div className="skeleton-placeholder h-4 w-full rounded-md" />
                <div className="skeleton-placeholder h-4 w-full rounded-md" />
                <div className="skeleton-placeholder h-4 w-11/12 rounded-md" />
                <div className="skeleton-placeholder h-4 w-3/4 rounded-md" />
              </div>

              <div className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:max-w-none sm:flex-row lg:mx-0">
                <div className="skeleton-placeholder h-11 w-full rounded-full sm:w-44" />
                <div className="skeleton-placeholder h-11 w-full rounded-full sm:w-40" />
              </div>
            </div>
          </div>
        </MediaDetailsContainer>
      </section>

      <div className="border-b border-white/10 bg-slate-950/85 py-4">
        <MediaDetailsContainer>
          <div className="flex gap-2 overflow-hidden">
            {Array.from({ length: showEpisodeExplorer ? 6 : 5 }).map(
              (_, index) => (
                <div
                  key={index}
                  className="skeleton-placeholder h-10 w-28 shrink-0 rounded-full"
                />
              ),
            )}
          </div>
        </MediaDetailsContainer>
      </div>


      <section className="py-10 sm:py-12">
        <MediaDetailsContainer>
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-6 lg:p-8">
            <SectionHeadingSkeleton width="w-40" showDescription={false} />

            <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))]">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 sm:p-5"
                >
                  <div className="skeleton-placeholder h-3 w-20 rounded-md" />
                  <div className="skeleton-placeholder mt-3 h-5 w-24 max-w-full rounded-md" />
                </div>
              ))}
            </div>

            <div className="mt-6 flex gap-4 border-t border-white/10 pt-5">
              <div className="skeleton-placeholder h-4 w-32 rounded-md" />
              <div className="skeleton-placeholder h-4 w-28 rounded-md" />
            </div>
          </div>
        </MediaDetailsContainer>
      </section>

      <section className="py-10 sm:py-12">
        <MediaDetailsContainer>
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-6 lg:p-8">
            <SectionHeadingSkeleton width="w-56" />

            <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
              <div className="min-w-0">
                <div className="skeleton-placeholder aspect-video rounded-2xl" />

                <div className="mt-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="skeleton-placeholder h-3 w-24 rounded-md" />
                    <div className="skeleton-placeholder h-4 w-3/5 rounded-md" />
                  </div>
                  <div className="skeleton-placeholder h-11 w-full shrink-0 rounded-full sm:w-40" />
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="skeleton-placeholder h-5 w-28 rounded-md" />
                    <div className="skeleton-placeholder h-3 w-full rounded-md" />
                  </div>
                  <div className="skeleton-placeholder h-7 w-9 rounded-full" />
                </div>
                <div className="mt-4 space-y-2">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div
                      key={index}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5"
                    >
                      <div className="skeleton-placeholder h-3 w-16 rounded-md" />
                      <div className="skeleton-placeholder mt-2 h-4 w-full rounded-md" />
                      <div className="skeleton-placeholder mt-2 h-3 w-3/4 rounded-md" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </MediaDetailsContainer>
      </section>

      <section className="py-10 sm:py-12">
        <MediaDetailsContainer>
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-6 lg:p-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <SectionHeadingSkeleton width="w-72" />

              <div className="w-full sm:w-52">
                <div className="skeleton-placeholder h-3 w-16 rounded-md" />
                <div className="skeleton-placeholder mt-2 h-11 w-full rounded-xl" />
              </div>
            </div>

            <div className="mt-6 flex gap-3 overflow-hidden sm:gap-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="flex min-h-24 w-[172px] min-w-[172px] items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/55 p-3 sm:w-[190px] sm:min-w-[190px] lg:w-[208px] lg:min-w-[208px]"
                >
                  <div className="skeleton-placeholder h-11 w-11 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="skeleton-placeholder h-4 w-full rounded-md" />
                    <div className="skeleton-placeholder h-3 w-3/4 rounded-md" />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-col gap-2 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="skeleton-placeholder h-3 w-52 rounded-md" />
              <div className="skeleton-placeholder h-3 w-40 rounded-md" />
            </div>
          </div>
        </MediaDetailsContainer>
      </section>

      {showEpisodeExplorer && (
        <section className="py-10 sm:py-12">
          <MediaDetailsContainer>
            <div className="min-w-0 rounded-3xl border border-white/10 bg-white/[0.04] p-4 sm:p-6 lg:p-7">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <SectionHeadingSkeleton width="w-52" />

                <div className="w-full lg:w-auto">
                  <div className="flex w-full gap-2 sm:w-auto sm:justify-end">
                    <div className="skeleton-placeholder h-11 flex-1 rounded-xl sm:w-36 sm:flex-none" />
                    <div className="skeleton-placeholder h-11 flex-1 rounded-xl sm:w-32 sm:flex-none" />
                  </div>
                  <div className="skeleton-placeholder mt-3 h-9 w-full rounded-full sm:ml-auto sm:w-36" />
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3 border-y border-white/10 py-3">
                <div className="skeleton-placeholder h-3 w-24 rounded-md" />
                <div className="skeleton-placeholder h-3 w-14 rounded-md" />
                <div className="skeleton-placeholder h-3 w-36 rounded-full sm:w-44" />
                <div className="skeleton-placeholder h-3 w-14 rounded-md" />
              </div>

              <div className="mt-3 space-y-3">
                {Array.from({ length: 4 }).map((_, rowIndex) => (
                  <div
                    key={rowIndex}
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/45 p-3"
                  >
                    <div className="skeleton-placeholder h-10 w-12 shrink-0 rounded-lg" />
                    <div className="flex gap-2 overflow-hidden">
                      {Array.from({ length: 10 }).map((_, cellIndex) => (
                        <div
                          key={cellIndex}
                          className="skeleton-placeholder h-9 w-9 shrink-0 rounded-md"
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="skeleton-placeholder mt-4 h-3 w-full max-w-2xl rounded-md" />
            </div>
          </MediaDetailsContainer>
        </section>
      )}

      <section className="py-10 sm:py-12">
        <MediaDetailsContainer>
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-6 lg:p-8">
            <SectionHeadingSkeleton width="w-56" />

            <div className="flex gap-3 overflow-hidden sm:gap-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="w-[146px] min-w-[146px] overflow-hidden rounded-2xl border border-white/10 bg-slate-950/55 sm:w-[164px] sm:min-w-[164px] lg:w-[176px] lg:min-w-[176px]"
                >
                  <div className="skeleton-placeholder aspect-[3/4]" />
                  <div className="space-y-2 p-3.5">
                    <div className="skeleton-placeholder h-4 w-full rounded-md" />
                    <div className="skeleton-placeholder h-3 w-3/4 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </MediaDetailsContainer>
      </section>

      <section className="py-10 sm:py-12">
        <MediaDetailsContainer>
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-6 lg:p-8">
            <SectionHeadingSkeleton width="w-64" />

            <div className="grid gap-4 lg:grid-cols-2">
              {Array.from({ length: 2 }).map((_, groupIndex) => (
                <div
                  key={groupIndex}
                  className="rounded-2xl border border-white/10 bg-slate-950/55 p-4 sm:p-5"
                >
                  <div className="skeleton-placeholder h-5 w-24 rounded-md" />

                  <div className="mt-4 space-y-3">
                    {Array.from({ length: 2 }).map((__, rowIndex) => (
                      <div
                        key={rowIndex}
                        className="rounded-2xl border border-white/10 bg-slate-900/70 p-4"
                      >
                        <div className="skeleton-placeholder h-5 w-48 max-w-full rounded-md" />
                        <div className="mt-3 flex gap-2">
                          <div className="skeleton-placeholder h-6 w-20 rounded-full" />
                          <div className="skeleton-placeholder h-6 w-24 rounded-full" />
                        </div>
                        <div className="skeleton-placeholder mt-5 h-11 w-40 rounded-full" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </MediaDetailsContainer>
      </section>

      <section className="py-7 sm:py-8">
        <ContentContainer>
          <header className="mb-4 space-y-2 sm:mb-5">
            <div className="skeleton-placeholder h-7 w-48 rounded-md" />
            <div className="skeleton-placeholder h-4 w-full max-w-xl rounded-md" />
          </header>

          <div className="flex gap-3 overflow-hidden pb-2 sm:gap-4 lg:gap-5">
            {Array.from({ length: 7 }).map((_, index) => (
              <div
                key={index}
                className="w-[154px] min-w-[154px] shrink-0 sm:w-[176px] sm:min-w-[176px] lg:w-[196px] lg:min-w-[196px]"
              >
                <MediaCardSkeleton />
              </div>
            ))}
          </div>
        </ContentContainer>
      </section>
    </main>
  );
}

export default MediaDetailsSkeleton;
