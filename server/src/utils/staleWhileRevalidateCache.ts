interface CacheEntry<Value> {
  value: Value;
  freshUntil: number;
  staleUntil: number;
}

interface StaleWhileRevalidateCacheOptions {
  freshDurationMs: number;
  staleDurationMs: number;
  label: string;
}

export interface StaleWhileRevalidateCache<Value> {
  get(loader: () => Promise<Value>): Promise<Value>;
  clear(): void;
}

/**
 * Small in-process stale-while-revalidate cache for shared public page data.
 *
 * - Fresh values are returned immediately.
 * - Stale-but-usable values are returned immediately while one background
 *   refresh runs.
 * - A cold or fully expired cache waits for one shared loader promise.
 *
 * This is intentionally process-local. It is the cheapest correct choice while
 * FilmGeezer runs one API instance. A shared Redis adapter can replace this
 * boundary later when multiple API replicas are introduced.
 */
export function createStaleWhileRevalidateCache<Value>(
  options: StaleWhileRevalidateCacheOptions,
): StaleWhileRevalidateCache<Value> {
  if (options.freshDurationMs <= 0) {
    throw new Error("freshDurationMs must be greater than zero.");
  }

  if (options.staleDurationMs < options.freshDurationMs) {
    throw new Error(
      "staleDurationMs must be greater than or equal to freshDurationMs.",
    );
  }

  let entry: CacheEntry<Value> | null = null;
  let pendingLoad: Promise<Value> | null = null;

  function store(value: Value) {
    const now = Date.now();

    entry = {
      value,
      freshUntil: now + options.freshDurationMs,
      staleUntil: now + options.staleDurationMs,
    };

    return value;
  }

  function startLoad(loader: () => Promise<Value>) {
    if (pendingLoad) {
      return pendingLoad;
    }

    pendingLoad = loader()
      .then(store)
      .finally(() => {
        pendingLoad = null;
      });

    return pendingLoad;
  }

  return {
    async get(loader) {
      const now = Date.now();

      if (entry && entry.freshUntil > now) {
        return entry.value;
      }

      if (entry && entry.staleUntil > now) {
        if (!pendingLoad) {
          void startLoad(loader).catch((error: unknown) => {
            console.error(
              `${options.label} background cache refresh failed:`,
              error,
            );
          });
        }

        return entry.value;
      }

      return startLoad(loader);
    },

    clear() {
      entry = null;
    },
  };
}
