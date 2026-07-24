import BannerSearch from "../components/BannerSearch";
import ContentContainer from "../components/layout/ContentContainer";
import MediaRow from "../components/MediaRow";
import PageBanner from "../components/PageBanner";
import EmptyState from "../components/states/EmptyState";
import ErrorState from "../components/states/ErrorState";
import CollectionRowsSkeleton from "../components/skeletons/CollectionRowsSkeleton";
import { useMovieCollections } from "../hooks/useMovieCollections";
import { buildSearchHref } from "../utils/searchLinks";
import moviesBanner from "../assets/images/movies-banner.png";

function MoviesPage() {
  const { collections, isLoading, errorMessage, reload } =
    useMovieCollections();

  const hasMovieCollections = Object.values(collections).some(
    (items) => items.length > 0,
  );

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
          rowCount={4}
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
              viewMoreHref={buildSearchHref({ scope: "movie", preset: "trending" })}
            />
          )}

          {collections.essentials.length > 0 && (
            <MediaRow
              title="FilmGeezer Essentials"
              description="Recognisable, highly regarded movies selected using rating, popularity, and audience confidence."
              items={collections.essentials}
              viewMoreHref={buildSearchHref({ scope: "movie", preset: "essentials" })}
            />
          )}

          {collections.actionAdventureCrimeThriller.length > 0 && (
            <MediaRow
              title="Action, Adventure, Crime & Thriller"
              description="High-energy stories, dangerous missions, investigations, and suspense."
              items={collections.actionAdventureCrimeThriller}
              viewMoreHref={buildSearchHref({ scope: "movie", genres: ["Action", "Adventure", "Crime", "Thriller"], genreMode: "any", minRating: "6" })}
            />
          )}

          {collections.comedy.length > 0 && (
            <MediaRow
              title="Comedy"
              description="Popular comedies and lighter movies worth adding to your watch list."
              items={collections.comedy}
              viewMoreHref={buildSearchHref({ scope: "movie", genres: ["Comedy"], minRating: "6" })}
            />
          )}

          {collections.dramaRomance.length > 0 && (
            <MediaRow
              title="Drama & Romance"
              description="Character-driven, emotional, and relationship-focused movies."
              items={collections.dramaRomance}
              viewMoreHref={buildSearchHref({ scope: "movie", genres: ["Drama", "Romance"], genreMode: "any", minRating: "6" })}
            />
          )}

          {collections.family.length > 0 && (
            <MediaRow
              title="Family"
              description="Accessible family movies and suitable animated favourites."
              items={collections.family}
              viewMoreHref={buildSearchHref({ scope: "movie", genres: ["Family"], minRating: "6" })}
            />
          )}
        </>
      )}
    </main>
  );
}

export default MoviesPage;
