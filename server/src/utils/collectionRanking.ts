import type { MediaItem } from "../types/media.js";

export interface QualityCollectionCandidate {
  item: MediaItem;
  popularity: number;
  voteAverage: number;
  voteCount: number;
  hasBackdrop: boolean;
}

export interface CollectionRowDefinition<
  Key extends string,
  Candidate extends QualityCollectionCandidate,
> {
  key: Key;
  candidates: Candidate[];
  limit: number;
}

export function getCollectionCandidateKey(
  candidate: Pick<QualityCollectionCandidate, "item">,
) {
  return `${candidate.item.mediaType}:${candidate.item.tmdbId}`;
}

export function removeDuplicateCollectionCandidates<
  Candidate extends QualityCollectionCandidate,
>(candidates: Candidate[]) {
  const seenKeys = new Set<string>();

  return candidates.filter((candidate) => {
    const key = getCollectionCandidateKey(candidate);

    if (seenKeys.has(key)) {
      return false;
    }

    seenKeys.add(key);
    return true;
  });
}

export function interleaveCollectionCandidateGroups<
  Candidate extends QualityCollectionCandidate,
>(groups: Candidate[][]) {
  const combined: Candidate[] = [];
  const longestLength = Math.max(0, ...groups.map((group) => group.length));

  for (let index = 0; index < longestLength; index += 1) {
    for (const group of groups) {
      const candidate = group[index];

      if (candidate) {
        combined.push(candidate);
      }
    }
  }

  return combined;
}

export function calculateCollectionQualityScore(
  candidate: QualityCollectionCandidate,
  confidenceVotes: number,
  globalAverageRating = 6.4,
) {
  const voteConfidence =
    candidate.voteCount / (candidate.voteCount + confidenceVotes);

  const weightedRating =
    voteConfidence * candidate.voteAverage +
    (1 - voteConfidence) * globalAverageRating;

  const popularityBoost = Math.log10(candidate.popularity + 1) * 0.32;
  const voteCountBoost = Math.log10(candidate.voteCount + 1) * 0.2;
  const imageBoost = candidate.hasBackdrop ? 0.1 : 0;

  return weightedRating + popularityBoost + voteCountBoost + imageBoost;
}

/**
 * Allocates one candidate per row per pass. This prevents the first row from
 * consuming every strong title before later rows receive a fair share.
 */
export function allocateUniqueCollectionRows<
  Key extends string,
  Candidate extends QualityCollectionCandidate,
>(
  definitions: Array<CollectionRowDefinition<Key, Candidate>>,
  usedKeys: Set<string>,
  isSuitable: (candidate: Candidate) => boolean,
): Record<Key, MediaItem[]> {
  const output = Object.fromEntries(
    definitions.map((definition) => [definition.key, [] as MediaItem[]]),
  ) as Record<Key, MediaItem[]>;

  const cursors = new Map<Key, number>(
    definitions.map((definition) => [definition.key, 0]),
  );

  let madeProgress = true;

  while (madeProgress) {
    madeProgress = false;

    for (const definition of definitions) {
      const row = output[definition.key];

      if (row.length >= definition.limit) {
        continue;
      }

      let cursor = cursors.get(definition.key) ?? 0;

      while (cursor < definition.candidates.length) {
        const candidate = definition.candidates[cursor];
        cursor += 1;

        const key = getCollectionCandidateKey(candidate);

        if (usedKeys.has(key) || !isSuitable(candidate)) {
          continue;
        }

        usedKeys.add(key);
        row.push(candidate.item);
        madeProgress = true;
        break;
      }

      cursors.set(definition.key, cursor);
    }
  }

  return output;
}
