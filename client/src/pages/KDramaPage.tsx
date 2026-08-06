import BannerSearch from "../components/BannerSearch";
import ContentContainer from "../components/layout/ContentContainer";
import MediaRow from "../components/MediaRow";
import PageBanner from "../components/PageBanner";
import PersonalRecommendationsRow from "../components/PersonalRecommendationsRow";
import EmptyState from "../components/states/EmptyState";
import ErrorState from "../components/states/ErrorState";
import CollectionRowsSkeleton from "../components/skeletons/CollectionRowsSkeleton";
import { useKDramaCollections } from "../hooks/useKDramaCollections";
import { usePersonalRecommendations } from "../hooks/usePersonalRecommendations";
import { createCollectionRowAllocator } from "../utils/collectionRows";
import { excludeMediaItems } from "../utils/recommendations";
import { buildSearchHref } from "../utils/searchLinks";
import kdramaBanner from "../assets/images/kdrama-banner.png";

const CURATED_ROW_LIMIT = 28;

function KDramaPage() {
  const { collections, isLoading, errorMessage, reload } =
    useKDramaCollections();
  const recommendations = usePersonalRecommendations("kdrama");

  const recommendationItems =
    recommendations.available && recommendations.basis
      ? excludeMediaItems(
          recommendations.items,
          collections.trendingKDramas,
        ).slice(0, 24)
      : [];

  const allocateRow = createCollectionRowAllocator([
    ...collections.trendingKDramas,
    ...recommendationItems,
  ]);

  const essentials = allocateRow(collections.essentials, CURATED_ROW_LIMIT);
  const romance = allocateRow(collections.romance, CURATED_ROW_LIMIT);
  const actionCrimeThriller = allocateRow(
    collections.actionCrimeThriller,
    CURATED_ROW_LIMIT,
  );
  const mysterySuspense = allocateRow(
    collections.mysterySuspense,
    CURATED_ROW_LIMIT,
  );
  const comedyFeelGood = allocateRow(
    collections.comedyFeelGood,
    CURATED_ROW_LIMIT,
  );

  const hasKDramaCollections = [
    collections.trendingKDramas,
    collections.essentials,
    collections.romance,
    collections.actionCrimeThriller,
    collections.mysterySuspense,
    collections.comedyFeelGood,
  ].some((items) => items.length > 0);

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
        <CollectionRowsSkeleton
          rowCount={6}
          label="Loading curated K-Drama collections"
        />
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
              viewMoreHref={buildSearchHref({
                scope: "k-drama",
                preset: "trending",
              })}
            />
          )}

          {recommendations.basis && recommendationItems.length > 0 && (
            <PersonalRecommendationsRow
              category="kdrama"
              basis={recommendations.basis}
              items={recommendationItems}
            />
          )}

          {essentials.length > 0 && (
            <MediaRow
              title="FilmGeezer K-Drama Essentials"
              description="Recognisable Korean movies and series selected using rating, popularity, audience confidence, and lasting interest."
              items={essentials}
              viewMoreHref={buildSearchHref({
                scope: "k-drama",
                preset: "essentials",
              })}
            />
          )}

          {romance.length > 0 && (
            <MediaRow
              title="Romance K-Dramas"
              description="Relationship-focused Korean stories ranging from heartfelt romance to romantic comedy."
              items={romance}
              viewMoreHref={buildSearchHref({
                scope: "k-drama",
                genres: ["Romance", "Comedy"],
                genreMode: "any",
                minRating: "6",
              })}
            />
          )}

          {actionCrimeThriller.length > 0 && (
            <MediaRow
              title="Action, Crime & Thriller"
              description="High-stakes conflicts, dangerous missions, criminal investigations, and tense Korean thrillers."
              items={actionCrimeThriller}
              viewMoreHref={buildSearchHref({
                scope: "k-drama",
                genres: [
                  "Action",
                  "Action & Adventure",
                  "Crime",
                  "Thriller",
                ],
                genreMode: "any",
                minRating: "6",
              })}
            />
          )}

          {mysterySuspense.length > 0 && (
            <MediaRow
              title="Mystery & Suspense"
              description="Secrets, investigations, psychological tension, and stories that keep their answers hidden."
              items={mysterySuspense}
              viewMoreHref={buildSearchHref({
                scope: "k-drama",
                genres: ["Mystery", "Thriller"],
                genreMode: "any",
                minRating: "6",
              })}
            />
          )}

          {comedyFeelGood.length > 0 && (
            <MediaRow
              title="Comedy & Feel-Good"
              description="Funny, warm, and comforting Korean stories built around friendship, family, and community."
              items={comedyFeelGood}
              viewMoreHref={buildSearchHref({
                scope: "k-drama",
                genres: ["Comedy", "Family"],
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

export default KDramaPage;
