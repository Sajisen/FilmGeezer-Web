export type PreferenceCategory =
  | "movie"
  | "tv"
  | "anime"
  | "kdrama";

export type PreferenceGenre =
  | "Action"
  | "Action & Adventure"
  | "Adventure"
  | "Animation"
  | "Comedy"
  | "Crime"
  | "Documentary"
  | "Drama"
  | "Family"
  | "Fantasy"
  | "History"
  | "Horror"
  | "Kids"
  | "Music"
  | "Mystery"
  | "Reality"
  | "Romance"
  | "Sci-Fi & Fantasy"
  | "Science Fiction"
  | "Thriller"
  | "War"
  | "War & Politics"
  | "Western";

export type PreferenceLanguage =
  | "en"
  | "ko"
  | "ja"
  | "hi"
  | "ta"
  | "te"
  | "si"
  | "zh"
  | "es"
  | "fr"
  | "de"
  | "it"
  | "pt"
  | "th"
  | "tr"
  | "id"
  | "ml";

export interface EntertainmentPreferencesValues {
  personalizationEnabled: boolean;
  preferredCategories: PreferenceCategory[];
  preferredGenres: PreferenceGenre[];
  hiddenGenres: PreferenceGenre[];
  preferredLanguages: PreferenceLanguage[];
}

export interface EntertainmentPreferences
  extends EntertainmentPreferencesValues {
  revision: number;
  updatedAt: string | null;
}

export interface PreferenceOption<T extends string> {
  value: T;
  label: string;
  description?: string;
}

export interface EntertainmentPreferenceOptions {
  limits: {
    maximumPreferredGenres: number;
    maximumHiddenGenres: number;
    maximumPreferredLanguages: number;
  };
  categories: PreferenceOption<PreferenceCategory>[];
  genres: PreferenceOption<PreferenceGenre>[];
  languages: PreferenceOption<PreferenceLanguage>[];
}

export interface EntertainmentPreferencesResponse {
  status: "success";
  code: "ACCOUNT_PREFERENCES_READY";
  preferences: EntertainmentPreferences;
  options: EntertainmentPreferenceOptions;
}

export interface EntertainmentPreferencesUpdateResponse {
  status: "success";
  code: "ACCOUNT_PREFERENCES_UPDATED";
  message: string;
  changed: boolean;
  preferences: EntertainmentPreferences;
  options: EntertainmentPreferenceOptions;
}
