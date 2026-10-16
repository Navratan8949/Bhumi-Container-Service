const mongoose = require("mongoose");

const CustomerInvoice = require("../models/CustomerInvoice");
const Booking = require("../models/Booking");
const LRBilty = require("../models/LRBilty");
const Party = require("../models/Party");
const CustomerPayment = require("../models/CustomerPayment");
const { getNextSequence } = require("../utils/sequenceService");

// ======================================================
// CREATE CUSTOMER INVOICE
// ======================================================

const createCustomerInvoice = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const companyId = req.user.companyId;
    const createdBy = req.user.userId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company is required",
      });
    }

    let {
      invoiceNumber,
      invoiceDate,
      bookingId,
      lrBiltyId,
      freightRate,
      hammali,
      detention,
      otherCharges,
      taxPercent,
      remarks,
    } = req.body;

    // Auto-generate invoiceNumber if omitted or empty
    if (!invoiceNumber || !invoiceNumber.toString().trim()) {
      invoiceNumber = await getNextSequence(companyId, "customer-invoices");
    }

    // ==================================================
    // REQUIRED VALIDATION
    // ==================================================

    if (
      !invoiceDate ||
      !bookingId ||
      freightRate === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "invoiceDate, bookingId and freightRate are required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid bookingId",
      });
    }

    if (lrBiltyId && !mongoose.Types.ObjectId.isValid(lrBiltyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid lrBiltyId",
      });
    }

    const invoiceDateValue = new Date(invoiceDate);

    if (Number.isNaN(invoiceDateValue.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid invoice date",
      });
    }

    const finalFreightRate = Number(freightRate);
    const finalHammali = Number(hammali || 0);
    const finalDetention = Number(detention || 0);
    const finalOtherCharges = Number(otherCharges || 0);
    const finalTaxPercent = Number(taxPercent || 0);

    if (
      !Number.isFinite(finalFreightRate) ||
      !Number.isFinite(finalHammali) ||
      !Number.isFinite(finalDetention) ||
      !Number.isFinite(finalOtherCharges) ||
      !Number.isFinite(finalTaxPercent)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid invoice amount or tax values",
      });
    }

    if (
      finalFreightRate < 0 ||
      finalHammali < 0 ||
      finalDetention < 0 ||
      finalOtherCharges < 0 ||
      finalTaxPercent < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invoice amount values cannot be negative",
      });
    }

    if (finalTaxPercent > 100) {
      return res.status(400).json({
        success: false,
        message: "Tax percentage cannot be greater than 100",
      });
    }

    const normalizedInvoiceNumber = invoiceNumber.trim().toUpperCase();

    if (!normalizedInvoiceNumber) {
      return res.status(400).json({
        success: false,
        message: "Invoice number is required",
      });
    }

    // ==================================================
    // START TRANSACTION
    // ==================================================

    session.startTransaction();

    // ==================================================
    // DUPLICATE INVOICE NUMBER
    // ==================================================

    const existingInvoice = await CustomerInvoice.findOne({
      companyId,
      invoiceNumber: normalizedInvoiceNumber,
    }).session(session);

    if (existingInvoice) {
      await session.abortTransaction();

      return res.status(409).json({
        success: false,
        message: "Invoice number already exists",
      });
    }

    // ==================================================
    // BOOKING
    // ==================================================

    const booking = await Booking.findOne({
      _id: bookingId,
      companyId,
    }).session(session);

    if (!booking) {
      await session.abortTransaction();

      return res.status(404).json({
        success: false,
        message: "Booking not found in your company",
      });
    }

    if (booking.status === "cancelled") {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: "Cancelled booking cannot be invoiced",
      });
    }

    // ==================================================
    // VALIDATE BOOKING QUANTITY
    // ==================================================

    const bookingQuantity = Number(booking.quantity);

    if (!Number.isFinite(bookingQuantity) || bookingQuantity <= 0) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: "Booking quantity must be greater than 0",
      });
    }

    // ==================================================
    // ONE INVOICE PER BOOKING
    // ==================================================

    const bookingInvoice = await CustomerInvoice.findOne({
      companyId,
      bookingId,
    }).session(session);

    if (bookingInvoice) {
      await session.abortTransaction();

      return res.status(409).json({
        success: false,
        message: "Customer invoice already exists for this booking",
      });
    }

    // ==================================================
    // PARTY
    // ==================================================

    const party = await Party.findOne({
      _id: booking.billingPartyId,
      companyId,
    }).session(session);

    if (!party) {
      await session.abortTransaction();

      return res.status(404).json({
        success: false,
        message: "Billing party not found",
      });
    }

    // ==================================================
    // LR / BILTY VALIDATION
    // ==================================================

    let lrBilty = null;

    if (lrBiltyId) {
      lrBilty = await LRBilty.findOne({
        _id: lrBiltyId,
        companyId,
        bookingId,
      }).session(session);

      if (!lrBilty) {
        await session.abortTransaction();

        return res.status(400).json({
          success: false,
          message: "LR/Bilty does not belong to this booking",
        });
      }
    }

    // ==================================================
    // AMOUNTS
    // ==================================================

    const freightAmount = bookingQuantity * finalFreightRate;

    const taxableAmount =
      freightAmount + finalHammali + finalDetention + finalOtherCharges;

    const taxAmount = (taxableAmount * finalTaxPercent) / 100;

    const grandTotal = taxableAmount + taxAmount;

    if (!Number.isFinite(grandTotal) || grandTotal <= 0) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: "Invoice grand total must be greater than 0",
      });
    }

    // ==================================================
    // PAYMENT SETTLEMENT (UNPAID / PARTIAL / PAID)
    // ==================================================
    let finalPaymentStatus = String(req.body.paymentStatus || "unpaid").trim().toLowerCase();
    let finalPaidAmount = 0;
    let finalPaymentMode = req.body.paymentMode ? String(req.body.paymentMode).trim().toLowerCase() : "";
    const finalReferenceNumber = req.body.referenceNumber ? String(req.body.referenceNumber).trim() : "";

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

    if (finalPaymentStatus === "paid") {
      finalPaidAmount = grandTotal;
      if (!finalPaymentMode) {
        finalPaymentMode = "bank_transfer";
      }
    } else if (finalPaymentStatus === "partial") {
      const parsedPaid = Number(req.body.paidAmount || 0);
      if (!Number.isFinite(parsedPaid) || parsedPaid <= 0) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: "Paid amount must be greater than 0 for partial payment",
        });
      }
      if (parsedPaid >= grandTotal) {
        finalPaymentStatus = "paid";
        finalPaidAmount = grandTotal;
      } else {
        finalPaidAmount = parsedPaid;
      }
      if (!finalPaymentMode) {
        finalPaymentMode = "bank_transfer";
      }
    } else {
      finalPaymentStatus = "unpaid";
      finalPaidAmount = 0;
    }

    if (finalPaidAmount > 0 && !allowedPaymentModes.includes(finalPaymentMode)) {
      finalPaymentMode = "other";
    }

    const finalOutstandingAmount = Math.max(0, grandTotal - finalPaidAmount);

    // ==================================================
    // CREATE INVOICE
    // ==================================================

    const [invoice] = await CustomerInvoice.create(
      [
        {
          companyId,

          invoiceNumber: normalizedInvoiceNumber,

          invoiceDate: invoiceDateValue,

          bookingId,

          lrBiltyId: lrBilty ? lrBilty._id : null,

          partyId: party._id,

          quantity: bookingQuantity,

          unit: booking.unit,

          freightRate: finalFreightRate,

          freightAmount,

          hammali: finalHammali,

          detention: finalDetention,

          otherCharges: finalOtherCharges,

          taxableAmount,

          taxPercent: finalTaxPercent,

          taxAmount,

          grandTotal,

          paidAmount: finalPaidAmount,

          outstandingAmount: finalOutstandingAmount,

          paymentStatus: finalPaymentStatus,

          status: "issued",

          remarks,

          createdBy,
        },
      ],
      {
        session,
      },
    );

    // ==================================================
    // AUTO-CREATE CUSTOMER PAYMENT (IF PAID OR PARTIAL)
    // ==================================================
    if (finalPaidAmount > 0) {
      let paymentNumber = req.body.paymentNumber;
      if (!paymentNumber || !paymentNumber.toString().trim()) {
        paymentNumber = await getNextSequence(companyId, "customer-payments");
      }
      const paymentDateVal = req.body.paymentDate
        ? new Date(req.body.paymentDate)
        : invoiceDateValue;

      const customerPayment = new CustomerPayment({
        companyId,
        paymentNumber: paymentNumber.trim().toUpperCase(),
        paymentDate: !Number.isNaN(paymentDateVal.getTime()) ? paymentDateVal : invoiceDateValue,
        invoiceId: invoice._id,
        partyId: party._id,
        amount: finalPaidAmount,
        paymentMode: finalPaymentMode,
        referenceNumber: finalReferenceNumber,
        remarks: req.body.paymentRemarks || `Auto-recorded on invoice creation (${finalPaymentStatus.toUpperCase()})`,
        receivedBy: createdBy,
      });

      await customerPayment.save({ session });
    }

    await session.commitTransaction();

    // ==================================================
    // POPULATED RESPONSE
    // ==================================================

    const result = await CustomerInvoice.findOne({
      _id: invoice._id,
      companyId,
    })
      .populate("bookingId", "bookingNumber lrNumber quantity unit status")
      .populate("lrBiltyId", "lrNumber lrDate status")
      .populate("partyId", "name phone gstNumber")
      .populate("createdBy", "name email");

    return res.status(201).json({
      success: true,
      message: "Customer invoice created successfully",
      data: result,
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    console.error("Create customer invoice error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Invoice number or booking invoice already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create customer invoice",
      error: error.message,
    });
  } finally {
    await session.endSession();
  }
};

// ======================================================
// GET ALL CUSTOMER INVOICES
// ======================================================

const getCustomerInvoices = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company is required",
      });
    }

    const { partyId, paymentStatus, status, fromDate, toDate } = req.query;

    const filter = {
      companyId,
    };

    if (partyId) {
      if (!mongoose.Types.ObjectId.isValid(partyId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid partyId",
        });
      }

      filter.partyId = partyId;
    }

    if (paymentStatus) {
      filter.paymentStatus = paymentStatus;
    }

    if (status) {
      filter.status = status;
    }

    if (fromDate || toDate) {
      filter.invoiceDate = {};

      if (fromDate) {
        const startDate = new Date(fromDate);

        if (Number.isNaN(startDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid fromDate",
          });
        }

        filter.invoiceDate.$gte = startDate;
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

        filter.invoiceDate.$lte = endDate;
      }
    }

    const invoices = await CustomerInvoice.find(filter)
      .populate("bookingId", "bookingNumber lrNumber quantity unit")
      .populate("lrBiltyId", "lrNumber lrDate status")
      .populate("partyId", "name phone gstNumber")
      .populate("createdBy", "name email")
      .sort({
        invoiceDate: -1,
        createdAt: -1,
      });

    return res.status(200).json({
      success: true,
      count: invoices.length,
      data: invoices,
    });
  } catch (error) {
    console.error("Get customer invoices error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch customer invoices",
      error: error.message,
    });
  }
};

// ======================================================
// GET SINGLE CUSTOMER INVOICE
// ======================================================

const getCustomerInvoiceById = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid invoice id",
      });
    }

    const invoice = await CustomerInvoice.findOne({
      _id: req.params.id,
      companyId,
    })
      .populate({
        path: "bookingId",
        populate: [
          { path: "fromCityId", select: "cityName state" },
          { path: "toCityId", select: "cityName state" },
          { path: "vehicleId", select: "vehicleNumber vehicleType model" },
          { path: "driverId", select: "name phone" },
          { path: "productId", select: "name description" },
        ],
      })
      .populate({
        path: "lrBiltyId",
        populate: [
          { path: "fromCityId", select: "cityName state" },
          { path: "toCityId", select: "cityName state" },
          { path: "vehicleId", select: "vehicleNumber vehicleType model" },
          { path: "consignorId", select: "name phone gstNumber address" },
          { path: "consigneeId", select: "name phone gstNumber address" },
          { path: "productId", select: "name description" },
        ],
      })
      .populate("partyId")
      .populate("companyId", "name code email phone address city state gstNumber panNumber bankName accountNumber ifscCode branchName upiId")
      .populate("createdBy", "name email");

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Customer invoice not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    console.error("Get customer invoice error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch customer invoice",
      error: error.message,
    });
  }
};

// ======================================================
// UPDATE CUSTOMER INVOICE
// ======================================================

const updateCustomerInvoice = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid invoice id",
      });
    }

    const invoice = await CustomerInvoice.findOne({
      _id: req.params.id,
      companyId,
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Customer invoice not found",
      });
    }

    if (invoice.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cancelled invoice cannot be updated",
      });
    }

    const {
      invoiceDate,
      freightRate,
      hammali,
      detention,
      otherCharges,
      taxPercent,
      remarks,
    } = req.body;

    if (invoiceDate !== undefined) {
      const newInvoiceDate = new Date(invoiceDate);

      if (Number.isNaN(newInvoiceDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid invoice date",
        });
      }

      invoice.invoiceDate = newInvoiceDate;
    }

    if (freightRate !== undefined) {
      const value = Number(freightRate);

      if (!Number.isFinite(value) || value < 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid freight rate",
        });
      }

      invoice.freightRate = value;
    }

    if (hammali !== undefined) {
      const value = Number(hammali);

      if (!Number.isFinite(value) || value < 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid hammali amount",
        });
      }

      invoice.hammali = value;
    }

    if (detention !== undefined) {
      const value = Number(detention);

      if (!Number.isFinite(value) || value < 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid detention amount",
        });
      }

      invoice.detention = value;
    }

    if (otherCharges !== undefined) {
      const value = Number(otherCharges);

      if (!Number.isFinite(value) || value < 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid other charges",
        });
      }

      invoice.otherCharges = value;
    }

    if (taxPercent !== undefined) {
      const value = Number(taxPercent);

      if (!Number.isFinite(value) || value < 0 || value > 100) {
        return res.status(400).json({
          success: false,
          message: "Tax percentage must be between 0 and 100",
        });
      }

      invoice.taxPercent = value;
    }

    if (remarks !== undefined) {
      invoice.remarks = remarks;
    }

    // ==================================================
    // RECALCULATE
    // ==================================================

    invoice.freightAmount =
      Number(invoice.quantity) * Number(invoice.freightRate);

    invoice.taxableAmount =
      Number(invoice.freightAmount) +
      Number(invoice.hammali) +
      Number(invoice.detention) +
      Number(invoice.otherCharges);

    invoice.taxAmount =
      (invoice.taxableAmount * Number(invoice.taxPercent)) / 100;

    invoice.grandTotal = invoice.taxableAmount + invoice.taxAmount;

    const paidAmount = Number(invoice.paidAmount || 0);

    // IMPORTANT:
    // Invoice amount cannot be reduced below already received payment.
    if (invoice.grandTotal < paidAmount) {
      return res.status(400).json({
        success: false,
        message: `Invoice grand total cannot be less than already paid amount of ${paidAmount}`,
      });
    }

    invoice.outstandingAmount = Math.max(invoice.grandTotal - paidAmount, 0);

    if (paidAmount === 0) {
      invoice.paymentStatus = "unpaid";
    } else if (paidAmount >= invoice.grandTotal) {
      invoice.paymentStatus = "paid";
    } else {
      invoice.paymentStatus = "partial";
    }

    await invoice.save();

    return res.status(200).json({
      success: true,
      message: "Customer invoice updated successfully",
      data: invoice,
    });
  } catch (error) {
    console.error("Update customer invoice error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update customer invoice",
      error: error.message,
    });
  }
};

// ======================================================
// CANCEL CUSTOMER INVOICE
// ======================================================

const cancelCustomerInvoice = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid invoice id",
      });
    }

    const invoice = await CustomerInvoice.findOne({
      _id: req.params.id,
      companyId,
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Customer invoice not found",
      });
    }

    if (invoice.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Invoice is already cancelled",
      });
    }

    if (invoice.paymentStatus !== "unpaid") {
      return res.status(400).json({
        success: false,
        message: "Invoice with payment cannot be cancelled",
      });
    }

    invoice.status = "cancelled";

    await invoice.save();

    return res.status(200).json({
      success: true,
      message: "Customer invoice cancelled successfully",
      data: invoice,
    });
  } catch (error) {
    console.error("Cancel customer invoice error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to cancel customer invoice",
      error: error.message,
    });
  }
};

module.exports = {
  createCustomerInvoice,
  getCustomerInvoices,
  getCustomerInvoiceById,
  updateCustomerInvoice,
  cancelCustomerInvoice,
};
