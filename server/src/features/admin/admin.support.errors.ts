export class AdminSupportConversationNotFoundError extends Error {
  constructor() {
    super("The support request could not be found.");
    this.name = "AdminSupportConversationNotFoundError";
  }
}

export class AdminSupportMessageLimitError extends Error {
  constructor() {
    super("This support request has reached its message limit.");
    this.name = "AdminSupportMessageLimitError";
  }
}

export class AdminSupportSpamReplyBlockedError extends Error {
  constructor() {
    super("Restore this request from spam before replying.");
    this.name = "AdminSupportSpamReplyBlockedError";
  }
}

export class AdminSupportPersistenceError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "AdminSupportPersistenceError";
  }
}
