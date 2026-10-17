const mongoose = require("mongoose");

const VendorPayment = require("../models/VendorPayment");
const VendorBill = require("../models/VendorBill");
const Vendor = require("../models/Vendor");
const { getNextSequence } = require("../utils/sequenceService");

// =====================================================
// CREATE VENDOR PAYMENT
// =====================================================

const createVendorPayment = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    let {
      paymentNumber,
      paymentDate,
      vendorBillId,
      amount,
      paymentMode,
      referenceNumber,
      remarks,
    } = req.body;

    const companyId = req.user.companyId;
    const paidBy = req.user.userId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company is required",
      });
    }

    if (!paymentNumber || !paymentNumber.toString().trim()) {
      paymentNumber = await getNextSequence(companyId, "vendor-payments");
    }

    if (
      !paymentDate ||
      !vendorBillId ||
      amount === undefined ||
      !paymentMode
    ) {
      return res.status(400).json({
        success: false,
        message:
          "paymentDate, vendorBillId, amount and paymentMode are required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(vendorBillId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vendorBillId",
      });
    }

    const paymentAmount = Number(amount);

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

    const existingPayment = await VendorPayment.findOne({
      companyId,
      paymentNumber: paymentNumber.toUpperCase().trim(),
    }).session(session);

    if (existingPayment) {
      await session.abortTransaction();

      return res.status(409).json({
        success: false,
        message: "Vendor payment number already exists",
      });
    }

    // -------------------------------------------------
    // Find bill
    // -------------------------------------------------

    const bill = await VendorBill.findOne({
      _id: vendorBillId,
      companyId,
    }).session(session);

    if (!bill) {
      await session.abortTransaction();

      return res.status(404).json({
        success: false,
        message: "Vendor bill not found",
      });
    }

    // -------------------------------------------------
    // Cancelled bill
    // -------------------------------------------------

    if (bill.status === "cancelled") {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: "Payment cannot be made against cancelled vendor bill",
      });
    }

    // -------------------------------------------------
    // Already paid
    // -------------------------------------------------

    const currentOutstanding = Math.max(0, Number(bill.outstandingAmount || 0));

    if (currentOutstanding <= 0) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: "Vendor bill is already fully paid",
      });
    }

    // -------------------------------------------------
    // Payment cannot exceed outstanding
    // -------------------------------------------------

    if (paymentAmount > currentOutstanding) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: `Payment amount cannot exceed outstanding amount of ${currentOutstanding}`,
      });
    }

    // -------------------------------------------------
    // Vendor validation
    // -------------------------------------------------

    const vendor = await Vendor.findOne({
      _id: bill.vendorId,
      companyId,
    }).session(session);

    if (!vendor) {
      await session.abortTransaction();

      return res.status(404).json({
        success: false,
        message: "Vendor associated with bill not found",
      });
    }

    // -------------------------------------------------
    // Create payment
    // -------------------------------------------------

    const payment = new VendorPayment({
      companyId,
      paymentNumber: paymentNumber.trim(),
      paymentDate,
      vendorBillId: bill._id,
      vendorId: bill.vendorId,
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
    // Update bill
    // -------------------------------------------------

    const newPaidAmount = Number(bill.paidAmount || 0) + paymentAmount;

    const newOutstandingAmount = Number(bill.grandTotal || 0) - newPaidAmount;

    bill.paidAmount = newPaidAmount;
    bill.outstandingAmount = Math.max(0, newOutstandingAmount);

    if (bill.outstandingAmount <= 0) {
      bill.paymentStatus = "paid";
    } else {
      bill.paymentStatus = "partial";
    }

    await bill.save({
      session,
    });

    await session.commitTransaction();

    // -------------------------------------------------
    // Populate response
    // -------------------------------------------------

    const populatedPayment = await VendorPayment.findById(payment._id)
      .populate(
        "vendorBillId",
        "billNumber billDate grandTotal paidAmount outstandingAmount paymentStatus",
      )
      .populate(
        "vendorId",
        "vendorCode vendorName vendorType phone email gstNumber",
      )
      .populate("paidBy", "name email");

    return res.status(201).json({
      success: true,
      message: "Vendor payment made successfully",
      data: populatedPayment,
    });
  } catch (error) {
    await session.abortTransaction();

    console.error("Create vendor payment error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create vendor payment",
      error: error.message,
    });
  } finally {
    await session.endSession();
  }
};

// =====================================================
// GET ALL VENDOR PAYMENTS
// =====================================================

const getVendorPayments = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const { vendorId, vendorBillId, paymentMode, fromDate, toDate } = req.query;

    const filter = {
      companyId,
    };

    if (vendorId) {
      filter.vendorId = vendorId;
    }

    if (vendorBillId) {
      filter.vendorBillId = vendorBillId;
    }

    if (paymentMode) {
      filter.paymentMode = paymentMode;
    }

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

    const payments = await VendorPayment.find(filter)
      .populate(
        "vendorBillId",
        "billNumber billDate grandTotal paidAmount outstandingAmount paymentStatus",
      )
      .populate(
        "vendorId",
        "vendorCode vendorName vendorType phone email gstNumber",
      )
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
    console.error("Get vendor payments error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch vendor payments",
      error: error.message,
    });
  }
};

// =====================================================
// GET PAYMENT BY ID
// =====================================================

const getVendorPaymentById = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    const payment = await VendorPayment.findOne({
      _id: id,
      companyId,
    })
      .populate(
        "vendorBillId",
        "billNumber billDate grandTotal paidAmount outstandingAmount paymentStatus",
      )
      .populate(
        "vendorId",
        "vendorCode vendorName vendorType phone email gstNumber",
      )
      .populate("paidBy", "name email");

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Vendor payment not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    console.error("Get vendor payment error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch vendor payment",
      error: error.message,
    });
  }
};

// =====================================================
// CANCEL / REVERSE PAYMENT
// =====================================================

const cancelVendorPayment = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment id",
      });
    }

    session.startTransaction();

    // -------------------------------------------------
    // Find payment
    // -------------------------------------------------

    const payment = await VendorPayment.findOne({
      _id: id,
      companyId,
    }).session(session);

    if (!payment) {
      await session.abortTransaction();

      return res.status(404).json({
        success: false,
        message: "Vendor payment not found",
      });
    }

    // -------------------------------------------------
    // Find related bill
    // -------------------------------------------------

    const bill = await VendorBill.findOne({
      _id: payment.vendorBillId,
      companyId,
    }).session(session);

    if (!bill) {
      await session.abortTransaction();

      return res.status(404).json({
        success: false,
        message: "Related vendor bill not found",
      });
    }

    // -------------------------------------------------
    // Prevent reversal if bill is already cancelled
    // -------------------------------------------------

    if (bill.status === "cancelled") {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message:
          "Payment cannot be reversed because the related vendor bill is cancelled",
      });
    }

    // -------------------------------------------------
    // Restore bill amounts
    // -------------------------------------------------

    const newPaidAmount = Math.max(
      0,
      Number(bill.paidAmount || 0) - Number(payment.amount || 0),
    );

    const newOutstandingAmount = Math.max(
      0,
      Number(bill.grandTotal || 0) - newPaidAmount,
    );

    bill.paidAmount = newPaidAmount;
    bill.outstandingAmount = newOutstandingAmount;

    if (newOutstandingAmount <= 0) {
      bill.paymentStatus = "paid";
    } else if (newPaidAmount > 0) {
      bill.paymentStatus = "partial";
    } else {
      bill.paymentStatus = "unpaid";
    }

    await bill.save({
      session,
    });

    // -------------------------------------------------
    // Delete payment - company scoped
    // -------------------------------------------------

    await VendorPayment.deleteOne({
      _id: payment._id,
      companyId,
    }).session(session);

    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      message: "Vendor payment cancelled and bill amount restored successfully",
    });
  } catch (error) {
    await session.abortTransaction();

    console.error("Cancel vendor payment error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to cancel vendor payment",
      error: error.message,
    });
  } finally {
    await session.endSession();
  }
};

module.exports = {
  createVendorPayment,
  getVendorPayments,
  getVendorPaymentById,
  cancelVendorPayment,
};
