const mongoose = require("mongoose");

const VendorBill = require("../models/VendorBill");
const Vendor = require("../models/Vendor");
const Vehicle = require("../models/Vehicle");
const LRBilty = require("../models/LRBilty");
const User = require("../models/User");
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

    const finalBillDate = billDate ? new Date(billDate) : new Date();
    if (Number.isNaN(finalBillDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid billDate",
      });
    }

    if (bookingId && !mongoose.Types.ObjectId.isValid(bookingId)) {
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
    // Vendor and Parameters
    // -------------------------------------------------

    let finalVendorId = req.body.vendorId;
    let quantity = Number(req.body.quantity || 1);
    let unit = req.body.unit || "TRIP";

    if (!finalVendorId) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Vendor / Transporter / Broker is required",
      });
    }

    let vendor = null;
    if (mongoose.Types.ObjectId.isValid(finalVendorId)) {
      vendor = await Vendor.findOne({
        _id: finalVendorId,
        companyId,
      }).session(session);
    }

    if (!vendor && typeof finalVendorId === "string" && finalVendorId.trim()) {
      vendor = await Vendor.findOne({
        vendorName: new RegExp(`^${finalVendorId.trim()}$`, "i"),
        companyId,
      }).session(session);

      if (!vendor) {
        const created = await Vendor.create(
          [
            {
              companyId,
              vendorName: finalVendorId.trim(),
              phone: "0000000000",
              vendorType:
                finalVendorId.trim().toUpperCase() === "SELF"
                  ? "self"
                  : "market_vendor",
              status: "active",
            },
          ],
          { session },
        );
        vendor = created[0];
      }
      finalVendorId = vendor._id;
    }

    if (!vendor) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Vendor / Broker not found in your company",
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
    }

    // -------------------------------------------------
    // Charges & Amounts
    // -------------------------------------------------

    const finalHireRate =
      hireRate !== undefined
        ? Number(hireRate)
        : 0;

    const finalLoading =
      loadingCharges !== undefined
        ? Number(loadingCharges)
        : 0;

    const finalUnloading =
      unloadingCharges !== undefined
        ? Number(unloadingCharges)
        : 0;

    const finalHammali =
      hammali !== undefined
        ? Number(hammali)
        : 0;

    const finalDetention =
      detention !== undefined
        ? Number(detention)
        : 0;

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

    let finalPaidAmount = Number(req.body.paidAmount || 0);
    let finalPaymentStatus = String(req.body.paymentStatus || "unpaid").toLowerCase();
    if (finalPaymentStatus === "paid" && finalPaidAmount === 0) {
      finalPaidAmount = grandTotal;
    }

    const outstandingAmount = grandTotal - finalPaidAmount;
    if (outstandingAmount <= 0 && grandTotal > 0) {
      finalPaymentStatus = "paid";
    } else if (finalPaidAmount > 0) {
      finalPaymentStatus = "partial";
    } else {
      finalPaymentStatus = "unpaid";
    }

    // -------------------------------------------------
    // Vehicle resolution
    // -------------------------------------------------

    let finalVehicleId = req.body.vehicleId && mongoose.Types.ObjectId.isValid(req.body.vehicleId) ? req.body.vehicleId : null;
    let finalVehicleNumber = (req.body.vehicleNumber || req.body.truckNumber || "").trim().toUpperCase();

    if (finalVehicleId && !finalVehicleNumber) {
      const vObj = await Vehicle.findById(finalVehicleId).select("vehicleNumber").session(session);
      if (vObj) finalVehicleNumber = vObj.vehicleNumber || "";
    }

    // -------------------------------------------------
    // Create bill
    // -------------------------------------------------

    const vendorBill = new VendorBill({
      companyId,
      billNumber,
      billDate: finalBillDate,
      vendorId: vendor._id,
      vendorName: req.body.vendorName || vendor.vendorName || "",
      vehicleId: finalVehicleId,
      vehicleNumber: finalVehicleNumber,
      partyId: req.body.partyId || null,
      partyName: req.body.partyName || "",
      containerSize: req.body.containerSize || "",
      fromLocation: req.body.fromLocation || "",
      toLocation: req.body.toLocation || "",
      deliveryDate: req.body.deliveryDate ? new Date(req.body.deliveryDate) : null,
      podDate: req.body.podDate || "",
      advanceDate: req.body.advanceDate ? new Date(req.body.advanceDate) : null,
      bookingId: null,
      lrBiltyId: lrBiltyId || null,
      quantity,
      unit,
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
      advanceDiesel: Number(req.body.advanceDiesel || 0),
      advanceCash: Number(req.body.advanceCash || 0),
      paidAmount: finalPaidAmount,
      outstandingAmount,
      paymentMode: req.body.paymentMode || "",
      referenceNumber: req.body.referenceNumber || "",
      paymentStatus: finalPaymentStatus,
      status: req.body.status || "issued",
      remarks: remarks || "",
      rcDocument: req.body.rcDocument || "",
      driverLicenseDoc: req.body.driverLicenseDoc || "",
      tdsDeclaration: req.body.tdsDeclaration || "",
      insuranceDoc: req.body.insuranceDoc || "",
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
      .populate("vehicleId", "vehicleNumber vehicleType make model")
      .populate("lrBiltyId", "lrNumber lrDate")
      .populate("createdBy", "name email");

    return res.status(201).json({
      success: true,
      message: "Vendor bill created successfully",
      data: populatedBill,
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

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
      .populate("vehicleId", "vehicleNumber vehicleType make model")
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
      .populate("vehicleId", "vehicleNumber vehicleType make model")
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

    if (bill.status === "cancelled" && req.body.status !== "issued") {
      return res.status(400).json({
        success: false,
        message: "Cancelled vendor bill cannot be updated",
      });
    }

    const {
      billDate,
      vendorId,
      vehicleId,
      partyId,
      containerSize,
      fromLocation,
      toLocation,
      deliveryDate,
      podDate,
      advanceDate,
      quantity,
      unit,
      hireRate,
      loadingCharges,
      unloadingCharges,
      hammali,
      detention,
      otherCharges,
      taxPercent,
      paidAmount,
      paymentMode,
      referenceNumber,
      paymentStatus,
      status,
      remarks,
    } = req.body;

    if (billDate !== undefined) {
      const d = new Date(billDate);
      if (!Number.isNaN(d.getTime())) bill.billDate = d;
    }

    if (vendorId !== undefined && mongoose.Types.ObjectId.isValid(vendorId)) {
      bill.vendorId = vendorId;
    }

    if (vehicleId !== undefined) {
      bill.vehicleId = vehicleId && mongoose.Types.ObjectId.isValid(vehicleId) ? vehicleId : null;
      if (bill.vehicleId && !req.body.vehicleNumber && !req.body.truckNumber) {
        const vObj = await Vehicle.findById(bill.vehicleId).select("vehicleNumber");
        if (vObj) bill.vehicleNumber = vObj.vehicleNumber || "";
      }
    }

    if (req.body.vehicleNumber !== undefined || req.body.truckNumber !== undefined) {
      bill.vehicleNumber = (req.body.vehicleNumber || req.body.truckNumber || "").trim().toUpperCase();
    }

    if (req.body.advanceDiesel !== undefined) {
      const val = Number(req.body.advanceDiesel);
      if (Number.isFinite(val) && val >= 0) bill.advanceDiesel = val;
    }

    if (req.body.advanceCash !== undefined) {
      const val = Number(req.body.advanceCash);
      if (Number.isFinite(val) && val >= 0) bill.advanceCash = val;
    }

    if (partyId !== undefined) {
      bill.partyId = partyId && mongoose.Types.ObjectId.isValid(partyId) ? partyId : null;
    }

    if (req.body.partyName !== undefined) bill.partyName = (req.body.partyName || "").trim();
    if (req.body.vendorName !== undefined) bill.vendorName = (req.body.vendorName || "").trim();

    if (containerSize !== undefined) bill.containerSize = containerSize;
    if (fromLocation !== undefined) bill.fromLocation = fromLocation;
    if (toLocation !== undefined) bill.toLocation = toLocation;
    if (podDate !== undefined) bill.podDate = podDate;
    if (unit !== undefined) bill.unit = unit;

    if (req.body.rcDocument !== undefined) bill.rcDocument = req.body.rcDocument;
    if (req.body.driverLicenseDoc !== undefined) bill.driverLicenseDoc = req.body.driverLicenseDoc;
    if (req.body.tdsDeclaration !== undefined) bill.tdsDeclaration = req.body.tdsDeclaration;
    if (req.body.insuranceDoc !== undefined) bill.insuranceDoc = req.body.insuranceDoc;

    if (deliveryDate !== undefined) {
      bill.deliveryDate = deliveryDate ? new Date(deliveryDate) : null;
    }

    if (advanceDate !== undefined) {
      bill.advanceDate = advanceDate ? new Date(advanceDate) : null;
    }

    if (paymentMode !== undefined) bill.paymentMode = paymentMode;
    if (referenceNumber !== undefined) bill.referenceNumber = referenceNumber;
    if (status !== undefined) bill.status = status;

    if (quantity !== undefined) {
      const q = Number(quantity);
      if (Number.isFinite(q) && q >= 0) bill.quantity = q;
    }

    if (hireRate !== undefined) {
      const h = Number(hireRate);
      if (Number.isFinite(h) && h >= 0) bill.hireRate = h;
    }

    if (loadingCharges !== undefined) {
      const val = Number(loadingCharges);
      if (Number.isFinite(val) && val >= 0) bill.loadingCharges = val;
    }

    if (unloadingCharges !== undefined) {
      const val = Number(unloadingCharges);
      if (Number.isFinite(val) && val >= 0) bill.unloadingCharges = val;
    }

    if (hammali !== undefined) {
      const val = Number(hammali);
      if (Number.isFinite(val) && val >= 0) bill.hammali = val;
    }

    if (detention !== undefined) {
      const val = Number(detention);
      if (Number.isFinite(val) && val >= 0) bill.detention = val;
    }

    if (otherCharges !== undefined) {
      const val = Number(otherCharges);
      if (Number.isFinite(val) && val >= 0) bill.otherCharges = val;
    }

    if (taxPercent !== undefined) {
      const val = Number(taxPercent);
      if (Number.isFinite(val) && val >= 0 && val <= 100) bill.taxPercent = val;
    }

    if (paidAmount !== undefined) {
      const val = Number(paidAmount);
      if (Number.isFinite(val) && val >= 0) bill.paidAmount = val;
    }

    if (remarks !== undefined) {
      bill.remarks = remarks;
    }

    // Recalculate
    bill.hireAmount = Number(bill.quantity || 1) * Number(bill.hireRate || 0);

    bill.taxableAmount =
      bill.hireAmount +
      Number(bill.loadingCharges || 0) +
      Number(bill.unloadingCharges || 0) +
      Number(bill.hammali || 0) +
      Number(bill.detention || 0) +
      Number(bill.otherCharges || 0);

    bill.taxAmount = bill.taxableAmount * (Number(bill.taxPercent || 0) / 100);

    bill.grandTotal = bill.taxableAmount + bill.taxAmount;

    if (paymentStatus === "paid" && (!bill.paidAmount || bill.paidAmount === 0)) {
      bill.paidAmount = bill.grandTotal;
    }

    bill.outstandingAmount = bill.grandTotal - Number(bill.paidAmount || 0);

    if (bill.outstandingAmount <= 0 && bill.grandTotal > 0) {
      bill.paymentStatus = "paid";
    } else if (Number(bill.paidAmount || 0) > 0) {
      bill.paymentStatus = "partial";
    } else {
      bill.paymentStatus = paymentStatus || "unpaid";
    }

    await bill.save();

    const updatedBill = await VendorBill.findById(bill._id)
      .populate(
        "vendorId",
        "vendorCode vendorName vendorType phone email gstNumber",
      )
      .populate("vehicleId", "vehicleNumber vehicleType make model")
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
