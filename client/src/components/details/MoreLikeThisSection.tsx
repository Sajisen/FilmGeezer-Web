import { useMoreLikeThis } from "../../hooks/useMoreLikeThis";
import type { MediaType } from "../../types/media";
import MediaRow from "../MediaRow";
import ContentContainer from "../layout/ContentContainer";
import MediaRowSkeleton from "../skeletons/MediaRowSkeleton";
import EmptyState from "../states/EmptyState";
import ErrorState from "../states/ErrorState";


const DETAILS_CONTENT_CLASS =
  "mx-auto w-full max-w-[1180px]";

interface MoreLikeThisSectionProps {
  mediaType: MediaType;
  tmdbId: number;
}

function MoreLikeThisSection({
  mediaType,
  tmdbId,
}: MoreLikeThisSectionProps) {
  const { items, isLoading, errorMessage, retry } = useMoreLikeThis(
    mediaType,
    tmdbId,
  );

  if (isLoading) {
    return (
      <div id="more-like-this" className="scroll-mt-24">
        <MediaRowSkeleton cardCount={7} contentClassName={DETAILS_CONTENT_CLASS} />
      </div>
    );
  }

  if (errorMessage) {
    return (
      <section id="more-like-this" className="scroll-mt-24 py-7 sm:py-8">
        <ContentContainer>
          <div className={DETAILS_CONTENT_CLASS}>
          <header className="mb-4 sm:mb-5">
            <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
              More like this
            </h2>

            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">
              Stories and titles related to what you are viewing.
            </p>
          </header>

          <ErrorState
            title="Related titles are unavailable"
            message={errorMessage}
            onRetry={retry}
          />
        </div>
        </ContentContainer>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section id="more-like-this" className="scroll-mt-24 py-7 sm:py-8">
        <ContentContainer>
          <div className={DETAILS_CONTENT_CLASS}>
          <header className="mb-4 sm:mb-5">
            <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
              More like this
            </h2>

            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">
              Stories and titles related to what you are viewing.
            </p>
          </header>

          <EmptyState
            title="No close matches yet"
            message="We could not find enough suitable related titles for this one."
          />
          </div>
        </ContentContainer>
      </section>
    );
  }

  return (
    
      <div id="more-like-this" className="scroll-mt-24">
        <MediaRow
          title="More like this"
          description="Stories and titles related to what you are viewing."
          items={items}
          contentClassName={DETAILS_CONTENT_CLASS}
        />
      </div>
    
  );
}

export default MoreLikeThisSection;
