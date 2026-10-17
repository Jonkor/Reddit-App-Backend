import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import supertest from "supertest";
import app from "../app";
import Upload from "../models/upload";
import User from "../models/user";
import { getObjectStorage } from "../storage";
import { ObjectStorage } from "../storage/objectStorage";

jest.mock("../storage", () => ({ getObjectStorage: jest.fn() }));

const api = supertest(app);
const storage: jest.Mocked<ObjectStorage> = {
  createUpload: jest.fn(),
  getObjectMetadata: jest.fn(),
  createDownloadUrl: jest.fn(),
  deleteObject: jest.fn(),
};
let token: string;

beforeEach(async () => {
  jest.clearAllMocks();
  jest.mocked(getObjectStorage).mockReturnValue(storage);
  await Promise.all([Upload.deleteMany({}), User.deleteMany({})]);
  const passwordHash = await bcrypt.hash("test-password", 10);
  const user = await new User({ username: "uploader", passwordHash }).save();
  token = jwt.sign({ username: user.username, id: user._id }, process.env.SECRET as string);
});

test("creates a direct upload authorization", async () => {
  storage.createUpload.mockResolvedValue({
    method: "PUT",
    uploadUrl: "https://storage.example.test/signed-upload",
    headers: { "Content-Type": "image/png" },
  });

  const response = await api
    .post("/api/uploads")
    .set("Authorization", `Bearer ${token}`)
    .send({ fileName: "avatar.png", contentType: "image/png", size: 1024 })
    .expect(201);

  expect(response.body.method).toBe("PUT");
  expect(response.body.uploadUrl).toBe("https://storage.example.test/signed-upload");
  expect(response.body.uploadId).toBeDefined();
  expect(storage.createUpload).toHaveBeenCalledWith(
    expect.objectContaining({ contentType: "image/png" }),
  );
});

test("rejects unsupported files before contacting storage", async () => {
  const response = await api
    .post("/api/uploads")
    .set("Authorization", `Bearer ${token}`)
    .send({ fileName: "payload.svg", contentType: "image/svg+xml", size: 100 })
    .expect(400);

  expect(response.body).toMatchObject({
    code: "INVALID_UPLOAD_METADATA",
    field: "contentType",
    received: "image/svg+xml",
  });
  expect(storage.createUpload).not.toHaveBeenCalled();
});

test("explains when the authorization request is sent as form data", async () => {
  const response = await api
    .post("/api/uploads")
    .set("Authorization", `Bearer ${token}`)
    .field("fileName", "avatar.png")
    .field("contentType", "image/png")
    .field("size", "1024")
    .expect(415);

  expect(response.body.code).toBe("INVALID_UPLOAD_CONTENT_TYPE");
});

test("verifies and completes an uploaded object", async () => {
  const user = await User.findOne({ username: "uploader" });
  const upload = await Upload.create({
    owner: user?._id,
    storageKey: "uploads/user/image.jpg",
    originalName: "image.jpg",
    contentType: "image/jpeg",
    size: 2048,
    expiresAt: new Date(Date.now() + 60_000),
  });
  storage.getObjectMetadata.mockResolvedValue({
    size: 2048,
    contentType: "image/jpeg",
  });

  const response = await api
    .post(`/api/uploads/${upload.id}/complete`)
    .set("Authorization", `Bearer ${token}`)
    .expect(200);

  expect(response.body.status).toBe("ready");
  expect(response.body.storageKey).toBeUndefined();
  expect((await Upload.findById(upload.id))?.status).toBe("ready");
});

test("redirects image reads to a short-lived storage URL", async () => {
  const user = await User.findOne({ username: "uploader" });
  const upload = await Upload.create({
    owner: user?._id,
    storageKey: "uploads/user/image.webp",
    originalName: "image.webp",
    contentType: "image/webp",
    size: 4096,
    status: "ready",
  });
  storage.createDownloadUrl.mockResolvedValue("https://storage.example.test/signed-read");

  const response = await api.get(`/api/uploads/${upload.id}/content`).expect(302);
  expect(response.headers.location).toBe("https://storage.example.test/signed-read");
});

afterAll(async () => {
  await mongoose.connection.close();
});
