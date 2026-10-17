import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  CreateUploadInput,
  ObjectStorage,
  UploadAuthorization,
} from "./objectStorage";

interface S3ObjectStorageOptions {
  bucket: string;
  region: string;
  endpoint?: string;
  forcePathStyle?: boolean;
}

export default class S3ObjectStorage implements ObjectStorage {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(options: S3ObjectStorageOptions) {
    this.bucket = options.bucket;
    this.client = new S3Client({
      region: options.region,
      endpoint: options.endpoint,
      forcePathStyle: options.forcePathStyle,
    });
  }

  async createUpload(input: CreateUploadInput): Promise<UploadAuthorization> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: input.key,
      ContentType: input.contentType,
    });
    const uploadUrl = await getSignedUrl(this.client, command, {
      expiresIn: input.expiresInSeconds,
    });

    return {
      method: "PUT",
      uploadUrl,
      headers: { "Content-Type": input.contentType },
    };
  }

  async getObjectMetadata(key: string) {
    const result = await this.client.send(
      new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    return {
      size: result.ContentLength ?? 0,
      contentType: result.ContentType,
    };
  }

  createDownloadUrl(key: string, expiresInSeconds: number): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: expiresInSeconds },
    );
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }
}
