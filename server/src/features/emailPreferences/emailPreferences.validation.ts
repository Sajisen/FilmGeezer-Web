import { z } from "zod";

export const userEmailPreferencesUpdateSchema = z
  .object({
    revision: z.number().int().min(0).max(2_147_483_647),
    recommendationsAndDiscoveryEmailsEnabled: z.boolean(),
    productUpdatesEmailsEnabled: z.boolean(),
  })
  .strict();
