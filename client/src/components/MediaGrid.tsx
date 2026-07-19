import MediaCard from "./MediaCard";
import EmptyState from "./states/EmptyState";
import ErrorState from "./states/ErrorState";
import LoadingState from "./states/LoadingState";
import type { MediaItem } from "../types/media";
import ContentContainer from "./layout/ContentContainer";

interface MediaGridProps {
  title: string;
  description?: string;
  items: MediaItem[];
  emptyMessage: string;
  isLoading?: boolean;
  isLoadingMore?: boolean;
  errorMessage?: string;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onRetry?: () => void;
  loadMoreLabel?: string;
  loadMoreErrorMessage?: string;
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
  loadMoreLabel = "Show More",
}: MediaGridProps) {
  return (
    <section className="py-8">
      <ContentContainer>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white">{title}</h2>

          {description && (
            <p className="mt-1 text-sm text-slate-400">{description}</p>
          )}
        </div>

        {isLoading && (
          <LoadingState
            title="Loading results"
            message="Please wait while the media cards are loading."
          />
        )}

        {!isLoading && errorMessage && (
          <ErrorState message={errorMessage} onRetry={onRetry} />
        )}

        {!isLoading && !errorMessage && items.length === 0 && (
          <EmptyState message={emptyMessage} />
        )}

        {!isLoading && !errorMessage && items.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {items.map((item) => (
              <MediaCard key={`${item.mediaType}-${item.tmdbId}`} item={item} />
            ))}
          </div>
        )}

        {!isLoading && !errorMessage && loadMoreErrorMessage && (
          <p
            role="alert"
            className="mt-6 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100"
          >
            {loadMoreErrorMessage}
          </p>
        )}

        {!isLoading && !errorMessage && hasMore && onLoadMore && (
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={onLoadMore}
              disabled={isLoadingMore}
              className="rounded-full border border-white/10 px-6 py-3 font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoadingMore ? "Loading More..." : loadMoreLabel}
            </button>
          </div>
        )}
      </ContentContainer>
    </section>
  );
}

export default MediaGrid;
