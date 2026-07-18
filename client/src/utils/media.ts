import type { MediaItem } from '../types/media'

export function removeDuplicateMedia(
  items: MediaItem[],
): MediaItem[] {
  const uniqueItems = new Map<string, MediaItem>()

  items.forEach((item) => {
    const key = `${item.mediaType}-${item.tmdbId}`

    if (!uniqueItems.has(key)) {
      uniqueItems.set(key, item)
    }
  })

  return Array.from(uniqueItems.values())
}