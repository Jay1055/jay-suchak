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
        ? { id: account.id, role, name: account.officialName, email: account.officialEmail, phone: account.phone || "", username: account.username }
        : { id: account.id, role, name: account.name, email: account.email, username: account.username };
    return response.json({ user });
  } catch (error) {
    return next(error);
  }
});

router.get("/me", requireAuth, (request, response) => {
  response.json({ user: request.user, departments: request.departments });
});

router.patch("/profile", requireAuth, async (request, response, next) => {
  if (request.user.role !== "departmentHead") return response.status(403).json({ message: "Profile editing is available only for department heads." });
  const name = typeof request.body.name === "string" ? request.body.name.trim() : "";
  const email = typeof request.body.email === "string" ? request.body.email.trim().toLowerCase() : "";
  const phone = typeof request.body.phone === "string" ? request.body.phone.trim() : "";
  const username = typeof request.body.username === "string" ? request.body.username.trim().toLowerCase() : "";
  const password = typeof request.body.password === "string" ? request.body.password : "";
  if (!name || name.length > 120 || !/^\S+@\S+\.\S+$/.test(email) || email.length > 254 || phone.length > 30 || !/^[a-z0-9][a-z0-9._-]{2,31}$/.test(username)) {
    return response.status(400).json({ message: "Enter valid profile details." });
  }
  if (password && (password.length < 8 || Buffer.byteLength(password, "utf8") > 72)) {
    return response.status(400).json({ message: "Password must be at least 8 characters." });
  }
  try {
    const conflict = await DepartmentHead.exists({ _id: { $ne: request.user.id }, $or: [{ username }, { officialEmail: email }] });
    if (conflict) return response.status(409).json({ message: "That username or email is already in use." });
    const head = await DepartmentHead.findById(request.user.id).select("+passwordHash");
    if (!head || head.status !== "active") return response.status(404).json({ message: "Profile account not found." });
    head.officialName = name;
    head.officialEmail = email;
    head.phone = phone;
    head.username = username;
    if (password) head.passwordHash = await bcrypt.hash(password, 12);
    await head.save();
    response.json({ user: { id: head.id, role: "departmentHead", name: head.officialName, email: head.officialEmail, phone: head.phone || "", username: head.username } });
  } catch (error) {
    return next(error);
  }
});

router.delete("/profile", requireAuth, async (request, response, next) => {
  if (request.user.role !== "departmentHead") return response.status(403).json({ message: "Profile deactivation is available only for department heads." });
  const password = typeof request.body.password === "string" ? request.body.password : "";
  if (!password) return response.status(400).json({ message: "Enter your password to deactivate your profile." });
  try {
    const head = await DepartmentHead.findById(request.user.id).select("+passwordHash");
    if (!head || head.status !== "active" || !(await bcrypt.compare(password, head.passwordHash))) {
      return response.status(401).json({ message: "Password is incorrect." });
    }
    head.status = "disabled";
    await head.save();
    response.clearCookie("suchak_session", { ...sessionCookie, maxAge: undefined });
    response.status(204).end();
  } catch (error) {
    return next(error);
  }
});

router.post("/logout", (_request, response) => {
  response.clearCookie("suchak_session", { ...sessionCookie, maxAge: undefined });
  response.status(204).end();
});

export default router;