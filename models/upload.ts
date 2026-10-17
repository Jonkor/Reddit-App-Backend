import { InferSchemaType, model, Schema, Types } from "mongoose";

const uploadSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    storageKey: { type: String, required: true, unique: true },
    originalName: { type: String, required: true },
    contentType: { type: String, required: true },
    size: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "ready"],
      default: "pending",
      required: true,
    },
    expiresAt: { type: Date },
  },
  { timestamps: true },
);

uploadSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0, partialFilterExpression: { status: "pending" } },
);

uploadSchema.set("toJSON", {
  transform: (_document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString();
    returnedObject.contentPath = `/api/uploads/${returnedObject.id}/content`;
    delete returnedObject._id;
    delete returnedObject.__v;
    delete returnedObject.storageKey;
    delete returnedObject.owner;
    delete returnedObject.expiresAt;
  },
});

export type UploadDocument = InferSchemaType<typeof uploadSchema> & {
  _id: Types.ObjectId;
};

export default model("Upload", uploadSchema);
