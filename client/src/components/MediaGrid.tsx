import ContentContainer from './layout/ContentContainer'
import MediaCard from './MediaCard'
import MediaCardSkeleton from './skeletons/MediaCardSkeleton'
import MediaGridSkeleton from './skeletons/MediaGridSkeleton'
import EmptyState from './states/EmptyState'
import ErrorState from './states/ErrorState'
import type { MediaItem } from '../types/media'

interface MediaGridProps {
  title: string
  description?: string
  items: MediaItem[]
  emptyMessage: string
  isLoading?: boolean
  isLoadingMore?: boolean
  errorMessage?: string
  hasMore?: boolean
  onLoadMore?: () => void
  onRetry?: () => void
  loadMoreLabel?: string
  loadMoreErrorMessage?: string
}

function MediaGrid({
  title,
  description,
  items,
  emptyMessage,
  isLoading = false,
  isLoadingMore = false,
  errorMessage,
  loadMoreErrorMessage,
  hasMore = false,
  onLoadMore,
  onRetry,
  loadMoreLabel = 'Show More',
}: MediaGridProps) {
  return (
    <section
      aria-busy={
        isLoading || isLoadingMore
      }
      className="py-8"
    >
      <ContentContainer>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white">
            {title}
          </h2>

          {description && (
            <p className="mt-1 text-sm text-slate-400">
              {description}
            </p>
          )}
        </div>

        {isLoading && (
          <div role="status">
            <span className="sr-only">
              Loading search results
            </span>

            <MediaGridSkeleton />
          </div>
        )}

        {!isLoading &&
          errorMessage && (
            <ErrorState
              message={errorMessage}
              onRetry={onRetry}
            />
          )}

        {!isLoading &&
          !errorMessage &&
          items.length === 0 && (
            <EmptyState
              message={emptyMessage}
            />
          )}

        {!isLoading &&
          !errorMessage &&
          items.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {items.map((item) => (
                <MediaCard
                  key={`${item.mediaType}-${item.tmdbId}`}
                  item={item}
                />
              ))}

              {isLoadingMore &&
                Array.from({
                  length: 4,
                }).map((_, index) => (
                  <MediaCardSkeleton
                    key={`loading-more-${index}`}
                  />
                ))}
            </div>
          )}

        {!isLoading &&
          !errorMessage &&
          loadMoreErrorMessage && (
            <p
              role="alert"
              className="mt-6 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100"
            >
              {loadMoreErrorMessage}
            </p>
          )}

        {!isLoading &&
          !errorMessage &&
          hasMore &&
          onLoadMore && (
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={onLoadMore}
                disabled={isLoadingMore}
                className="min-h-12 rounded-full border border-white/10 px-6 py-3 font-semibold text-white transition hover:border-sky-300/40 hover:bg-white/10 disabled:cursor-wait disabled:opacity-60"
              >
                {isLoadingMore
                  ? 'Loading more titles...'
                  : loadMoreLabel}
              </button>
            </div>
          )}
      </ContentContainer>
    </section>
  )
}

export default MediaGrid