import type { Collection } from "mongodb";

import { getWebDatabase } from "../../config/database.js";
import { ADMIN_COLLECTION_NAMES } from "./admin.constants.js";
import type {
  AdminAuditEventDocument,
  AdminMfaChallengeDocument,
  AdminMfaFactorDocument,
  AdminPasskeyChallengeDocument,
  AdminPasskeyCredentialDocument,
  AdminRecoveryFactorDocument,
  AdminSessionDocument,
  AdminSecurityStateDocument,
} from "./admin.types.js";

export interface AdminCollections {
  sessions: Collection<AdminSessionDocument>;
  auditEvents: Collection<AdminAuditEventDocument>;
  mfaFactors: Collection<AdminMfaFactorDocument>;
  mfaChallenges: Collection<AdminMfaChallengeDocument>;
  recoveryFactors: Collection<AdminRecoveryFactorDocument>;
  passkeyCredentials: Collection<AdminPasskeyCredentialDocument>;
  passkeyChallenges: Collection<AdminPasskeyChallengeDocument>;
  securityStates: Collection<AdminSecurityStateDocument>;
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
    recoveryFactors: database.collection<AdminRecoveryFactorDocument>(
      ADMIN_COLLECTION_NAMES.recoveryFactors,
    ),
    passkeyCredentials: database.collection<AdminPasskeyCredentialDocument>(
      ADMIN_COLLECTION_NAMES.passkeyCredentials,
    ),
    passkeyChallenges: database.collection<AdminPasskeyChallengeDocument>(
      ADMIN_COLLECTION_NAMES.passkeyChallenges,
    ),
    securityStates: database.collection<AdminSecurityStateDocument>(
      ADMIN_COLLECTION_NAMES.securityStates,
    ),
  };
}
