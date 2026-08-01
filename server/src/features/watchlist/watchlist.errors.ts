export class WatchlistPersistenceError extends Error {
  readonly code = "WATCHLIST_PERSISTENCE_ERROR";

  constructor(
    message = "The Watchlist could not be saved.",
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "WatchlistPersistenceError";
  }
}

export class WatchlistLimitError extends Error {
  readonly code = "WATCHLIST_LIMIT_REACHED";

  constructor(readonly maximumItems: number) {
    super(`A Watchlist can contain up to ${maximumItems} titles.`);
    this.name = "WatchlistLimitError";
  }
}
