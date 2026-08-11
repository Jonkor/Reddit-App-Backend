import bcrypt from "bcryptjs";
import { Router } from "express";
import User from "../models/user";

interface CreateUserBody {
  username?: string;
  name?: string;
  password?: string;
}

const usersRouter = Router();

usersRouter.get("/", async (_request, response) => {
  const users = await User.find({}).populate("blogs", {
    title: 1,
    content: 1,
    dateCreated: 1,
    likes: 1,
  });
  response.json(users);
});

usersRouter.post("/", async (request, response) => {
  const { username, name, password } = request.body as CreateUserBody;

  if (!username) {
    return response.status(400).json({ error: "username is required" });
  }
  if (!password) {
    return response.status(400).json({ error: "password is required" });
  }
  if (await User.exists({ username })) {
    return response.status(400).json({ error: "username must be unique" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const savedUser = await new User({ username, name, passwordHash }).save();
  return response.status(201).json(savedUser);
});

export default usersRouter;
