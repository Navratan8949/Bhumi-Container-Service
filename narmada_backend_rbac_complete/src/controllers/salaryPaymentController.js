const mongoose = require("mongoose");

const SalaryPayment = require("../models/SalaryPayment");

const Payroll = require("../models/Payroll");

const Employee = require("../models/Employee");

// =====================================================
// CREATE SALARY PAYMENT
// =====================================================

const createSalaryPayment = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const {
      paymentNumber,
      paymentDate,
      payrollId,
      amount,
      paymentMode,
      referenceNumber,
      remarks,
    } = req.body;

    const companyId = req.user.companyId;

    const paidBy = req.user.userId;

    if (
      !paymentNumber ||
      !paymentDate ||
      !payrollId ||
      amount === undefined ||
      !paymentMode
    ) {
      return res.status(400).json({
        success: false,
        message:
          "paymentNumber, paymentDate, payrollId, amount and paymentMode are required",
      });
    }

    const paymentAmount = Number(Number(amount).toFixed(2));

    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Payment amount must be greater than 0",
      });
    }

    session.startTransaction();

    // -------------------------------------------------
    // Duplicate payment number
    // -------------------------------------------------

    const existingPayment = await SalaryPayment.findOne({
      companyId,
      paymentNumber: paymentNumber.toUpperCase(),
    }).session(session);

    if (existingPayment) {
      await session.abortTransaction();

      return res.status(409).json({
        success: false,
        message: "Salary payment number already exists",
      });
    }

    // -------------------------------------------------
    // Payroll
    // -------------------------------------------------

    const payroll = await Payroll.findOne({
      _id: payrollId,
      companyId,
    }).session(session);

    if (!payroll) {
      await session.abortTransaction();

      return res.status(404).json({
        success: false,
        message: "Payroll not found",
      });
    }

    if (payroll.status === "cancelled") {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: "Payment cannot be made against cancelled payroll",
      });
    }

    // -------------------------------------------------
    // Already paid
    // -------------------------------------------------

    if (payroll.paymentStatus === "paid") {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: "Salary is already fully paid",
      });
    }

    // -------------------------------------------------
    // Calculate previous payments
    // -------------------------------------------------

    const paymentSummary = await SalaryPayment.aggregate([
      {
        $match: {
          companyId: new mongoose.Types.ObjectId(companyId),

          payrollId: new mongoose.Types.ObjectId(payrollId),
        },
      },
      {
        $group: {
          _id: null,

          totalPaid: {
            $sum: "$amount",
          },
        },
      },
    ]);

    const previousPaid = paymentSummary[0]?.totalPaid || 0;

    const outstanding = Number(
      Math.max(0, Number(payroll.netSalary) - Number(previousPaid)).toFixed(2),
    );

    if (paymentAmount > outstanding) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: `Payment amount cannot exceed outstanding salary of ${outstanding}`,
      });
    }

    // -------------------------------------------------
    // Employee
    // -------------------------------------------------

    const employee = await Employee.findOne({
      _id: payroll.employeeId,
      companyId,
    }).session(session);

    if (!employee) {
      await session.abortTransaction();

      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    // -------------------------------------------------
    // Create payment
    // -------------------------------------------------

    const payment = new SalaryPayment({
      companyId,

      paymentNumber,

      paymentDate,

      payrollId: payroll._id,

      employeeId: payroll.employeeId,

      amount: paymentAmount,

      paymentMode,

      referenceNumber: referenceNumber || "",

      remarks: remarks || "",

      paidBy,
    });

    await payment.save({
      session,
    });

    // -------------------------------------------------
    // Update payroll
    // -------------------------------------------------
    const newPaidAmount = Number(
      (Number(previousPaid) + paymentAmount).toFixed(2),
    );

    const newOutstanding = Number(
      Math.max(0, Number(payroll.netSalary) - newPaidAmount).toFixed(2),
    );

    payroll.paymentStatus = newOutstanding === 0 ? "paid" : "partial";

    await payroll.save({
      session,
    });

    await session.commitTransaction();

    const populatedPayment = await SalaryPayment.findById(payment._id)
      .populate("payrollId", "payrollMonth netSalary paymentStatus")
      .populate("employeeId", "employeeCode name designation")
      .populate("paidBy", "name email");

    return res.status(201).json({
      success: true,
      message: "Salary payment created successfully",
      data: populatedPayment,
    });
  } catch (error) {
    await session.abortTransaction();

    console.error("Salary payment error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create salary payment",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

// =====================================================
// GET SALARY PAYMENTS
// =====================================================

const getSalaryPayments = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const { employeeId, payrollId, fromDate, toDate } = req.query;

    const filter = {
      companyId,
    };

    if (employeeId) filter.employeeId = employeeId;

    if (payrollId) filter.payrollId = payrollId;

    if (fromDate || toDate) {
      filter.paymentDate = {};

      if (fromDate) {
        filter.paymentDate.$gte = new Date(fromDate);
      }

      if (toDate) {
        const endDate = new Date(toDate);

        endDate.setHours(23, 59, 59, 999);

        filter.paymentDate.$lte = endDate;
      }
    }

    const payments = await SalaryPayment.find(filter)
      .populate("payrollId", "payrollMonth netSalary paymentStatus")
      .populate("employeeId", "employeeCode name designation")
      .populate("paidBy", "name email")
      .sort({
        paymentDate: -1,
        createdAt: -1,
      });

    return res.status(200).json({
      success: true,
      count: payments.length,
      data: payments,
    });
  } catch (error) {
    console.error("Get salary payments error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch salary payments",
      error: error.message,
    });
  }
};

module.exports = {
  createSalaryPayment,
  getSalaryPayments,
};
