import mongoose from "mongoose";

const departmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    category: { type: String, required: true },
    heads: [{ type: mongoose.Schema.Types.ObjectId, ref: "DepartmentHead" }],
  },
  { timestamps: true },
);

export default mongoose.models.Department || mongoose.model("Department", departmentSchema);