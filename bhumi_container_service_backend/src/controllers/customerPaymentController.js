const mongoose = require("mongoose");

const CustomerPayment = require("../models/CustomerPayment");
const CustomerInvoice = require("../models/CustomerInvoice");
const Party = require("../models/Party");
const { getNextSequence } = require("../utils/sequenceService");

// =====================================================
// CREATE CUSTOMER PAYMENT
// =====================================================

const createCustomerPayment = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    let {
      paymentNumber,
      paymentDate,
      invoiceId,
      amount,
      paymentMode,
      referenceNumber,
      remarks,
    } = req.body;

    const companyId = req.user.companyId;
    const receivedBy = req.user.userId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company is required",
      });
    }

    if (!paymentNumber || !paymentNumber.toString().trim()) {
      paymentNumber = await getNextSequence(companyId, "customer-payments");
    }

    if (
      !paymentDate ||
      !invoiceId ||
      amount === undefined ||
      !paymentMode
    ) {
      return res.status(400).json({
        success: false,
        message:
          "paymentDate, invoiceId, amount and paymentMode are required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid invoiceId",
      });
    }

    const paymentAmount = Number(amount);

    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Payment amount must be greater than 0",
      });
    }

    const paymentDateValue = new Date(paymentDate);

    if (Number.isNaN(paymentDateValue.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment date",
      });
    }

    const normalizedPaymentNumber = paymentNumber.trim().toUpperCase();

    if (!normalizedPaymentNumber) {
      return res.status(400).json({
        success: false,
        message: "Payment number is required",
      });
    }

    const normalizedPaymentMode = String(paymentMode).trim().toLowerCase();

    const allowedPaymentModes = [
      "cash",
      "bank_transfer",
      "upi",
      "cheque",
      "neft",
      "rtgs",
      "imps",
      "other",
    ];

    if (!allowedPaymentModes.includes(normalizedPaymentMode)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment mode",
      });
    }

    session.startTransaction();

    // -------------------------------------------------
    // Duplicate payment number
    // -------------------------------------------------

    const existingPayment = await CustomerPayment.findOne({
      companyId,
      paymentNumber: normalizedPaymentNumber,
    }).session(session);

    if (existingPayment) {
      await session.abortTransaction();

      return res.status(409).json({
        success: false,
        message: "Payment number already exists",
      });
    }

    // -------------------------------------------------
    // Find invoice
    // -------------------------------------------------

    const invoice = await CustomerInvoice.findOne({
      _id: invoiceId,
      companyId,
    }).session(session);

    if (!invoice) {
      await session.abortTransaction();

      return res.status(404).json({
        success: false,
        message: "Customer invoice not found",
      });
    }

    // -------------------------------------------------
    // Cancelled invoice check
    // -------------------------------------------------

    if (invoice.status === "cancelled") {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: "Payment cannot be received for cancelled invoice",
      });
    }

    // -------------------------------------------------
    // Already paid
    // -------------------------------------------------

    const currentOutstanding = Number(invoice.outstandingAmount || 0);

    if (currentOutstanding <= 0) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: "Invoice is already fully paid",
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
    // Validate party
    // -------------------------------------------------

    const party = await Party.findOne({
      _id: invoice.partyId,
      companyId,
    }).session(session);

    if (!party) {
      await session.abortTransaction();

      return res.status(404).json({
        success: false,
        message: "Invoice party not found",
      });
    }

    // -------------------------------------------------
    // Create payment
    // -------------------------------------------------

    const payment = new CustomerPayment({
      companyId,

      paymentNumber: normalizedPaymentNumber,

      paymentDate: paymentDateValue,

      invoiceId: invoice._id,

      partyId: invoice.partyId,

      amount: paymentAmount,

      paymentMode: normalizedPaymentMode,

      referenceNumber: referenceNumber ? String(referenceNumber).trim() : "",

      remarks: remarks || "",

      receivedBy,
    });

    await payment.save({ session });

    // -------------------------------------------------
    // Update invoice
    // -------------------------------------------------

    const newPaidAmount = Number(invoice.paidAmount || 0) + paymentAmount;

    const newOutstandingAmount =
      Number(invoice.grandTotal || 0) - newPaidAmount;

    let paymentStatus = "partial";

    if (newOutstandingAmount <= 0) {
      paymentStatus = "paid";
    }

    invoice.paidAmount = newPaidAmount;

    invoice.outstandingAmount = Math.max(0, newOutstandingAmount);

    invoice.paymentStatus = paymentStatus;

    await invoice.save({ session });

    await session.commitTransaction();

    // -------------------------------------------------
    // Populate response
    // -------------------------------------------------

    const populatedPayment = await CustomerPayment.findOne({
      _id: payment._id,
      companyId,
    })
      .populate(
        "invoiceId",
        "invoiceNumber grandTotal paidAmount outstandingAmount paymentStatus",
      )
      .populate("partyId", "name phone gstNumber")
      .populate("receivedBy", "name email");

    return res.status(201).json({
      success: true,
      message: "Customer payment received successfully",
      data: populatedPayment,
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    console.error("Create customer payment error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Payment number already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to receive customer payment",
      error: error.message,
    });
  } finally {
    await session.endSession();
  }
};

// =====================================================
// GET ALL CUSTOMER PAYMENTS
// =====================================================

const getCustomerPayments = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company is required",
      });
    }

    const { invoiceId, partyId, paymentMode, fromDate, toDate } = req.query;

    const filter = {
      companyId,
    };

    if (invoiceId) {
      if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid invoiceId",
        });
      }

      filter.invoiceId = invoiceId;
    }

    if (partyId) {
      if (!mongoose.Types.ObjectId.isValid(partyId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid partyId",
        });
      }

      filter.partyId = partyId;
    }

    if (paymentMode) {
      filter.paymentMode = String(paymentMode).trim().toLowerCase();
    }

    if (fromDate || toDate) {
      filter.paymentDate = {};

      if (fromDate) {
        const startDate = new Date(fromDate);

        if (Number.isNaN(startDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid fromDate",
          });
        }

        filter.paymentDate.$gte = startDate;
      }

      if (toDate) {
        const endDate = new Date(toDate);

        if (Number.isNaN(endDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid toDate",
          });
        }

        endDate.setHours(23, 59, 59, 999);

        filter.paymentDate.$lte = endDate;
      }
    }

    const payments = await CustomerPayment.find(filter)
      .populate(
        "invoiceId",
        "invoiceNumber invoiceDate grandTotal paidAmount outstandingAmount paymentStatus",
      )
      .populate("partyId", "name phone gstNumber")
      .populate("receivedBy", "name email")
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
    console.error("Get customer payments error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch customer payments",
      error: error.message,
    });
  }
};

// =====================================================
// GET PAYMENT BY ID
// =====================================================

const getCustomerPaymentById = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment id",
      });
    }

    const payment = await CustomerPayment.findOne({
      _id: id,
      companyId,
    })
      .populate(
        "invoiceId",
        "invoiceNumber invoiceDate grandTotal paidAmount outstandingAmount paymentStatus",
      )
      .populate("partyId", "name phone gstNumber address")
      .populate("receivedBy", "name email");

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Customer payment not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    console.error("Get customer payment error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch customer payment",
      error: error.message,
    });
  }
};

// =====================================================
// CANCEL CUSTOMER PAYMENT
// =====================================================

const cancelCustomerPayment = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment id",
      });
    }

    session.startTransaction();

    const payment = await CustomerPayment.findOne({
      _id: id,
      companyId,
    }).session(session);

    if (!payment) {
      await session.abortTransaction();

      return res.status(404).json({
        success: false,
        message: "Customer payment not found",
      });
    }

    const invoice = await CustomerInvoice.findOne({
      _id: payment.invoiceId,
      companyId,
    }).session(session);

    if (!invoice) {
      await session.abortTransaction();

      return res.status(404).json({
        success: false,
        message: "Related invoice not found",
      });
    }

    // -------------------------------------------------
    // Restore invoice amount
    // -------------------------------------------------

    const currentPaidAmount = Number(invoice.paidAmount || 0);
    const paymentAmount = Number(payment.amount || 0);

    const newPaidAmount = Math.max(0, currentPaidAmount - paymentAmount);

    const newOutstandingAmount = Math.max(
      0,
      Number(invoice.grandTotal || 0) - newPaidAmount,
    );

    let paymentStatus = "unpaid";

    if (newPaidAmount > 0 && newOutstandingAmount > 0) {
      paymentStatus = "partial";
    } else if (newOutstandingAmount <= 0) {
      paymentStatus = "paid";
    }

    invoice.paidAmount = newPaidAmount;

    invoice.outstandingAmount = newOutstandingAmount;

    invoice.paymentStatus = paymentStatus;

    await invoice.save({ session });

    // -------------------------------------------------
    // Delete payment WITH company isolation
    // -------------------------------------------------

    await CustomerPayment.deleteOne({
      _id: payment._id,
      companyId,
    }).session(session);

    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      message:
        "Customer payment cancelled and invoice amount restored successfully",
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    console.error("Cancel customer payment error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to cancel customer payment",
      error: error.message,
    });
  } finally {
    await session.endSession();
  }
};

module.exports = {
  createCustomerPayment,
  getCustomerPayments,
  getCustomerPaymentById,
  cancelCustomerPayment,
};
