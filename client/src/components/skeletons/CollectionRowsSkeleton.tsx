import MediaRowSkeleton from './MediaRowSkeleton'

interface CollectionRowsSkeletonProps {
  rowCount?: number
  label?: string
}

function CollectionRowsSkeleton({
  rowCount = 4,
  label = 'Loading media collections',
}: CollectionRowsSkeletonProps) {
  return (
    <div
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">
        {label}
      </span>

      <div aria-hidden="true">
        {Array.from({
          length: rowCount,
        }).map((_, index) => (
          <MediaRowSkeleton
            key={index}
          />
        ))}
      </div>
    </div>
  )
}

export default CollectionRowsSkeleton