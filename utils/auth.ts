import { Request } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

interface UserToken extends JwtPayload {
  id: string;
}

const getUserToken = (request: Request): UserToken => {
  const authorization = request.get("authorization");
  const token = authorization?.toLowerCase().startsWith("bearer ")
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

export default getUserToken;
