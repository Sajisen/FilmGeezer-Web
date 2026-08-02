import { z } from "zod";

import { RECOMMENDATION_CATEGORY_VALUES } from "./recommendations.constants.js";

export const recommendationCategorySchema = z.enum(
  RECOMMENDATION_CATEGORY_VALUES,
);
