import BannerSearch from "../components/BannerSearch";
import ContentContainer from "../components/layout/ContentContainer";
import MediaRow from "../components/MediaRow";
import PageBanner from "../components/PageBanner";
import EmptyState from "../components/states/EmptyState";
import ErrorState from "../components/states/ErrorState";
import CollectionRowsSkeleton from "../components/skeletons/CollectionRowsSkeleton";
import { useAnimeCollections } from "../hooks/useAnimeCollections";

import { buildSearchHref } from "../utils/searchLinks";
import animeBanner from "../assets/images/anime-banner.png";

function AnimePage() {
  const { collections, isLoading, errorMessage, reload } =
    useAnimeCollections();

  const hasAnimeCollections = Object.values(collections).some(
    (items) => items.length > 0,
  );

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <PageBanner
        eyebrow="Anime"
        title="Discover anime for every kind of watch session"
        description="Search for an Anime title or explore current favourites, FilmGeezer essentials, and curated genre collections."
        imageUrl={animeBanner}
        mobileAmbientPosition="74% center"
        mobileArtworkWidth="240%"
        mobileArtworkRight="-18%"
        mobileArtworkTop="1rem"
        desktopImagePosition="right center"
      >
        <BannerSearch
          ariaLabel="Search Anime titles"
          placeholder="Search One Piece, Jujutsu Kaisen..."
          scope="anime"
        />
      </PageBanner>

      {isLoading && (
        <CollectionRowsSkeleton
          rowCount={4}
          label="Loading curated Anime collections"
        />
      )}

      {!isLoading && errorMessage && (
        <section className="py-8">
          <ContentContainer>
            <ErrorState message={errorMessage} onRetry={reload} />
          </ContentContainer>
        </section>
      )}

      {!isLoading && !errorMessage && !hasAnimeCollections && (
        <section className="py-8">
          <ContentContainer>
            <EmptyState
              title="No Anime collections are available"
              message="FilmGeezer could not find suitable Anime collections at the moment. Please try again shortly."
            />
          </ContentContainer>
        </section>
      )}

      {!isLoading && !errorMessage && hasAnimeCollections && (
        <>
          {collections.trendingAnime.length > 0 && (
            <MediaRow
              title="Trending Anime"
              description="Anime movies and series receiving current audience attention."
              items={collections.trendingAnime}
              viewMoreHref={buildSearchHref({ scope: "anime", preset: "trending" })}
            />
          )}

          {collections.essentials.length > 0 && (
            <MediaRow
              title="FilmGeezer Anime Essentials"
              description="Recognisable and highly regarded Anime selected using rating, popularity, and audience confidence."
              items={collections.essentials}
              viewMoreHref={buildSearchHref({ scope: "anime", preset: "essentials" })}
            />
          )}

          {collections.actionAdventureThriller.length > 0 && (
            <MediaRow
              title="Action, Adventure & Thriller"
              description="High-energy battles, dangerous journeys, intense missions, and suspenseful stories."
              items={collections.actionAdventureThriller}
              viewMoreHref={buildSearchHref({ scope: "anime", genres: ["Action", "Action & Adventure", "Adventure", "Thriller"], genreMode: "any", minRating: "6" })}
            />
          )}

          {collections.fantasyMysteryScienceFiction.length > 0 && (
            <MediaRow
              title="Fantasy, Mystery & Science Fiction"
              description="Supernatural worlds, unexplained events, futuristic ideas, and imaginative adventures."
              items={collections.fantasyMysteryScienceFiction}
              viewMoreHref={buildSearchHref({ scope: "anime", genres: ["Fantasy", "Mystery", "Science Fiction", "Sci-Fi & Fantasy"], genreMode: "any", minRating: "6" })}
            />
          )}

          {collections.romanceDrama.length > 0 && (
            <MediaRow
              title="Romance & Drama"
              description="Emotional, character-driven, and relationship-focused Anime stories."
              items={collections.romanceDrama}
              viewMoreHref={buildSearchHref({ scope: "anime", genres: ["Romance", "Drama"], genreMode: "any", minRating: "6" })}
            />
          )}

          {collections.comedySliceOfLife.length > 0 && (
            <MediaRow
              title="Comedy & Slice of Life"
              description="Funny, comforting, and everyday stories with lighter moments and memorable characters."
              items={collections.comedySliceOfLife}
              viewMoreHref={buildSearchHref({ scope: "anime", genres: ["Comedy", "Drama"], genreMode: "any", minRating: "6" })}
            />
          )}
        </>
      )}
    </main>
  );
}

export default AnimePage;
