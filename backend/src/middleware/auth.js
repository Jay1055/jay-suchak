import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";
import Department from "../models/Department.js";
import DepartmentHead from "../models/DepartmentHead.js";
import StaffAccount from "../models/StaffAccount.js";

export async function requireAuth(request, response, next) {
  const token = request.cookies.suchak_session;
  if (!token) return response.status(401).json({ message: "Please sign in to continue." });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.role === "admin") {
      const admin = await Admin.findById(payload.sub).select("email");
      if (!admin) return response.status(401).json({ message: "This account is unavailable." });
      request.user = { id: admin.id, role: "admin", name: admin.email, email: admin.email };
      request.departments = [];
    } else if (payload.role === "departmentHead") {
      const head = await DepartmentHead.findById(payload.sub).select("officialName officialEmail phone username status");
      if (!head || head.status !== "active") return response.status(401).json({ message: "This account is unavailable." });
      const departments = await Department.find({ heads: head._id }).select("name code").sort({ name: 1 }).lean();
      request.user = { id: head.id, role: "departmentHead", name: head.officialName, email: head.officialEmail, phone: head.phone || "", username: head.username };
      request.departments = departments;
    } else if (["governmentEmployee", "smartCityWorker"].includes(payload.role)) {
      const account = await StaffAccount.findById(payload.sub)
        .populate("department", "name code")
        .populate("departmentHead", "officialName officialEmail status");
      if (!account || account.status !== "active" || account.role !== payload.role) {
        return response.status(401).json({ message: "This account is unavailable." });
      }
      request.user = {
        id: account.id,
        role: account.role,
        name: account.name,
        email: account.email,
        username: account.username,
        department: account.department,
        departmentHead: account.departmentHead,
      };
      request.departments = [];
    } else {
      return response.status(401).json({ message: "Your session is invalid. Please sign in again." });
    }
    return next();
  } catch {
    return response.status(401).json({ message: "Your session has expired. Please sign in again." });
  }
}

export function requireDepartmentHead(request, response, next) {
  if (request.user?.role !== "departmentHead") {
    return response.status(403).json({ message: "Only department heads can manage staff accounts." });
  }
  return next();
}

export function requireAdminRole(request, response, next) {
  if (request.user?.role !== "admin") {
    return response.status(403).json({ message: "Only administrators can view organization analytics." });
  }
  return next();
}