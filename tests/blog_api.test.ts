import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import supertest from "supertest";
import app from "../app";
import Blog from "../models/blog";
import User from "../models/user";
import helper from "./test_helper";

const api = supertest(app);
let token: string;

beforeEach(async () => {
  await Promise.all([Blog.deleteMany({}), User.deleteMany({})]);
  const passwordHash = await bcrypt.hash("test-password", 10);
  const user = await new User({ username: "blog-tester", passwordHash }).save();
  token = jwt.sign(
    { username: user.username, id: user._id },
    process.env.SECRET as string,
  );

  for (const initialBlog of helper.initialBlogs) {
    const blog = await new Blog({ ...initialBlog, user: user._id }).save();
    user.blogs.push(blog._id);
  }
  await user.save();
});

test("returns all blogs", async () => {
  const response = await api.get("/api/blogs");
  expect(response.body).toHaveLength(3);
});

test("blogs expose an id", async () => {
  const blogs = await Blog.find({});
  expect(blogs[0].id).toBeDefined();
});

test("creates a blog", async () => {
  await api
    .post("/api/blogs")
    .set("Authorization", `Bearer ${token}`)
    .send({
      title: "TDD harms architecture",
      content: "Test-driven development",
      likes: 7,
    })
    .expect(201)
    .expect("Content-Type", /application\/json/);

  const response = await api.get("/api/blogs");
  expect(response.body).toHaveLength(helper.initialBlogs.length + 1);
});

test("defaults likes to zero", async () => {
  await api
    .post("/api/blogs")
    .set("Authorization", `Bearer ${token}`)
    .send({ title: "TDD harms architecture" })
    .expect(201);

  const blogs = await Blog.find({});
  expect(blogs[3].likes).toBe(0);
});

test("rejects a blog without a title", async () => {
  await api
    .post("/api/blogs")
    .set("Authorization", `Bearer ${token}`)
    .send({ content: "Missing title", likes: 100 })
    .expect(400);

  const response = await api.get("/api/blogs");
  expect(response.body).toHaveLength(helper.initialBlogs.length);
});

test("deletes a blog owned by the authenticated user", async () => {
  const blogsAtStart = await Blog.find({});
  const blogToDelete = blogsAtStart[0];

  await api
    .delete(`/api/blogs/${blogToDelete.id}`)
    .set("Authorization", `Bearer ${token}`)
    .expect(204);

  const blogsAtEnd = await Blog.find({});
  expect(blogsAtEnd).toHaveLength(helper.initialBlogs.length - 1);
  expect(blogsAtEnd.map((blog) => blog.title)).not.toContain(blogToDelete.title);
});

test("updates a blog", async () => {
  const blogToUpdate = (await Blog.find({}))[0];

  await api
    .put(`/api/blogs/${blogToUpdate.id}`)
    .set("Authorization", `Bearer ${token}`)
    .send({ title: "LOL", likes: 100 })
    .expect(200)
    .expect("Content-Type", /application\/json/);

  const updatedBlog = await Blog.findById(blogToUpdate.id);
  expect(updatedBlog?.title).toBe("LOL");
  expect(updatedBlog?.likes).toBe(100);
});

afterAll(async () => {
  await mongoose.connection.close();
});
