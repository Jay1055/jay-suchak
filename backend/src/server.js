import dotenv from "dotenv";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import mongoose from "mongoose";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";
import headRoutes from "./routes/head.js";

const backendDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: resolve(backendDirectory, ".env") });

const requiredEnvironment = ["MONGODB_URI", "JWT_SECRET", "CLIENT_ORIGIN"];
let missingEnvironment = requiredEnvironment.filter((key) => !process.env[key]?.trim());
if (missingEnvironment.length) {
  dotenv.config({ path: resolve(backendDirectory, "../../admin/backend/.env") });
  missingEnvironment = requiredEnvironment.filter((key) => !process.env[key]?.trim());
}
if (missingEnvironment.length) {
  console.error(`Missing required backend environment values: ${missingEnvironment.join(", ")}`);
  process.exit(1);
}
if (process.env.JWT_SECRET.length < 32) {
  console.error("JWT_SECRET must be at least 32 characters long.");
  process.exit(1);
}

const app = express();
app.disable("x-powered-by");
app.use(helmet());
const allowedOrigins = [process.env.CLIENT_ORIGIN];
if (process.env.NODE_ENV !== "production") allowedOrigins.push("http://localhost:5174", "http://127.0.0.1:5174");
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

app.get("/api/health", (_request, response) => response.json({ status: "ok" }));
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/head", headRoutes);
app.use((error, _request, response, _next) => {
  console.error("Request failed:", error.message);
  response.status(500).json({ message: "Something went wrong. Please try again." });
});

const port = Number(process.env.SUCHAK_PORT) || 8001;
try {
  await mongoose.connect(process.env.MONGODB_URI);
  app.listen(port, () => console.log(`SuchnaSetu API listening on port ${port}`));
} catch (error) {
  console.error("Could not connect to MongoDB:", error.message);
  process.exit(1);
}