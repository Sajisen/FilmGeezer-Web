export class AdminContentNotFoundError extends Error {
  constructor(message = "The FilmGeezer content entry could not be found.") {
    super(message);
    this.name = "AdminContentNotFoundError";
  }
}

export class AdminContentTmdbNotFoundError extends Error {
  constructor() {
    super("The selected TMDB title could not be found.");
    this.name = "AdminContentTmdbNotFoundError";
  }
}

export class AdminContentStateConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminContentStateConflictError";
  }
}

export class AdminContentPersistenceError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "AdminContentPersistenceError";
  }
}
