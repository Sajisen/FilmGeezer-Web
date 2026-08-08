import {
  getWebDatabase,
} from "../../config/database.js";

import type {
  EmailDeliveryDocument,
} from "./email.types.js";

export async function getEmailDeliveryCollection() {
  const database = await getWebDatabase();
  return database.collection<EmailDeliveryDocument>(
    "email_deliveries",
  );
}