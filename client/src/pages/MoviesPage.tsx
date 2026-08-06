import BannerSearch from "../components/BannerSearch";
import ContentContainer from "../components/layout/ContentContainer";
import MediaRow from "../components/MediaRow";
import PageBanner from "../components/PageBanner";
import PersonalRecommendationsRow from "../components/PersonalRecommendationsRow";
import EmptyState from "../components/states/EmptyState";
import ErrorState from "../components/states/ErrorState";
import CollectionRowsSkeleton from "../components/skeletons/CollectionRowsSkeleton";
import { useMovieCollections } from "../hooks/useMovieCollections";
import { usePersonalRecommendations } from "../hooks/usePersonalRecommendations";
import { createCollectionRowAllocator } from "../utils/collectionRows";
import { excludeMediaItems } from "../utils/recommendations";
import { buildSearchHref } from "../utils/searchLinks";
import moviesBanner from "../assets/images/movies-banner.png";

const CURATED_ROW_LIMIT = 28;

function MoviesPage() {
  const { collections, isLoading, errorMessage, reload } =
    useMovieCollections();
  const recommendations = usePersonalRecommendations("movie");

  const recommendationItems =
    recommendations.available && recommendations.basis
      ? excludeMediaItems(
          recommendations.items,
          collections.trendingAndNowPlaying,
        ).slice(0, 24)
      : [];

  const allocateRow = createCollectionRowAllocator([
    ...collections.trendingAndNowPlaying,
    ...recommendationItems,
  ]);

  const essentials = allocateRow(
    collections.essentials,
    CURATED_ROW_LIMIT,
  );
  const actionAdventureCrimeThriller = allocateRow(
    collections.actionAdventureCrimeThriller,
    CURATED_ROW_LIMIT,
  );
  const comedy = allocateRow(collections.comedy, CURATED_ROW_LIMIT);
  const drama = allocateRow(
    collections.drama,
    CURATED_ROW_LIMIT,
  );
  const family = allocateRow(collections.family, CURATED_ROW_LIMIT);

  const hasMovieCollections = [
    collections.trendingAndNowPlaying,
    collections.essentials,
    collections.actionAdventureCrimeThriller,
    collections.comedy,
    collections.drama,
    collections.family,
  ].some((items) => items.length > 0);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <PageBanner
        eyebrow="Movies"
        title="Discover movies for every kind of watch night"
        description="Search for a film or explore current releases, FilmGeezer essentials, and curated genre collections."
        imageUrl={moviesBanner}
        mobileAmbientPosition="74% center"
        mobileArtworkWidth="240%"
        mobileArtworkRight="-18%"
        mobileArtworkTop="1rem"
        desktopImagePosition="right center"
      >
        <BannerSearch
          ariaLabel="Search movies"
          placeholder="Search Interstellar, The Dark Knight..."
          scope="movie"
        />
      </PageBanner>

      {isLoading && (
        <CollectionRowsSkeleton
          rowCount={6}
          label="Loading curated Movie collections"
        />
      )}

      {!isLoading && errorMessage && (
        <section className="py-8">
          <ContentContainer>
            <ErrorState message={errorMessage} onRetry={reload} />
          </ContentContainer>
        </section>
      )}

      {!isLoading && !errorMessage && !hasMovieCollections && (
        <section className="py-8">
          <ContentContainer>
            <EmptyState
              title="No movie collections are available"
              message="FilmGeezer could not find suitable movie collections at the moment. Please try again shortly."
            />
          </ContentContainer>
        </section>
      )}

      {!isLoading && !errorMessage && hasMovieCollections && (
        <>
          {collections.trendingAndNowPlaying.length > 0 && (
            <MediaRow
              title="Trending & Now Playing"
              description="Current releases and movies receiving strong audience attention."
              items={collections.trendingAndNowPlaying}
              viewMoreHref={buildSearchHref({
                scope: "movie",
                preset: "trending",
              })}
            />
          )}

          {recommendations.basis && recommendationItems.length > 0 && (
            <PersonalRecommendationsRow
              category="movie"
              basis={recommendations.basis}
              items={recommendationItems}
            />
          )}

          {essentials.length > 0 && (
            <MediaRow
              title="FilmGeezer Essentials"
              description="Recognisable, highly regarded movies selected using rating, popularity, and audience confidence."
              items={essentials}
              viewMoreHref={buildSearchHref({
                scope: "movie",
                preset: "essentials",
              })}
            />
          )}

          {actionAdventureCrimeThriller.length > 0 && (
            <MediaRow
              title="Action, Adventure, Crime & Thriller"
              description="High-energy stories, dangerous missions, investigations, and suspense."
              items={actionAdventureCrimeThriller}
              viewMoreHref={buildSearchHref({
                scope: "movie",
                genres: ["Action", "Adventure", "Crime", "Thriller"],
                genreMode: "any",
                minRating: "6",
              })}
            />
          )}

          {comedy.length > 0 && (
            <MediaRow
              title="Comedy"
              description="Popular comedies and lighter movies worth adding to your Watchlist."
              items={comedy}
              viewMoreHref={buildSearchHref({
                scope: "movie",
                genres: ["Comedy"],
                minRating: "6",
              })}
            />
          )}

          {drama.length > 0 && (
            <MediaRow
              title="Drama"
              description="Grounded, character-driven stories without action-heavy titles dominating the row."
              items={drama}
              viewMoreHref={buildSearchHref({
                scope: "movie",
                preset: "movie-drama",
                genres: ["Drama"],
                minRating: "6",
              })}
            />
          )}

          {family.length > 0 && (
            <MediaRow
              title="Family"
              description="Accessible family movies and suitable animated favourites."
              items={family}
              viewMoreHref={buildSearchHref({
                scope: "movie",
                genres: ["Family"],
                minRating: "6",
              })}
            />
          )}
        </>
      )}
    </main>
  );
}

export default MoviesPage;
