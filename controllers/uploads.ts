import { randomUUID } from "crypto";
import { Router } from "express";
import Upload from "../models/upload";
import { getObjectStorage } from "../storage";
import getUserToken from "../utils/auth";

const uploadRouter = Router();

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const UPLOAD_EXPIRY_SECONDS = 10 * 60;
const DOWNLOAD_EXPIRY_SECONDS = 5 * 60;
const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

interface CreateUploadBody {
  fileName?: string;
  contentType?: string;
  size?: number;
}

uploadRouter.post("/", async (request, response) => {
  const { id: userId } = getUserToken(request);
  const body = (request.body ?? {}) as CreateUploadBody;
  const { fileName, contentType, size } = body;

  if (!request.is("application/json")) {
    return response.status(415).json({
      error: "upload authorization requires an application/json body",
      code: "INVALID_UPLOAD_CONTENT_TYPE",
    });
  }

  if (typeof fileName !== "string" || !fileName.trim() || fileName.length > 255) {
    return response.status(400).json({
      error: "fileName must be a non-empty string up to 255 characters",
      code: "INVALID_UPLOAD_METADATA",
      field: "fileName",
    });
  }
  if (typeof contentType !== "string" || !ALLOWED_IMAGE_TYPES[contentType]) {
    return response.status(400).json({
      error: "contentType must be image/jpeg, image/png, image/webp, or image/gif",
      code: "INVALID_UPLOAD_METADATA",
      field: "contentType",
      received: contentType ?? null,
    });
  }
  if (!Number.isInteger(size) || !size || size < 1 || size > MAX_IMAGE_SIZE) {
    return response.status(400).json({
      error: `size must be between 1 and ${MAX_IMAGE_SIZE} bytes`,
      code: "INVALID_UPLOAD_METADATA",
      field: "size",
      received: size ?? null,
    });
  }

  const storageKey = `uploads/${userId}/${randomUUID()}.${ALLOWED_IMAGE_TYPES[contentType]}`;
  const expiresAt = new Date(Date.now() + UPLOAD_EXPIRY_SECONDS * 1000);
  const upload = await Upload.create({
    owner: userId,
    storageKey,
    originalName: fileName.trim(),
    contentType,
    size,
    expiresAt,
  });

  try {
    const authorization = await getObjectStorage().createUpload({
      key: storageKey,
      contentType,
      expiresInSeconds: UPLOAD_EXPIRY_SECONDS,
    });
    return response.status(201).json({
      uploadId: upload.id,
      ...authorization,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    await upload.deleteOne();
    throw error;
  }
});

uploadRouter.post("/:id/complete", async (request, response) => {
  const { id: userId } = getUserToken(request);
  const upload = await Upload.findOne({
    _id: request.params.id,
    owner: userId,
    status: "pending",
  });

  if (!upload) {
    return response.status(404).json({ error: "pending upload not found" });
  }
  if (upload.expiresAt && upload.expiresAt < new Date()) {
    return response.status(410).json({ error: "upload authorization expired" });
  }

  const storage = getObjectStorage();
  const metadata = await storage.getObjectMetadata(upload.storageKey);
  if (
    metadata.size !== upload.size ||
    metadata.contentType?.toLowerCase() !== upload.contentType
  ) {
    await Promise.all([
      storage.deleteObject(upload.storageKey),
      upload.deleteOne(),
    ]);
    return response.status(400).json({
      error: "uploaded object does not match the declared size or contentType",
    });
  }

  upload.status = "ready";
  upload.expiresAt = undefined;
  await upload.save();
  return response.json(upload);
});

uploadRouter.get("/:id/content", async (request, response) => {
  const upload = await Upload.findOne({ _id: request.params.id, status: "ready" });
  if (!upload) {
    return response.status(404).json({ error: "image not found" });
  }

  const downloadUrl = await getObjectStorage().createDownloadUrl(
    upload.storageKey,
    DOWNLOAD_EXPIRY_SECONDS,
  );
  return response.redirect(302, downloadUrl);
});

export default uploadRouter;
