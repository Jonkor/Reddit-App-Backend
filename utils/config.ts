import "dotenv/config";

const PORT = process.env.PORT ?? "3003";
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN;

const MONGODB_URI = process.env.NODE_ENV === 'test' 
  ? process.env.TEST_MONGODB_URI
  : process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI is not configured");
}

export default { MONGODB_URI, PORT, FRONTEND_ORIGIN };
