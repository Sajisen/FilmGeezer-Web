export const PROFILE_IMAGE_UPLOAD_FIELD_NAME = "image";

export const PROFILE_IMAGE_INPUT_POLICY = {
  maximumBytes: 5_000_000,
  maximumPixels: 12_000_000,
  minimumWidth: 96,
  minimumHeight: 96,
  acceptedMimeTypes: [
    "image/jpeg",
    "image/png",
    "image/webp",
  ] as const,
  acceptedFormats: [
    "jpeg",
    "png",
    "webp",
  ] as const,
} as const;

export const PROFILE_IMAGE_OUTPUT_POLICY = {
  contentType: "image/webp" as const,
  extension: "webp" as const,
  preferredDimension: 512,
  fallbackDimensions: [512, 448, 384] as const,
  qualitySteps: [82, 74, 66, 58] as const,
  maximumBytes: 256 * 1024,
  cacheControl: "public, max-age=31536000, immutable",
} as const;

export const PROFILE_IMAGE_HTTP_POLICY = {
  uploadRateLimitWindowMilliseconds: 60 * 60 * 1_000,
  maximumUploadsPerWindow: 12,
  removeRateLimitWindowMilliseconds: 60 * 60 * 1_000,
  maximumRemovalsPerWindow: 30,
} as const;

export const PROFILE_IMAGE_SIGNED_URL_LIFETIME_SECONDS = 60 * 60;

