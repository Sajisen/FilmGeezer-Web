import ContentContainer from '../layout/ContentContainer'
import MediaCardSkeleton from './MediaCardSkeleton'

interface MediaRowSkeletonProps {
  cardCount?: number
}

function MediaRowSkeleton({
  cardCount = 8,
}: MediaRowSkeletonProps) {
  return (
    <section
      aria-hidden="true"
      className="py-7 sm:py-8"
    >
      <ContentContainer>
        <header className="mb-4 space-y-2 sm:mb-5">
          <div className="skeleton-placeholder h-6 w-44 rounded-md sm:h-7 sm:w-56" />

          <div className="skeleton-placeholder h-4 w-full max-w-xl rounded-md" />
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
      </ContentContainer>
    </section>
  )
}

export default MediaRowSkeleton