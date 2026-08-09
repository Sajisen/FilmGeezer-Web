import { getWebDatabase } from "../../config/database.js";

import type { SupportEmailAlertDocument } from "./supportEmailAlert.types.js";

export async function getSupportEmailAlertCollection() {
  const database = await getWebDatabase();

  return database.collection<SupportEmailAlertDocument>(
    "support_email_alerts",
  );
}
