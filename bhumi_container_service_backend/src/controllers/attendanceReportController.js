const mongoose = require("mongoose");

const Attendance = require("../models/Attendance");
const Employee = require("../models/Employee");

// =====================================================
// HELPERS
// =====================================================

const round2 = (value) => {
  return Number(Number(value || 0).toFixed(2));
};

const buildDateRange = (fromDate, toDate) => {
  let startDate;
  let endDate;

  if (fromDate) {
    startDate = new Date(fromDate);

    if (isNaN(startDate.getTime())) {
      return {
        error: "Invalid fromDate",
      };
    }

    startDate.setHours(0, 0, 0, 0);
  }

  if (toDate) {
    endDate = new Date(toDate);

    if (isNaN(endDate.getTime())) {
      return {
        error: "Invalid toDate",
      };
    }

    endDate.setHours(23, 59, 59, 999);
  }

  if (startDate && endDate && startDate > endDate) {
    return {
      error: "fromDate cannot be greater than toDate",
    };
  }

  return {
    startDate,
    endDate,
  };
};

// =====================================================
// GET ATTENDANCE REPORT
// =====================================================

const getAttendanceReport = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const { employeeId, status, fromDate, toDate } = req.query;

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
    // VALIDATE EMPLOYEE ID
    // =================================================

    if (employeeId && !mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid employee ID",
      });
    }

    // =================================================
    // VALIDATE EMPLOYEE BELONGS TO COMPANY
    // =================================================

    if (employeeId) {
      const employee = await Employee.findOne({
        _id: employeeId,
        companyId,
      })
        .select("_id")
        .lean();

      if (!employee) {
        return res.status(404).json({
          success: false,
          message: "Employee not found in this company",
        });
      }
    }

    // =================================================
    // DATE RANGE
    // =================================================

    const dateRange = buildDateRange(fromDate, toDate);

    if (dateRange.error) {
      return res.status(400).json({
        success: false,
        message: dateRange.error,
      });
    }

    const { startDate, endDate } = dateRange;

    // =================================================
    // BUILD QUERY
    // =================================================

    const query = {
      companyId,
    };

    if (employeeId) {
      query.employeeId = employeeId;
    }

    if (status) {
      query.status = status;
    }

    if (startDate || endDate) {
      query.attendanceDate = {};

      if (startDate) {
        query.attendanceDate.$gte = startDate;
      }

      if (endDate) {
        query.attendanceDate.$lte = endDate;
      }
    }

    // =================================================
    // GET ATTENDANCE
    // =================================================

    const attendance = await Attendance.find(query)
      .populate(
        "employeeId",
        "employeeCode name phone designation department employeeType",
      )
      .sort({
        attendanceDate: -1,
      })
      .lean();

    // =================================================
    // SUMMARY
    // =================================================

    let totalWorkingHours = 0;
    let totalOvertimeHours = 0;

    const statusSummary = {};
    const employeeSummary = {};

    attendance.forEach((record) => {
      const workingHours = Number(record.workingHours || 0);

      const overtimeHours = Number(record.overtimeHours || 0);

      totalWorkingHours += workingHours;
      totalOvertimeHours += overtimeHours;

      // ---------------------------------------------
      // STATUS SUMMARY
      // ---------------------------------------------

      const currentStatus = record.status || "unknown";

      if (!statusSummary[currentStatus]) {
        statusSummary[currentStatus] = {
          status: currentStatus,
          count: 0,
        };
      }

      statusSummary[currentStatus].count += 1;

      // ---------------------------------------------
      // EMPLOYEE SUMMARY
      // ---------------------------------------------

      if (record.employeeId) {
        const id = record.employeeId._id.toString();

        if (!employeeSummary[id]) {
          employeeSummary[id] = {
            employeeId: record.employeeId._id,

            employeeCode: record.employeeId.employeeCode,

            employeeName: record.employeeId.name,

            designation: record.employeeId.designation,

            department: record.employeeId.department,

            totalDays: 0,

            presentDays: 0,

            absentDays: 0,

            halfDays: 0,

            leaveDays: 0,

            holidayDays: 0,

            workingHours: 0,

            overtimeHours: 0,
          };
        }

        const item = employeeSummary[id];

        item.totalDays += 1;

        item.workingHours += workingHours;

        item.overtimeHours += overtimeHours;

        switch (record.status) {
          case "present":
            item.presentDays += 1;
            break;

          case "absent":
            item.absentDays += 1;
            break;

          case "half_day":
            item.halfDays += 1;
            break;

          case "leave":
            item.leaveDays += 1;
            break;

          case "holiday":
            item.holidayDays += 1;
            break;

          default:
            break;
        }
      }
    });

    // =================================================
    // ROUND HOURS
    // =================================================

    totalWorkingHours = round2(totalWorkingHours);

    totalOvertimeHours = round2(totalOvertimeHours);

    Object.values(employeeSummary).forEach((item) => {
      item.workingHours = round2(item.workingHours);

      item.overtimeHours = round2(item.overtimeHours);
    });

    // =================================================
    // RESPONSE
    // =================================================

    return res.status(200).json({
      success: true,

      count: attendance.length,

      summary: {
        totalRecords: attendance.length,

        totalWorkingHours,

        totalOvertimeHours,

        statusSummary: Object.values(statusSummary),

        employeeSummary: Object.values(employeeSummary),
      },

      data: attendance,
    });
  } catch (error) {
    console.error("Get attendance report error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate attendance report",
      error: error.message,
    });
  }
};

// =====================================================
// GET EMPLOYEE ATTENDANCE REPORT
// =====================================================

const getEmployeeAttendanceReport = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const { employeeId, fromDate, toDate } = req.query;

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
    // VALIDATE EMPLOYEE ID
    // =================================================

    if (employeeId && !mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid employee ID",
      });
    }

    // =================================================
    // DATE RANGE
    // =================================================

    const dateRange = buildDateRange(fromDate, toDate);

    if (dateRange.error) {
      return res.status(400).json({
        success: false,
        message: dateRange.error,
      });
    }

    const { startDate, endDate } = dateRange;

    // =================================================
    // EMPLOYEE QUERY
    // =================================================

    const employeeQuery = {
      companyId,
    };

    if (employeeId) {
      employeeQuery._id = employeeId;
    }

    const employees = await Employee.find(employeeQuery)
      .select(
        "employeeCode name phone designation department employeeType status",
      )
      .sort({
        name: 1,
      })
      .lean();

    // =================================================
    // IF SPECIFIC EMPLOYEE WAS REQUESTED
    // =================================================

    if (employeeId && employees.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Employee not found in this company",
      });
    }

    // =================================================
    // REPORT
    // =================================================

    const report = [];

    for (const employee of employees) {
      const attendanceQuery = {
        companyId,

        employeeId: employee._id,
      };

      // ---------------------------------------------
      // DATE FILTER
      // ---------------------------------------------

      if (startDate || endDate) {
        attendanceQuery.attendanceDate = {};

        if (startDate) {
          attendanceQuery.attendanceDate.$gte = startDate;
        }

        if (endDate) {
          attendanceQuery.attendanceDate.$lte = endDate;
        }
      }

      const records = await Attendance.find(attendanceQuery)
        .sort({
          attendanceDate: 1,
        })
        .lean();

      // ---------------------------------------------
      // COUNTERS
      // ---------------------------------------------

      let presentDays = 0;
      let absentDays = 0;
      let halfDays = 0;
      let leaveDays = 0;
      let holidayDays = 0;

      let workingHours = 0;
      let overtimeHours = 0;

      records.forEach((record) => {
        switch (record.status) {
          case "present":
            presentDays += 1;
            break;

          case "absent":
            absentDays += 1;
            break;

          case "half_day":
            halfDays += 1;
            break;

          case "leave":
            leaveDays += 1;
            break;

          case "holiday":
            holidayDays += 1;
            break;

          default:
            break;
        }

        workingHours += Number(record.workingHours || 0);

        overtimeHours += Number(record.overtimeHours || 0);
      });

      // ---------------------------------------------
      // REPORT ITEM
      // ---------------------------------------------

      report.push({
        employeeId: employee._id,

        employeeCode: employee.employeeCode,

        employeeName: employee.name,

        designation: employee.designation,

        department: employee.department,

        employeeType: employee.employeeType,

        employeeStatus: employee.status,

        totalDays: records.length,

        presentDays,

        absentDays,

        halfDays,

        leaveDays,

        holidayDays,

        workingHours: round2(workingHours),

        overtimeHours: round2(overtimeHours),

        attendance: records,
      });
    }

    // =================================================
    // RESPONSE
    // =================================================

    return res.status(200).json({
      success: true,

      count: report.length,

      data: report,
    });
  } catch (error) {
    console.error("Get employee attendance report error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate employee attendance report",
      error: error.message,
    });
  }
};

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  getAttendanceReport,
  getEmployeeAttendanceReport,
};
