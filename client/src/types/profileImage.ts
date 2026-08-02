export interface ProfileImageDetails {
  contentType: "image/webp";
  byteSize: number;
  width: number;
  height: number;
  updatedAt: string;
}

export interface ProfileImageUploadResponse {
  status: "success";
  code: "PROFILE_IMAGE_UPDATED";
  message: string;
  profileImagePath: string;
  image: ProfileImageDetails;
}

export interface ProfileImageRemoveResponse {
  status: "success";
  code: "PROFILE_IMAGE_REMOVED";
  message: string;
  changed: boolean;
  removedAt: string;
  profileImagePath: null;
}
