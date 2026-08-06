import type { MediaItem } from "../types/media";

function getMediaKey(item: MediaItem) {
  return `${item.mediaType}:${item.tmdbId}`;
}

export function createCollectionRowAllocator(seedItems: MediaItem[] = []) {
  const usedKeys = new Set(seedItems.map(getMediaKey));

  return function allocateRow(items: MediaItem[], limit: number) {
    const allocated: MediaItem[] = [];

    for (const item of items) {
      const key = getMediaKey(item);

      if (usedKeys.has(key)) {
        continue;
      }

      usedKeys.add(key);
      allocated.push(item);

      if (allocated.length >= limit) {
        break;
      }
    }

    return allocated;
  };
}
