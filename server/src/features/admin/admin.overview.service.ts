import { getAuthCollections } from "../auth/auth.collections.js";
import { getContactMessagesCollection } from "../contact/contact.collection.js";
import {
  countActiveAdministrators,
  countActiveAdminSessions,
} from "./admin.repository.js";
import type { AdminOverviewResult } from "./admin.types.js";

export async function getAdminOverview(): Promise<AdminOverviewResult> {
  const generatedAt = new Date();
  const { users } = await getAuthCollections();
  const contactMessages = await getContactMessagesCollection();

  const [
    totalUsers,
    activeUsers,
    pendingUsers,
    suspendedUsers,
    newSupport,
    inReviewSupport,
    resolvedSupport,
    spamSupport,
    activeAdministrators,
    activeAdminSessions,
  ] = await Promise.all([
    users.countDocuments({ deletedAt: null }),
    users.countDocuments({ status: "active", deletedAt: null }),
    users.countDocuments({ status: "pending", deletedAt: null }),
    users.countDocuments({ status: "suspended", deletedAt: null }),
    contactMessages.countDocuments({ status: "new" }),
    contactMessages.countDocuments({ status: "in-review" }),
    contactMessages.countDocuments({ status: "resolved" }),
    contactMessages.countDocuments({ status: "spam" }),
    countActiveAdministrators(),
    countActiveAdminSessions(generatedAt),
  ]);

  return {
    generatedAt,
    users: {
      total: totalUsers,
      active: activeUsers,
      pending: pendingUsers,
      suspended: suspendedUsers,
    },
    support: {
      new: newSupport,
      inReview: inReviewSupport,
      resolved: resolvedSupport,
      spam: spamSupport,
      open: newSupport + inReviewSupport,
    },
    administration: {
      activeAdministrators,
      activeAdminSessions,
    },
  };
}
