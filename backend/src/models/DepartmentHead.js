import mongoose from "mongoose";

const departmentHeadSchema = new mongoose.Schema(
  {
    officialName: { type: String, required: true, trim: true, maxlength: 120 },
    officialEmail: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    phone: { type: String, trim: true, maxlength: 30 },
    username: { type: String, unique: true, sparse: true, lowercase: true, trim: true, maxlength: 32 },
    passwordHash: { type: String, select: false },
    status: { type: String, enum: ["invited", "active", "disabled"], default: "invited", required: true },
  },
  { timestamps: true },
);

export default mongoose.models.DepartmentHead || mongoose.model("DepartmentHead", departmentHeadSchema);