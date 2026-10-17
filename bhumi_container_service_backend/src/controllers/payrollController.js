const Payroll = require("../models/Payroll");
const Employee = require("../models/Employee");
const EmployeeAdvance = require("../models/EmployeeAdvance");

// =====================================================
// CREATE PAYROLL
// =====================================================

const createPayroll = async (req, res) => {
  try {
    const {
      employeeId,
      payrollMonth,
      workingDays,
      presentDays,
      leaveDays,
      overtimeAmount,
      allowances,
      advanceDeduction,
      otherDeduction,
      remarks,
    } = req.body;

    const companyId = req.user.companyId;
    const createdBy = req.user.userId;

    if (
      !employeeId ||
      !payrollMonth ||
      workingDays === undefined ||
      presentDays === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "employeeId, payrollMonth, workingDays and presentDays are required",
      });
    }

    // -------------------------------------------------
    // Employee
    // -------------------------------------------------

    const employee = await Employee.findOne({
      _id: employeeId,
      companyId,
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    if (employee.status !== "active") {
      return res.status(400).json({
        success: false,
        message: "Payroll cannot be created for inactive employee",
      });
    }

    // -------------------------------------------------
    // Validate days
    // -------------------------------------------------

    const totalWorkingDays = Number(workingDays);
    const totalPresentDays = Number(presentDays);

    const totalLeaveDays =
      leaveDays !== undefined
        ? Number(leaveDays)
        : Math.max(0, totalWorkingDays - totalPresentDays);

    if (!Number.isFinite(totalWorkingDays) || totalWorkingDays <= 0) {
      return res.status(400).json({
        success: false,
        message: "Working days must be greater than 0",
      });
    }

    if (
      !Number.isFinite(totalPresentDays) ||
      totalPresentDays < 0 ||
      totalPresentDays > totalWorkingDays
    ) {
      return res.status(400).json({
        success: false,
        message: "Present days are invalid",
      });
    }

    if (
      !Number.isFinite(totalLeaveDays) ||
      totalLeaveDays < 0 ||
      totalLeaveDays > totalWorkingDays
    ) {
      return res.status(400).json({
        success: false,
        message: "Leave days are invalid",
      });
    }

    // -------------------------------------------------
    // Duplicate payroll
    // -------------------------------------------------

    const existingPayroll = await Payroll.findOne({
      companyId,
      employeeId,
      payrollMonth,
    });

    if (existingPayroll) {
      return res.status(409).json({
        success: false,
        message: "Payroll already exists for this employee and month",
      });
    }

    // -------------------------------------------------
    // Salary values
    // -------------------------------------------------

    const basicSalary = Number(Number(employee.basicSalary || 0).toFixed(2));

    if (!Number.isFinite(basicSalary) || basicSalary < 0) {
      return res.status(400).json({
        success: false,
        message: "Employee basic salary is invalid",
      });
    }

    const earnedBasicSalary = Number(
      ((basicSalary / totalWorkingDays) * totalPresentDays).toFixed(2),
    );

    const overtime = overtimeAmount !== undefined ? Number(overtimeAmount) : 0;

    const allowance = allowances !== undefined ? Number(allowances) : 0;

    const advance =
      advanceDeduction !== undefined ? Number(advanceDeduction) : 0;

    const other = otherDeduction !== undefined ? Number(otherDeduction) : 0;

    const values = [overtime, allowance, advance, other];

    if (values.some((value) => !Number.isFinite(value) || value < 0)) {
      return res.status(400).json({
        success: false,
        message: "Salary adjustments must be valid positive numbers",
      });
    }

    // Round all adjustment values
    const overtimeAmountFinal = Number(overtime.toFixed(2));

    const allowanceFinal = Number(allowance.toFixed(2));

    const advanceDeductionFinal = Number(advance.toFixed(2));

    const otherDeductionFinal = Number(other.toFixed(2));

    // -------------------------------------------------
    // CHECK EMPLOYEE ADVANCE
    // -------------------------------------------------

    const pendingAdvances = await EmployeeAdvance.find({
      companyId,
      employeeId,
      status: {
        $in: ["pending", "partial"],
      },
      outstandingAmount: {
        $gt: 0,
      },
    }).sort({
      advanceDate: 1,
      createdAt: 1,
    });

    const totalAdvanceOutstanding = Number(
      pendingAdvances
        .reduce(
          (sum, advanceRecord) =>
            sum + Number(advanceRecord.outstandingAmount || 0),
          0,
        )
        .toFixed(2),
    );

    // -------------------------------------------------
    // VALIDATE ADVANCE DEDUCTION
    // -------------------------------------------------

    if (advanceDeductionFinal > totalAdvanceOutstanding) {
      return res.status(400).json({
        success: false,
        message: "Advance deduction cannot exceed total outstanding advance",
        requestedDeduction: advanceDeductionFinal,
        totalAdvanceOutstanding,
      });
    }

    // -------------------------------------------------
    // SALARY CALCULATION
    // -------------------------------------------------

    const grossSalary = Number(
      (earnedBasicSalary + overtimeAmountFinal + allowanceFinal).toFixed(2),
    );

    const totalDeduction = Number(
      (advanceDeductionFinal + otherDeductionFinal).toFixed(2),
    );

    const netSalary = Number(
      Math.max(0, grossSalary - totalDeduction).toFixed(2),
    );

    // -------------------------------------------------
    // CREATE PAYROLL
    // -------------------------------------------------

    const payroll = await Payroll.create({
      companyId,

      employeeId,

      payrollMonth,

      workingDays: totalWorkingDays,

      presentDays: totalPresentDays,

      leaveDays: totalLeaveDays,

      basicSalary,

      earnedBasicSalary,

      overtimeAmount: overtimeAmountFinal,

      allowances: allowanceFinal,

      advanceDeduction: advanceDeductionFinal,

      otherDeduction: otherDeductionFinal,

      grossSalary,

      totalDeduction,

      netSalary,

      paymentStatus: "unpaid",

      status: "processed",

      remarks: remarks || "",

      createdBy,
    });

    // -------------------------------------------------
    // RECOVER EMPLOYEE ADVANCE
    // -------------------------------------------------

    let remainingDeduction = advanceDeductionFinal;

    if (remainingDeduction > 0) {
      for (const advanceRecord of pendingAdvances) {
        if (remainingDeduction <= 0) {
          break;
        }

        const outstanding = Number(advanceRecord.outstandingAmount || 0);

        if (outstanding <= 0) {
          continue;
        }

        const recoveryAmount = Number(
          Math.min(remainingDeduction, outstanding).toFixed(2),
        );

        advanceRecord.recoveredAmount = Number(
          (Number(advanceRecord.recoveredAmount || 0) + recoveryAmount).toFixed(
            2,
          ),
        );

        advanceRecord.outstandingAmount = Number(
          Math.max(
            0,
            Number(advanceRecord.amount) - advanceRecord.recoveredAmount,
          ).toFixed(2),
        );

        advanceRecord.status =
          advanceRecord.outstandingAmount === 0 ? "recovered" : "partial";

        await advanceRecord.save();

        remainingDeduction = Number(
          (remainingDeduction - recoveryAmount).toFixed(2),
        );
      }
    }

    // -------------------------------------------------
    // POPULATE PAYROLL
    // -------------------------------------------------

    const populatedPayroll = await Payroll.findById(payroll._id)
      .populate(
        "employeeId",
        "employeeCode name phone designation department employeeType basicSalary bankName accountNumber ifscCode",
      )
      .populate("createdBy", "name email");

    return res.status(201).json({
      success: true,
      message: "Payroll created successfully",
      data: populatedPayroll,
    });
  } catch (error) {
    console.error("Create payroll error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create payroll",
      error: error.message,
    });
  }
};

// =====================================================
// GET PAYROLLS
// =====================================================

const getPayrolls = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const { employeeId, payrollMonth, paymentStatus, status } = req.query;

    const filter = {
      companyId,
    };

    if (employeeId) {
      filter.employeeId = employeeId;
    }

    if (payrollMonth) {
      filter.payrollMonth = payrollMonth;
    }

    if (paymentStatus) {
      filter.paymentStatus = paymentStatus;
    }

    if (status) {
      filter.status = status;
    }

    const payrolls = await Payroll.find(filter)
      .populate(
        "employeeId",
        "employeeCode name phone designation department employeeType basicSalary bankName accountNumber ifscCode",
      )
      .populate("createdBy", "name email")
      .sort({
        payrollMonth: -1,
        createdAt: -1,
      });

    return res.status(200).json({
      success: true,
      count: payrolls.length,
      data: payrolls,
    });
  } catch (error) {
    console.error("Get payrolls error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch payrolls",
      error: error.message,
    });
  }
};

// =====================================================
// GET PAYROLL BY ID
// =====================================================

const getPayrollById = async (req, res) => {
  try {
    const { id } = req.params;

    const companyId = req.user.companyId;

    const payroll = await Payroll.findOne({
      _id: id,
      companyId,
    })
      .populate(
        "employeeId",
        "employeeCode name phone designation department employeeType basicSalary bankName accountNumber ifscCode",
      )
      .populate("createdBy", "name email");

    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: "Payroll not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: payroll,
    });
  } catch (error) {
    console.error("Get payroll error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch payroll",
      error: error.message,
    });
  }
};

module.exports = {
  createPayroll,
  getPayrolls,
  getPayrollById,
};
