import type { Collection } from "mongodb";
import { getWebDatabase } from "../../config/database.js";
import { AUTH_COLLECTION_NAMES } from "./auth.constants.js";
import type {
  AuthAuditEventDocument,
  AuthChallengeDocument,
  AuthCredentialDocument,
  AuthIdentityDocument,
  AuthSessionDocument,
  FilmGeezerUserDocument,
} from "./auth.types.js";

export interface AuthCollections {
  users: Collection<FilmGeezerUserDocument>;
  identities: Collection<AuthIdentityDocument>;
  credentials: Collection<AuthCredentialDocument>;
  sessions: Collection<AuthSessionDocument>;
  challenges: Collection<AuthChallengeDocument>;
  auditEvents: Collection<AuthAuditEventDocument>;
}

export async function getAuthCollections(): Promise<AuthCollections> {
  const database = await getWebDatabase();

  return {
    users: database.collection<FilmGeezerUserDocument>(
      AUTH_COLLECTION_NAMES.users,
    ),

    identities: database.collection<AuthIdentityDocument>(
      AUTH_COLLECTION_NAMES.identities,
    ),

    credentials: database.collection<AuthCredentialDocument>(
      AUTH_COLLECTION_NAMES.credentials,
    ),

    sessions: database.collection<AuthSessionDocument>(
      AUTH_COLLECTION_NAMES.sessions,
    ),

    challenges: database.collection<AuthChallengeDocument>(
      AUTH_COLLECTION_NAMES.challenges,
    ),

    auditEvents: database.collection<AuthAuditEventDocument>(
      AUTH_COLLECTION_NAMES.auditEvents,
    ),
  };
}