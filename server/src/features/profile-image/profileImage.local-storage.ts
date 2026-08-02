import {
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";

import {
  dirname,
  resolve,
  sep,
} from "node:path";

import {
  randomUUID,
} from "node:crypto";

import {
  env,
} from "../../config/env.js";

import {
  PROFILE_IMAGE_OUTPUT_POLICY,
} from "./profileImage.constants.js";

import {
  ProfileImageNotFoundError,
  ProfileImageStorageError,
} from "./profileImage.errors.js";

import type {
  ProfileImageStorage,
} from "./profileImage.types.js";

const storageRoot = resolve(
  process.cwd(),
  env.PROFILE_IMAGE_LOCAL_DIRECTORY,
);

function resolveObjectPath(
  objectKey: string,
): string {
  const objectPath = resolve(
    storageRoot,
    objectKey,
  );

  if (
    objectPath !== storageRoot &&
    !objectPath.startsWith(
      `${storageRoot}${sep}`,
    )
  ) {
    throw new ProfileImageStorageError();
  }

  return objectPath;
}

export const localProfileImageStorage:
  ProfileImageStorage = {
    async put(input) {
      const objectPath =
        resolveObjectPath(
          input.objectKey,
        );

      const temporaryPath =
        `${objectPath}.${randomUUID()}.tmp`;

      try {
        await mkdir(
          dirname(objectPath),
          {
            recursive: true,
          },
        );

        await writeFile(
          temporaryPath,
          input.image.buffer,
          {
            flag: "wx",
          },
        );

        await rename(
          temporaryPath,
          objectPath,
        );
      } catch (error) {
        await rm(
          temporaryPath,
          {
            force: true,
          },
        ).catch(() => undefined);

        throw new ProfileImageStorageError({
          cause: error,
        });
      }
    },

    async remove(objectKey) {
      try {
        await rm(
          resolveObjectPath(objectKey),
          {
            force: true,
          },
        );
      } catch (error) {
        throw new ProfileImageStorageError({
          cause: error,
        });
      }
    },

    async createReadResult(objectKey) {
      try {
        const buffer = await readFile(
          resolveObjectPath(objectKey),
        );

        return {
          kind: "buffer",
          buffer,
          contentType:
            PROFILE_IMAGE_OUTPUT_POLICY.contentType,
          cacheControl:
            PROFILE_IMAGE_OUTPUT_POLICY.cacheControl,
        };
      } catch (error) {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          error.code === "ENOENT"
        ) {
          throw new ProfileImageNotFoundError();
        }

        throw new ProfileImageStorageError({
          cause: error,
        });
      }
    },
  };