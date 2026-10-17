const mongoose = require("mongoose");

const Employee = require("../models/Employee");

// =====================================================
// HELPERS
// =====================================================

const round2 = (value) => {
  return Number(Number(value || 0).toFixed(2));
};

// =====================================================
// GET EMPLOYEE REPORT
// =====================================================

const getEmployeeReport = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const { status, employeeType, department, designation } = req.query;

    // =================================================
    // VALIDATE COMPANY
    // =================================================

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid company ID",
      });
    }

    // =================================================
    // BUILD QUERY
    // =================================================

    const query = {
      companyId,
    };

    if (status) {
      query.status = status;
    }

    if (employeeType) {
      query.employeeType = employeeType;
    }

    if (department) {
      query.department = department;
    }

    if (designation) {
      query.designation = designation;
    }

    // =================================================
    // GET EMPLOYEES
    // =================================================

    const employees = await Employee.find(query)
      .select("-__v")
      .sort({
        name: 1,
      })
      .lean();

    // =================================================
    // SUMMARY
    // =================================================

    let totalBasicSalary = 0;

    const statusSummary = {};
    const employeeTypeSummary = {};
    const departmentSummary = {};
    const designationSummary = {};

    employees.forEach((employee) => {
      const salary = Number(employee.basicSalary || 0);

      totalBasicSalary += salary;

      // ---------------------------------------------
      // Status
      // ---------------------------------------------

      const currentStatus = employee.status || "inactive";

      if (!statusSummary[currentStatus]) {
        statusSummary[currentStatus] = {
          status: currentStatus,
          count: 0,
          totalBasicSalary: 0,
        };
      }

      statusSummary[currentStatus].count += 1;

      statusSummary[currentStatus].totalBasicSalary += salary;

      // ---------------------------------------------
      // Employee Type
      // ---------------------------------------------

      const type = employee.employeeType || "other";

      if (!employeeTypeSummary[type]) {
        employeeTypeSummary[type] = {
          employeeType: type,
          count: 0,
          totalBasicSalary: 0,
        };
      }

      employeeTypeSummary[type].count += 1;

      employeeTypeSummary[type].totalBasicSalary += salary;

      // ---------------------------------------------
      // Department
      // ---------------------------------------------

      const dept = employee.department || "Not Assigned";

      if (!departmentSummary[dept]) {
        departmentSummary[dept] = {
          department: dept,
          count: 0,
          totalBasicSalary: 0,
        };
      }

      departmentSummary[dept].count += 1;

      departmentSummary[dept].totalBasicSalary += salary;

      // ---------------------------------------------
      // Designation
      // ---------------------------------------------

      const designationName = employee.designation || "Not Assigned";

      if (!designationSummary[designationName]) {
        designationSummary[designationName] = {
          designation: designationName,
          count: 0,
          totalBasicSalary: 0,
        };
      }

      designationSummary[designationName].count += 1;

      designationSummary[designationName].totalBasicSalary += salary;
    });

    // =================================================
    // ROUND SALARIES
    // =================================================

    totalBasicSalary = round2(totalBasicSalary);

    Object.values(statusSummary).forEach((item) => {
      item.totalBasicSalary = round2(item.totalBasicSalary);
    });

    Object.values(employeeTypeSummary).forEach((item) => {
      item.totalBasicSalary = round2(item.totalBasicSalary);
    });

    Object.values(departmentSummary).forEach((item) => {
      item.totalBasicSalary = round2(item.totalBasicSalary);
    });

    Object.values(designationSummary).forEach((item) => {
      item.totalBasicSalary = round2(item.totalBasicSalary);
    });

    // =================================================
    // RESPONSE
    // =================================================

    return res.status(200).json({
      success: true,

      count: employees.length,

      summary: {
        totalEmployees: employees.length,

        totalBasicSalary,

        statusSummary: Object.values(statusSummary),

        employeeTypeSummary: Object.values(employeeTypeSummary),

        departmentSummary: Object.values(departmentSummary),

        designationSummary: Object.values(designationSummary),
      },

      data: employees,
    });
  } catch (error) {
    console.error("Get employee report error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate employee report",
      error: error.message,
    });
  }
};

// =====================================================
// GET EMPLOYEE SUMMARY
// =====================================================

const getEmployeeSummary = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    // =================================================
    // VALIDATE COMPANY
    // =================================================

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid company ID",
      });
    }

    // =================================================
    // GET EMPLOYEES
    // =================================================

    const employees = await Employee.find({
      companyId,
    })
      .select("status employeeType department designation basicSalary")
      .lean();

    // =================================================
    // SUMMARY
    // =================================================

    let activeEmployees = 0;
    let inactiveEmployees = 0;
    let totalBasicSalary = 0;

    employees.forEach((employee) => {
      if (employee.status === "active") {
        activeEmployees += 1;
      }

      if (employee.status === "inactive") {
        inactiveEmployees += 1;
      }

      totalBasicSalary += Number(employee.basicSalary || 0);
    });

    const totalEmployees = employees.length;

    // =================================================
    // RESPONSE
    // =================================================

    return res.status(200).json({
      success: true,

      data: {
        totalEmployees,

        activeEmployees,

        inactiveEmployees,

        totalBasicSalary: round2(totalBasicSalary),
      },
    });
  } catch (error) {
    console.error("Get employee summary error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate employee summary",
      error: error.message,
    });
  }
};

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  getEmployeeReport,
  getEmployeeSummary,
};
