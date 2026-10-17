import dotenv from "dotenv";

const environment = process.env.NODE_ENV;
if (environment) {
  dotenv.config({ path: `.env.${environment}` });
}
dotenv.config();

const PORT = process.env.PORT ?? "3003";
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN;
const STORAGE_PROVIDER = process.env.STORAGE_PROVIDER;
const S3_BUCKET = process.env.S3_BUCKET;
const S3_REGION = process.env.S3_REGION;
const S3_ENDPOINT = process.env.S3_ENDPOINT;
const S3_FORCE_PATH_STYLE = process.env.S3_FORCE_PATH_STYLE === "true";

const MONGODB_URI = process.env.NODE_ENV === 'test' 
  ? process.env.TEST_MONGODB_URI
  : process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI is not configured");
}

export default {
  MONGODB_URI,
  PORT,
  FRONTEND_ORIGIN,
  STORAGE_PROVIDER,
  S3_BUCKET,
  S3_REGION,
  S3_ENDPOINT,
  S3_FORCE_PATH_STYLE,
};
