import { Router } from "express";
import { Types } from "mongoose";
import Blog from "../models/blog";
import Upload from "../models/upload";
import User from "../models/user";
import getUserToken from "../utils/auth";

interface BlogBody {
  title?: string;
  content?: string;
  imageId?: string | null;
  dateCreated?: Date | string;
  likes?: number;
  comments?: Array<{ content?: string; user?: string }>;
}

const blogRouter = Router();

const imageFields = "originalName contentType size status";

const resolveImage = async (
  imageId: BlogBody["imageId"],
  userId: string,
): Promise<Types.ObjectId | null | undefined> => {
  if (imageId === undefined) return undefined;
  if (imageId === null) return null;
  if (!Types.ObjectId.isValid(imageId)) return undefined;

  const image = await Upload.findOne({
    _id: imageId,
    owner: userId,
    status: "ready",
  });
  return image?._id;
};

blogRouter.get("/", async (_request, response) => {
  const blogs = await Blog.find({})
    .populate("user", { username: 1, name: 1 })
    .populate("image", imageFields);
  response.json(blogs);
});

blogRouter.get("/:id", async (request, response) => {
  const blog = await Blog.findById(request.params.id)
    .populate("user", { username: 1, name: 1 })
    .populate("image", imageFields);
  return blog ? response.json(blog.toJSON()) : response.status(404).end();
});

blogRouter.post("/", async (request, response) => {
  const body = request.body as BlogBody;
  const decodedToken = getUserToken(request);
  if (!body.title) {
    return response.status(400).json({ error: "title is required" });
  }

  const user = await User.findById(decodedToken.id);
  if (!user) {
    return response.status(401).json({ error: "token missing or invalid" });
  }
  const image = await resolveImage(body.imageId, decodedToken.id);
  if (body.imageId && !image) {
    return response.status(400).json({ error: "imageId must reference your completed upload" });
  }

  const savedBlog = await new Blog({
    title: body.title,
    content: body.content,
    image,
    dateCreated: body.dateCreated,
    likes: body.likes ?? 0,
    comments: body.comments ?? [],
    user: user._id,
  }).save();

  user.blogs = user.blogs.concat(savedBlog._id);
  await user.save();
  await savedBlog.populate("image", imageFields);
  return response.status(201).json(savedBlog);
});

blogRouter.delete("/:id", async (request, response) => {
  const decodedToken = getUserToken(request);
  const [user, blog] = await Promise.all([
    User.findById(decodedToken.id),
    Blog.findById(request.params.id),
  ]);

  if (!user || !blog || user._id.toString() !== blog.user?.toString()) {
    return response.status(401).json({ error: "Unauthorized" });
  }

  await Blog.findByIdAndDelete(request.params.id);
  return response.status(204).end();
});

blogRouter.put("/:id", async (request, response) => {
  const body = request.body as BlogBody;
  const decodedToken = getUserToken(request);
  if (!body.title) {
    return response.status(400).json({ error: "title is required" });
  }
  const image = await resolveImage(body.imageId, decodedToken.id);
  if (body.imageId && !image) {
    return response.status(400).json({ error: "imageId must reference your completed upload" });
  }

  const updatedBlog = await Blog.findByIdAndUpdate(
    request.params.id,
    {
      title: body.title,
      content: body.content,
      image,
      dateCreated: body.dateCreated,
      likes: body.likes ?? 0,
      comments: body.comments,
    },
    { new: true, runValidators: true },
  );
  await updatedBlog?.populate("image", imageFields);
  return updatedBlog
    ? response.json(updatedBlog.toJSON())
    : response.status(404).end();
});

blogRouter.post("/:id/comments", async (request, response) => {
  const decodedToken = getUserToken(request);
  const [blog, user] = await Promise.all([
    Blog.findById(request.params.id).populate("user", { username: 1, name: 1 }),
    User.findById(decodedToken.id),
  ]);
  if (!blog) {
    return response.status(404).end();
  }
  if (!user) {
    return response.status(401).json({ error: "token missing or invalid" });
  }

  blog.comments.push({ content: request.body.content, user: user._id });
  const updatedBlog = await blog.save();
  return response.status(200).json(updatedBlog.toJSON());
});

export default blogRouter;
