import type { MediaItem } from './media'

export interface MovieCollections {
  trendingAndNowPlaying: MediaItem[]
  essentials: MediaItem[]

  actionAdventureCrimeThriller:
    MediaItem[]

  comedy: MediaItem[]
  drama: MediaItem[]
  family: MediaItem[]
}