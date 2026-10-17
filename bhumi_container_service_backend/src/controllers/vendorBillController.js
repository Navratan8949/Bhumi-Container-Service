const mongoose = require("mongoose");

const VendorBill = require("../models/VendorBill");
const Booking = require("../models/Booking");
const Vendor = require("../models/Vendor");
const LRBilty = require("../models/LRBilty");
const { getNextSequence } = require("../utils/sequenceService");

// =====================================================
// CREATE VENDOR BILL
// =====================================================

const createVendorBill = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    let {
      billNumber,
      billDate,
      bookingId,
      lrBiltyId,
      hireRate,
      loadingCharges,
      unloadingCharges,
      hammali,
      detention,
      otherCharges,
      taxPercent,
      remarks,
    } = req.body;

    const companyId = req.user.companyId;
    const createdBy = req.user.userId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company is required",
      });
    }

    if (!billNumber || !billNumber.toString().trim()) {
      billNumber = await getNextSequence(companyId, "vendor-bills");
    }

    if (!billDate || !bookingId) {
      return res.status(400).json({
        success: false,
        message: "billDate and bookingId are required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid bookingId",
      });
    }

    session.startTransaction();

    // -------------------------------------------------
    // Duplicate bill number
    // -------------------------------------------------

    const existingBill = await VendorBill.findOne({
      companyId,
      billNumber: billNumber.toUpperCase(),
    }).session(session);

    if (existingBill) {
      await session.abortTransaction();

      return res.status(409).json({
        success: false,
        message: "Vendor bill number already exists",
      });
    }

    // -------------------------------------------------
    // Booking
    // -------------------------------------------------

    const booking = await Booking.findOne({
      _id: bookingId,
      companyId,
    }).session(session);

    if (!booking) {
      await session.abortTransaction();

      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (booking.status === "cancelled") {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: "Vendor bill cannot be created for cancelled booking",
      });
    }

    // -------------------------------------------------
    // Transporter required
    // -------------------------------------------------

    if (!booking.transporterId) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: "Transporter is not assigned to this booking",
      });
    }

    // -------------------------------------------------
    // Vendor
    // -------------------------------------------------

    const vendor = await Vendor.findOne({
      _id: booking.transporterId,
      companyId,
      vendorType: "transporter",
      status: "active",
    }).session(session);

    if (!vendor) {
      await session.abortTransaction();

      return res.status(404).json({
        success: false,
        message: "Transporter vendor not found or inactive",
      });
    }

    // -------------------------------------------------
    // One bill per booking
    // -------------------------------------------------

    const bookingBill = await VendorBill.findOne({
      companyId,
      bookingId,
    }).session(session);

    if (bookingBill) {
      await session.abortTransaction();

      return res.status(409).json({
        success: false,
        message: "Vendor bill already exists for this booking",
      });
    }

    // -------------------------------------------------
    // LR validation
    // -------------------------------------------------

    if (lrBiltyId) {
      if (!mongoose.Types.ObjectId.isValid(lrBiltyId)) {
        await session.abortTransaction();

        return res.status(400).json({
          success: false,
          message: "Invalid lrBiltyId",
        });
      }

      const lrBilty = await LRBilty.findOne({
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

    // -------------------------------------------------
    // Charges
    // -------------------------------------------------

    const quantity = Number(booking.quantity || 0);

    const finalHireRate =
      hireRate !== undefined ? Number(hireRate) : Number(booking.hireRate || 0);

    const finalLoading =
      loadingCharges !== undefined
        ? Number(loadingCharges)
        : Number(booking.transporterLoading || 0);

    const finalUnloading =
      unloadingCharges !== undefined
        ? Number(unloadingCharges)
        : Number(booking.transporterUnloading || 0);

    const finalHammali =
      hammali !== undefined
        ? Number(hammali)
        : Number(booking.transporterHammali || 0);

    const finalDetention =
      detention !== undefined
        ? Number(detention)
        : Number(booking.transporterDetention || 0);

    const finalOtherCharges =
      otherCharges !== undefined ? Number(otherCharges) : 0;

    const finalTaxPercent = taxPercent !== undefined ? Number(taxPercent) : 0;

    const values = [
      finalHireRate,
      finalLoading,
      finalUnloading,
      finalHammali,
      finalDetention,
      finalOtherCharges,
      finalTaxPercent,
    ];

    if (values.some((value) => !Number.isFinite(value) || value < 0)) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: "Charges, tax and rates must be valid positive numbers",
      });
    }

    // -------------------------------------------------
    // Amount calculation
    // -------------------------------------------------

    const hireAmount = quantity * finalHireRate;

    const taxableAmount =
      hireAmount +
      finalLoading +
      finalUnloading +
      finalHammali +
      finalDetention +
      finalOtherCharges;

    const taxAmount = taxableAmount * (finalTaxPercent / 100);

    const grandTotal = taxableAmount + taxAmount;

    // -------------------------------------------------
    // Create bill
    // -------------------------------------------------

    const vendorBill = new VendorBill({
      companyId,

      billNumber,

      billDate,

      vendorId: vendor._id,

      bookingId: booking._id,

      lrBiltyId: lrBiltyId || null,

      quantity,

      unit: booking.unit,

      hireRate: finalHireRate,

      hireAmount,

      loadingCharges: finalLoading,

      unloadingCharges: finalUnloading,

      hammali: finalHammali,

      detention: finalDetention,

      otherCharges: finalOtherCharges,

      taxableAmount,

      taxPercent: finalTaxPercent,

      taxAmount,

      grandTotal,

      paidAmount: 0,

      outstandingAmount: grandTotal,

      paymentStatus: "unpaid",

      status: "issued",

      remarks: remarks || "",

      createdBy,
    });

    await vendorBill.save({ session });

    await session.commitTransaction();

    // -------------------------------------------------
    // Populate response
    // -------------------------------------------------

    const populatedBill = await VendorBill.findById(vendorBill._id)
      .populate(
        "vendorId",
        "vendorCode vendorName vendorType phone email gstNumber",
      )
      .populate(
        "bookingId",
        "bookingNumber lrNumber quantity unit hireRate transporterLoading transporterUnloading transporterHammali transporterDetention",
      )
      .populate("lrBiltyId", "lrNumber lrDate")
      .populate("createdBy", "name email");

    return res.status(201).json({
      success: true,
      message: "Vendor bill created successfully",
      data: populatedBill,
    });
  } catch (error) {
    await session.abortTransaction();

    console.error("Create vendor bill error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create vendor bill",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

// =====================================================
// GET ALL VENDOR BILLS
// =====================================================

const getVendorBills = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const { vendorId, bookingId, paymentStatus, status, fromDate, toDate } =
      req.query;

    const filter = {
      companyId,
    };

    if (vendorId) {
      filter.vendorId = vendorId;
    }

    if (bookingId) {
      filter.bookingId = bookingId;
    }

    if (paymentStatus) {
      filter.paymentStatus = paymentStatus;
    }

    if (status) {
      filter.status = status;
    }

    if (fromDate || toDate) {
      filter.billDate = {};

      if (fromDate) {
        filter.billDate.$gte = new Date(fromDate);
      }

      if (toDate) {
        const endDate = new Date(toDate);

        endDate.setHours(23, 59, 59, 999);

        filter.billDate.$lte = endDate;
      }
    }

    const bills = await VendorBill.find(filter)
      .populate(
        "vendorId",
        "vendorCode vendorName vendorType phone email gstNumber",
      )
      .populate("bookingId", "bookingNumber lrNumber quantity unit")
      .populate("lrBiltyId", "lrNumber lrDate")
      .populate("createdBy", "name email")
      .sort({
        billDate: -1,
        createdAt: -1,
      });

    return res.status(200).json({
      success: true,
      count: bills.length,
      data: bills,
    });
  } catch (error) {
    console.error("Get vendor bills error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch vendor bills",
      error: error.message,
    });
  }
};

// =====================================================
// GET VENDOR BILL BY ID
// =====================================================

const getVendorBillById = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    const bill = await VendorBill.findOne({
      _id: id,
      companyId,
    })
      .populate(
        "vendorId",
        "vendorCode vendorName vendorType phone email gstNumber",
      )
      .populate(
        "bookingId",
        "bookingNumber lrNumber quantity unit hireRate transporterLoading transporterUnloading transporterHammali transporterDetention",
      )
      .populate("lrBiltyId", "lrNumber lrDate")
      .populate("createdBy", "name email");

    if (!bill) {
      return res.status(404).json({
        success: false,
        message: "Vendor bill not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: bill,
    });
  } catch (error) {
    console.error("Get vendor bill error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch vendor bill",
      error: error.message,
    });
  }
};

// =====================================================
// UPDATE VENDOR BILL
// =====================================================

const updateVendorBill = async (req, res) => {
  try {
    const { id } = req.params;

    const companyId = req.user.companyId;

    const bill = await VendorBill.findOne({
      _id: id,
      companyId,
    });

    if (!bill) {
      return res.status(404).json({
        success: false,
        message: "Vendor bill not found",
      });
    }

    if (bill.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cancelled vendor bill cannot be updated",
      });
    }

    const {
      billDate,
      hireRate,
      loadingCharges,
      unloadingCharges,
      hammali,
      detention,
      otherCharges,
      taxPercent,
      remarks,
    } = req.body;

    if (billDate !== undefined) {
      bill.billDate = billDate;
    }

    if (hireRate !== undefined) {
      bill.hireRate = Number(hireRate);
    }

    if (loadingCharges !== undefined) {
      bill.loadingCharges = Number(loadingCharges);
    }

    if (unloadingCharges !== undefined) {
      bill.unloadingCharges = Number(unloadingCharges);
    }

    if (hammali !== undefined) {
      bill.hammali = Number(hammali);
    }

    if (detention !== undefined) {
      bill.detention = Number(detention);
    }

    if (otherCharges !== undefined) {
      bill.otherCharges = Number(otherCharges);
    }

    if (taxPercent !== undefined) {
      bill.taxPercent = Number(taxPercent);
    }

    if (remarks !== undefined) {
      bill.remarks = remarks;
    }

    const values = [
      bill.hireRate,
      bill.loadingCharges,
      bill.unloadingCharges,
      bill.hammali,
      bill.detention,
      bill.otherCharges,
      bill.taxPercent,
    ];

    if (values.some((value) => !Number.isFinite(value) || value < 0)) {
      return res.status(400).json({
        success: false,
        message: "Charges, rates and tax must be valid positive numbers",
      });
    }

    // Recalculate

    bill.hireAmount = bill.quantity * bill.hireRate;

    bill.taxableAmount =
      bill.hireAmount +
      bill.loadingCharges +
      bill.unloadingCharges +
      bill.hammali +
      bill.detention +
      bill.otherCharges;

    bill.taxAmount = bill.taxableAmount * (bill.taxPercent / 100);

    bill.grandTotal = bill.taxableAmount + bill.taxAmount;

    // Existing paid amount cannot exceed new bill total

    if (bill.paidAmount > bill.grandTotal) {
      return res.status(400).json({
        success: false,
        message: "New bill total cannot be less than already paid amount",
      });
    }

    bill.outstandingAmount = bill.grandTotal - bill.paidAmount;

    if (bill.outstandingAmount <= 0) {
      bill.outstandingAmount = 0;
      bill.paymentStatus = "paid";
    } else if (bill.paidAmount > 0) {
      bill.paymentStatus = "partial";
    } else {
      bill.paymentStatus = "unpaid";
    }

    await bill.save();

    const updatedBill = await VendorBill.findById(bill._id)
      .populate(
        "vendorId",
        "vendorCode vendorName vendorType phone email gstNumber",
      )
      .populate("bookingId", "bookingNumber lrNumber quantity unit")
      .populate("createdBy", "name email");

    return res.status(200).json({
      success: true,
      message: "Vendor bill updated successfully",
      data: updatedBill,
    });
  } catch (error) {
    console.error("Update vendor bill error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update vendor bill",
      error: error.message,
    });
  }
};

// =====================================================
// CANCEL VENDOR BILL
// =====================================================

const cancelVendorBill = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    const bill = await VendorBill.findOne({
      _id: id,
      companyId,
    });

    if (!bill) {
      return res.status(404).json({
        success: false,
        message: "Vendor bill not found",
      });
    }

    if (bill.paidAmount > 0) {
      return res.status(400).json({
        success: false,
        message: "Vendor bill with received payment cannot be cancelled",
      });
    }

    bill.status = "cancelled";

    await bill.save();

    return res.status(200).json({
      success: true,
      message: "Vendor bill cancelled successfully",
    });
  } catch (error) {
    console.error("Cancel vendor bill error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to cancel vendor bill",
      error: error.message,
    });
  }
};

module.exports = {
  createVendorBill,
  getVendorBills,
  getVendorBillById,
  updateVendorBill,
  cancelVendorBill,
};
