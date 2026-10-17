import config from "../utils/config";
import { ObjectStorage } from "./objectStorage";
import S3ObjectStorage from "./s3ObjectStorage";

let storage: ObjectStorage | undefined;

export const getObjectStorage = (): ObjectStorage => {
  if (storage) return storage;

  if (config.STORAGE_PROVIDER !== "s3") {
    throw new Error("STORAGE_PROVIDER must be configured as s3");
  }
  if (!config.S3_BUCKET || !config.S3_REGION) {
    throw new Error("S3_BUCKET and S3_REGION must be configured");
  }

  storage = new S3ObjectStorage({
    bucket: config.S3_BUCKET,
    region: config.S3_REGION,
    endpoint: config.S3_ENDPOINT,
    forcePathStyle: config.S3_FORCE_PATH_STYLE,
  });
  return storage;
};
