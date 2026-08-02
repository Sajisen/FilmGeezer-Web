export interface StoredProfileImage {
  objectKey: string;
  version: string;
  contentType: "image/webp";
  byteSize: number;
  width: number;
  height: number;
  updatedAt: Date;
}

export interface ProcessedProfileImage {
  buffer: Buffer;
  contentType: "image/webp";
  byteSize: number;
  width: number;
  height: number;
}

export type ProfileImageReadResult =
  | {
      kind: "buffer";
      buffer: Buffer;
      contentType: "image/webp";
      cacheControl: string;
    }
  | {
      kind: "redirect";
      url: string;
      cacheControl: string;
    };

export interface ProfileImageStorage {
  put(input: {
    objectKey: string;
    image: ProcessedProfileImage;
  }): Promise<void>;

  remove(objectKey: string): Promise<void>;

  createReadResult(
    objectKey: string,
  ): Promise<ProfileImageReadResult>;
}