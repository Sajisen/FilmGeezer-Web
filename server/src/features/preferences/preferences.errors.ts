export class PreferencesPersistenceError extends Error {
  readonly code = "PREFERENCES_PERSISTENCE_ERROR";

  constructor(
    message = "The entertainment preferences could not be saved.",
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "PreferencesPersistenceError";
  }
}

export class PreferencesRevisionConflictError extends Error {
  readonly code = "PREFERENCES_REVISION_CONFLICT";

  constructor() {
    super("The entertainment preferences changed in another request.");
    this.name = "PreferencesRevisionConflictError";
  }
}
