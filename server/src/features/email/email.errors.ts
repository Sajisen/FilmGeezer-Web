export class TransactionalEmailConfigurationError extends Error {
  constructor(
    message = "The transactional email service is not configured.",
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "TransactionalEmailConfigurationError";
  }
}

export class TransactionalEmailDeliveryError extends Error {
  constructor(
    message = "The transactional email could not be submitted.",
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "TransactionalEmailDeliveryError";
  }
}

export class TransactionalEmailPersistenceError extends Error {
  constructor(
    message = "Transactional email delivery state could not be stored.",
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "TransactionalEmailPersistenceError";
  }
}

export class ResendWebhookVerificationError extends Error {
  constructor(options?: ErrorOptions) {
    super("The Resend webhook signature could not be verified.", options);
    this.name = "ResendWebhookVerificationError";
  }
}
