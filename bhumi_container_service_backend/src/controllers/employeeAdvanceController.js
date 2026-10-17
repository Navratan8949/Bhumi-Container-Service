const mongoose = require("mongoose");

const EmployeeAdvance = require("../models/EmployeeAdvance");
const Employee = require("../models/Employee");

// =====================================================
// CREATE EMPLOYEE ADVANCE
// =====================================================
const createEmployeeAdvance = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const {
      advanceNumber,
      employeeId,
      advanceDate,
      amount,
      paymentMode,
      referenceNumber,
      remarks,
    } = req.body;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company is required",
      });
    }

    if (
      !advanceNumber ||
      !employeeId ||
      !advanceDate ||
      amount === undefined ||
      !paymentMode
    ) {
      return res.status(400).json({
        success: false,
        message:
          "advanceNumber, employeeId, advanceDate, amount and paymentMode are required",
      });
    }

    const advanceAmount = Number(Number(amount).toFixed(2));

    if (!Number.isFinite(advanceAmount) || advanceAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Advance amount must be greater than 0",
      });
    }

    // Check employee
    const employee = await Employee.findOne({
      _id: employeeId,
      companyId,
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found in this company",
      });
    }

    if (employee.status !== "active") {
      return res.status(400).json({
        success: false,
        message: "Advance cannot be given to inactive employee",
      });
    }

    // Duplicate advance number
    const existingAdvance = await EmployeeAdvance.findOne({
      companyId,
      advanceNumber: advanceNumber.toUpperCase(),
    });

    if (existingAdvance) {
      return res.status(409).json({
        success: false,
        message: "Advance number already exists",
      });
    }

    const advance = await EmployeeAdvance.create({
      companyId,
      advanceNumber,
      employeeId,
      advanceDate,
      amount: advanceAmount,
      recoveredAmount: 0,
      outstandingAmount: advanceAmount,
      paymentMode,
      referenceNumber: referenceNumber || "",
      status: "pending",
      remarks: remarks || "",
      createdBy: req.user.userId,
    });

    const populatedAdvance = await EmployeeAdvance.findById(advance._id)
      .populate(
        "employeeId",
        "employeeCode name phone designation department employeeType bankName accountNumber ifscCode",
      )
      .populate("createdBy", "name email");

    return res.status(201).json({
      success: true,
      message: "Employee advance created successfully",
      data: populatedAdvance,
    });
  } catch (error) {
    console.error("Create employee advance error:", error.message);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Advance number already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create employee advance",
      error: error.message,
    });
  }
};

// =====================================================
// GET ALL ADVANCES
// =====================================================
const getEmployeeAdvances = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const { employeeId, status, fromDate, toDate } = req.query;

    const filter = {
      companyId,
    };

    if (employeeId) {
      filter.employeeId = employeeId;
    }

    if (status) {
      filter.status = status;
    }

    if (fromDate || toDate) {
      filter.advanceDate = {};

      if (fromDate) {
        const startDate = new Date(fromDate);
        startDate.setHours(0, 0, 0, 0);

        filter.advanceDate.$gte = startDate;
      }

      if (toDate) {
        const endDate = new Date(toDate);
        endDate.setHours(23, 59, 59, 999);

        filter.advanceDate.$lte = endDate;
      }
    }

    const advances = await EmployeeAdvance.find(filter)
      .populate(
        "employeeId",
        "employeeCode name phone designation department employeeType bankName accountNumber ifscCode",
      )
      .populate("createdBy", "name email")
      .sort({
        advanceDate: -1,
        createdAt: -1,
      });

    return res.status(200).json({
      success: true,
      count: advances.length,
      data: advances,
    });
  } catch (error) {
    console.error("Get employee advances error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch employee advances",
      error: error.message,
    });
  }
};

// =====================================================
// GET SINGLE ADVANCE
// =====================================================
const getEmployeeAdvanceById = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid advance ID",
      });
    }

    const advance = await EmployeeAdvance.findOne({
      _id: id,
      companyId,
    })
      .populate(
        "employeeId",
        "employeeCode name phone designation department employeeType bankName accountNumber ifscCode",
      )
      .populate("createdBy", "name email");

    if (!advance) {
      return res.status(404).json({
        success: false,
        message: "Employee advance not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: advance,
    });
  } catch (error) {
    console.error("Get employee advance error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch employee advance",
      error: error.message,
    });
  }
};

// =====================================================
// UPDATE ADVANCE
// =====================================================
const updateEmployeeAdvance = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid advance ID",
      });
    }

    const advance = await EmployeeAdvance.findOne({
      _id: id,
      companyId,
    });

    if (!advance) {
      return res.status(404).json({
        success: false,
        message: "Employee advance not found",
      });
    }

    if (advance.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cancelled advance cannot be updated",
      });
    }

    const { advanceDate, paymentMode, referenceNumber, remarks } = req.body;

    if (advanceDate !== undefined) {
      advance.advanceDate = advanceDate;
    }

    if (paymentMode !== undefined) {
      advance.paymentMode = paymentMode;
    }

    if (referenceNumber !== undefined) {
      advance.referenceNumber = referenceNumber;
    }

    if (remarks !== undefined) {
      advance.remarks = remarks;
    }

    await advance.save();

    const updatedAdvance = await EmployeeAdvance.findById(advance._id)
      .populate(
        "employeeId",
        "employeeCode name phone designation department employeeType bankName accountNumber ifscCode",
      )
      .populate("createdBy", "name email");

    return res.status(200).json({
      success: true,
      message: "Employee advance updated successfully",
      data: updatedAdvance,
    });
  } catch (error) {
    console.error("Update employee advance error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to update employee advance",
      error: error.message,
    });
  }
};

// =====================================================
// DELETE / CANCEL ADVANCE
// =====================================================
const deleteEmployeeAdvance = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid advance ID",
      });
    }

    const advance = await EmployeeAdvance.findOne({
      _id: id,
      companyId,
    });

    if (!advance) {
      return res.status(404).json({
        success: false,
        message: "Employee advance not found",
      });
    }

    if (advance.recoveredAmount > 0) {
      return res.status(400).json({
        success: false,
        message: "Advance with recovery cannot be cancelled",
      });
    }

    advance.status = "cancelled";

    await advance.save();

    return res.status(200).json({
      success: true,
      message: "Employee advance cancelled successfully",
    });
  } catch (error) {
    console.error("Cancel employee advance error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to cancel employee advance",
      error: error.message,
    });
  }
};

// =====================================================
// RECOVER ADVANCE
// =====================================================
const recoverEmployeeAdvance = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    const { recoveryAmount, remarks } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid advance ID",
      });
    }

    const advance = await EmployeeAdvance.findOne({
      _id: id,
      companyId,
    });

    if (!advance) {
      return res.status(404).json({
        success: false,
        message: "Employee advance not found",
      });
    }

    if (advance.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cancelled advance cannot be recovered",
      });
    }

    if (advance.outstandingAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Advance is already fully recovered",
      });
    }

    const amount = Number(Number(recoveryAmount).toFixed(2));

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Recovery amount must be greater than 0",
      });
    }

    if (amount > advance.outstandingAmount) {
      return res.status(400).json({
        success: false,
        message: "Recovery amount cannot exceed outstanding amount",
        outstandingAmount: advance.outstandingAmount,
      });
    }

    const newRecoveredAmount = Number(
      (Number(advance.recoveredAmount) + amount).toFixed(2),
    );

    const newOutstandingAmount = Number(
      (Number(advance.amount) - newRecoveredAmount).toFixed(2),
    );

    advance.recoveredAmount = newRecoveredAmount;

    advance.outstandingAmount = Math.max(0, newOutstandingAmount);

    advance.status = advance.outstandingAmount === 0 ? "recovered" : "partial";

    if (remarks !== undefined) {
      advance.remarks = remarks;
    }

    await advance.save();

    const updatedAdvance = await EmployeeAdvance.findById(advance._id)
      .populate(
        "employeeId",
        "employeeCode name phone designation department employeeType bankName accountNumber ifscCode",
      )
      .populate("createdBy", "name email");

    return res.status(200).json({
      success: true,
      message: "Employee advance recovered successfully",
      data: updatedAdvance,
    });
  } catch (error) {
    console.error("Recover employee advance error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to recover employee advance",
      error: error.message,
    });
  }
};

module.exports = {
  createEmployeeAdvance,
  getEmployeeAdvances,
  getEmployeeAdvanceById,
  updateEmployeeAdvance,
  deleteEmployeeAdvance,
  recoverEmployeeAdvance,
};
