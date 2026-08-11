import { InferSchemaType, model, Schema, Types } from "mongoose";

const commentSchema = new Schema({
  content: String,
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
});
commentSchema.set("toJSON", {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString();
    delete returnedObject._id;
    delete returnedObject.__v;
  },
});
const blogSchema = new Schema({
  title: String,
  content: String,
  dateCreated: Date,
  likes: Number,
  comments: [commentSchema],
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
});
blogSchema.set("toJSON", {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString();
    delete returnedObject._id;
    delete returnedObject.__v;
  },
});

export type BlogDocument = InferSchemaType<typeof blogSchema> & {
  _id: Types.ObjectId;
};

export default model("Blog", blogSchema);
