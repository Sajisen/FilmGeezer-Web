export type FeaturedCharacterPresentation =
  | "live-action"
  | "anime"
  | "animation";

export type FeaturedCharacterRole =
  | "Main"
  | "Supporting"
  | "Featured";

export interface FeaturedCharacter {
  id: string;
  characterName: string;
  alternateName: string;
  performerName: string;
  imageUrl: string;
  role: FeaturedCharacterRole;
  sourceUrl: string;
}

export interface FeaturedCharacters {
  presentation: FeaturedCharacterPresentation;
  source: "TMDB" | "AniList";
  matchedTitle: string;
  sourceNote: string;
  items: FeaturedCharacter[];
}