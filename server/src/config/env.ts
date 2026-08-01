import "dotenv/config";
import { z } from "zod";

const mongoDatabaseNameSchema = z
  .string()
  .trim()
  .min(1, "Database name is required.")
  .max(128, "Database name is too long.")
  .regex(
    /^[A-Za-z0-9._-]+$/,
    "Database name may contain letters, numbers, dots, underscores, and hyphens only.",
  );

const mongoCollectionNameSchema = z
  .string()
  .trim()
  .min(1, "Collection name is required.")
  .max(128, "Collection name is too long.")
  .regex(
    /^[A-Za-z0-9._-]+$/,
    "Collection name may contain letters, numbers, dots, underscores, and hyphens only.",
  );

const secretPepperSchema = z
  .string()
  .min(32, "Secret pepper must contain at least 32 characters.");

const environmentSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  PORT: z.coerce.number().int().min(1).max(65_535).default(5000),

  HOST: z.string().trim().min(1).default("0.0.0.0"),

  CLIENT_APP_ORIGIN: z
    .string()
    .trim()
    .url("CLIENT_APP_ORIGIN must be a valid URL.")
    .refine((value) => {
      const url = new URL(value);

      return (
        (url.protocol === "http:" ||
          url.protocol === "https:") &&
        url.pathname === "/" &&
        url.search === "" &&
        url.hash === ""
      );
    }, "CLIENT_APP_ORIGIN must be an http(s) origin without a path, query, or fragment."),

  TMDB_READ_ACCESS_TOKEN: z
    .string()
    .trim()
    .min(1, "TMDB_READ_ACCESS_TOKEN is required."),

  MONGODB_URI: z
    .string()
    .trim()
    .min(1, "MONGODB_URI is required.")
    .refine(
      (value) =>
        value.startsWith("mongodb://") || value.startsWith("mongodb+srv://"),
      "MONGODB_URI must begin with mongodb:// or mongodb+srv://.",
    ),

  MONGODB_CONTENT_DB_NAME: mongoDatabaseNameSchema.default("filmgeezer_bot"),

  MONGODB_WEB_DB_NAME: mongoDatabaseNameSchema.default("filmgeezer_web"),

  MONGODB_CONTENT_LINKS_COLLECTION:
    mongoCollectionNameSchema.default("content_links"),

  AUTH_CHALLENGE_PEPPER: secretPepperSchema,

  /*
   * Session tokens, CSRF material, and privacy-preserving IP hashes use a
   * different pepper from short-lived verification challenges. Separating
   * these secrets limits the impact of a future secret rotation or leak.
   */
  AUTH_SESSION_PEPPER: secretPepperSchema,
});

const environmentResult = environmentSchema.safeParse(process.env);

if (!environmentResult.success) {
  const issueList = environmentResult.error.issues
    .map((issue) => {
      const variableName =
        issue.path.length > 0 ? issue.path.join(".") : "environment";

      return `- ${variableName}: ${issue.message}`;
    })
    .join("\n");

  throw new Error(
    `Invalid FilmGeezer server environment configuration:\n${issueList}`,
  );
}

export const env = environmentResult.data;

export type ServerEnvironment = typeof env;
