const mongoose = require("mongoose");

const Payroll = require("../models/Payroll");
const Employee = require("../models/Employee");

// =====================================================
// HELPERS
// =====================================================

const round2 = (value) => {
  return Number(Number(value || 0).toFixed(2));
};

const isValidMonth = (month) => {
  if (!month) return true;

  if (!/^\d{4}-\d{2}$/.test(month)) {
    return false;
  }

  const [year, monthNumber] = month.split("-").map(Number);

  return monthNumber >= 1 && monthNumber <= 12 && year >= 2000 && year <= 9999;
};

const validateMonthRange = (fromMonth, toMonth) => {
  if (fromMonth && !isValidMonth(fromMonth)) {
    return "Invalid fromMonth. Use YYYY-MM";
  }

  if (toMonth && !isValidMonth(toMonth)) {
    return "Invalid toMonth. Use YYYY-MM";
  }

  if (fromMonth && toMonth && fromMonth > toMonth) {
    return "fromMonth cannot be greater than toMonth";
  }

  return null;
};

// =====================================================
// GET PAYROLL REPORT
// =====================================================

const getPayrollReport = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    // =================================================
    // VALIDATE COMPANY
    // =================================================

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid company ID",
      });
    }

    const {
      employeeId,
      payrollMonth,
      paymentStatus,
      status,
      fromMonth,
      toMonth,
    } = req.query;

    // =================================================
    // VALIDATE MONTH FILTERS
    // =================================================

    if (payrollMonth && !isValidMonth(payrollMonth)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payrollMonth. Use YYYY-MM",
      });
    }

    if (payrollMonth && (fromMonth || toMonth)) {
      return res.status(400).json({
        success: false,
        message: "Use either payrollMonth or fromMonth/toMonth, not both",
      });
    }

    const monthRangeError = validateMonthRange(fromMonth, toMonth);

    if (monthRangeError) {
      return res.status(400).json({
        success: false,
        message: monthRangeError,
      });
    }

    // =================================================
    // BUILD FILTER
    // =================================================

    const filter = {
      companyId: new mongoose.Types.ObjectId(companyId),
    };

    // =================================================
    // EMPLOYEE FILTER
    // =================================================

    if (employeeId) {
      if (!mongoose.Types.ObjectId.isValid(employeeId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid employeeId",
        });
      }

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

      filter.employeeId = new mongoose.Types.ObjectId(employeeId);
    }

    // =================================================
    // EXACT MONTH
    // =================================================

    if (payrollMonth) {
      filter.payrollMonth = payrollMonth;
    }

    // =================================================
    // PAYMENT STATUS
    // =================================================

    if (paymentStatus) {
      filter.paymentStatus = paymentStatus;
    }

    // =================================================
    // PAYROLL STATUS
    // =================================================

    if (status) {
      filter.status = status;
    }

    // =================================================
    // MONTH RANGE
    // =================================================

    if (fromMonth || toMonth) {
      filter.payrollMonth = {};

      if (fromMonth) {
        filter.payrollMonth.$gte = fromMonth;
      }

      if (toMonth) {
        filter.payrollMonth.$lte = toMonth;
      }
    }

    // =================================================
    // GET PAYROLL
    // =================================================

    const payrolls = await Payroll.find(filter)
      .populate(
        "employeeId",
        "employeeCode name phone designation department employeeType",
      )
      .sort({
        payrollMonth: -1,
        createdAt: -1,
      })
      .lean();

    // =================================================
    // SUMMARY VARIABLES
    // =================================================

    let totalBasicSalary = 0;
    let totalEarnedBasicSalary = 0;
    let totalOvertimeAmount = 0;
    let totalAllowances = 0;
    let totalGrossSalary = 0;
    let totalAdvanceDeduction = 0;
    let totalOtherDeduction = 0;
    let totalDeduction = 0;
    let totalNetSalary = 0;

    const paymentStatusMap = {};
    const monthMap = {};
    const employeeMap = {};

    // =================================================
    // BUILD SUMMARY
    // =================================================

    payrolls.forEach((payroll) => {
      const basicSalary = Number(payroll.basicSalary || 0);

      const earnedBasicSalary = Number(payroll.earnedBasicSalary || 0);

      const overtimeAmount = Number(payroll.overtimeAmount || 0);

      const allowances = Number(payroll.allowances || 0);

      const grossSalary = Number(payroll.grossSalary || 0);

      const advanceDeduction = Number(payroll.advanceDeduction || 0);

      const otherDeduction = Number(payroll.otherDeduction || 0);

      const deduction = Number(payroll.totalDeduction || 0);

      const netSalary = Number(payroll.netSalary || 0);

      totalBasicSalary += basicSalary;
      totalEarnedBasicSalary += earnedBasicSalary;
      totalOvertimeAmount += overtimeAmount;
      totalAllowances += allowances;
      totalGrossSalary += grossSalary;
      totalAdvanceDeduction += advanceDeduction;
      totalOtherDeduction += otherDeduction;
      totalDeduction += deduction;
      totalNetSalary += netSalary;

      // ---------------------------------------------
      // PAYMENT STATUS SUMMARY
      // ---------------------------------------------

      const currentPaymentStatus = payroll.paymentStatus || "unknown";

      if (!paymentStatusMap[currentPaymentStatus]) {
        paymentStatusMap[currentPaymentStatus] = {
          paymentStatus: currentPaymentStatus,

          count: 0,

          netSalary: 0,
        };
      }

      paymentStatusMap[currentPaymentStatus].count += 1;

      paymentStatusMap[currentPaymentStatus].netSalary += netSalary;

      // ---------------------------------------------
      // MONTH SUMMARY
      // ---------------------------------------------

      const month = payroll.payrollMonth || "unknown";

      if (!monthMap[month]) {
        monthMap[month] = {
          payrollMonth: month,

          count: 0,

          grossSalary: 0,

          totalDeduction: 0,

          netSalary: 0,
        };
      }

      monthMap[month].count += 1;

      monthMap[month].grossSalary += grossSalary;

      monthMap[month].totalDeduction += deduction;

      monthMap[month].netSalary += netSalary;

      // ---------------------------------------------
      // EMPLOYEE SUMMARY
      // ---------------------------------------------

      if (payroll.employeeId) {
        const empId = payroll.employeeId._id.toString();

        if (!employeeMap[empId]) {
          employeeMap[empId] = {
            employeeId: payroll.employeeId._id,

            employeeCode: payroll.employeeId.employeeCode,

            employeeName: payroll.employeeId.name,

            designation: payroll.employeeId.designation,

            department: payroll.employeeId.department,

            payrollCount: 0,

            grossSalary: 0,

            totalDeduction: 0,

            netSalary: 0,
          };
        }

        employeeMap[empId].payrollCount += 1;

        employeeMap[empId].grossSalary += grossSalary;

        employeeMap[empId].totalDeduction += deduction;

        employeeMap[empId].netSalary += netSalary;
      }
    });

    // =================================================
    // FINAL SUMMARY
    // =================================================

    const summary = {
      totalRecords: payrolls.length,

      totalBasicSalary: round2(totalBasicSalary),

      totalEarnedBasicSalary: round2(totalEarnedBasicSalary),

      totalOvertimeAmount: round2(totalOvertimeAmount),

      totalAllowances: round2(totalAllowances),

      totalGrossSalary: round2(totalGrossSalary),

      totalAdvanceDeduction: round2(totalAdvanceDeduction),

      totalOtherDeduction: round2(totalOtherDeduction),

      totalDeduction: round2(totalDeduction),

      totalNetSalary: round2(totalNetSalary),

      // ---------------------------------------------
      // PAYMENT STATUS
      // ---------------------------------------------

      paymentStatusSummary: Object.values(paymentStatusMap).map((item) => ({
        ...item,

        netSalary: round2(item.netSalary),
      })),

      // ---------------------------------------------
      // MONTH
      // ---------------------------------------------

      monthSummary: Object.values(monthMap)
        .sort((a, b) => b.payrollMonth.localeCompare(a.payrollMonth))
        .map((item) => ({
          ...item,

          grossSalary: round2(item.grossSalary),

          totalDeduction: round2(item.totalDeduction),

          netSalary: round2(item.netSalary),
        })),

      // ---------------------------------------------
      // EMPLOYEE
      // ---------------------------------------------

      employeeSummary: Object.values(employeeMap).map((item) => ({
        ...item,

        grossSalary: round2(item.grossSalary),

        totalDeduction: round2(item.totalDeduction),

        netSalary: round2(item.netSalary),
      })),
    };

    // =================================================
    // RESPONSE
    // =================================================

    return res.status(200).json({
      success: true,

      count: payrolls.length,

      filters: {
        employeeId: employeeId || null,

        payrollMonth: payrollMonth || null,

        paymentStatus: paymentStatus || null,

        status: status || null,

        fromMonth: fromMonth || null,

        toMonth: toMonth || null,
      },

      summary,

      data: payrolls,
    });
  } catch (error) {
    console.error("Get payroll report error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get payroll report",
      error: error.message,
    });
  }
};

// =====================================================
// GET EMPLOYEE PAYROLL REPORT
// =====================================================

const getEmployeePayrollReport = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    // =================================================
    // VALIDATE COMPANY
    // =================================================

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid company ID",
      });
    }

    const { employeeId, fromMonth, toMonth } = req.query;

    // =================================================
    // VALIDATE EMPLOYEE ID
    // =================================================

    if (employeeId && !mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid employeeId",
      });
    }

    // =================================================
    // VALIDATE MONTH RANGE
    // =================================================

    const monthRangeError = validateMonthRange(fromMonth, toMonth);

    if (monthRangeError) {
      return res.status(400).json({
        success: false,
        message: monthRangeError,
      });
    }

    // =================================================
    // EMPLOYEE QUERY
    // =================================================

    const employeeFilter = {
      companyId: new mongoose.Types.ObjectId(companyId),
    };

    if (employeeId) {
      employeeFilter._id = new mongoose.Types.ObjectId(employeeId);
    }

    const employees = await Employee.find(employeeFilter)
      .select(
        "employeeCode name phone designation department employeeType basicSalary status",
      )
      .sort({
        name: 1,
      })
      .lean();

    // =================================================
    // SPECIFIC EMPLOYEE NOT FOUND
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

    const result = [];

    for (const employee of employees) {
      const payrollFilter = {
        companyId: new mongoose.Types.ObjectId(companyId),

        employeeId: employee._id,
      };

      // ---------------------------------------------
      // MONTH FILTER
      // ---------------------------------------------

      if (fromMonth || toMonth) {
        payrollFilter.payrollMonth = {};

        if (fromMonth) {
          payrollFilter.payrollMonth.$gte = fromMonth;
        }

        if (toMonth) {
          payrollFilter.payrollMonth.$lte = toMonth;
        }
      }

      // ---------------------------------------------
      // GET PAYROLL
      // ---------------------------------------------

      const payrolls = await Payroll.find(payrollFilter)
        .sort({
          payrollMonth: -1,
          createdAt: -1,
        })
        .lean();

      // ---------------------------------------------
      // SUMMARY
      // ---------------------------------------------

      let grossSalary = 0;
      let totalDeduction = 0;
      let netSalary = 0;

      payrolls.forEach((payroll) => {
        grossSalary += Number(payroll.grossSalary || 0);

        totalDeduction += Number(payroll.totalDeduction || 0);

        netSalary += Number(payroll.netSalary || 0);
      });

      // ---------------------------------------------
      // RESULT
      // ---------------------------------------------

      result.push({
        employee: {
          _id: employee._id,

          employeeCode: employee.employeeCode,

          name: employee.name,

          phone: employee.phone,

          designation: employee.designation,

          department: employee.department,

          employeeType: employee.employeeType,

          basicSalary: round2(employee.basicSalary),

          status: employee.status,
        },

        summary: {
          payrollCount: payrolls.length,

          grossSalary: round2(grossSalary),

          totalDeduction: round2(totalDeduction),

          netSalary: round2(netSalary),
        },

        payrolls,
      });
    }

    // =================================================
    // RESPONSE
    // =================================================

    return res.status(200).json({
      success: true,

      count: result.length,

      filters: {
        employeeId: employeeId || null,

        fromMonth: fromMonth || null,

        toMonth: toMonth || null,
      },

      data: result,
    });
  } catch (error) {
    console.error("Get employee payroll report error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get employee payroll report",
      error: error.message,
    });
  }
};

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  getPayrollReport,
  getEmployeePayrollReport,
};
