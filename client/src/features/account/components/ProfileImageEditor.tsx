import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

import ProfileAvatar from "../../../components/ProfileAvatar";

import {
  removeProfileImage,
  uploadProfileImage,
} from "../../../services/profileImageService";

const PROFILE_IMAGE_MAX_BYTES = 5_000_000;
const PROFILE_IMAGE_MAX_PIXELS = 12_000_000;
const PROFILE_IMAGE_MIN_DIMENSION = 96;

const ACCEPTED_PROFILE_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

interface ProfileImageEditorProps {
  displayName: string;
  profileImagePath: string | null;
  csrfToken: string;
  onChanged: (
    profileImagePath: string | null,
  ) => Promise<void>;
}

interface SelectedProfileImage {
  file: File;
  previewUrl: string;
  width: number;
  height: number;
}

function UploadIcon({
  className = "h-4 w-4",
}: {
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 16V4" />
      <path d="m7.5 8.5 4.5-4.5 4.5 4.5" />
      <path d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
    </svg>
  );
}

function TrashIcon({
  className = "h-4 w-4",
}: {
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M4 7h16" />
      <path d="M9 7V4h6v3" />
      <path d="m7 7 1 13h8l1-13" />
      <path d="M10 11v5M14 11v5" />
    </svg>
  );
}

function formatFileSize(
  byteSize: number,
): string {
  if (byteSize >= 1_000_000) {
    return `${(byteSize / 1_000_000).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(byteSize / 1_000))} KB`;
}

async function readImageDimensions(
  file: File,
): Promise<{
  width: number;
  height: number;
}> {
  if ("createImageBitmap" in window) {
    const image = await createImageBitmap(file);

    try {
      return {
        width: image.width,
        height: image.height,
      };
    } finally {
      image.close();
    }
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    return await new Promise((resolve, reject) => {
      const image = new Image();

      image.onload = () => {
        resolve({
          width: image.naturalWidth,
          height: image.naturalHeight,
        });
      };

      image.onerror = () => {
        reject(
          new Error(
            "We couldn’t open that image. Try another one.",
          ),
        );
      };

      image.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function validateSelectedFile(
  file: File,
): Promise<{
  width: number;
  height: number;
}> {
  if (!ACCEPTED_PROFILE_IMAGE_TYPES.has(file.type)) {
    throw new Error(
      "Choose a JPEG, PNG, or WebP image.",
    );
  }

  if (file.size <= 0) {
    throw new Error(
      "We couldn’t use that image. Try another one.",
    );
  }

  if (file.size > PROFILE_IMAGE_MAX_BYTES) {
    throw new Error(
      "Choose an image smaller than 5 MB.",
    );
  }

  let dimensions: {
    width: number;
    height: number;
  };

  try {
    dimensions = await readImageDimensions(file);
  } catch {
    throw new Error(
      "We couldn’t open that image. Try another JPEG, PNG, or WebP.",
    );
  }

  if (
    dimensions.width < PROFILE_IMAGE_MIN_DIMENSION ||
    dimensions.height < PROFILE_IMAGE_MIN_DIMENSION
  ) {
    throw new Error(
      "Choose an image that is at least 96 × 96 pixels.",
    );
  }

  if (
    dimensions.width * dimensions.height >
    PROFILE_IMAGE_MAX_PIXELS
  ) {
    throw new Error(
      "That image is too large to process. Choose a smaller one.",
    );
  }

  return dimensions;
}

function ProfileImageEditor({
  displayName,
  profileImagePath,
  csrfToken,
  onChanged,
}: ProfileImageEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);

  const [selectedImage, setSelectedImage] =
    useState<SelectedProfileImage | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isConfirmingRemove, setIsConfirmingRemove] =
    useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);
  const [successMessage, setSuccessMessage] =
    useState<string | null>(null);

  const isBusy = isValidating || isUploading || isRemoving;

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  function releasePreviewUrl() {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  }

  function clearSelection() {
    releasePreviewUrl();
    setSelectedImage(null);
    setUploadProgress(0);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleFileSelection(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (!file || isBusy) {
      return;
    }

    setIsValidating(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsConfirmingRemove(false);

    try {
      const dimensions = await validateSelectedFile(file);

      releasePreviewUrl();
      const previewUrl = URL.createObjectURL(file);
      previewUrlRef.current = previewUrl;

      setSelectedImage({
        file,
        previewUrl,
        width: dimensions.width,
        height: dimensions.height,
      });
    } catch (error) {
      clearSelection();
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "FilmGeezer couldn’t use that image. Try another one.",
      );
    } finally {
      setIsValidating(false);
    }
  }

  async function handleUpload() {
    if (!selectedImage || isBusy) {
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await uploadProfileImage(
        selectedImage.file,
        csrfToken,
        setUploadProgress,
      );

      clearSelection();
      await onChanged(response.profileImagePath);
      setSuccessMessage(response.message);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "FilmGeezer couldn’t update your profile picture. Please try again.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  async function handleRemove() {
    if (!profileImagePath || isBusy) {
      return;
    }

    setIsRemoving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await removeProfileImage(csrfToken);
      setIsConfirmingRemove(false);
      clearSelection();
      await onChanged(null);
      setSuccessMessage(response.message);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "FilmGeezer couldn’t remove your profile picture. Please try again.",
      );
    } finally {
      setIsRemoving(false);
    }
  }

  const visibleImagePath =
    selectedImage?.previewUrl ?? profileImagePath;

  return (
    <section
      aria-labelledby="profile-picture-heading"
      className="border-b border-white/8 px-5 py-5 sm:px-6 sm:py-6"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-7">
        <div className="flex min-w-0 items-center gap-4">
          <ProfileAvatar
            displayName={displayName}
            profileImagePath={visibleImagePath}
            alt={
              selectedImage
                ? "Selected profile-picture preview"
                : `${displayName}'s profile picture`
            }
            className="h-24 w-24 sm:h-28 sm:w-28"
            initialsClassName="text-2xl sm:text-3xl"
          />

          <div className="min-w-0">
            <h3
              id="profile-picture-heading"
              className="text-base font-bold text-white"
            >
              Profile picture
            </h3>

            <p className="mt-1 max-w-md text-sm leading-6 text-slate-400">
              Choose a clear image for your profile. FilmGeezer will resize
              and crop it to fit.
            </p>

            <p className="mt-2 text-xs font-medium text-slate-500">
              JPEG, PNG, or WebP · up to 5 MB · 96 × 96 or larger
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 sm:max-w-[15rem] sm:justify-end">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={isBusy}
            onChange={(event) => {
              void handleFileSelection(event);
            }}
          />

          <button
            type="button"
            disabled={isBusy}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-sky-300/20 bg-sky-400/10 px-4 text-sm font-bold text-sky-100 transition hover:bg-sky-400/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
          >
            <UploadIcon />
            {isValidating
              ? "Checking…"
              : profileImagePath
                ? "Replace"
                : "Choose image"}
          </button>

          {profileImagePath && !selectedImage && !isConfirmingRemove && (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => setIsConfirmingRemove(true)}
              className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-rose-300/15 bg-rose-400/[0.07] px-4 text-sm font-bold text-rose-200 transition hover:bg-rose-400/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
            >
              <TrashIcon />
              Remove
            </button>
          )}
        </div>
      </div>

      {selectedImage && (
        <div className="mt-5 rounded-2xl border border-sky-300/15 bg-sky-400/[0.055] p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-white">
                {selectedImage.file.name}
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-400">
                {formatFileSize(selectedImage.file.size)} · Ready to use.
                FilmGeezer will resize and crop it to fit your profile.
              </p>
            </div>

            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={clearSelection}
                disabled={isBusy}
                className="min-h-10 rounded-xl border border-white/10 px-4 text-sm font-bold text-slate-300 transition hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => {
                  void handleUpload();
                }}
                disabled={isBusy}
                className="inline-flex min-h-10 min-w-28 items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 text-sm font-bold text-white transition hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isUploading ? "Uploading…" : "Use picture"}
              </button>
            </div>
          </div>

          {isUploading && (
            <div className="mt-4" aria-live="polite">
              <div className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-400">
                <span>
                  {uploadProgress >= 100
                    ? "Finishing…"
                    : "Uploading…"}
                </span>
                <span>{uploadProgress}%</span>
              </div>

              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-300 transition-[width] duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {isConfirmingRemove && (
        <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-rose-300/15 bg-rose-400/[0.055] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-white">
              Remove your profile picture?
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              Your initials will be shown instead.
            </p>
          </div>

          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => setIsConfirmingRemove(false)}
              disabled={isBusy}
              className="min-h-10 rounded-xl border border-white/10 px-4 text-sm font-bold text-slate-300 transition hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 disabled:opacity-60"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() => {
                void handleRemove();
              }}
              disabled={isBusy}
              className="min-h-10 min-w-24 rounded-xl border border-rose-300/20 bg-rose-400/10 px-4 text-sm font-bold text-rose-100 transition hover:bg-rose-400/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isRemoving ? "Removing…" : "Remove"}
            </button>
          </div>
        </div>
      )}

      {errorMessage && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm leading-6 text-rose-100"
        >
          {errorMessage}
        </p>
      )}

      {successMessage && (
        <p
          role="status"
          className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm leading-6 text-emerald-100"
        >
          {successMessage}
        </p>
      )}
    </section>
  );
}

export default ProfileImageEditor;
