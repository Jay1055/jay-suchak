import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { rateLimit } from "express-rate-limit";
import Admin from "../models/Admin.js";
import DepartmentHead from "../models/DepartmentHead.js";
import StaffAccount from "../models/StaffAccount.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
const sessionCookie = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/api",
  maxAge: 8 * 60 * 60 * 1000,
};

const loginLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many sign-in attempts. Please try again in 15 minutes." },
});

router.post("/login", loginLimit, async (request, response, next) => {
  const role = request.body.role;
  const identifier = role === "admin"
    ? (typeof request.body.email === "string" ? request.body.email.trim().toLowerCase() : "")
    : (typeof request.body.username === "string" ? request.body.username.trim().toLowerCase() : "");
  const password = typeof request.body.password === "string" ? request.body.password : "";
  if (!identifier || !password || identifier.length > (role === "admin" ? 254 : 32) || password.length > 128) {
    return response.status(400).json({ message: role === "admin" ? "Enter a valid email address and password." : "Enter a valid username and password." });
  }

  try {
    const account = role === "admin"
      ? await Admin.findOne({ email: identifier }).select("+passwordHash")
      : role === "departmentHead"
        ? await DepartmentHead.findOne({ username: identifier, status: "active" }).select("+passwordHash")
        : ["governmentEmployee", "smartCityWorker"].includes(role)
          ? await StaffAccount.findOne({ username: identifier, role, status: "active" }).select("+passwordHash")
          : null;
    const matches = account?.passwordHash ? await bcrypt.compare(password, account.passwordHash) : false;
    if (!matches) return response.status(401).json({ message: "Username, password, or account type is incorrect." });

    const token = jwt.sign({ role }, process.env.JWT_SECRET, { subject: account.id, expiresIn: "8h" });
    response.cookie("suchak_session", token, sessionCookie);
    const user = role === "admin"
      ? { id: account.id, role, name: account.email, email: account.email }
      : role === "departmentHead"
        ? { id: account.id, role, name: account.officialName, email: account.officialEmail, username: account.username }
        : { id: account.id, role, name: account.name, email: account.email, username: account.username };
    return response.json({ user });
  } catch (error) {
    return next(error);
  }
});

router.get("/me", requireAuth, (request, response) => {
  response.json({ user: request.user, departments: request.departments });
});

router.post("/logout", (_request, response) => {
  response.clearCookie("suchak_session", { ...sessionCookie, maxAge: undefined });
  response.status(204).end();
});

export default router;