import type { Collection } from "mongodb";

import { getWebDatabase } from "../../config/database.js";

import {
  CONTACT_MESSAGES_COLLECTION_NAME,
  CONTACT_THREAD_MESSAGES_COLLECTION_NAME,
} from "./contact.constants.js";

import type {
  ContactMessageDocument,
  ContactThreadMessageDocument,
} from "./contact.types.js";

export async function getContactMessagesCollection(): Promise<
  Collection<ContactMessageDocument>
> {
  const database = await getWebDatabase();

  return database.collection<ContactMessageDocument>(
    CONTACT_MESSAGES_COLLECTION_NAME,
  );
}

export async function getContactThreadMessagesCollection(): Promise<
  Collection<ContactThreadMessageDocument>
> {
  const database = await getWebDatabase();

  return database.collection<ContactThreadMessageDocument>(
    CONTACT_THREAD_MESSAGES_COLLECTION_NAME,
  );
}
