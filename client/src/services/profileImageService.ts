import {
  AuthApiError,
} from "./authService";

import type {
  AuthErrorPayload,
} from "../types/auth";

import type {
  ProfileImageRemoveResponse,
  ProfileImageUploadResponse,
} from "../types/profileImage";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL;

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isProfileImageUploadResponse(
  value: unknown,
): value is ProfileImageUploadResponse {
  if (!isRecord(value) || !isRecord(value.image)) {
    return false;
  }

  return (
    value.status === "success" &&
    value.code === "PROFILE_IMAGE_UPDATED" &&
    typeof value.message === "string" &&
    typeof value.profileImagePath === "string" &&
    value.image.contentType === "image/webp" &&
    typeof value.image.byteSize === "number" &&
    typeof value.image.width === "number" &&
    typeof value.image.height === "number" &&
    typeof value.image.updatedAt === "string"
  );
}

function isProfileImageRemoveResponse(
  value: unknown,
): value is ProfileImageRemoveResponse {
  return (
    isRecord(value) &&
    value.status === "success" &&
    value.code === "PROFILE_IMAGE_REMOVED" &&
    typeof value.message === "string" &&
    typeof value.changed === "boolean" &&
    typeof value.removedAt === "string" &&
    value.profileImagePath === null
  );
}

function parseJson(
  value: string,
): unknown {
  if (!value.trim()) {
    return null;
  }

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function asErrorPayload(
  value: unknown,
): AuthErrorPayload {
  return isRecord(value)
    ? (value as AuthErrorPayload)
    : {};
}

export function uploadProfileImage(
  file: File,
  csrfToken: string,
  onProgress?: (percentage: number) => void,
  signal?: AbortSignal,
): Promise<ProfileImageUploadResponse> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    const formData = new FormData();

    formData.append("image", file);

    request.open(
      "POST",
      `${API_BASE_URL}/api/account/profile-image`,
    );

    request.withCredentials = true;
    request.setRequestHeader(
      "X-CSRF-Token",
      csrfToken,
    );

    request.upload.addEventListener(
      "progress",
      (event) => {
        if (!event.lengthComputable || !onProgress) {
          return;
        }

        onProgress(
          Math.min(
            100,
            Math.round(
              (event.loaded / event.total) * 100,
            ),
          ),
        );
      },
    );

    request.addEventListener("load", () => {
      const payload = parseJson(request.responseText);

      if (request.status < 200 || request.status >= 300) {
        reject(
          new AuthApiError(
            request.status,
            asErrorPayload(payload),
            "FilmGeezer could not upload the profile picture.",
          ),
        );
        return;
      }

      if (!isProfileImageUploadResponse(payload)) {
        reject(
          new AuthApiError(
            request.status,
            {},
            "FilmGeezer received an invalid profile-picture response.",
          ),
        );
        return;
      }

      onProgress?.(100);
      resolve(payload);
    });

    request.addEventListener("error", () => {
      reject(
        new AuthApiError(
          0,
          {},
          "FilmGeezer could not reach the profile-picture service.",
        ),
      );
    });

    request.addEventListener("abort", () => {
      reject(
        new DOMException(
          "The profile-picture upload was cancelled.",
          "AbortError",
        ),
      );
    });

    const abortRequest = () => {
      request.abort();
    };

    if (signal) {
      if (signal.aborted) {
        request.abort();
        return;
      }

      signal.addEventListener(
        "abort",
        abortRequest,
        { once: true },
      );
    }

    request.addEventListener(
      "loadend",
      () => {
        signal?.removeEventListener(
          "abort",
          abortRequest,
        );
      },
      { once: true },
    );

    request.send(formData);
  });
}

export async function removeProfileImage(
  csrfToken: string,
): Promise<ProfileImageRemoveResponse> {
  let response: Response;

  try {
    response = await fetch(
      `${API_BASE_URL}/api/account/profile-image`,
      {
        method: "DELETE",
        credentials: "include",
        cache: "no-store",
        headers: {
          "X-CSRF-Token": csrfToken,
        },
      },
    );
  } catch {
    throw new AuthApiError(
      0,
      {},
      "FilmGeezer could not reach the profile-picture service.",
    );
  }

  const payload = parseJson(
    await response.text(),
  );

  if (!response.ok) {
    throw new AuthApiError(
      response.status,
      asErrorPayload(payload),
      "FilmGeezer could not remove the profile picture.",
    );
  }

  if (
    !isProfileImageRemoveResponse(
      payload,
    )
  ) {
    throw new AuthApiError(
      response.status,
      {},
      "FilmGeezer received an invalid profile-picture response.",
    );
  }

  return payload;
}