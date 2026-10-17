const mongoose = require("mongoose");

const EmployeeAdvance = require("../models/EmployeeAdvance");
const Employee = require("../models/Employee");

// =====================================================
// GET EMPLOYEE ADVANCE REPORT
// =====================================================
const getEmployeeAdvanceReport = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company is required",
      });
    }

    const { employeeId, status, fromDate, toDate } = req.query;

    const filter = {
      companyId: new mongoose.Types.ObjectId(companyId),
    };

    // Employee filter
    if (employeeId) {
      if (!mongoose.Types.ObjectId.isValid(employeeId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid employeeId",
        });
      }

      filter.employeeId = new mongoose.Types.ObjectId(employeeId);
    }

    // Status filter
    if (status) {
      const allowedStatuses = ["pending", "partial", "recovered", "cancelled"];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid advance status",
        });
      }

      filter.status = status;
    }

    // Date filter
    if (fromDate || toDate) {
      filter.advanceDate = {};

      if (fromDate) {
        const startDate = new Date(fromDate);

        if (isNaN(startDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid fromDate",
          });
        }

        startDate.setHours(0, 0, 0, 0);

        filter.advanceDate.$gte = startDate;
      }

      if (toDate) {
        const endDate = new Date(toDate);

        if (isNaN(endDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid toDate",
          });
        }

        endDate.setHours(23, 59, 59, 999);

        filter.advanceDate.$lte = endDate;
      }
    }

    const advances = await EmployeeAdvance.find(filter)
      .populate(
        "employeeId",
        "employeeCode name phone designation department employeeType",
      )
      .sort({
        advanceDate: -1,
        createdAt: -1,
      });

    // =====================================================
    // SUMMARY
    // =====================================================

    let totalAdvanceAmount = 0;
    let totalRecoveredAmount = 0;
    let totalOutstandingAmount = 0;

    const statusMap = {};
    const employeeMap = {};

    advances.forEach((advance) => {
      const amount = Number(advance.amount || 0);
      const recoveredAmount = Number(advance.recoveredAmount || 0);
      const outstandingAmount = Number(advance.outstandingAmount || 0);

      totalAdvanceAmount += amount;
      totalRecoveredAmount += recoveredAmount;
      totalOutstandingAmount += outstandingAmount;

      // -----------------------------------------
      // STATUS SUMMARY
      // -----------------------------------------

      if (!statusMap[advance.status]) {
        statusMap[advance.status] = {
          status: advance.status,
          count: 0,
          amount: 0,
          recoveredAmount: 0,
          outstandingAmount: 0,
        };
      }

      statusMap[advance.status].count += 1;
      statusMap[advance.status].amount += amount;
      statusMap[advance.status].recoveredAmount += recoveredAmount;
      statusMap[advance.status].outstandingAmount += outstandingAmount;

      // -----------------------------------------
      // EMPLOYEE SUMMARY
      // -----------------------------------------

      if (advance.employeeId) {
        const empId = advance.employeeId._id.toString();

        if (!employeeMap[empId]) {
          employeeMap[empId] = {
            employeeId: advance.employeeId._id,
            employeeCode: advance.employeeId.employeeCode,
            employeeName: advance.employeeId.name,
            designation: advance.employeeId.designation,
            department: advance.employeeId.department,
            advanceCount: 0,
            advanceAmount: 0,
            recoveredAmount: 0,
            outstandingAmount: 0,
          };
        }

        employeeMap[empId].advanceCount += 1;
        employeeMap[empId].advanceAmount += amount;
        employeeMap[empId].recoveredAmount += recoveredAmount;
        employeeMap[empId].outstandingAmount += outstandingAmount;
      }
    });

    const round = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

    const summary = {
      totalRecords: advances.length,

      totalAdvanceAmount: round(totalAdvanceAmount),

      totalRecoveredAmount: round(totalRecoveredAmount),

      totalOutstandingAmount: round(totalOutstandingAmount),

      statusSummary: Object.values(statusMap).map((item) => ({
        ...item,
        amount: round(item.amount),
        recoveredAmount: round(item.recoveredAmount),
        outstandingAmount: round(item.outstandingAmount),
      })),

      employeeSummary: Object.values(employeeMap).map((item) => ({
        ...item,
        advanceAmount: round(item.advanceAmount),
        recoveredAmount: round(item.recoveredAmount),
        outstandingAmount: round(item.outstandingAmount),
      })),
    };

    return res.status(200).json({
      success: true,
      count: advances.length,

      filters: {
        employeeId: employeeId || null,
        status: status || null,
        fromDate: fromDate || null,
        toDate: toDate || null,
      },

      summary,

      data: advances,
    });
  } catch (error) {
    console.error("Get employee advance report error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get employee advance report",
      error: error.message,
    });
  }
};

// =====================================================
// GET EMPLOYEE-WISE ADVANCE REPORT
// =====================================================
const getEmployeeWiseAdvanceReport = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company is required",
      });
    }

    const { employeeId, fromDate, toDate } = req.query;

    const employeeFilter = {
      companyId: new mongoose.Types.ObjectId(companyId),
      status: "active",
    };

    if (employeeId) {
      if (!mongoose.Types.ObjectId.isValid(employeeId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid employeeId",
        });
      }

      employeeFilter._id = new mongoose.Types.ObjectId(employeeId);
    }

    const employees = await Employee.find(employeeFilter)
      .select(
        "employeeCode name phone designation department employeeType basicSalary status",
      )
      .sort({ name: 1 });

    const result = [];

    for (const employee of employees) {
      const advanceFilter = {
        companyId: new mongoose.Types.ObjectId(companyId),

        employeeId: employee._id,
      };

      if (fromDate || toDate) {
        advanceFilter.advanceDate = {};

        if (fromDate) {
          const startDate = new Date(fromDate);

          if (isNaN(startDate.getTime())) {
            return res.status(400).json({
              success: false,
              message: "Invalid fromDate",
            });
          }

          startDate.setHours(0, 0, 0, 0);

          advanceFilter.advanceDate.$gte = startDate;
        }

        if (toDate) {
          const endDate = new Date(toDate);

          if (isNaN(endDate.getTime())) {
            return res.status(400).json({
              success: false,
              message: "Invalid toDate",
            });
          }

          endDate.setHours(23, 59, 59, 999);

          advanceFilter.advanceDate.$lte = endDate;
        }
      }

      const advances = await EmployeeAdvance.find(advanceFilter).sort({
        advanceDate: -1,
      });

      let totalAdvanceAmount = 0;
      let totalRecoveredAmount = 0;
      let totalOutstandingAmount = 0;

      advances.forEach((advance) => {
        totalAdvanceAmount += Number(advance.amount || 0);

        totalRecoveredAmount += Number(advance.recoveredAmount || 0);

        totalOutstandingAmount += Number(advance.outstandingAmount || 0);
      });

      result.push({
        employee: {
          _id: employee._id,
          employeeCode: employee.employeeCode,
          name: employee.name,
          phone: employee.phone,
          designation: employee.designation,
          department: employee.department,
          employeeType: employee.employeeType,
          basicSalary: employee.basicSalary,
          status: employee.status,
        },

        summary: {
          advanceCount: advances.length,

          advanceAmount: Math.round(totalAdvanceAmount * 100) / 100,

          recoveredAmount: Math.round(totalRecoveredAmount * 100) / 100,

          outstandingAmount: Math.round(totalOutstandingAmount * 100) / 100,
        },

        advances,
      });
    }

    return res.status(200).json({
      success: true,
      count: result.length,

      filters: {
        employeeId: employeeId || null,
        fromDate: fromDate || null,
        toDate: toDate || null,
      },

      data: result,
    });
  } catch (error) {
    console.error("Get employee wise advance report error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get employee-wise advance report",
      error: error.message,
    });
  }
};

module.exports = {
  getEmployeeAdvanceReport,
  getEmployeeWiseAdvanceReport,
};
