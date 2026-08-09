import BannerSearch from "../components/BannerSearch";
import ContentContainer from "../components/layout/ContentContainer";
import MediaRow from "../components/MediaRow";
import PageBanner from "../components/PageBanner";
import PersonalRecommendationsRow from "../components/PersonalRecommendationsRow";
import EmptyState from "../components/states/EmptyState";
import ErrorState from "../components/states/ErrorState";
import CollectionRowsSkeleton from "../components/skeletons/CollectionRowsSkeleton";
import { useAnimeCollections } from "../hooks/useAnimeCollections";
import { usePersonalRecommendations } from "../hooks/usePersonalRecommendations";
import { createCollectionRowAllocator } from "../utils/collectionRows";
import { excludeMediaItems } from "../utils/recommendations";
import { buildSearchHref } from "../utils/searchLinks";
import animeBanner from "../assets/images/anime-banner.webp";

const CURATED_ROW_LIMIT = 28;

function AnimePage() {
  const { collections, isLoading, errorMessage, reload } =
    useAnimeCollections();
  const recommendations = usePersonalRecommendations("anime");

  const recommendationItems =
    recommendations.available && recommendations.basis
      ? excludeMediaItems(
          recommendations.items,
          collections.trendingAnime,
        ).slice(0, 24)
      : [];

  const allocateRow = createCollectionRowAllocator([
    ...collections.trendingAnime,
    ...recommendationItems,
  ]);

  const essentials = allocateRow(collections.essentials, CURATED_ROW_LIMIT);
  const actionAdventureThriller = allocateRow(
    collections.actionAdventureThriller,
    CURATED_ROW_LIMIT,
  );
  const fantasyMysteryScienceFiction = allocateRow(
    collections.fantasyMysteryScienceFiction,
    CURATED_ROW_LIMIT,
  );
  const romanceDramaComedy = allocateRow(
    collections.romanceDramaComedy,
    CURATED_ROW_LIMIT,
  );
  const sports = allocateRow(collections.sports, CURATED_ROW_LIMIT);

  const hasAnimeCollections = [
    collections.trendingAnime,
    collections.essentials,
    collections.actionAdventureThriller,
    collections.fantasyMysteryScienceFiction,
    collections.romanceDramaComedy,
    collections.sports,
  ].some((items) => items.length > 0);

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
          rowCount={6}
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
              viewMoreHref={buildSearchHref({
                scope: "anime",
                preset: "trending",
              })}
            />
          )}

          {recommendations.basis && recommendationItems.length > 0 && (
            <PersonalRecommendationsRow
              category="anime"
              basis={recommendations.basis}
              items={recommendationItems}
            />
          )}

          {essentials.length > 0 && (
            <MediaRow
              title="FilmGeezer Anime Essentials"
              description="Recognisable and highly regarded Anime selected using rating, popularity, and audience confidence."
              items={essentials}
              viewMoreHref={buildSearchHref({
                scope: "anime",
                preset: "essentials",
              })}
            />
          )}

          {actionAdventureThriller.length > 0 && (
            <MediaRow
              title="Action, Adventure & Thriller"
              description="High-energy battles, dangerous journeys, intense missions, and suspenseful stories."
              items={actionAdventureThriller}
              viewMoreHref={buildSearchHref({
                scope: "anime",
                genres: [
                  "Action",
                  "Action & Adventure",
                  "Adventure",
                  "Thriller",
                ],
                genreMode: "any",
                minRating: "6",
              })}
            />
          )}

          {fantasyMysteryScienceFiction.length > 0 && (
            <MediaRow
              title="Fantasy, Mystery & Science Fiction"
              description="Supernatural worlds, unexplained events, futuristic ideas, and imaginative adventures."
              items={fantasyMysteryScienceFiction}
              viewMoreHref={buildSearchHref({
                scope: "anime",
                genres: [
                  "Fantasy",
                  "Mystery",
                  "Science Fiction",
                  "Sci-Fi & Fantasy",
                ],
                genreMode: "any",
                minRating: "6",
              })}
            />
          )}

          {romanceDramaComedy.length > 0 && (
            <MediaRow
              title="Romance, Drama & Comedy"
              description="Emotional relationships, grounded character stories, humour, and lighter everyday moments."
              items={romanceDramaComedy}
              viewMoreHref={buildSearchHref({
                scope: "anime",
                preset: "anime-romance-drama-comedy",
                genres: ["Romance", "Drama", "Comedy"],
                genreMode: "any",
                minRating: "6",
              })}
            />
          )}

          {sports.length > 0 && (
            <MediaRow
              title="Sports Anime"
              description="Competition, teamwork, training, rivalry, and the drive to improve."
              items={sports}
              viewMoreHref={buildSearchHref({
                scope: "anime",
                preset: "sports",
              })}
            />
          )}
        </>
      )}
    </main>
  );
}

export default AnimePage;
