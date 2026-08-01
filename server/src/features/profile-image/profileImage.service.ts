import {
  randomUUID,
} from "node:crypto";

import {
  ObjectId,
  type TransactionOptions,
} from "mongodb";

import {
  getMongoClient,
} from "../../config/database.js";

import {
  AuthPersistenceError,
} from "../auth/auth.errors.js";

import {
  hashAuthIpAddress,
  summarizeAuthUserAgent,
  type AuthRequestMetadata,
} from "../auth/auth.session.js";

import type {
  AuthenticatedSessionContext,
} from "../auth/auth.session.service.js";

import {
  createAuthAuditEvent,
} from "../auth/repositories/authAudit.repository.js";

import {
  findActiveUserById,
  removeActiveUserProfileImage,
  replaceActiveUserProfileImage,
} from "../auth/repositories/authUser.repository.js";

import {
  ProfileImageNotFoundError,
} from "./profileImage.errors.js";

import {
  processProfileImage,
} from "./profileImage.processor.js";

import {
  getProfileImageStorage,
} from "./profileImage.storage.js";

import type {
  ProfileImageReadResult,
} from "./profileImage.types.js";

const PROFILE_IMAGE_TRANSACTION_OPTIONS:
  TransactionOptions = {
    readPreference: "primary",
    readConcern: {
      level: "snapshot",
    },
    writeConcern: {
      w: "majority",
    },
    maxCommitTimeMS: 5_000,
  };

function createAuditMetadata(
  requestMetadata: AuthRequestMetadata,
) {
  return {
    ipHash: hashAuthIpAddress(
      requestMetadata.ipAddress,
    ),
    userAgentSummary:
      summarizeAuthUserAgent(
        requestMetadata.userAgent,
      ),
  };
}

function createObjectKey(
  userId: ObjectId,
  version: string,
): string {
  return `profile-images/${userId.toHexString()}/${version}.webp`;
}

async function removeObjectQuietly(
  objectKey: string,
  context: string,
): Promise<void> {
  try {
    await getProfileImageStorage().remove(
      objectKey,
    );
  } catch (error) {
    console.error(
      `[profile-image] ${context}`,
      {
        name:
          error instanceof Error
            ? error.name
            : "UnknownError",
      },
    );
  }
}

export async function uploadProfileImage(
  input: {
    buffer: Buffer;
  },
  auth: AuthenticatedSessionContext,
  requestMetadata: AuthRequestMetadata,
) {
  const processedImage =
    await processProfileImage(
      input.buffer,
    );

  const version = randomUUID();
  const updatedAt = new Date();
  const objectKey = createObjectKey(
    auth.userId,
    version,
  );

  const storage =
    getProfileImageStorage();

  await storage.put({
    objectKey,
    image: processedImage,
  });

  const client = await getMongoClient();
  const session = client.startSession();
  let previousObjectKey: string | null = null;

  try {
    await session.withTransaction(
      async () => {
        const previousUser =
          await replaceActiveUserProfileImage(
            {
              userId: auth.userId,
              profileImage: {
                objectKey,
                version,
                contentType:
                  processedImage.contentType,
                byteSize:
                  processedImage.byteSize,
                width:
                  processedImage.width,
                height:
                  processedImage.height,
                updatedAt,
              },
              updatedAt,
            },
            session,
          );

        if (!previousUser) {
          throw new AuthPersistenceError(
            "The active account could not be updated with the profile picture.",
          );
        }

        previousObjectKey =
          previousUser.profileImage
            ?.objectKey ?? null;

        await createAuthAuditEvent(
          {
            auditEventId:
              new ObjectId(),
            userId: auth.userId,
            eventType:
              "profile-image-updated",
            outcome: "success",
            ...createAuditMetadata(
              requestMetadata,
            ),
            details: {
              byteSize:
                processedImage.byteSize,
              width:
                processedImage.width,
              height:
                processedImage.height,
            },
            createdAt: updatedAt,
          },
          session,
        );
      },
      PROFILE_IMAGE_TRANSACTION_OPTIONS,
    );
  } catch (error) {
    await removeObjectQuietly(
      objectKey,
      "A newly uploaded object could not be cleaned up after a database failure.",
    );

    if (
      error instanceof AuthPersistenceError
    ) {
      throw error;
    }

    throw new AuthPersistenceError(
      "The profile picture could not be saved to the account.",
      {
        cause: error,
      },
    );
  } finally {
    await session.endSession();
  }

  if (
    previousObjectKey &&
    previousObjectKey !== objectKey
  ) {
    await removeObjectQuietly(
      previousObjectKey,
      "The previous profile-picture object could not be removed.",
    );
  }

  return {
    profileImagePath:
      `/api/profile-images/${auth.userId.toHexString()}/${encodeURIComponent(version)}`,
    byteSize:
      processedImage.byteSize,
    width: processedImage.width,
    height: processedImage.height,
    updatedAt,
  };
}

export async function removeProfileImage(
  auth: AuthenticatedSessionContext,
  requestMetadata: AuthRequestMetadata,
) {
  const removedAt = new Date();
  const client = await getMongoClient();
  const session = client.startSession();
  let previousObjectKey: string | null = null;
  let changed = false;

  try {
    await session.withTransaction(
      async () => {
        const previousUser =
          await removeActiveUserProfileImage(
            {
              userId: auth.userId,
              updatedAt: removedAt,
            },
            session,
          );

        if (!previousUser) {
          return;
        }

        changed = true;
        previousObjectKey =
          previousUser.profileImage
            ?.objectKey ?? null;

        await createAuthAuditEvent(
          {
            auditEventId:
              new ObjectId(),
            userId: auth.userId,
            eventType:
              "profile-image-removed",
            outcome: "success",
            ...createAuditMetadata(
              requestMetadata,
            ),
            details: {},
            createdAt: removedAt,
          },
          session,
        );
      },
      PROFILE_IMAGE_TRANSACTION_OPTIONS,
    );
  } catch (error) {
    throw new AuthPersistenceError(
      "The profile picture could not be removed from the account.",
      {
        cause: error,
      },
    );
  } finally {
    await session.endSession();
  }

  if (previousObjectKey) {
    await removeObjectQuietly(
      previousObjectKey,
      "A removed profile-picture object could not be deleted from storage.",
    );
  }

  return {
    changed,
    removedAt,
  };
}

export async function getProfileImageReadResult(
  input: {
    userId: ObjectId;
    version: string;
  },
): Promise<ProfileImageReadResult> {
  const user = await findActiveUserById(
    input.userId,
  );

  if (
    !user?.profileImage ||
    user.profileImage.version !==
      input.version
  ) {
    throw new ProfileImageNotFoundError();
  }

  return getProfileImageStorage()
    .createReadResult(
      user.profileImage.objectKey,
    );
}