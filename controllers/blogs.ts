import { Request, Router } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import Blog from "../models/blog";
import User from "../models/user";

interface BlogBody {
  title?: string;
  content?: string;
  dateCreated?: Date | string;
  likes?: number;
  comments?: Array<{ content?: string; user?: string }>;
}

interface UserToken extends JwtPayload {
  id: string;
}

const blogRouter = Router();

const getUserToken = (request: Request): UserToken => {
  const authorization = request.get("authorization");
  const token =
    authorization?.toLowerCase().startsWith("bearer ")
      ? authorization.substring(7)
      : undefined;
  const secret = process.env.SECRET;

  if (!token || !secret) {
    throw new jwt.JsonWebTokenError("token missing or invalid");
  }

  const decoded = jwt.verify(token, secret);
  if (typeof decoded === "string" || !decoded.id) {
    throw new jwt.JsonWebTokenError("token missing or invalid");
  }
  return decoded as UserToken;
};

blogRouter.get("/", async (_request, response) => {
  const blogs = await Blog.find({}).populate("user", { username: 1, name: 1 });
  response.json(blogs);
});

blogRouter.get("/:id", async (request, response) => {
  const blog = await Blog.findById(request.params.id);
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

  const savedBlog = await new Blog({
    title: body.title,
    content: body.content,
    dateCreated: body.dateCreated,
    likes: body.likes ?? 0,
    comments: body.comments ?? [],
    user: user._id,
  }).save();

  user.blogs = user.blogs.concat(savedBlog._id);
  await user.save();
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
  getUserToken(request);
  if (!body.title) {
    return response.status(400).json({ error: "title is required" });
  }

  const updatedBlog = await Blog.findByIdAndUpdate(
    request.params.id,
    {
      title: body.title,
      content: body.content,
      dateCreated: body.dateCreated,
      likes: body.likes ?? 0,
      comments: body.comments,
    },
    { new: true },
  );
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
