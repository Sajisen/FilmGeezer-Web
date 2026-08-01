import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import {
  getSignedUrl,
} from "@aws-sdk/s3-request-presigner";

import {
  env,
} from "../../config/env.js";

import {
  PROFILE_IMAGE_OUTPUT_POLICY,
  PROFILE_IMAGE_SIGNED_URL_LIFETIME_SECONDS,
} from "./profileImage.constants.js";

import {
  ProfileImageStorageError,
} from "./profileImage.errors.js";

import type {
  ProfileImageStorage,
} from "./profileImage.types.js";

export function createRailwayProfileImageStorage():
  ProfileImageStorage {
  const bucketName =
    env.PROFILE_IMAGE_BUCKET_NAME;
  const endpoint =
    env.PROFILE_IMAGE_BUCKET_ENDPOINT;
  const region =
    env.PROFILE_IMAGE_BUCKET_REGION;
  const accessKeyId =
    env.PROFILE_IMAGE_BUCKET_ACCESS_KEY_ID;
  const secretAccessKey =
    env.PROFILE_IMAGE_BUCKET_SECRET_ACCESS_KEY;

  if (
    !bucketName ||
    !endpoint ||
    !region ||
    !accessKeyId ||
    !secretAccessKey
  ) {
    throw new ProfileImageStorageError();
  }

  const client = new S3Client({
    endpoint,
    region,
    forcePathStyle:
      env.PROFILE_IMAGE_BUCKET_FORCE_PATH_STYLE,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return {
    async put(input) {
      try {
        await client.send(
          new PutObjectCommand({
            Bucket: bucketName,
            Key: input.objectKey,
            Body: input.image.buffer,
            ContentType:
              input.image.contentType,
            CacheControl:
              PROFILE_IMAGE_OUTPUT_POLICY.cacheControl,
          }),
        );
      } catch (error) {
        throw new ProfileImageStorageError({
          cause: error,
        });
      }
    },

    async remove(objectKey) {
      try {
        await client.send(
          new DeleteObjectCommand({
            Bucket: bucketName,
            Key: objectKey,
          }),
        );
      } catch (error) {
        throw new ProfileImageStorageError({
          cause: error,
        });
      }
    },

    async createReadResult(objectKey) {
      try {
        const url = await getSignedUrl(
          client,
          new GetObjectCommand({
            Bucket: bucketName,
            Key: objectKey,
          }),
          {
            expiresIn:
              PROFILE_IMAGE_SIGNED_URL_LIFETIME_SECONDS,
          },
        );

        return {
          kind: "redirect",
          url,
          cacheControl:
            "public, max-age=300, stale-while-revalidate=600",
        };
      } catch (error) {
        throw new ProfileImageStorageError({
          cause: error,
        });
      }
    },
  };
}