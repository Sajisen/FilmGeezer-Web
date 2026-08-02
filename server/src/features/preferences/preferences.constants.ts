export const USER_PREFERENCES_COLLECTION_NAME =
  "user_preferences";

export const USER_PREFERENCES_SCHEMA_VERSION = 1;

export const PREFERENCE_CATEGORY_VALUES = [
  "movie",
  "tv",
  "anime",
  "kdrama",
] as const;

export const PREFERENCE_GENRE_VALUES = [
  "Action",
  "Action & Adventure",
  "Adventure",
  "Animation",
  "Comedy",
  "Crime",
  "Documentary",
  "Drama",
  "Family",
  "Fantasy",
  "History",
  "Horror",
  "Kids",
  "Music",
  "Mystery",
  "Reality",
  "Romance",
  "Sci-Fi & Fantasy",
  "Science Fiction",
  "Thriller",
  "War",
  "War & Politics",
  "Western",
] as const;

export const PREFERENCE_LANGUAGE_VALUES = [
  "en",
  "ko",
  "ja",
  "hi",
  "ta",
  "te",
  "si",
  "zh",
  "es",
  "fr",
  "de",
  "it",
  "pt",
  "th",
  "tr",
  "id",
  "ml",
] as const;

export const PREFERENCE_LIMITS = {
  preferredGenres: 8,
  hiddenGenres: 5,
  preferredLanguages: 5,
} as const;

export const PREFERENCE_OPTIONS = {
  categories: [
    {
      value: "movie",
      label: "Movies",
      description: "Feature films from every era and genre.",
    },
    {
      value: "tv",
      label: "TV Series",
      description: "Feature series from every era and genre.",
    },
    {
      value: "anime",
      label: "Anime",
      description: "Japanese animated movies and series.",
    },
    {
      value: "kdrama",
      label: "K-Drama",
      description: "Korean movies and television series.",
    },
  ],
  genres: PREFERENCE_GENRE_VALUES.map((value) => ({
    value,
    label: value,
  })),
  languages: [
    { value: "en", label: "English" },
    { value: "ko", label: "Korean" },
    { value: "ja", label: "Japanese" },
    { value: "hi", label: "Hindi" },
    { value: "ta", label: "Tamil" },
    { value: "te", label: "Telugu" },
    { value: "si", label: "Sinhala" },
    { value: "zh", label: "Chinese" },
    { value: "es", label: "Spanish" },
    { value: "fr", label: "French" },
    { value: "de", label: "German" },
    { value: "it", label: "Italian" },
    { value: "pt", label: "Portuguese" },
    { value: "th", label: "Thai" },
    { value: "tr", label: "Turkish" },
    { value: "id", label: "Indonesian" },
    { value: "ml", label: "Malayalam" },
  ],
} as const;

export const DEFAULT_USER_PREFERENCES = {
  personalizationEnabled: true,
  preferredCategories: [...PREFERENCE_CATEGORY_VALUES],
  preferredGenres: [],
  hiddenGenres: [],
  preferredLanguages: [],
} as const;

export const PREFERENCES_HTTP_POLICY = {
  jsonBodyLimit: "16kb",
  read: {
    rateLimitWindowMilliseconds: 15 * 60 * 1_000,
    maximumRequestsPerWindow: 300,
  },
  mutation: {
    rateLimitWindowMilliseconds: 60 * 60 * 1_000,
    maximumRequestsPerWindow: 30,
  },
} as const;
