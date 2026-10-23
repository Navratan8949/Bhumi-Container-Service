const mongoose = require("mongoose");

const LRBilty = require("../models/LRBilty");
const Trip = require("../models/Trip");
const CustomerInvoice = require("../models/CustomerInvoice");
const { getNextSequence } = require("../utils/sequenceService");

// ======================================================
// CREATE LR / BILTY
// ======================================================
const createLRBilty = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company is required",
      });
    }

    let {
      bookingId,
      lrNumber,
      lrDate,
      center,
      freightBy,
      consignorName,
      consignorAddress,
      consigneeName,
      consigneeAddress,
      partyName,
      partyId,
      fromCity,
      toCity,
      vehicleId,
      driverId,
      article,
      quantity,
      unit,
      loadingWeight,
      unloadingWeight,
      unloadingDate,
      containerNumber,
      containerSize,
      containerType,
      customsSealNumber,
      shippingLine,
      podUrl,
      status,
      remarks,
    } = req.body;

    // Auto-generate LR number if not provided
    if (!lrNumber || !lrNumber.toString().trim()) {
      lrNumber = await getNextSequence(companyId, "lr-bilties");
    }

    const normalizedLrNumber = lrNumber.toString().trim().toUpperCase();

    // Check duplicate LR number
    const existingLR = await LRBilty.findOne({
      companyId,
      lrNumber: normalizedLrNumber,
    });

    if (existingLR) {
      return res.status(409).json({
        success: false,
        message: "LR number already exists",
      });
    }

    const newLR = await LRBilty.create({
      companyId,
      bookingId: bookingId && mongoose.Types.ObjectId.isValid(bookingId) ? bookingId : null,
      lrNumber: normalizedLrNumber,
      lrDate: lrDate ? new Date(lrDate) : new Date(),
      center: center ? center.toString().toUpperCase() : "PLANT",
      freightBy: freightBy ? freightBy.toString().toUpperCase() : "TBB",

      partyName: partyName || "",
      partyId: partyId && mongoose.Types.ObjectId.isValid(partyId) ? partyId : null,
      consignorName: consignorName || "",
      consignorAddress: consignorAddress || "",
      consigneeName: consigneeName || "",
      consigneeAddress: consigneeAddress || "",
      fromCity: fromCity || "",
      toCity: toCity || "",

      vehicleId: vehicleId && mongoose.Types.ObjectId.isValid(vehicleId) ? vehicleId : null,
      driverId: driverId && mongoose.Types.ObjectId.isValid(driverId) ? driverId : null,

      article: article || "",
      quantity: Number(quantity) || 0,
      unit: unit || "TRIP",
      loadingWeight: Number(loadingWeight) || 0,
      unloadingWeight: Number(unloadingWeight) || 0,
      unloadingDate: unloadingDate ? new Date(unloadingDate) : null,

      containerNumber: (containerNumber || "").toString().trim().toUpperCase(),
      containerSize: containerSize || "40_ft_hc",
      containerType: containerType || "standard",
      customsSealNumber: (customsSealNumber || "").toString().trim().toUpperCase(),
      shippingLine: (shippingLine || "").toString().trim(),
      podUrl: podUrl || "",

      status: status || "generated",
      remarks: remarks || "",
    });

    return res.status(201).json({
      success: true,
      message: "LR/Bilty created successfully",
      data: newLR,
    });
  } catch (error) {
    console.error("Create LR/Bilty error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create LR/Bilty",
      error: error.message,
    });
  }
};

// ======================================================
// GET ALL LR / BILTY
// ======================================================
const getLRBilties = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const lrBilties = await LRBilty.find({
      companyId,
    })
      .populate("vehicleId", "vehicleNumber vehicleType ownerType")
      .populate("driverId", "name phone licenseNumber")
      .sort({
        createdAt: -1,
      });

    const lrIds = lrBilties.map((l) => l._id);

    const activeTrips = await Trip.find({
      companyId,
      status: { $ne: "cancelled" },
      lrBiltyId: { $in: lrIds },
    })
      .select("tripNumber status lrBiltyId vehicleId driverId")
      .lean();

    const tripByLR = {};
    for (const t of activeTrips) {
      if (t.lrBiltyId) tripByLR[t.lrBiltyId.toString()] = t;
    }

    const invoices = await CustomerInvoice.find({
      companyId,
      status: { $ne: "cancelled" },
      lrBiltyId: { $in: lrIds },
    })
      .select("invoiceNumber status lrBiltyId")
      .lean();

    const invoiceByLR = {};
    for (const inv of invoices) {
      if (inv.lrBiltyId) invoiceByLR[inv.lrBiltyId.toString()] = inv;
    }

    const data = lrBilties.map((lr) => {
      const obj = lr.toObject();

      const matchedTrip = tripByLR[obj._id.toString()];
      if (matchedTrip) {
        obj.tripId = matchedTrip._id;
        obj.tripNumber = matchedTrip.tripNumber;
        obj.tripStatus = matchedTrip.status;
      }

      const matchedInv = invoiceByLR[obj._id.toString()];
      if (matchedInv) {
        obj.invoiceId = matchedInv._id;
        obj.customerInvoiceNumber = matchedInv.invoiceNumber;
        obj.invoiceStatus = "invoiced";
        obj.isBilled = true;
      }

      return obj;
    });

    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error("Get LR/Bilty error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch LR/Bilty",
      error: error.message,
    });
  }
};

// ======================================================
// GET SINGLE LR / BILTY
// ======================================================
const getLRBiltyById = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const lrBilty = await LRBilty.findOne({
      _id: req.params.id,
      companyId,
    })
      .populate("vehicleId", "vehicleNumber vehicleType ownerType")
      .populate("driverId", "name phone licenseNumber")
      .populate("companyId", "name code email phone address city state gstNumber panNumber");

    if (!lrBilty) {
      return res.status(404).json({
        success: false,
        message: "LR/Bilty not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: lrBilty,
    });
  } catch (error) {
    console.error("Get LR/Bilty by ID error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch LR/Bilty",
      error: error.message,
    });
  }
};

// ======================================================
// UPDATE LR / BILTY
// ======================================================
const updateLRBilty = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const lrBilty = await LRBilty.findOne({
      _id: req.params.id,
      companyId,
    });

    if (!lrBilty) {
      return res.status(404).json({
        success: false,
        message: "LR/Bilty not found",
      });
    }

    const {
      lrDate,
      center,
      freightBy,
      consignorName,
      consignorAddress,
      consigneeName,
      consigneeAddress,
      partyName,
      fromCity,
      toCity,
      vehicleId,
      driverId,
      article,
      quantity,
      unit,
      containerNumber,
      containerSize,
      containerType,
      customsSealNumber,
      shippingLine,
      loadingWeight,
      unloadingWeight,
      unloadingDate,
      podUrl,
      status,
      remarks,
    } = req.body;

    if (consignorName !== undefined) lrBilty.consignorName = consignorName;
    if (consignorAddress !== undefined) lrBilty.consignorAddress = consignorAddress;
    if (consigneeName !== undefined) lrBilty.consigneeName = consigneeName;
    if (consigneeAddress !== undefined) lrBilty.consigneeAddress = consigneeAddress;
    if (partyName !== undefined) lrBilty.partyName = partyName;
    if (fromCity !== undefined) lrBilty.fromCity = fromCity;
    if (toCity !== undefined) lrBilty.toCity = toCity;

    if (vehicleId !== undefined && mongoose.Types.ObjectId.isValid(vehicleId)) {
      lrBilty.vehicleId = vehicleId;
    }
    if (driverId !== undefined && mongoose.Types.ObjectId.isValid(driverId)) {
      lrBilty.driverId = driverId;
    }

    if (article !== undefined) lrBilty.article = article;
    if (quantity !== undefined) lrBilty.quantity = Number(quantity) || 0;
    if (unit !== undefined) lrBilty.unit = unit;

    // Container & Customs
    if (containerNumber !== undefined) {
      lrBilty.containerNumber = containerNumber.toString().trim().toUpperCase();
    }
    if (containerSize !== undefined) {
      lrBilty.containerSize = containerSize;
    }
    if (containerType !== undefined) {
      lrBilty.containerType = containerType;
    }
    if (customsSealNumber !== undefined) {
      lrBilty.customsSealNumber = customsSealNumber.toString().trim().toUpperCase();
    }
    if (shippingLine !== undefined) {
      lrBilty.shippingLine = shippingLine.toString().trim();
    }
    if (podUrl !== undefined) {
      lrBilty.podUrl = podUrl;
    }

    if (loadingWeight !== undefined) {
      lrBilty.loadingWeight = Number(loadingWeight) || 0;
    }

    // LR date
    if (lrDate !== undefined) {
      lrBilty.lrDate = lrDate;
    }

    if (center !== undefined && ["PLANT", "GODOWN", "MARKET"].includes(center.toString().toUpperCase())) {
      lrBilty.center = center.toString().toUpperCase();
    }

    if (freightBy !== undefined && ["TBB", "PAID", "TO_PAY"].includes(freightBy.toString().toUpperCase())) {
      lrBilty.freightBy = freightBy.toString().toUpperCase();
    }

    // Unloading
    if (unloadingWeight !== undefined) {
      lrBilty.unloadingWeight = unloadingWeight;
    }
    if (unloadingDate !== undefined) {
      lrBilty.unloadingDate = unloadingDate;
    }

    // Status
    if (status !== undefined) {
      lrBilty.status = status;
    }

    // Remarks
    if (remarks !== undefined) {
      lrBilty.remarks = remarks;
    }

    await lrBilty.save();

    return res.status(200).json({
      success: true,
      message: "LR/Bilty updated successfully",
      data: lrBilty,
    });
  } catch (error) {
    console.error("Update LR/Bilty error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update LR/Bilty",
      error: error.message,
    });
  }
};

// ======================================================
// CANCEL LR / BILTY
// ======================================================
const cancelLRBilty = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const lrBilty = await LRBilty.findOne({
      _id: req.params.id,
      companyId,
    });

    if (!lrBilty) {
      return res.status(404).json({
        success: false,
        message: "LR/Bilty not found",
      });
    }

    if (lrBilty.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "LR/Bilty is already cancelled",
      });
    }

    lrBilty.status = "cancelled";
    await lrBilty.save();

    // Also cancel linked trip if any
    await Trip.updateMany(
      { companyId, lrBiltyId: lrBilty._id },
      { $set: { status: "cancelled" } }
    );

    return res.status(200).json({
      success: true,
      message: "LR/Bilty cancelled successfully",
      data: lrBilty,
    });
  } catch (error) {
    console.error("Cancel LR/Bilty error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to cancel LR/Bilty",
      error: error.message,
    });
  }
};

// ======================================================
// DELETE LR / BILTY (HARD DELETE FROM DATABASE)
// ======================================================
const deleteLRBilty = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const lrBilty = await LRBilty.findOne({
      _id: req.params.id,
      companyId,
    });

    if (!lrBilty) {
      return res.status(404).json({
        success: false,
        message: "LR/Bilty not found",
      });
    }

    // Permanently delete linked trips from database
    await Trip.deleteMany({
      companyId,
      lrBiltyId: lrBilty._id,
    });

    await LRBilty.deleteOne({ _id: lrBilty._id, companyId });

    return res.status(200).json({
      success: true,
      message: "LR/Bilty and linked Trips permanently deleted from database",
    });
  } catch (error) {
    console.error("Delete LR/Bilty error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete LR/Bilty",
      error: error.message,
    });
  }
};

module.exports = {
  createLRBilty,
  getLRBilties,
  getLRBiltyById,
  updateLRBilty,
  cancelLRBilty,
  deleteLRBilty,
};
