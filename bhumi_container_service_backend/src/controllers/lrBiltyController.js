const mongoose = require("mongoose");

const LRBilty = require("../models/LRBilty");
const Booking = require("../models/Booking");
const SupplyOrder = require("../models/SupplyOrder");
const Trip = require("../models/Trip");
const CustomerInvoice = require("../models/CustomerInvoice");

// ======================================================
// CREATE LR / BILTY
// ======================================================
const createLRBilty = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const companyId = req.user.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company is required",
      });
    }

    const { bookingId, lrDate, status, remarks } = req.body;

    // ==================================================
    // BASIC VALIDATION
    // ==================================================
    if (!bookingId || !lrDate) {
      return res.status(400).json({
        success: false,
        message: "Booking and LR date are required",
      });
    }

    session.startTransaction();

    // ==================================================
    // FIND BOOKING
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

    // ==================================================
    // BOOKING STATUS VALIDATION
    // ==================================================
    if (booking.status === "cancelled") {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: "Cancelled booking cannot be converted into LR/Bilty",
      });
    }

    // ==================================================
    // CHECK LR ALREADY EXISTS FOR BOOKING
    // ==================================================
    const existingBookingLR = await LRBilty.findOne({
      companyId,
      bookingId,
    }).session(session);

    if (existingBookingLR) {
      await session.abortTransaction();

      return res.status(409).json({
        success: false,
        message: "LR/Bilty already exists for this booking",
        data: {
          lrId: existingBookingLR._id,
          lrNumber: existingBookingLR.lrNumber,
        },
      });
    }

    // ==================================================
    // CHECK LR NUMBER DUPLICATE
    // ==================================================
    const existingLR = await LRBilty.findOne({
      companyId,
      lrNumber: booking.lrNumber,
    }).session(session);

    if (existingLR) {
      await session.abortTransaction();

      return res.status(409).json({
        success: false,
        message: "LR number already exists",
      });
    }

    // ==================================================
    // GET SUPPLY ORDER
    // ==================================================
    const supplyOrder = await SupplyOrder.findOne({
      _id: booking.supplyOrderId,
      companyId,
    }).session(session);

    if (!supplyOrder) {
      await session.abortTransaction();

      return res.status(404).json({
        success: false,
        message: "Related Supply Order not found",
      });
    }

    // ==================================================
    // CREATE LR / BILTY
    // ==================================================
    const [lrBilty] = await LRBilty.create(
      [
        {
          companyId,

          bookingId: booking._id,

          // LR number comes from Booking
          lrNumber: booking.lrNumber,

          lrDate,

          center: booking.center || "PLANT",
          freightBy: booking.freightBy || "TBB",

          // From Supply Order
          partyId: supplyOrder.partyId,
          consignorId: supplyOrder.consignorId,
          consigneeId: supplyOrder.consigneeId,

          // From Booking
          productId: booking.productId,
          fromCityId: booking.fromCityId,
          toCityId: booking.toCityId,

          vehicleId: booking.vehicleId,
          driverId: booking.driverId,

          // Container & Customs specifications
          containerNumber: (req.body.containerNumber || booking.containerNumber || "").toString().trim().toUpperCase(),
          containerSize: req.body.containerSize || booking.containerSize || "40_ft_hc",
          containerType: req.body.containerType || booking.containerType || "standard",
          customsSealNumber: (req.body.customsSealNumber || booking.customsSealNumber || "").toString().trim().toUpperCase(),
          shippingLine: req.body.shippingLine || booking.shippingLine || "",

          quantity: booking.quantity,
          unit: booking.unit,

          article: booking.article,

          invoiceNumber: booking.invoiceNumber,
          invoiceDate: booking.invoiceDate,

          loadingWeight: req.body.loadingWeight !== undefined ? req.body.loadingWeight : booking.loadingWeight,
          unloadingWeight: booking.unloadingWeight,
          unloadingDate: booking.unloadingDate,

          status: status || "generated",

          remarks: remarks !== undefined ? remarks : booking.remarks,
        },
      ],
      {
        session,
      },
    );

    await session.commitTransaction();

    // ==================================================
    // POPULATE RESPONSE
    // ==================================================
    const populatedLR = await LRBilty.findById(lrBilty._id)
      .populate(
        "bookingId",
        "bookingNumber bookingDate lrNumber quantity unit status",
      )
      .populate("partyId", "name phone gstNumber")
      .populate("consignorId", "name phone gstNumber")
      .populate("consigneeId", "name phone gstNumber")
      .populate("productId", "name code unit")
      .populate("fromCityId", "name state")
      .populate("toCityId", "name state")
      .populate("vehicleId", "vehicleNumber vehicleType ownerType")
      .populate("driverId", "name phone licenseNumber");

    return res.status(201).json({
      success: true,
      message: "LR/Bilty created successfully",
      data: populatedLR,
    });
  } catch (error) {
    await session.abortTransaction();

    console.error("Create LR/Bilty error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create LR/Bilty",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

// ======================================================
// GET ALL LR / BILTY
// ======================================================
const getLRBilties = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    // Auto-sync any Bookings that have an lrNumber but no LRBilty document yet
    const unlinkedBookings = await Booking.find({
      companyId,
      lrNumber: { $exists: true, $ne: "" },
    }).populate("supplyOrderId");

    for (const b of unlinkedBookings) {
      const exists = await LRBilty.findOne({ companyId, bookingId: b._id });
      if (!exists) {
        await LRBilty.create({
          companyId,
          bookingId: b._id,
          lrNumber: b.lrNumber,
          lrDate: b.bookingDate || b.createdAt || new Date(),
          center: b.center || "PLANT",
          freightBy: b.freightBy || "TBB",
          partyId: b.billingPartyId || b.supplyOrderId?.partyId,
          consignorId: b.supplyOrderId?.consignorId,
          consigneeId: b.supplyOrderId?.consigneeId,
          productId: b.productId,
          fromCityId: b.fromCityId,
          toCityId: b.toCityId,
          vehicleId: b.vehicleId,
          driverId: b.driverId,
          quantity: b.quantity,
          unit: b.unit,
          article: b.article,
          invoiceNumber: b.invoiceNumber,
          invoiceDate: b.invoiceDate,
          loadingWeight: b.loadingWeight,
          unloadingWeight: b.unloadingWeight,
          status: "generated",
          remarks: b.remarks,
        });
      }
    }

    const lrBilties = await LRBilty.find({
      companyId,
    })
      .populate(
        "bookingId",
        "bookingNumber bookingDate lrNumber center freightBy commission shortageAllowed shortageRate shortageAmount quantity unit status billingRate billingHammali billingDetention hireRate shortage",
      )
      .populate("partyId", "name phone gstNumber address")
      .populate("consignorId", "name phone gstNumber address")
      .populate("consigneeId", "name phone gstNumber address")
      .populate("productId", "name code unit")
      .populate("fromCityId", "name state")
      .populate("toCityId", "name state")
      .populate("vehicleId", "vehicleNumber vehicleType ownerType")
      .populate("driverId", "name phone licenseNumber")
      .sort({
        createdAt: -1,
      });

    const lrIds = lrBilties.map((l) => l._id);
    const bookingIds = lrBilties
      .map((l) => (l.bookingId ? (l.bookingId._id || l.bookingId) : null))
      .filter(Boolean);

    const activeTrips = await Trip.find({
      companyId,
      status: { $ne: "cancelled" },
      $or: [{ lrBiltyId: { $in: lrIds } }, { bookingId: { $in: bookingIds } }],
    })
      .select("tripNumber status lrBiltyId bookingId vehicleId driverId")
      .lean();

    const tripByLR = {};
    const tripByBooking = {};
    for (const t of activeTrips) {
      if (t.lrBiltyId) tripByLR[t.lrBiltyId.toString()] = t;
      if (t.bookingId) tripByBooking[t.bookingId.toString()] = t;
    }

    const invoices = await CustomerInvoice.find({
      companyId,
      status: { $ne: "cancelled" },
      $or: [{ lrBiltyId: { $in: lrIds } }, { bookingId: { $in: bookingIds } }],
    })
      .select("invoiceNumber status lrBiltyId bookingId")
      .lean();

    const invoiceByLR = {};
    const invoiceByBooking = {};
    for (const inv of invoices) {
      if (inv.lrBiltyId) invoiceByLR[inv.lrBiltyId.toString()] = inv;
      if (inv.bookingId) invoiceByBooking[inv.bookingId.toString()] = inv;
    }

    const data = lrBilties.map((lr) => {
      const obj = lr.toObject();
      const bId = obj.bookingId?._id
        ? obj.bookingId._id.toString()
        : obj.bookingId
          ? obj.bookingId.toString()
          : null;

      const matchedTrip =
        tripByLR[obj._id.toString()] || (bId ? tripByBooking[bId] : null);

      if (matchedTrip) {
        obj.tripId = matchedTrip._id;
        obj.tripNumber = matchedTrip.tripNumber;
        obj.tripStatus = matchedTrip.status;
      }

      const matchedInv =
        invoiceByLR[obj._id.toString()] || (bId ? invoiceByBooking[bId] : null);

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
      .populate(
        "bookingId",
        "bookingNumber bookingDate lrNumber center freightBy commission shortageAllowed shortageRate shortageAmount quantity unit status billingRate billingHammali billingDetention hireRate shortage",
      )
      .populate("partyId", "name phone gstNumber address")
      .populate("consignorId", "name phone gstNumber address")
      .populate("consigneeId", "name phone gstNumber address")
      .populate("productId", "name code unit")
      .populate("fromCityId", "name state")
      .populate("toCityId", "name state")
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
      containerNumber,
      containerSize,
      containerType,
      customsSealNumber,
      shippingLine,
      loadingWeight,
      unloadingWeight,
      unloadingDate,
      status,
      remarks,
    } = req.body;

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
      { companyId, $or: [{ lrBiltyId: lrBilty._id }, { bookingId: lrBilty.bookingId }] },
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
      $or: [
        { lrBiltyId: lrBilty._id },
        ...(lrBilty.bookingId ? [{ bookingId: lrBilty.bookingId }] : [])
      ]
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
