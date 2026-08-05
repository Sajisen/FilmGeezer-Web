export class AdminAuditFilterTooBroadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminAuditFilterTooBroadError";
  }
}

export class AdminAuditPersistenceError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "AdminAuditPersistenceError";
  }
}
