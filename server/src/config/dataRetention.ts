const DAY_SECONDS = 24 * 60 * 60;
const DAY_MILLISECONDS = DAY_SECONDS * 1_000;

/*
 * FilmGeezer keeps account/product state for as long as it is useful, while
 * finite operational history is automatically retired so the free Atlas tier
 * does not accumulate logs forever. These values are product policy rather
 * than compliance guarantees and can be revisited as real usage grows.
 */
export const DATA_RETENTION_POLICY = {
  authAuditSeconds: 180 * DAY_SECONDS,
  adminAuditSeconds: 365 * DAY_SECONDS,
  notificationsSeconds: 180 * DAY_SECONDS,
  emailDeliverySeconds: 90 * DAY_SECONDS,
  settledSupportEmailAlertSeconds: 30 * DAY_SECONDS,

  resolvedSupportMilliseconds: 90 * DAY_MILLISECONDS,
  spamSupportMilliseconds: 30 * DAY_MILLISECONDS,
} as const;
