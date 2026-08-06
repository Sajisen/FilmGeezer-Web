import { z } from "zod";

import {
  PREFERENCE_CATEGORY_VALUES,
  PREFERENCE_GENRE_VALUES,
  PREFERENCE_LANGUAGE_VALUES,
  PREFERENCE_LIMITS,
} from "./preferences.constants.js";

const uniqueArray = <T extends z.ZodTypeAny>(
  itemSchema: T,
  maximum: number,
) =>
  z
    .array(itemSchema)
    .max(maximum)
    .refine(
      (values) => new Set(values).size === values.length,
      "Choose each option only once.",
    );

export const userPreferencesUpdateSchema = z
  .object({
    revision: z.number().int().min(0).max(2_147_483_647),
    personalizationEnabled: z.boolean(),
    preferredCategories: uniqueArray(
      z.enum(PREFERENCE_CATEGORY_VALUES),
      PREFERENCE_CATEGORY_VALUES.length,
    ).min(1, "Choose at least one content category."),
    preferredGenres: uniqueArray(
      z.enum(PREFERENCE_GENRE_VALUES),
      PREFERENCE_LIMITS.preferredGenres,
    ),
    hiddenGenres: uniqueArray(
      z.enum(PREFERENCE_GENRE_VALUES),
      PREFERENCE_LIMITS.hiddenGenres,
    ),
    preferredLanguages: uniqueArray(
      z.enum(PREFERENCE_LANGUAGE_VALUES),
      PREFERENCE_LIMITS.preferredLanguages,
    ),
  })
  .strict()
  .superRefine((value, context) => {
    const preferredGenreSet = new Set(value.preferredGenres);

    value.hiddenGenres.forEach((genre, index) => {
      if (preferredGenreSet.has(genre)) {
        context.addIssue({
          code: "custom",
          path: ["hiddenGenres", index],
          message:
            "A genre cannot be both preferred and shown less often.",
        });
      }
    });
  });
