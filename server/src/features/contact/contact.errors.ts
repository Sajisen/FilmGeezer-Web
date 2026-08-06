export class ContactPersistenceError extends Error {
  readonly code = "CONTACT_PERSISTENCE_ERROR";

  constructor(
    message = "The support request could not be saved.",
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "ContactPersistenceError";
  }
}

export class ContactConversationNotFoundError extends Error {
  readonly code = "CONTACT_CONVERSATION_NOT_FOUND";

  constructor() {
    super("The support request could not be found.");
    this.name = "ContactConversationNotFoundError";
  }
}

export class ContactConversationMessageLimitError extends Error {
  readonly code = "CONTACT_CONVERSATION_MESSAGE_LIMIT_REACHED";

  constructor() {
    super(
      "This support request has reached its message limit. Start a new request if more help is needed.",
    );
    this.name = "ContactConversationMessageLimitError";
  }
}
