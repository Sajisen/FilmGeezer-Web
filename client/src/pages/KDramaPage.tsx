import BannerSearch from "../components/BannerSearch";
import ContentContainer from "../components/layout/ContentContainer";
import MediaRow from "../components/MediaRow";
import PageBanner from "../components/PageBanner";
import EmptyState from "../components/states/EmptyState";
import ErrorState from "../components/states/ErrorState";
import LoadingState from "../components/states/LoadingState";
import { useKDramaCollections } from "../hooks/useKDramaCollections";
import kdramaBanner from "../assets/images/kdrama-banner.png";

function KDramaPage() {
  const { collections, isLoading, errorMessage, reload } =
    useKDramaCollections();

  const hasKDramaCollections = Object.values(collections).some(
    (items) => items.length > 0,
  );

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <PageBanner
        eyebrow="K-Drama"
        title="Discover Korean stories for every kind of mood"
        description="Search for a Korean title or explore current favourites, FilmGeezer essentials, romance, thrillers, mysteries, and feel-good collections."
        imageUrl={kdramaBanner}
        mobileAmbientPosition="74% center"
        mobileArtworkWidth="240%"
        mobileArtworkRight="-18%"
        mobileArtworkTop="1rem"
        desktopImagePosition="right center"
      >
        <BannerSearch
          ariaLabel="Search K-Drama titles"
          placeholder="Search Crash Landing on You, Moving..."
          scope="k-drama"
        />
      </PageBanner>

      {isLoading && (
        <section className="py-8">
          <ContentContainer>
            <LoadingState
              title="Loading K-Drama collections"
              message="Please wait while FilmGeezer prepares trending, essential, and genre-based Korean movies and series."
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

      {!isLoading && !errorMessage && !hasKDramaCollections && (
        <section className="py-8">
          <ContentContainer>
            <EmptyState
              title="No K-Drama collections are available"
              message="FilmGeezer could not find suitable K-Drama collections at the moment. Please try again shortly."
            />
          </ContentContainer>
        </section>
      )}

      {!isLoading && !errorMessage && hasKDramaCollections && (
        <>
          {collections.trendingKDramas.length > 0 && (
            <MediaRow
              title="Trending K-Dramas"
              description="Currently airing series, recent Korean movies, and titles receiving strong audience attention."
              items={collections.trendingKDramas}
            />
          )}

          {collections.essentials.length > 0 && (
            <MediaRow
              title="FilmGeezer K-Drama Essentials"
              description="Recognisable Korean movies and series selected using rating, popularity, audience confidence, and lasting interest."
              items={collections.essentials}
            />
          )}

          {collections.romance.length > 0 && (
            <MediaRow
              title="Romance K-Dramas"
              description="Relationship-focused Korean stories ranging from heartfelt romance to romantic comedy."
              items={collections.romance}
            />
          )}

          {collections.actionCrimeThriller.length > 0 && (
            <MediaRow
              title="Action, Crime & Thriller"
              description="High-stakes conflicts, dangerous missions, criminal investigations, and tense Korean thrillers."
              items={collections.actionCrimeThriller}
            />
          )}

          {collections.mysterySuspense.length > 0 && (
            <MediaRow
              title="Mystery & Suspense"
              description="Secrets, investigations, psychological tension, and stories that keep their answers hidden."
              items={collections.mysterySuspense}
            />
          )}

          {collections.comedyFeelGood.length > 0 && (
            <MediaRow
              title="Comedy & Feel-Good"
              description="Funny, warm, and comforting Korean stories built around friendship, family, and community."
              items={collections.comedyFeelGood}
            />
          )}
        </>
      )}
    </main>
  );
}

export default KDramaPage;
