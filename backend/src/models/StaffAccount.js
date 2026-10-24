import mongoose from "mongoose";

export const staffRoles = ["governmentEmployee", "smartCityWorker"];

const staffAccountSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, required: true, trim: true, maxlength: 30 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 32 },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: staffRoles, required: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
    departmentHead: { type: mongoose.Schema.Types.ObjectId, ref: "DepartmentHead", required: true },
    status: { type: String, enum: ["active", "disabled"], default: "active", required: true },
  },
  { timestamps: true },
);

export default mongoose.models.StaffAccount || mongoose.model("StaffAccount", staffAccountSchema);