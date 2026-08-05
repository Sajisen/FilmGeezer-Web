export class AdminUserNotFoundError extends Error {
  constructor() {
    super("The FilmGeezer account could not be found.");
    this.name = "AdminUserNotFoundError";
  }
}

export class AdminUserSessionNotFoundError extends Error {
  constructor() {
    super("The active FilmGeezer session could not be found.");
    this.name = "AdminUserSessionNotFoundError";
  }
}

export class AdminUserSelfActionError extends Error {
  constructor() {
    super(
      "Manage your own public account from the FilmGeezer account page, not User administration.",
    );
    this.name = "AdminUserSelfActionError";
  }
}

export class AdminUserFinalAdministratorError extends Error {
  constructor() {
    super(
      "The final active administrator cannot be suspended. Grant another trusted account administrator access first.",
    );
    this.name = "AdminUserFinalAdministratorError";
  }
}

export class AdminUserStateConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminUserStateConflictError";
  }
}

export class AdminUserPersistenceError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "AdminUserPersistenceError";
  }
}
