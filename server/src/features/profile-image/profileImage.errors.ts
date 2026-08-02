
export class ProfileImageError extends Error {
  readonly code: string;

  constructor(
    code: string,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "ProfileImageError";
    this.code = code;
  }
}

export class ProfileImageMissingError extends ProfileImageError {
  constructor() {
    super(
      "PROFILE_IMAGE_REQUIRED",
      "Choose a profile picture and try again.",
    );
  }
}

export class ProfileImageUnsupportedTypeError extends ProfileImageError {
  constructor() {
    super(
      "PROFILE_IMAGE_UNSUPPORTED_TYPE",
      "Use a JPEG, PNG, or WebP image.",
    );
  }
}

export class ProfileImageTooLargeError extends ProfileImageError {
  constructor() {
    super(
      "PROFILE_IMAGE_TOO_LARGE",
      "The selected image is too large. Choose an image smaller than 5 MB.",
    );
  }
}

export class ProfileImageInvalidError extends ProfileImageError {
  constructor(message = "The selected file is not a valid profile image.") {
    super(
      "PROFILE_IMAGE_INVALID",
      message,
    );
  }
}

export class ProfileImageProcessingError extends ProfileImageError {
  constructor(options?: ErrorOptions) {
    super(
      "PROFILE_IMAGE_PROCESSING_FAILED",
      "FilmGeezer could not safely prepare that image. Try another one.",
      options,
    );
  }
}

export class ProfileImageStorageError extends ProfileImageError {
  constructor(options?: ErrorOptions) {
    super(
      "PROFILE_IMAGE_STORAGE_UNAVAILABLE",
      "Profile-picture storage is temporarily unavailable. Please try again shortly.",
      options,
    );
  }
}

export class ProfileImageNotFoundError extends ProfileImageError {
  constructor() {
    super(
      "PROFILE_IMAGE_NOT_FOUND",
      "Profile picture not found.",
    );
  }
}