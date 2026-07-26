import type {
  FeaturedCharacter,
} from "../types/featuredCharacter.js";
import type {
  MediaDetails,
} from "../types/media.js";

const ANILIST_GRAPHQL_URL =
  "https://graphql.anilist.co";

interface AniListCharacterEdge {
  role:
    | "MAIN"
    | "SUPPORTING"
    | "BACKGROUND";

  node: {
    id: number;

    name: {
      full: string;
      native?: string | null;
    };

    image: {
      large?: string | null;
      medium?: string | null;
    };

    siteUrl?: string | null;
    favourites?: number;
  };
}

interface AniListMediaCandidate {
  id: number;

  title: {
    romaji?: string | null;
    english?: string | null;
    native?: string | null;
  };

  synonyms?: string[];
  format?: string | null;

  startDate?: {
    year?: number | null;
  };

  episodes?: number | null;

  characters?: {
    edges?: AniListCharacterEdge[];
  };
}

interface AniListSearchData {
  Page?: {
    media?: AniListMediaCandidate[];
  };
}

interface AniListGraphQlResponse<T> {
  data?: T;

  errors?: Array<{
    message: string;
    status?: number;
  }>;
}

interface AniListFeaturedCharactersResult {
  matchedTitle: string;
  items: FeaturedCharacter[];
}

const FEATURED_CHARACTERS_QUERY = `
  query FeaturedCharacters(
    $search: String!
  ) {
    Page(
      page: 1
      perPage: 5
    ) {
      media(
        search: $search
        type: ANIME
        isAdult: false
      ) {
        id

        title {
          romaji
          english
          native
        }

        synonyms
        format

        startDate {
          year
        }

        episodes

        characters(
          page: 1
          perPage: 25
          sort: [
            ROLE
            FAVOURITES_DESC
          ]
        ) {
          edges {
            role

            node {
              id

              name {
                full
                native
              }

              image {
                large
                medium
              }

              siteUrl
              favourites
            }
          }
        }
      }
    }
  }
`;

function normalizeTitle(
  title: string,
) {
  return title
    .normalize("NFKD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .toLocaleLowerCase()
    .replace(
      /[^a-z0-9\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]+/g,
      "",
    );
}

function getCandidateTitles(
  candidate:
    AniListMediaCandidate,
) {
  return [
    candidate.title.english,
    candidate.title.romaji,
    candidate.title.native,
    ...(candidate.synonyms ?? []),
  ].filter(
    (title): title is string =>
      Boolean(title?.trim()),
  );
}

function getFormatScore(
  mediaType:
    MediaDetails["mediaType"],
  format?: string | null,
) {
  if (!format) {
    return 0;
  }

  if (mediaType === "movie") {
    return format === "MOVIE"
      ? 20
      : 0;
  }

  return [
    "TV",
    "TV_SHORT",
    "ONA",
    "OVA",
  ].includes(format)
    ? 20
    : 0;
}

function calculateMatchScore(
  candidate:
    AniListMediaCandidate,
  details: MediaDetails,
) {
  const targetTitles = [
    details.title,
    details.originalTitle,
  ]
    .filter(Boolean)
    .map(normalizeTitle)
    .filter(Boolean);

  const candidateTitles =
    getCandidateTitles(candidate)
      .map(normalizeTitle)
      .filter(Boolean);

  const hasExactTitle =
    targetTitles.some((targetTitle) =>
      candidateTitles.includes(
        targetTitle,
      ),
    );

  const hasContainedTitle =
    !hasExactTitle &&
    targetTitles.some(
      (targetTitle) =>
        targetTitle.length >= 5 &&
        candidateTitles.some(
          (candidateTitle) =>
            candidateTitle.includes(
              targetTitle,
            ) ||
            targetTitle.includes(
              candidateTitle,
            ),
        ),
    );

  if (
    !hasExactTitle &&
    !hasContainedTitle
  ) {
    return 0;
  }

  let score = hasExactTitle
    ? 100
    : 60;

  const detailsYear =
    Number(details.year);

  const candidateYear =
    candidate.startDate?.year ?? 0;

  if (
    detailsYear > 0 &&
    candidateYear > 0
  ) {
    if (
      detailsYear === candidateYear
    ) {
      score += 25;
    } else if (
      Math.abs(
        detailsYear -
          candidateYear,
      ) === 1
    ) {
      score += 10;
    }
  }

  score += getFormatScore(
    details.mediaType,
    candidate.format,
  );

  if (
    details.numberOfEpisodes &&
    candidate.episodes
  ) {
    const episodeDifference =
      Math.abs(
        details.numberOfEpisodes -
          candidate.episodes,
      );

    if (episodeDifference === 0) {
      score += 10;
    } else if (
      episodeDifference <= 2
    ) {
      score += 5;
    }
  }

  return score;
}

async function searchAniListMedia(
  searchText: string,
) {
  const response = await fetch(
    ANILIST_GRAPHQL_URL,
    {
      method: "POST",

      headers: {
        Accept:
          "application/json",

        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        query:
          FEATURED_CHARACTERS_QUERY,

        variables: {
          search: searchText,
        },
      }),
    },
  );

  const payload =
    (await response.json()) as
      AniListGraphQlResponse<
        AniListSearchData
      >;

  if (
    !response.ok ||
    payload.errors?.length
  ) {
    const message =
      payload.errors?.[0]
        ?.message ??
      "AniList request failed.";

    throw new Error(message);
  }

  return (
    payload.data?.Page?.media ??
    []
  );
}

function getMatchedTitle(
  candidate:
    AniListMediaCandidate,
) {
  return (
    candidate.title.english ||
    candidate.title.romaji ||
    candidate.title.native ||
    ""
  );
}

function mapAniListCharacters(
  candidate:
    AniListMediaCandidate,
) {
  const usedCharacterIds =
    new Set<number>();

  return (
    candidate.characters?.edges ??
    []
  )
    .filter(
      (edge) =>
        edge.role !==
        "BACKGROUND",
    )
    .filter((edge) => {
      if (
        usedCharacterIds.has(
          edge.node.id,
        )
      ) {
        return false;
      }

      usedCharacterIds.add(
        edge.node.id,
      );

      return true;
    })
    .slice(0, 12)
    .map(
      (
        edge,
      ): FeaturedCharacter => {
        const characterName =
          edge.node.name.full ||
          edge.node.name.native ||
          "Unknown character";

        const nativeName =
          edge.node.name.native ??
          "";

        return {
          id: `anilist:${edge.node.id}`,

          characterName,

          alternateName:
            nativeName &&
            normalizeTitle(
              nativeName,
            ) !==
              normalizeTitle(
                characterName,
              )
              ? nativeName
              : "",

          performerName: "",

          imageUrl:
            edge.node.image.large ||
            edge.node.image.medium ||
            "",

          role:
            edge.role === "MAIN"
              ? "Main"
              : "Supporting",

          sourceUrl:
            edge.node.siteUrl ||
            "",
        };
      },
    );
}

export async function getAniListFeaturedCharacters(
  details: MediaDetails,
): Promise<
  AniListFeaturedCharactersResult | null
> {
  const searchTexts = [
    details.title,
    details.originalTitle,
  ].filter(
    (
      title,
      index,
      titles,
    ) =>
      Boolean(title.trim()) &&
      titles.indexOf(title) ===
        index,
  );

  let bestCandidate:
    | AniListMediaCandidate
    | null = null;

  let bestScore = 0;

  for (const searchText of searchTexts) {
    const candidates =
      await searchAniListMedia(
        searchText,
      );

    for (const candidate of candidates) {
      const candidateScore =
        calculateMatchScore(
          candidate,
          details,
        );

      if (
        candidateScore >
        bestScore
      ) {
        bestCandidate =
          candidate;

        bestScore =
          candidateScore;
      }
    }

    /*
     * Exact title plus a matching
     * year or format is already a
     * strong result, so avoid an
     * unnecessary second request.
     */
    if (bestScore >= 120) {
      break;
    }
  }

  if (
    !bestCandidate ||
    bestScore < 100
  ) {
    return null;
  }

  const items =
    mapAniListCharacters(
      bestCandidate,
    );

  if (items.length === 0) {
    return null;
  }

  return {
    matchedTitle:
      getMatchedTitle(
        bestCandidate,
      ),

    items,
  };
}