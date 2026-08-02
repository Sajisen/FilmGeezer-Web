
import {
  ObjectId,
} from "mongodb";

import type {
  NextFunction,
  Request,
  Response,
} from "express";

import {
  AuthPersistenceError,
} from "../features/auth/auth.errors.js";

import {
  getAuthenticatedSessionContext,
} from "../middleware/auth.middleware.js";

import {
  ProfileImageError,
  ProfileImageMissingError,
  ProfileImageNotFoundError,
} from "../features/profile-image/profileImage.errors.js";

import {
  getProfileImageReadResult,
  removeProfileImage,
  uploadProfileImage,
} from "../features/profile-image/profileImage.service.js";

function createRequestMetadata(
  request: Request,
) {
  return {
    ipAddress:
      request.ip ||
      request.socket.remoteAddress ||
      null,
    userAgent:
      request.get("user-agent") ??
      null,
  };
}

function sendProfileImageError(
  response: Response,
  error: ProfileImageError,
): void {
  const status =
    error.code ===
      "PROFILE_IMAGE_TOO_LARGE"
      ? 413
      : error.code ===
          "PROFILE_IMAGE_STORAGE_UNAVAILABLE"
        ? 503
        : 400;

  response.status(status).json({
    status: "error",
    code: error.code,
    message: error.message,
  });
}

export async function uploadCurrentProfileImage(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  response.setHeader(
    "Cache-Control",
    "no-store",
  );

  try {
    if (!request.file) {
      throw new ProfileImageMissingError();
    }

    const auth =
      getAuthenticatedSessionContext(
        request,
      );

    const result =
      await uploadProfileImage(
        {
          buffer: request.file.buffer,
        },
        auth,
        createRequestMetadata(request),
      );

    response.status(200).json({
      status: "success",
      code: "PROFILE_IMAGE_UPDATED",
      message:
        "Your profile picture has been updated.",
      profileImagePath:
        result.profileImagePath,
      image: {
        contentType: "image/webp",
        byteSize: result.byteSize,
        width: result.width,
        height: result.height,
        updatedAt:
          result.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof ProfileImageError) {
      sendProfileImageError(
        response,
        error,
      );
      return;
    }

    if (error instanceof AuthPersistenceError) {
      console.error(
        "[profile-image] Account update failed.",
        {
          name: error.name,
          code: error.code,
        },
      );

      response.status(503).json({
        status: "error",
        code:
          "PROFILE_IMAGE_TEMPORARILY_UNAVAILABLE",
        message:
          "Profile pictures are temporarily unavailable. Please try again shortly.",
      });
      return;
    }

    next(error);
  }
}

export async function removeCurrentProfileImage(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  response.setHeader(
    "Cache-Control",
    "no-store",
  );

  try {
    const auth =
      getAuthenticatedSessionContext(
        request,
      );

    const result =
      await removeProfileImage(
        auth,
        createRequestMetadata(request),
      );

    response.status(200).json({
      status: "success",
      code: "PROFILE_IMAGE_REMOVED",
      message: result.changed
        ? "Your profile picture has been removed."
        : "Your account is already using initials.",
      changed: result.changed,
      removedAt:
        result.removedAt.toISOString(),
      profileImagePath: null,
    });
  } catch (error) {
    if (error instanceof AuthPersistenceError) {
      console.error(
        "[profile-image] Account removal failed.",
        {
          name: error.name,
          code: error.code,
        },
      );

      response.status(503).json({
        status: "error",
        code:
          "PROFILE_IMAGE_TEMPORARILY_UNAVAILABLE",
        message:
          "Profile pictures are temporarily unavailable. Please try again shortly.",
      });
      return;
    }

    next(error);
  }
}

export async function serveProfileImage(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const { userId, version } =
    request.params;

  if (
    typeof userId !== "string" ||
    !ObjectId.isValid(userId) ||
    typeof version !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
      version,
    )
  ) {
    response.status(404).end();
    return;
  }

  try {
    const result =
      await getProfileImageReadResult({
        userId: new ObjectId(
          userId,
        ),
        version,
      });

    response.setHeader(
      "X-Content-Type-Options",
      "nosniff",
    );

    response.setHeader(
      "Cross-Origin-Resource-Policy",
      "cross-origin",
    );

    response.setHeader(
      "Cache-Control",
      result.cacheControl,
    );

    if (
      result.kind ===
      "redirect"
    ) {
      response.redirect(
        302,
        result.url,
      );
      return;
    }

    response.type(
      result.contentType,
    );

    response.status(200).send(
      result.buffer,
    );
  } catch (error) {
    if (
      error instanceof
      ProfileImageNotFoundError
    ) {
      response.status(404).end();
      return;
    }

    if (
      error instanceof
      ProfileImageError
    ) {
      response.status(503).end();
      return;
    }

    next(error);
  }
}