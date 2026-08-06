export class NotificationPersistenceError extends Error {
  readonly code = "NOTIFICATIONS_TEMPORARILY_UNAVAILABLE";

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "NotificationPersistenceError";
  }
}

export class NotificationNotFoundError extends Error {
  readonly code = "NOTIFICATION_NOT_FOUND";

  constructor() {
    super("The notification could not be found.");
    this.name = "NotificationNotFoundError";
  }
}
