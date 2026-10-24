import { Router } from "express";
import Department from "../models/Department.js";
import DepartmentHead from "../models/DepartmentHead.js";
import StaffAccount from "../models/StaffAccount.js";
import { requireAuth, requireAdminRole } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth, requireAdminRole);

router.get("/overview", async (_request, response, next) => {
  try {
    const [departments, headCount, activeHeadCount, staffByDepartment] = await Promise.all([
      Department.find().select("name code heads").sort({ name: 1 }).lean(),
      DepartmentHead.countDocuments(),
      DepartmentHead.countDocuments({ status: "active" }),
      StaffAccount.aggregate([
        { $match: { status: "active" } },
        { $group: { _id: { department: "$department", role: "$role" }, count: { $sum: 1 } } },
      ]),
    ]);
    const staffCounts = new Map(staffByDepartment.map((entry) => [`${entry._id.department}:${entry._id.role}`, entry.count]));
    const departmentRows = departments.map((department) => ({
      _id: department._id,
      name: department.name,
      code: department.code,
      headCount: department.heads.length,
      employeeCount: staffCounts.get(`${department._id}:governmentEmployee`) || 0,
      workerCount: staffCounts.get(`${department._id}:smartCityWorker`) || 0,
    }));
    const employeeCount = departmentRows.reduce((total, department) => total + department.employeeCount, 0);
    const workerCount = departmentRows.reduce((total, department) => total + department.workerCount, 0);

    return response.json({
      totals: {
        departmentCount: departments.length,
        headCount,
        activeHeadCount,
        employeeCount,
        workerCount,
        memberCount: employeeCount + workerCount,
      },
      departments: departmentRows,
    });
  } catch (error) {
    return next(error);
  }
});

export default router;