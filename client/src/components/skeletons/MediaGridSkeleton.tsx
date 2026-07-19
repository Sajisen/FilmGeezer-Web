import MediaCardSkeleton from './MediaCardSkeleton'

interface MediaGridSkeletonProps {
  cardCount?: number
}

function MediaGridSkeleton({
  cardCount = 10,
}: MediaGridSkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
    >
      {Array.from({
        length: cardCount,
      }).map((_, index) => (
        <MediaCardSkeleton
          key={index}
        />
      ))}
    </div>
  )
}

export default MediaGridSkeleton