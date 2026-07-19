interface MediaCardSkeletonProps {
  className?: string
}

function MediaCardSkeleton({
  className = '',
}: MediaCardSkeletonProps) {
  return (
    <article
      aria-hidden="true"
      className={`overflow-hidden rounded-xl border border-white/10 bg-slate-900/70 shadow-lg shadow-black/10 sm:rounded-2xl ${className}`}
    >
      <div className="skeleton-shimmer relative aspect-[2/3]">
        <div className="skeleton-placeholder absolute left-2 top-2 h-7 w-14 rounded-full sm:left-3 sm:top-3" />

        <div className="skeleton-placeholder absolute right-2 top-2 h-11 w-11 rounded-full sm:right-3 sm:top-3" />

        <div className="skeleton-placeholder absolute bottom-2 left-2 h-6 w-20 rounded-full sm:bottom-3 sm:left-3" />
      </div>

      <div className="flex h-[6.75rem] flex-col px-3 py-3 sm:h-[7.25rem] sm:px-4">
        <div className="h-[2.625rem] space-y-2 sm:h-12">
          <div className="skeleton-placeholder h-4 w-11/12 rounded-md" />

          <div className="skeleton-placeholder h-4 w-7/12 rounded-md" />
        </div>

        <div className="mt-1 space-y-2">
          <div className="skeleton-placeholder h-3 w-3/4 rounded-md" />

          <div className="skeleton-placeholder h-3 w-5/6 rounded-md" />
        </div>
      </div>
    </article>
  )
}

export default MediaCardSkeleton