import type {
  FilmGeezerUserDocument,
} from "../auth/auth.types.js";

export function createProfileImagePath(
  user: Pick<FilmGeezerUserDocument, "_id" | "profileImage">,
): string | null {
  if (!user.profileImage) {
    return null;
  }

  return `/api/profile-images/${user._id.toHexString()}/${encodeURIComponent(user.profileImage.version)}`;
}