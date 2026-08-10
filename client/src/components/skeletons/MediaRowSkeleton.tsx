import ContentContainer from '../layout/ContentContainer'
import MediaCardSkeleton from './MediaCardSkeleton'

interface MediaRowSkeletonProps {
  cardCount?: number
  contentClassName?: string
}

function MediaRowSkeleton({
  cardCount = 8,
  contentClassName = "",
}: MediaRowSkeletonProps) {
  return (
    <section
      aria-hidden="true"
      className="py-7 sm:py-8"
    >
      <ContentContainer>
        <div className={contentClassName}>
        <header className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-2 sm:mb-5">
          <div className="skeleton-placeholder h-6 w-44 max-w-full rounded-md sm:h-7 sm:w-56" />

          <div className="skeleton-placeholder h-10 w-24 rounded-full sm:w-28" />

          <div className="skeleton-placeholder col-span-2 h-4 w-full max-w-xl rounded-md sm:col-span-1 sm:col-start-1" />
        </header>

        <div className="flex gap-3 overflow-hidden pb-2 sm:gap-4 lg:gap-5">
          {Array.from({
            length: cardCount,
          }).map((_, index) => (
            <div
              key={index}
              className="w-[154px] min-w-[154px] flex-shrink-0 sm:w-[176px] sm:min-w-[176px] lg:w-[196px] lg:min-w-[196px]"
            >
              <MediaCardSkeleton />
            </div>
          ))}
        </div>
        </div>
      </ContentContainer>
    </section>
  )
}

export default MediaRowSkeleton