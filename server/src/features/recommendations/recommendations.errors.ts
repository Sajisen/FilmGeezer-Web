export class RecommendationsPersistenceError extends Error {
  readonly code = "RECOMMENDATIONS_PERSISTENCE_ERROR";

  constructor(
    message = "Your recommendation signals could not be loaded.",
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "RecommendationsPersistenceError";
  }
}
