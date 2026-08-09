export class EmailPreferencesPersistenceError extends Error {
  readonly code = "EMAIL_PREFERENCES_PERSISTENCE_ERROR";

  constructor(
    message = "Your email preferences could not be saved.",
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "EmailPreferencesPersistenceError";
  }
}

export class EmailPreferencesRevisionConflictError extends Error {
  readonly code = "EMAIL_PREFERENCES_REVISION_CONFLICT";

  constructor() {
    super("Your email preferences changed in another request.");
    this.name = "EmailPreferencesRevisionConflictError";
  }
}
