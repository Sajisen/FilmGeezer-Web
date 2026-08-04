import type { Collection } from "mongodb";

import { getWebDatabase } from "../../config/database.js";
import { ADMIN_COLLECTION_NAMES } from "./admin.constants.js";
import type {
  AdminAuditEventDocument,
  AdminMfaChallengeDocument,
  AdminMfaFactorDocument,
  AdminSessionDocument,
} from "./admin.types.js";

export interface AdminCollections {
  sessions: Collection<AdminSessionDocument>;
  auditEvents: Collection<AdminAuditEventDocument>;
  mfaFactors: Collection<AdminMfaFactorDocument>;
  mfaChallenges: Collection<AdminMfaChallengeDocument>;
}

export async function getAdminCollections(): Promise<AdminCollections> {
  const database = await getWebDatabase();

  return {
    sessions: database.collection<AdminSessionDocument>(
      ADMIN_COLLECTION_NAMES.sessions,
    ),
    auditEvents: database.collection<AdminAuditEventDocument>(
      ADMIN_COLLECTION_NAMES.auditEvents,
    ),
    mfaFactors: database.collection<AdminMfaFactorDocument>(
      ADMIN_COLLECTION_NAMES.mfaFactors,
    ),
    mfaChallenges: database.collection<AdminMfaChallengeDocument>(
      ADMIN_COLLECTION_NAMES.mfaChallenges,
    ),
  };
}
