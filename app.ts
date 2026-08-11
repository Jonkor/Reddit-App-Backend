import "express-async-errors";
import cors from "cors";
import express from "express";
import mongoose from "mongoose";
import blogRouter from "./controllers/blogs";
import loginRouter from "./controllers/login";
import usersRouter from "./controllers/users";
import config from "./utils/config";
import logger from "./utils/logger";
import middleware from "./utils/middleware";

const app = express();

logger.info("connecting to", config.MONGODB_URI);

mongoose
  .connect(config.MONGODB_URI)
  .then(() => {
    logger.info("connected to MongoDB");
  })
  .catch((error) => {
    logger.error("error connecting to MongoDB:", error.message);
  });

const corsOptions = config.FRONTEND_ORIGIN
  ? { origin: config.FRONTEND_ORIGIN }
  : {};

app.use(cors(corsOptions));
app.use(express.json());
app.use(middleware.requestLogger);

app.get("/", (request, response) => {
  response.json({ status: "ok", service: "forum-app-api" });
});

app.use("/api/blogs", blogRouter);
app.use("/api/users", usersRouter);
app.use("/api/login", loginRouter);

app.use(middleware.unknownEndpoint);
app.use(middleware.errorHandler);

export default app;
