import BannerSearch from "../components/BannerSearch";
import ContentContainer from "../components/layout/ContentContainer";
import MediaRow from "../components/MediaRow";
import PageBanner from "../components/PageBanner";
import EmptyState from "../components/states/EmptyState";
import ErrorState from "../components/states/ErrorState";
import LoadingState from "../components/states/LoadingState";
import { useHomeCollections } from "../hooks/useHomeCollections";
import homeBanner from "../assets/images/home-banner2.png";

function HomePage() {
  const { collections, isLoading, errorMessage, reload } = useHomeCollections();

  const hasHomeMedia = Object.values(collections).some(
    (items) => items.length > 0,
  );

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <PageBanner
        eyebrow="FilmGeezer Web"
        title="Discover movies, TV series, anime, and K-dramas"
        description="Search for a title or explore the entertainment people are watching now across FilmGeezer's four main categories."
        imageUrl={homeBanner}
        mobileAmbientPosition="74% center"
        mobileArtworkWidth="240%"
        mobileArtworkRight="-18%"
        mobileArtworkTop="1rem"
        desktopImagePosition="right center"
      >
        <BannerSearch
          ariaLabel="Search FilmGeezer titles"
          placeholder="Search Interstellar, Breaking Bad..."
        />
      </PageBanner>

      {isLoading && (
        <section className="py-8">
          <ContentContainer>
            <LoadingState
              title="Loading trending titles"
              message="Please wait while we prepare movies, TV series, anime, and K-dramas."
            />
          </ContentContainer>
        </section>
      )}

      {!isLoading && errorMessage && (
        <section className="py-8">
          <ContentContainer>
            <ErrorState message={errorMessage} onRetry={reload} />
          </ContentContainer>
        </section>
      )}

      {!isLoading && !errorMessage && !hasHomeMedia && (
        <section className="py-8">
          <ContentContainer>
            <EmptyState
              title="No trending titles are available"
              message="FilmGeezer could not find suitable Home-page collections at the moment. Please try again shortly."
            />
          </ContentContainer>
        </section>
      )}

      {!isLoading && !errorMessage && hasHomeMedia && (
        <>
          <MediaRow
            title="Trending Movies"
            description="Current movie trends, kept separate from Anime."
            items={collections.trendingMovies}
          />

          <MediaRow
            title="Trending TV Series"
            description="Current TV trends, excluding Anime and K-dramas shown in their own rows."
            items={collections.trendingTv}
          />

          <MediaRow
            title="Trending Anime"
            description="Anime movies and series receiving current audience attention."
            items={collections.trendingAnime}
          />

          <MediaRow
            title="Trending K-Dramas"
            description="Korean drama series receiving current audience attention."
            items={collections.trendingKDrama}
          />
        </>
      )}
    </main>
  );
}

export default HomePage;
