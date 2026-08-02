import {
  env,
} from "../../config/env.js";

import {
  localProfileImageStorage,
} from "./profileImage.local-storage.js";

import {
  createRailwayProfileImageStorage,
} from "./profileImage.railway-storage.js";

import type {
  ProfileImageStorage,
} from "./profileImage.types.js";

let storage: ProfileImageStorage | null = null;

export function getProfileImageStorage():
  ProfileImageStorage {
  if (storage) {
    return storage;
  }

  storage =
    env.PROFILE_IMAGE_STORAGE_DRIVER ===
    "railway-bucket"
      ? createRailwayProfileImageStorage()
      : localProfileImageStorage;

  return storage;
}