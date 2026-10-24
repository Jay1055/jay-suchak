import { Router } from "express";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import Department from "../models/Department.js";
import DepartmentHead from "../models/DepartmentHead.js";
import StaffAccount, { staffRoles } from "../models/StaffAccount.js";
import { requireAuth, requireDepartmentHead } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth, requireDepartmentHead);

function validateStaff(body, requirePassword) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const phoneDigits = phone.replace(/\D/g, "");
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const role = body.role;

  if (!name || name.length > 120) return { error: "Enter a name up to 120 characters." };
  if (!/^\+?[0-9().\s-]+$/.test(phone) || phoneDigits.length < 7 || phoneDigits.length > 15 || phone.length > 30) {
    return { error: "Enter a valid phone number." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return { error: "Enter a valid email address." };
  if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(username)) {
    return { error: "Username must be 3 to 32 characters using letters, numbers, dots, underscores, or hyphens." };
  }
  if (!staffRoles.includes(role)) return { error: "Choose a valid staff account type." };
  if (requirePassword && (password.length < 8 || Buffer.byteLength(password, "utf8") > 72)) {
    return { error: "Password must be at least 8 characters and no more than 72 bytes." };
  }
  if (!requirePassword && password && (password.length < 8 || Buffer.byteLength(password, "utf8") > 72)) {
    return { error: "A new password must be at least 8 characters and no more than 72 bytes." };
  }
  return { value: { name, phone, email, username, password, role } };
}

async function hasAccountConflict(value, excludeId) {
  const query = { $or: [{ username: value.username }, { email: value.email }] };
  if (excludeId) query._id = { $ne: excludeId };
  const [headConflict, staffConflict] = await Promise.all([
    DepartmentHead.exists({ $or: [{ username: value.username }, { officialEmail: value.email }] }),
    StaffAccount.exists(query),
  ]);
  return Boolean(headConflict || staffConflict);
}

async function getManagedDepartment(departmentId, headId) {
  if (!mongoose.isValidObjectId(departmentId)) return null;
  return Department.findOne({ _id: departmentId, heads: headId }).select("name code");
}

router.get("/departments", (request, response) => {
  response.json({ departments: request.departments });
});

router.get("/staff", async (request, response, next) => {
  try {
    const department = await getManagedDepartment(request.query.departmentId, request.user.id);
    if (!department) return response.status(404).json({ message: "That department is not assigned to your account." });
    const staff = await StaffAccount.find({ department: department._id, departmentHead: request.user.id })
      .select("name phone email username role status createdAt")
      .sort({ name: 1 })
      .lean();
    return response.json({ staff });
  } catch (error) {
    return next(error);
  }
});

router.post("/staff", async (request, response, next) => {
  const validation = validateStaff(request.body || {}, true);
  if (validation.error) return response.status(400).json({ message: validation.error });
  const value = validation.value;
  try {
    const department = await getManagedDepartment(request.body.departmentId, request.user.id);
    if (!department) return response.status(404).json({ message: "That department is not assigned to your account." });
    if (await hasAccountConflict(value)) return response.status(409).json({ message: "That username or email is already in use." });

    const staff = await StaffAccount.create({
      name: value.name,
      phone: value.phone,
      email: value.email,
      username: value.username,
      passwordHash: await bcrypt.hash(value.password, 12),
      role: value.role,
      department: department._id,
      departmentHead: request.user.id,
    });
    return response.status(201).json({
      staff: {
        _id: staff.id,
        name: staff.name,
        phone: staff.phone,
        email: staff.email,
        username: staff.username,
        role: staff.role,
        status: staff.status,
      },
    });
  } catch (error) {
    if (error.code === 11000) return response.status(409).json({ message: "That username or email is already in use." });
    return next(error);
  }
});

router.patch("/staff/:id", async (request, response, next) => {
  if (!mongoose.isValidObjectId(request.params.id)) return response.status(400).json({ message: "Invalid staff account." });
  const validation = validateStaff(request.body || {}, false);
  if (validation.error) return response.status(400).json({ message: validation.error });
  const value = validation.value;
  try {
    const staff = await StaffAccount.findOne({ _id: request.params.id, departmentHead: request.user.id });
    if (!staff) return response.status(404).json({ message: "Staff account not found." });
    if (await hasAccountConflict(value, staff._id)) return response.status(409).json({ message: "That username or email is already in use." });

    staff.name = value.name;
    staff.phone = value.phone;
    staff.email = value.email;
    staff.username = value.username;
    staff.role = value.role;
    if (value.password) staff.passwordHash = await bcrypt.hash(value.password, 12);
    await staff.save();
    return response.json({
      staff: {
        _id: staff.id,
        name: staff.name,
        phone: staff.phone,
        email: staff.email,
        username: staff.username,
        role: staff.role,
        status: staff.status,
      },
    });
  } catch (error) {
    if (error.code === 11000) return response.status(409).json({ message: "That username or email is already in use." });
    return next(error);
  }
});

router.delete("/staff/:id", async (request, response, next) => {
  if (!mongoose.isValidObjectId(request.params.id)) return response.status(400).json({ message: "Invalid staff account." });
  try {
    const staff = await StaffAccount.findOneAndDelete({ _id: request.params.id, departmentHead: request.user.id });
    if (!staff) return response.status(404).json({ message: "Staff account not found." });
    return response.status(204).end();
  } catch (error) {
    return next(error);
  }
});

export default router;