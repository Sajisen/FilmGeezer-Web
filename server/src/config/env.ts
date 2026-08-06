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

const optionalSecretPepperSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  },
  secretPepperSchema.optional(),
);

const optionalAdminMfaEncryptionKeySchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  },
  z
    .string()
    .refine((value) => {
      try {
        return Buffer.from(value, "base64").length === 32;
      } catch {
        return false;
      }
    }, "ADMIN_MFA_ENCRYPTION_KEY must be a base64-encoded 32-byte key.")
    .optional(),
);

const optionalTrimmedStringSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  },
  z.string().min(1).optional(),
);

const optionalUrlSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  },
  z.string().url().optional(),
);

const optionalWebAuthnRpIdSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim().toLowerCase();
    return trimmed.length > 0 ? trimmed : undefined;
  },
  z
    .string()
    .min(1)
    .max(253)
    .regex(
      /^(localhost|(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)$/u,
      "ADMIN_WEBAUTHN_RP_ID must be a hostname such as localhost or admin.filmgeezer.site.",
    )
    .optional(),
);

const booleanEnvironmentSchema = z.preprocess(
  (value) => {
    if (typeof value === "boolean") {
      return value;
    }

    if (typeof value !== "string") {
      return value;
    }

    const normalized = value.trim().toLowerCase();

    if (normalized === "true" || normalized === "1") {
      return true;
    }

    if (normalized === "false" || normalized === "0") {
      return false;
    }

    return value;
  },
  z.boolean(),
);

const environmentSchema = z
  .object({
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
          (url.protocol === "http:" || url.protocol === "https:") &&
          url.pathname === "/" &&
          url.search === "" &&
          url.hash === ""
        );
      }, "CLIENT_APP_ORIGIN must be an http(s) origin without a path, query, or fragment."),

    ADMIN_APP_ORIGIN: optionalUrlSchema.refine((value) => {
      if (!value) {
        return true;
      }

      const url = new URL(value);

      return (
        (url.protocol === "http:" || url.protocol === "https:") &&
        url.pathname === "/" &&
        url.search === "" &&
        url.hash === ""
      );
    }, "ADMIN_APP_ORIGIN must be an http(s) origin without a path, query, or fragment."),

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

    AUTH_SESSION_PEPPER: secretPepperSchema,

    ADMIN_MFA_REQUIRED: booleanEnvironmentSchema.default(false),
    ADMIN_MFA_ENCRYPTION_KEY: optionalAdminMfaEncryptionKeySchema,
    ADMIN_MFA_RECOVERY_PEPPER: optionalSecretPepperSchema,
    ADMIN_WEBAUTHN_RP_NAME: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .default("FilmGeezer Administration"),
    ADMIN_WEBAUTHN_RP_ID: optionalWebAuthnRpIdSchema,
    ADMIN_WEBAUTHN_ORIGIN: optionalUrlSchema.refine((value) => {
      if (!value) {
        return true;
      }

      const url = new URL(value);
      return (
        (url.protocol === "http:" || url.protocol === "https:") &&
        url.pathname === "/" &&
        url.search === "" &&
        url.hash === ""
      );
    }, "ADMIN_WEBAUTHN_ORIGIN must be an http(s) origin without a path, query, or fragment."),

    PROFILE_IMAGE_STORAGE_DRIVER: z
      .enum(["local", "railway-bucket"])
      .default("local"),

    PROFILE_IMAGE_LOCAL_DIRECTORY: z
      .string()
      .trim()
      .min(1)
      .default(".data/profile-images"),

    PROFILE_IMAGE_BUCKET_NAME: optionalTrimmedStringSchema,
    PROFILE_IMAGE_BUCKET_ENDPOINT: optionalUrlSchema,
    PROFILE_IMAGE_BUCKET_REGION: optionalTrimmedStringSchema,
    PROFILE_IMAGE_BUCKET_ACCESS_KEY_ID: optionalTrimmedStringSchema,
    PROFILE_IMAGE_BUCKET_SECRET_ACCESS_KEY: optionalTrimmedStringSchema,
    PROFILE_IMAGE_BUCKET_FORCE_PATH_STYLE:
      booleanEnvironmentSchema.default(false),
  })
  .superRefine((value, context) => {
    if (
      value.NODE_ENV === "production" &&
      !value.CLIENT_APP_ORIGIN.startsWith("https://")
    ) {
      context.addIssue({
        code: "custom",
        path: ["CLIENT_APP_ORIGIN"],
        message:
          "Production must configure the public FilmGeezer application with an HTTPS origin.",
      });
    }

    if (
      value.NODE_ENV === "production" &&
      value.ADMIN_APP_ORIGIN &&
      !value.ADMIN_APP_ORIGIN.startsWith("https://")
    ) {
      context.addIssue({
        code: "custom",
        path: ["ADMIN_APP_ORIGIN"],
        message:
          "Production must configure the administrator application with an HTTPS origin.",
      });
    }

    if (
      value.NODE_ENV === "production" &&
      !value.ADMIN_APP_ORIGIN
    ) {
      context.addIssue({
        code: "custom",
        path: ["ADMIN_APP_ORIGIN"],
        message:
          "Production must configure the exact administrator application origin.",
      });
    }

    const administratorMfaHasPartialConfiguration =
      Boolean(value.ADMIN_MFA_ENCRYPTION_KEY) !==
      Boolean(value.ADMIN_MFA_RECOVERY_PEPPER);

    if (administratorMfaHasPartialConfiguration) {
      context.addIssue({
        code: "custom",
        path: ["ADMIN_MFA_ENCRYPTION_KEY"],
        message:
          "ADMIN_MFA_ENCRYPTION_KEY and ADMIN_MFA_RECOVERY_PEPPER must be configured together.",
      });
    }

    if (
      value.ADMIN_MFA_REQUIRED &&
      (!value.ADMIN_MFA_ENCRYPTION_KEY ||
        !value.ADMIN_MFA_RECOVERY_PEPPER)
    ) {
      context.addIssue({
        code: "custom",
        path: ["ADMIN_MFA_REQUIRED"],
        message:
          "ADMIN_MFA_REQUIRED needs both administrator MFA secrets.",
      });
    }

    const webAuthnHasPartialConfiguration =
      Boolean(value.ADMIN_WEBAUTHN_RP_ID) !==
      Boolean(value.ADMIN_WEBAUTHN_ORIGIN);

    if (webAuthnHasPartialConfiguration) {
      context.addIssue({
        code: "custom",
        path: ["ADMIN_WEBAUTHN_RP_ID"],
        message:
          "ADMIN_WEBAUTHN_RP_ID and ADMIN_WEBAUTHN_ORIGIN must be configured together.",
      });
    }

    if (value.ADMIN_WEBAUTHN_RP_ID && value.ADMIN_WEBAUTHN_ORIGIN) {
      const originHostname = new URL(
        value.ADMIN_WEBAUTHN_ORIGIN,
      ).hostname.toLowerCase();

      if (originHostname !== value.ADMIN_WEBAUTHN_RP_ID) {
        context.addIssue({
          code: "custom",
          path: ["ADMIN_WEBAUTHN_ORIGIN"],
          message:
            "ADMIN_WEBAUTHN_ORIGIN hostname must exactly match ADMIN_WEBAUTHN_RP_ID.",
        });
      }

      if (
        value.ADMIN_APP_ORIGIN &&
        new URL(value.ADMIN_APP_ORIGIN).origin !==
          new URL(value.ADMIN_WEBAUTHN_ORIGIN).origin
      ) {
        context.addIssue({
          code: "custom",
          path: ["ADMIN_WEBAUTHN_ORIGIN"],
          message:
            "ADMIN_WEBAUTHN_ORIGIN must exactly match ADMIN_APP_ORIGIN.",
        });
      }

      if (
        value.NODE_ENV === "production" &&
        !value.ADMIN_WEBAUTHN_ORIGIN.startsWith("https://")
      ) {
        context.addIssue({
          code: "custom",
          path: ["ADMIN_WEBAUTHN_ORIGIN"],
          message: "Production administrator WebAuthn must use HTTPS.",
        });
      }
    }

    if (
      value.NODE_ENV === "production" &&
      value.PROFILE_IMAGE_STORAGE_DRIVER === "local"
    ) {
      context.addIssue({
        code: "custom",
        path: ["PROFILE_IMAGE_STORAGE_DRIVER"],
        message:
          "Production must use railway-bucket because Railway service filesystems are not durable profile-image storage.",
      });
    }

    if (value.PROFILE_IMAGE_STORAGE_DRIVER !== "railway-bucket") {
      return;
    }

    const requiredBucketValues = [
      ["PROFILE_IMAGE_BUCKET_NAME", value.PROFILE_IMAGE_BUCKET_NAME],
      ["PROFILE_IMAGE_BUCKET_ENDPOINT", value.PROFILE_IMAGE_BUCKET_ENDPOINT],
      ["PROFILE_IMAGE_BUCKET_REGION", value.PROFILE_IMAGE_BUCKET_REGION],
      ["PROFILE_IMAGE_BUCKET_ACCESS_KEY_ID", value.PROFILE_IMAGE_BUCKET_ACCESS_KEY_ID],
      ["PROFILE_IMAGE_BUCKET_SECRET_ACCESS_KEY", value.PROFILE_IMAGE_BUCKET_SECRET_ACCESS_KEY],
    ] as const;

    for (const [name, configuredValue] of requiredBucketValues) {
      if (!configuredValue) {
        context.addIssue({
          code: "custom",
          path: [name],
          message: `${name} is required when PROFILE_IMAGE_STORAGE_DRIVER is railway-bucket.`,
        });
      }
    }
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