export interface CreateUploadInput {
  key: string;
  contentType: string;
  expiresInSeconds: number;
}

export interface UploadAuthorization {
  method: "PUT";
  uploadUrl: string;
  headers: Record<string, string>;
}

export interface StoredObjectMetadata {
  size: number;
  contentType?: string;
}

export interface ObjectStorage {
  createUpload(input: CreateUploadInput): Promise<UploadAuthorization>;
  getObjectMetadata(key: string): Promise<StoredObjectMetadata>;
  createDownloadUrl(key: string, expiresInSeconds: number): Promise<string>;
  deleteObject(key: string): Promise<void>;
}
