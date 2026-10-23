const mongoose = require("mongoose");

const CustomerInvoice = require("../models/CustomerInvoice");
const LRBilty = require("../models/LRBilty");
const Trip = require("../models/Trip");
const AdvanceMemo = require("../models/AdvanceMemo");
const { getNextSequence } = require("../utils/sequenceService");

const syncTripAndAdvanceMemoOnInvoice = async (companyId, invoice) => {
  try {
    const query = { companyId };
    if (invoice.vehicleId) {
      query.vehicleId = invoice.vehicleId;
    }
    const pName = (invoice.partyName || invoice.customerName || "").trim();
    if (pName) {
      query.partyName = { $regex: new RegExp(`^${pName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") };
    }

    const matchingTrips = await Trip.find(query).sort({ createdAt: -1 }).limit(3);
    for (const trip of matchingTrips) {
      if (invoice.paymentStatus === "paid" || invoice.outstandingAmount === 0) {
        trip.balanceAmount = 0;
        await trip.save();

        if (trip.advanceMemoId) {
          await AdvanceMemo.findOneAndUpdate(
            { _id: trip.advanceMemoId, companyId },
            { $set: { balance: 0 } }
          ).catch(() => {});
        }
      } else if (invoice.paidAmount > 0) {
        const initialBal = Math.max(0, (trip.rate || 0) - (trip.advanceAmount || 0));
        trip.balanceAmount = Math.max(0, initialBal - invoice.paidAmount);
        await trip.save();

        if (trip.advanceMemoId) {
          await AdvanceMemo.findOneAndUpdate(
            { _id: trip.advanceMemoId, companyId },
            { $set: { balance: trip.balanceAmount } }
          ).catch(() => {});
        }
      }
    }
  } catch (err) {
    console.error("syncTripAndAdvanceMemoOnInvoice error:", err.message);
  }
};

// ======================================================
// CREATE CUSTOMER INVOICE
// ======================================================

const createCustomerInvoice = async (req, res) => {
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
      customerName,
      partyName,
      partyId,
      customerAddress,
      customerPhone,
      customerGst,
      vehicleId,
      containerSize,
      fromLocation,
      toLocation,
      quantity,
      unit,
      freightRate,
      advanceReceived,
      advanceDate,
      bankAccountName,
      munshiyanaML,
      tdsAmount,
      hammali,
      detention,
      otherCharges,
      debitAmount,
      kundi,
      taxPercent,
      paidAmount,
      paymentDate,
      paymentMode,
      referenceNumber,
      paymentStatus,
      status,
      remarks,
    } = req.body;

    // Auto-generate invoiceNumber if omitted or empty
    if (!invoiceNumber || !invoiceNumber.toString().trim()) {
      invoiceNumber = await getNextSequence(companyId, "customer-invoices");
    }

    const invoiceDateValue = invoiceDate ? new Date(invoiceDate) : new Date();
    if (Number.isNaN(invoiceDateValue.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid invoice date",
      });
    }

    const finalFreightRate = Number(freightRate || 0);
    const finalHammali = Number(hammali || 0);
    const finalDetention = Number(detention || 0);
    const finalOtherCharges = Number(otherCharges || 0);
    const finalTaxPercent = Number(taxPercent || 0);
    const finalQuantity = Number(quantity || 1);
    const finalUnit = unit || "TRIP";

    const normalizedInvoiceNumber = invoiceNumber.trim().toUpperCase();

    // Check duplicate
    const existingInvoice = await CustomerInvoice.findOne({
      companyId,
      invoiceNumber: normalizedInvoiceNumber,
    });

    if (existingInvoice) {
      return res.status(409).json({
        success: false,
        message: "Invoice number already exists",
      });
    }

    const finalCustomerName = (customerName || partyName || "").trim();

    // Check linked LR if any
    let lrBilty = null;
    if (lrBiltyId && mongoose.Types.ObjectId.isValid(lrBiltyId)) {
      lrBilty = await LRBilty.findOne({ _id: lrBiltyId, companyId });
    }

    const freightAmount = finalQuantity * finalFreightRate;
    const taxableAmount = freightAmount + finalHammali + finalDetention + finalOtherCharges;
    const taxAmount = (taxableAmount * finalTaxPercent) / 100;
    const grandTotal = taxableAmount + taxAmount;

    const finalAdvanceReceived = Number(advanceReceived || 0);
    const finalMunshiyana = Number(munshiyanaML || 0);
    const finalTds = Number(tdsAmount || 0);
    const totalDeductions = finalAdvanceReceived + finalMunshiyana + finalTds;

    let finalPaymentStatus = String(paymentStatus || "unpaid").trim().toLowerCase();
    let finalPaidAmount = Number(paidAmount || 0);
    let finalOutstandingAmount = Math.max(grandTotal - totalDeductions - finalPaidAmount, 0);

    if (finalPaidAmount >= (grandTotal - totalDeductions) && (grandTotal - totalDeductions) > 0) {
      finalPaymentStatus = "paid";
      finalOutstandingAmount = 0;
    } else if (finalPaidAmount > 0) {
      finalPaymentStatus = "partial";
    }

    const newInvoice = await CustomerInvoice.create({
      companyId,
      invoiceNumber: normalizedInvoiceNumber,
      invoiceDate: invoiceDateValue,
      bookingId: bookingId && mongoose.Types.ObjectId.isValid(bookingId) ? bookingId : null,
      lrBiltyId: lrBilty ? lrBilty._id : null,
      partyId: partyId && mongoose.Types.ObjectId.isValid(partyId) ? partyId : null,
      customerName: finalCustomerName,
      partyName: finalCustomerName,
      customerAddress: customerAddress || "",
      customerPhone: customerPhone || "",
      customerGst: customerGst || "",

      vehicleId: vehicleId && mongoose.Types.ObjectId.isValid(vehicleId) ? vehicleId : null,
      containerSize: containerSize || "",
      fromLocation: fromLocation || "",
      toLocation: toLocation || "",
      quantity: finalQuantity,
      unit: finalUnit,
      freightRate: finalFreightRate,
      freightAmount,

      advanceReceived: finalAdvanceReceived,
      advanceDate: advanceDate ? new Date(advanceDate) : null,
      bankAccountName: bankAccountName || "",
      munshiyanaML: finalMunshiyana,
      tdsAmount: finalTds,
      hammali: finalHammali,
      detention: finalDetention,
      otherCharges: finalOtherCharges,
      debitAmount: Number(debitAmount || 0),
      kundi: Number(kundi || 0),

      taxableAmount,
      taxPercent: finalTaxPercent,
      taxAmount,
      grandTotal,

      paidAmount: finalPaidAmount,
      paymentDate: paymentDate ? new Date(paymentDate) : null,
      paymentMode: paymentMode || "",
      referenceNumber: referenceNumber || "",
      outstandingAmount: finalOutstandingAmount,
      paymentStatus: finalPaymentStatus,
      status: status || "issued",
      remarks: remarks || "",
      createdBy,
    });

    const populated = await CustomerInvoice.findOne({
      _id: newInvoice._id,
      companyId,
    })
      .populate("vehicleId", "vehicleNumber vehicleType make model")
      .populate("lrBiltyId", "lrNumber lrDate containerNumber");

    await syncTripAndAdvanceMemoOnInvoice(companyId, populated || newInvoice);

    return res.status(201).json({
      success: true,
      message: "Customer invoice created successfully",
      data: populated,
    });
  } catch (error) {
    console.error("Create customer invoice error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create customer invoice",
      error: error.message,
    });
  }
};

// ======================================================
// GET ALL CUSTOMER INVOICES
// ======================================================

const getCustomerInvoices = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const { paymentStatus, status, fromDate, toDate, vehicleId } = req.query;

    const filter = {
      companyId,
    };

    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (status) filter.status = status;
    if (vehicleId && mongoose.Types.ObjectId.isValid(vehicleId)) filter.vehicleId = vehicleId;

    if (fromDate || toDate) {
      filter.invoiceDate = {};
      if (fromDate) {
        const start = new Date(fromDate);
        if (!Number.isNaN(start.getTime())) {
          start.setHours(0, 0, 0, 0);
          filter.invoiceDate.$gte = start;
        }
      }
      if (toDate) {
        const end = new Date(toDate);
        if (!Number.isNaN(end.getTime())) {
          end.setHours(23, 59, 59, 999);
          filter.invoiceDate.$lte = end;
        }
      }
    }

    const invoices = await CustomerInvoice.find(filter)
      .populate("vehicleId", "vehicleNumber vehicleType")
      .populate("lrBiltyId", "lrNumber lrDate containerNumber")
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
      .populate("vehicleId", "vehicleNumber vehicleType make model currentOdometer")
      .populate("lrBiltyId", "lrNumber lrDate containerNumber customsSealNumber shippingLine consignorName consigneeName partyName fromCity toCity")
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

    const {
      invoiceDate,
      customerName,
      partyName,
      customerAddress,
      customerPhone,
      customerGst,
      vehicleId,
      containerSize,
      fromLocation,
      toLocation,
      quantity,
      unit,
      freightRate,
      advanceReceived,
      advanceDate,
      bankAccountName,
      munshiyanaML,
      tdsAmount,
      hammali,
      detention,
      otherCharges,
      debitAmount,
      kundi,
      taxPercent,
      paidAmount,
      paymentDate,
      paymentMode,
      referenceNumber,
      paymentStatus,
      status,
      remarks,
    } = req.body;

    if (customerName !== undefined || partyName !== undefined) {
      const name = (customerName || partyName || "").trim();
      invoice.customerName = name;
      invoice.partyName = name;
    }

    if (customerAddress !== undefined) invoice.customerAddress = customerAddress;
    if (customerPhone !== undefined) invoice.customerPhone = customerPhone;
    if (customerGst !== undefined) invoice.customerGst = customerGst;

    if (invoiceDate !== undefined) {
      const newDate = new Date(invoiceDate);
      if (!Number.isNaN(newDate.getTime())) invoice.invoiceDate = newDate;
    }

    if (vehicleId !== undefined) {
      invoice.vehicleId = vehicleId && mongoose.Types.ObjectId.isValid(vehicleId) ? vehicleId : null;
    }

    if (containerSize !== undefined) invoice.containerSize = containerSize;
    if (fromLocation !== undefined) invoice.fromLocation = fromLocation;
    if (toLocation !== undefined) invoice.toLocation = toLocation;
    if (bankAccountName !== undefined) invoice.bankAccountName = bankAccountName;
    if (unit !== undefined) invoice.unit = unit;

    if (advanceDate !== undefined) invoice.advanceDate = advanceDate ? new Date(advanceDate) : null;
    if (paymentDate !== undefined) invoice.paymentDate = paymentDate ? new Date(paymentDate) : null;
    if (paymentMode !== undefined) invoice.paymentMode = paymentMode;
    if (referenceNumber !== undefined) invoice.referenceNumber = referenceNumber;
    if (status !== undefined) invoice.status = status;

    if (quantity !== undefined) invoice.quantity = Number(quantity) || 1;
    if (freightRate !== undefined) invoice.freightRate = Number(freightRate) || 0;
    if (advanceReceived !== undefined) invoice.advanceReceived = Number(advanceReceived) || 0;
    if (munshiyanaML !== undefined) invoice.munshiyanaML = Number(munshiyanaML) || 0;
    if (tdsAmount !== undefined) invoice.tdsAmount = Number(tdsAmount) || 0;
    if (hammali !== undefined) invoice.hammali = Number(hammali) || 0;
    if (detention !== undefined) invoice.detention = Number(detention) || 0;
    if (otherCharges !== undefined) invoice.otherCharges = Number(otherCharges) || 0;
    if (debitAmount !== undefined) invoice.debitAmount = Number(debitAmount) || 0;
    if (kundi !== undefined) invoice.kundi = Number(kundi) || 0;
    if (taxPercent !== undefined) invoice.taxPercent = Number(taxPercent) || 0;
    if (paidAmount !== undefined) invoice.paidAmount = Number(paidAmount) || 0;
    if (remarks !== undefined) invoice.remarks = remarks;

    // Recalculate
    invoice.freightAmount = Number(invoice.quantity || 1) * Number(invoice.freightRate || 0);
    invoice.taxableAmount =
      Number(invoice.freightAmount) +
      Number(invoice.hammali || 0) +
      Number(invoice.detention || 0) +
      Number(invoice.otherCharges || 0);

    invoice.taxAmount = (invoice.taxableAmount * Number(invoice.taxPercent || 0)) / 100;
    invoice.grandTotal = invoice.taxableAmount + invoice.taxAmount;

    const deductions =
      Number(invoice.advanceReceived || 0) +
      Number(invoice.munshiyanaML || 0) +
      Number(invoice.tdsAmount || 0);

    if (paymentStatus === "paid" || req.body.outstandingAmount === 0) {
      invoice.paymentStatus = "paid";
      invoice.outstandingAmount = 0;
      invoice.paidAmount = Math.max(0, invoice.grandTotal - deductions);
    } else {
      let outstanding = Math.max(invoice.grandTotal - deductions - Number(invoice.paidAmount || 0), 0);
      invoice.outstandingAmount = outstanding;

      if (paymentStatus) {
        invoice.paymentStatus = paymentStatus;
      } else if (invoice.paidAmount >= (invoice.grandTotal - deductions) && (invoice.grandTotal - deductions) > 0) {
        invoice.paymentStatus = "paid";
      } else if (invoice.paidAmount > 0) {
        invoice.paymentStatus = "partial";
      } else {
        invoice.paymentStatus = "unpaid";
      }
    }

    await invoice.save();

    await syncTripAndAdvanceMemoOnInvoice(companyId, invoice);

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
// DELETE CUSTOMER INVOICE
// ======================================================

const deleteCustomerInvoice = async (req, res) => {
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

    await CustomerInvoice.deleteOne({ _id: invoice._id, companyId });

    return res.status(200).json({
      success: true,
      message: "Customer invoice deleted successfully",
    });
  } catch (error) {
    console.error("Delete customer invoice error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete customer invoice",
      error: error.message,
    });
  }
};

module.exports = {
  createCustomerInvoice,
  getCustomerInvoices,
  getCustomerInvoiceById,
  updateCustomerInvoice,
  deleteCustomerInvoice,
  cancelCustomerInvoice: deleteCustomerInvoice,
};
