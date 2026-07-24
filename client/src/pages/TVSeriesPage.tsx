import BannerSearch from "../components/BannerSearch";
import ContentContainer from "../components/layout/ContentContainer";
import MediaRow from "../components/MediaRow";
import PageBanner from "../components/PageBanner";
import EmptyState from "../components/states/EmptyState";
import ErrorState from "../components/states/ErrorState";
import CollectionRowsSkeleton from "../components/skeletons/CollectionRowsSkeleton";
import { useTvCollections } from "../hooks/useTvCollections";
import { buildSearchHref } from "../utils/searchLinks";
import tvSeriesBanner from "../assets/images/tvseries-banner.png";

function TVSeriesPage() {
  const { collections, isLoading, errorMessage, reload } = useTvCollections();

  const hasTvCollections = Object.values(collections).some(
    (items) => items.length > 0,
  );

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
          rowCount={4}
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
              viewMoreHref={buildSearchHref({ scope: "tv", preset: "trending" })}
            />
          )}

          {collections.essentials.length > 0 && (
            <MediaRow
              title="FilmGeezer TV Essentials"
              description="Recognisable, highly regarded series selected using rating, popularity, and audience confidence."
              items={collections.essentials}
              viewMoreHref={buildSearchHref({ scope: "tv", preset: "essentials" })}
            />
          )}

          {collections.actionCrimeThriller.length > 0 && (
            <MediaRow
              title="Action, Crime & Thriller"
              description="High-stakes adventures, investigations, dangerous conflicts, and suspense."
              items={collections.actionCrimeThriller}
              viewMoreHref={buildSearchHref({ scope: "tv", genres: ["Action & Adventure", "Crime", "Mystery"], genreMode: "any", minRating: "6" })}
            />
          )}

          {collections.comedy.length > 0 && (
            <MediaRow
              title="Comedy"
              description="Popular comedies and lighter series worth adding to your watch list."
              items={collections.comedy}
              viewMoreHref={buildSearchHref({ scope: "tv", genres: ["Comedy"], minRating: "6" })}
            />
          )}

          {collections.dramaRomance.length > 0 && (
            <MediaRow
              title="Drama & Romance"
              description="Character-driven and emotional series, including relationship-focused stories."
              items={collections.dramaRomance}
              viewMoreHref={buildSearchHref({ scope: "tv", genres: ["Drama"], minRating: "6" })}
            />
          )}

          {collections.mysteryScienceFiction.length > 0 && (
            <MediaRow
              title="Mystery & Science Fiction"
              description="Unexplained events, speculative worlds, fantasy, and science-fiction stories."
              items={collections.mysteryScienceFiction}
              viewMoreHref={buildSearchHref({ scope: "tv", genres: ["Mystery", "Sci-Fi & Fantasy"], genreMode: "any", minRating: "6" })}
            />
          )}
        </>
      )}
    </main>
  );
}

export default TVSeriesPage;
