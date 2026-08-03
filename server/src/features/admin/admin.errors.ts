export class AdminAuthenticationRequiredError extends Error {
  constructor() {
    super("Administrator authentication is required.");
    this.name = "AdminAuthenticationRequiredError";
  }
}

export class AdminInvalidCredentialsError extends Error {
  constructor() {
    super("The administrator credentials are invalid.");
    this.name = "AdminInvalidCredentialsError";
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