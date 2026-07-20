export interface EpisodeDetails {
  tmdbEpisodeId: number;
  episodeNumber: number;
  name: string;
  overview: string;
  airDate: string;
  runtimeMinutes: number | null;
  stillUrl: string;
  rating: number;
  voteCount: number;
}

export interface SeasonDetails {
  tmdbSeasonId: number;
  seasonNumber: number;
  name: string;
  overview: string;
  airDate: string;
  posterUrl: string;

  episodeCount: number;
  averageRating: number;
  ratedEpisodeCount: number;

  episodes: EpisodeDetails[];
}