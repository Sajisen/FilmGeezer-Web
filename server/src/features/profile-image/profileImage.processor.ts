import sharp from "sharp";

import {
  PROFILE_IMAGE_INPUT_POLICY,
  PROFILE_IMAGE_OUTPUT_POLICY,
} from "./profileImage.constants.js";

import {
  ProfileImageInvalidError,
  ProfileImageProcessingError,
  ProfileImageUnsupportedTypeError,
} from "./profileImage.errors.js";

import type {
  ProcessedProfileImage,
} from "./profileImage.types.js";

const ACCEPTED_FORMATS = new Set<string>(
  PROFILE_IMAGE_INPUT_POLICY.acceptedFormats,
);

sharp.cache({
  memory: 32,
  files: 0,
  items: 24,
});

sharp.concurrency(2);


function hasAcceptedImageSignature(
  buffer: Buffer,
): boolean {
  const isJpeg =
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff;

  const pngSignature = [
    0x89, 0x50, 0x4e, 0x47,
    0x0d, 0x0a, 0x1a, 0x0a,
  ];

  const isPng =
    buffer.length >= pngSignature.length &&
    pngSignature.every(
      (value, index) =>
        buffer[index] === value,
    );

  const isWebp =
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP";

  return isJpeg || isPng || isWebp;
}

function createSharpInput(buffer: Buffer) {
  return sharp(buffer, {
    animated: false,
    failOn: "warning",
    limitInputChannels: 4,
    limitInputPixels:
      PROFILE_IMAGE_INPUT_POLICY.maximumPixels,
    sequentialRead: true,
  });
}

export async function processProfileImage(
  input: Buffer,
): Promise<ProcessedProfileImage> {
  try {
    if (!hasAcceptedImageSignature(input)) {
      throw new ProfileImageUnsupportedTypeError();
    }

    const metadata =
      await createSharpInput(input).metadata();

    if (
      !metadata.format ||
      !ACCEPTED_FORMATS.has(metadata.format)
    ) {
      throw new ProfileImageUnsupportedTypeError();
    }

    if (
      !metadata.width ||
      !metadata.height ||
      metadata.width <
        PROFILE_IMAGE_INPUT_POLICY.minimumWidth ||
      metadata.height <
        PROFILE_IMAGE_INPUT_POLICY.minimumHeight
    ) {
      throw new ProfileImageInvalidError(
        "Choose an image that is at least 96 × 96 pixels.",
      );
    }

    if (
      metadata.width * metadata.height >
      PROFILE_IMAGE_INPUT_POLICY.maximumPixels
    ) {
      throw new ProfileImageInvalidError(
        "The selected image dimensions are too large.",
      );
    }

    if ((metadata.pages ?? 1) !== 1) {
      throw new ProfileImageInvalidError(
        "Animated or multi-frame images are not supported.",
      );
    }

    for (const dimension of
      PROFILE_IMAGE_OUTPUT_POLICY.fallbackDimensions) {
      for (const quality of
        PROFILE_IMAGE_OUTPUT_POLICY.qualitySteps) {
        const output = await createSharpInput(input)
          .rotate()
          .resize(dimension, dimension, {
            fit: "cover",
            position: "attention",
          })
          .webp({
            quality,
            alphaQuality: 80,
            effort: 4,
            smartSubsample: true,
          })
          .toBuffer({
            resolveWithObject: true,
          });

        if (
          output.data.byteLength <=
          PROFILE_IMAGE_OUTPUT_POLICY.maximumBytes
        ) {
          return {
            buffer: output.data,
            contentType:
              PROFILE_IMAGE_OUTPUT_POLICY.contentType,
            byteSize:
              output.data.byteLength,
            width: output.info.width,
            height: output.info.height,
          };
        }
      }
    }

    throw new ProfileImageProcessingError();
  } catch (error) {
    if (
      error instanceof ProfileImageInvalidError ||
      error instanceof ProfileImageUnsupportedTypeError ||
      error instanceof ProfileImageProcessingError
    ) {
      throw error;
    }

    throw new ProfileImageProcessingError({
      cause: error,
    });
  }
}