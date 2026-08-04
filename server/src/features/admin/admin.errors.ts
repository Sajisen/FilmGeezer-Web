export class AdminAuthenticationRequiredError extends Error {
  constructor() {
    super("Administrator authentication is required.");
    this.name = "AdminAuthenticationRequiredError";
  }
}

export class AdminFullAccessRequiredError extends Error {
  constructor() {
    super("Administrator MFA enrollment must be completed first.");
    this.name = "AdminFullAccessRequiredError";
  }
}

export class AdminRecentAuthenticationRequiredError extends Error {
  constructor() {
    super("Recent administrator authentication is required.");
    this.name = "AdminRecentAuthenticationRequiredError";
  }
}

export class AdminInvalidCredentialsError extends Error {
  constructor() {
    super("The administrator credentials are invalid.");
    this.name = "AdminInvalidCredentialsError";
  }
}

export class AdminMfaChallengeRequiredError extends Error {
  constructor() {
    super("Administrator MFA verification is required.");
    this.name = "AdminMfaChallengeRequiredError";
  }
}

export class AdminMfaVerificationError extends Error {
  constructor(message = "The administrator verification code is invalid.") {
    super(message);
    this.name = "AdminMfaVerificationError";
  }
}

export class AdminMfaConfigurationError extends Error {
  constructor(message = "Administrator MFA is not configured on the server.") {
    super(message);
    this.name = "AdminMfaConfigurationError";
  }
}

export class AdminMfaOperationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminMfaOperationError";
  }
}


export class AdminPasskeyConfigurationError extends Error {
  constructor(message = "Administrator passkeys are not configured on the server.") {
    super(message);
    this.name = "AdminPasskeyConfigurationError";
  }
}

export class AdminPasskeyVerificationError extends Error {
  constructor(message = "The administrator passkey could not be verified.") {
    super(message);
    this.name = "AdminPasskeyVerificationError";
  }
}

export class AdminPasskeyOperationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminPasskeyOperationError";
  }
}

export class AdminPersistenceError extends Error {
  readonly code = "ADMIN_PERSISTENCE_ERROR";

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "AdminPersistenceError";
  }
}

export class AdminRoleOperationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminRoleOperationError";
  }
}
