import bcrypt from "bcryptjs";
import { Router } from "express";
import jwt from "jsonwebtoken";
import User from "../models/user";

interface LoginBody {
  username?: string;
  password?: string;
}

const loginRouter = Router();

loginRouter.post("/", async (request, response) => {
  const { username, password } = request.body as LoginBody;
  const user = username ? await User.findOne({ username }) : null;
  const passwordCorrect =
    user && password ? await bcrypt.compare(password, user.passwordHash ?? "") : false;

  if (!(user && passwordCorrect)) {
    return response.status(401).json({ error: "invalid username or password" });
  }

  const secret = process.env.SECRET;
  if (!secret) {
    throw new Error("SECRET is not configured");
  }

  const token = jwt.sign({ username: user.username, id: user._id }, secret);
  return response
    .status(200)
    .send({ token, username: user.username, name: user.name, id: user._id });
});

export default loginRouter;
