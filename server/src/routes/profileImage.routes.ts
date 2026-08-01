import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from "express";

import multer from "multer";

import {
  rateLimit,
} from "express-rate-limit";

import {
  getAuthenticatedSessionContext,
  requireAuthenticatedSession,
  requireAuthCsrfProtection,
} from "../middleware/auth.middleware.js";

import {
  removeCurrentProfileImage,
  serveProfileImage,
  uploadCurrentProfileImage,
} from "../controllers/profileImage.controller.js";

import {
  PROFILE_IMAGE_HTTP_POLICY,
  PROFILE_IMAGE_INPUT_POLICY,
  PROFILE_IMAGE_UPLOAD_FIELD_NAME,
} from "../features/profile-image/profileImage.constants.js";

import {
  ProfileImageTooLargeError,
  ProfileImageUnsupportedTypeError,
} from "../features/profile-image/profileImage.errors.js";

const router = Router();

function createAuthenticatedRateLimit(
  input: {
    windowMs: number;
    limit: number;
    identifier: string;
    code: string;
    message: string;
  },
) {
  return rateLimit({
    windowMs: input.windowMs,
    limit: input.limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    identifier: input.identifier,
    passOnStoreError: false,
    keyGenerator: (request) =>
      getAuthenticatedSessionContext(
        request,
      ).userId.toHexString(),
    handler: (_request, response) => {
      response.setHeader(
        "Cache-Control",
        "no-store",
      );
      response.status(429).json({
        status: "error",
        code: input.code,
        message: input.message,
      });
    },
  });
}


const serveRateLimit = rateLimit({
  windowMs: 15 * 60 * 1_000,
  limit: 600,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  identifier:
    "filmgeezer-profile-image-read",
  passOnStoreError: false,
  handler: (_request, response) => {
    response.setHeader(
      "Cache-Control",
      "no-store",
    );
    response.status(429).json({
      status: "error",
      code:
        "PROFILE_IMAGE_READ_RATE_LIMITED",
      message:
        "Too many profile-picture requests. Please wait before trying again.",
    });
  },
});

const uploadRateLimit =
  createAuthenticatedRateLimit({
    windowMs:
      PROFILE_IMAGE_HTTP_POLICY
        .uploadRateLimitWindowMilliseconds,
    limit:
      PROFILE_IMAGE_HTTP_POLICY
        .maximumUploadsPerWindow,
    identifier:
      "filmgeezer-profile-image-upload",
    code:
      "PROFILE_IMAGE_UPLOAD_RATE_LIMITED",
    message:
      "Too many profile-picture uploads. Please wait before trying again.",
  });

const removeRateLimit =
  createAuthenticatedRateLimit({
    windowMs:
      PROFILE_IMAGE_HTTP_POLICY
        .removeRateLimitWindowMilliseconds,
    limit:
      PROFILE_IMAGE_HTTP_POLICY
        .maximumRemovalsPerWindow,
    identifier:
      "filmgeezer-profile-image-remove",
    code:
      "PROFILE_IMAGE_REMOVE_RATE_LIMITED",
    message:
      "Too many profile-picture changes. Please wait before trying again.",
  });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize:
      PROFILE_IMAGE_INPUT_POLICY.maximumBytes,
    files: 1,
    fields: 0,
    parts: 2,
    headerPairs: 50,
  },
  fileFilter: (
    _request,
    file,
    callback,
  ) => {
    const accepted =
      PROFILE_IMAGE_INPUT_POLICY.acceptedMimeTypes
        .includes(
          file.mimetype as
            (typeof PROFILE_IMAGE_INPUT_POLICY.acceptedMimeTypes)[number],
        );

    if (!accepted) {
      callback(
        new ProfileImageUnsupportedTypeError(),
      );
      return;
    }

    callback(null, true);
  },
});

function requireMultipartContentType(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  if (!request.is("multipart/form-data")) {
    response.setHeader(
      "Cache-Control",
      "no-store",
    );
    response.status(415).json({
      status: "error",
      code:
        "PROFILE_IMAGE_MULTIPART_REQUIRED",
      message:
        "Profile-picture uploads must use multipart form data.",
    });
    return;
  }

  next();
}

function handleSingleImageUpload(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  upload.single(
    PROFILE_IMAGE_UPLOAD_FIELD_NAME,
  )(
    request,
    response,
    (error: unknown) => {
      if (!error) {
        next();
        return;
      }

      response.setHeader(
        "Cache-Control",
        "no-store",
      );

      if (
        error instanceof multer.MulterError &&
        error.code === "LIMIT_FILE_SIZE"
      ) {
        const tooLarge =
          new ProfileImageTooLargeError();
        response.status(413).json({
          status: "error",
          code: tooLarge.code,
          message: tooLarge.message,
        });
        return;
      }

      if (
        error instanceof
        ProfileImageUnsupportedTypeError
      ) {
        response.status(400).json({
          status: "error",
          code: error.code,
          message: error.message,
        });
        return;
      }

      if (error instanceof multer.MulterError) {
        response.status(400).json({
          status: "error",
          code:
            "PROFILE_IMAGE_UPLOAD_INVALID",
          message:
            "Send one image using the image field.",
        });
        return;
      }

      next(error);
    },
  );
}

router.get(
  "/profile-images/:userId/:version",
  serveRateLimit,
  serveProfileImage,
);

router.post(
  "/account/profile-image",
  requireAuthenticatedSession,
  uploadRateLimit,
  requireAuthCsrfProtection,
  requireMultipartContentType,
  handleSingleImageUpload,
  uploadCurrentProfileImage,
);

router.delete(
  "/account/profile-image",
  requireAuthenticatedSession,
  removeRateLimit,
  requireAuthCsrfProtection,
  removeCurrentProfileImage,
);

export default router;