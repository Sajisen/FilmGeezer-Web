import BannerSearch from "../components/BannerSearch";
import ContentContainer from "../components/layout/ContentContainer";
import MediaRow from "../components/MediaRow";
import PageBanner from "../components/PageBanner";
import PersonalRecommendationsRow from "../components/PersonalRecommendationsRow";
import EmptyState from "../components/states/EmptyState";
import ErrorState from "../components/states/ErrorState";
import CollectionRowsSkeleton from "../components/skeletons/CollectionRowsSkeleton";
import { usePersonalRecommendations } from "../hooks/usePersonalRecommendations";
import { useTvCollections } from "../hooks/useTvCollections";
import { createCollectionRowAllocator } from "../utils/collectionRows";
import { excludeMediaItems } from "../utils/recommendations";
import { buildSearchHref } from "../utils/searchLinks";
import tvSeriesBanner from "../assets/images/tvseries-banner.webp";

const CURATED_ROW_LIMIT = 28;

function TVSeriesPage() {
  const { collections, isLoading, errorMessage, reload } = useTvCollections();
  const recommendations = usePersonalRecommendations("tv");

  const recommendationItems =
    recommendations.available && recommendations.basis
      ? excludeMediaItems(
          recommendations.items,
          collections.trendingAndCurrentlyAiring,
        ).slice(0, 24)
      : [];

  const allocateRow = createCollectionRowAllocator([
    ...collections.trendingAndCurrentlyAiring,
    ...recommendationItems,
  ]);

  const essentials = allocateRow(collections.essentials, CURATED_ROW_LIMIT);
  const actionCrimeThriller = allocateRow(
    collections.actionCrimeThriller,
    CURATED_ROW_LIMIT,
  );
  const comedyDrama = allocateRow(
    collections.comedyDrama,
    CURATED_ROW_LIMIT,
  );
  const mysteryScienceFiction = allocateRow(
    collections.mysteryScienceFiction,
    CURATED_ROW_LIMIT,
  );

  const hasTvCollections = [
    collections.trendingAndCurrentlyAiring,
    collections.essentials,
    collections.actionCrimeThriller,
    collections.comedyDrama,
    collections.mysteryScienceFiction,
  ].some((items) => items.length > 0);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <PageBanner
        eyebrow="TV Series"
        title="Discover TV series for every kind of binge"
        description="Search for a show or explore current series, FilmGeezer essentials, and curated genre collections."
        imageUrl={tvSeriesBanner}
        mobileAmbientPosition="74% center"
        mobileArtworkWidth="240%"
        mobileArtworkRight="-18%"
        mobileArtworkTop="1rem"
        desktopImagePosition="right center"
      >
        <BannerSearch
          ariaLabel="Search TV series"
          placeholder="Search Breaking Bad, Severance..."
          scope="tv"
        />
      </PageBanner>

      {isLoading && (
        <CollectionRowsSkeleton
          rowCount={5}
          label="Loading curated TV Series collections"
        />
      )}

      {!isLoading && errorMessage && (
        <section className="py-8">
          <ContentContainer>
            <ErrorState message={errorMessage} onRetry={reload} />
          </ContentContainer>
        </section>
      )}

      {!isLoading && !errorMessage && !hasTvCollections && (
        <section className="py-8">
          <ContentContainer>
            <EmptyState
              title="No TV collections are available"
              message="FilmGeezer could not find suitable TV collections at the moment. Please try again shortly."
            />
          </ContentContainer>
        </section>
      )}

      {!isLoading && !errorMessage && hasTvCollections && (
        <>
          {collections.trendingAndCurrentlyAiring.length > 0 && (
            <MediaRow
              title="Trending & Currently Airing"
              description="Current TV series and shows receiving strong audience attention."
              items={collections.trendingAndCurrentlyAiring}
              viewMoreHref={buildSearchHref({
                scope: "tv",
                preset: "trending",
              })}
            />
          )}

          {recommendations.basis && recommendationItems.length > 0 && (
            <PersonalRecommendationsRow
              category="tv"
              basis={recommendations.basis}
              items={recommendationItems}
            />
          )}

          {essentials.length > 0 && (
            <MediaRow
              title="FilmGeezer TV Essentials"
              description="Recognisable, highly regarded series selected using rating, popularity, and audience confidence."
              items={essentials}
              viewMoreHref={buildSearchHref({
                scope: "tv",
                preset: "essentials",
              })}
            />
          )}

          {actionCrimeThriller.length > 0 && (
            <MediaRow
              title="Action, Crime & Thriller"
              description="High-stakes adventures, investigations, dangerous conflicts, and suspense."
              items={actionCrimeThriller}
              viewMoreHref={buildSearchHref({
                scope: "tv",
                genres: ["Action & Adventure", "Crime", "Mystery"],
                genreMode: "any",
                minRating: "6",
              })}
            />
          )}

          {comedyDrama.length > 0 && (
            <MediaRow
              title="Comedy & Drama"
              description="Funny, warm, and grounded character stories without action-heavy series taking over the row."
              items={comedyDrama}
              viewMoreHref={buildSearchHref({
                scope: "tv",
                preset: "tv-comedy-drama",
                genres: ["Comedy", "Drama"],
                genreMode: "any",
                minRating: "6",
              })}
            />
          )}

          {mysteryScienceFiction.length > 0 && (
            <MediaRow
              title="Mystery & Science Fiction"
              description="Unexplained events, speculative worlds, fantasy, and science-fiction stories."
              items={mysteryScienceFiction}
              viewMoreHref={buildSearchHref({
                scope: "tv",
                genres: ["Mystery", "Sci-Fi & Fantasy"],
                genreMode: "any",
                minRating: "6",
              })}
            />
          )}
        </>
      )}
    </main>
  );
}

export default TVSeriesPage;
