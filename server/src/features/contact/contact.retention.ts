import { DATA_RETENTION_POLICY } from "../../config/dataRetention.js";
import type { ContactMessageStatus } from "./contact.types.js";

export function createContactDeleteAt(
  status: ContactMessageStatus,
  statusChangedAt: Date,
): Date | null {
  if (status === "resolved") {
    return new Date(
      statusChangedAt.getTime() +
        DATA_RETENTION_POLICY.resolvedSupportMilliseconds,
    );
  }

  if (status === "spam") {
    return new Date(
      statusChangedAt.getTime() +
        DATA_RETENTION_POLICY.spamSupportMilliseconds,
    );
  }

  return null;
}
