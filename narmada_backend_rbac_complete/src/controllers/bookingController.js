const mongoose = require("mongoose");

const Booking = require("../models/Booking");
const SupplyOrder = require("../models/SupplyOrder");
const Vehicle = require("../models/Vehicle");
const Driver = require("../models/Driver");
const City = require("../models/City");
const Product = require("../models/Product");
const Party = require("../models/Party");
const Vendor = require("../models/Vendor");
const LRBilty = require("../models/LRBilty");
const Trip = require("../models/Trip");
const CustomerInvoice = require("../models/CustomerInvoice");
const { getNextBookingAndLR } = require("../utils/sequenceService");

// ======================================================
// HELPER: VALIDATE TRANSPORTER
// ======================================================

const validateTransporter = async (
  transporterId,
  companyId,
  session = null,
) => {
  if (!transporterId) {
    return null;
  }

  let query = Vendor.findOne({
    _id: transporterId,
    companyId,
  });

  if (session) {
    query = query.session(session);
  }

  const transporter = await query;

  if (!transporter) {
    const error = new Error("Transporter not found in your company");
    error.statusCode = 404;
    throw error;
  }

  if (transporter.vendorType !== "transporter") {
    const error = new Error("Selected vendor is not a transporter");
    error.statusCode = 400;
    throw error;
  }

  if (transporter.status !== "active") {
    const error = new Error("Selected transporter is inactive");
    error.statusCode = 400;
    throw error;
  }

  return transporter;
};

// ======================================================
// CREATE BOOKING
// ======================================================

const createBooking = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const companyId = req.user.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company is required",
      });
    }

    let {
      bookingNumber,
      bookingDate,
      lrNumber,
      supplyOrderId,
      vehicleId,
      driverId,

      quantity,

      article,
      invoiceNumber,
      invoiceDate,

      loadingWeight,
      unloadingWeight,
      unloadingDate,

      billingRate,
      billingHammali,
      billingDetention,

      transporterId,
      transporterLoading,
      transporterUnloading,

      shortage,
      shortageDetails,

      hireRate,
      transporterHammali,
      transporterDetention,

      status,
      remarks,
    } = req.body;

    // Auto-generate bookingNumber and/or lrNumber if omitted or blank
    if (!bookingNumber || !bookingNumber.toString().trim() || !lrNumber || !lrNumber.toString().trim()) {
      const autoNumbers = await getNextBookingAndLR(companyId);
      if (!bookingNumber || !bookingNumber.toString().trim()) {
        bookingNumber = autoNumbers.bookingNumber;
      }
      if (!lrNumber || !lrNumber.toString().trim()) {
        lrNumber = autoNumbers.lrNumber;
      }
    }

    // ==================================================
    // BASIC VALIDATION
    // ==================================================

    if (
      !bookingDate ||
      !supplyOrderId ||
      !vehicleId ||
      !driverId ||
      quantity === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Booking date, supply order, vehicle, driver and quantity are required",
      });
    }

    const bookingQuantity = Number(quantity);

    if (!Number.isFinite(bookingQuantity) || bookingQuantity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Booking quantity must be greater than 0",
      });
    }

    // ==================================================
    // START TRANSACTION
    // ==================================================

    session.startTransaction();

    // ==================================================
    // NORMALIZE NUMBERS
    // ==================================================

    const finalBillingRate = Number(billingRate) || 0;

    const finalBillingHammali = Number(billingHammali) || 0;

    const finalBillingDetention = Number(billingDetention) || 0;

    const finalTransporterLoading = Number(transporterLoading) || 0;

    const finalTransporterUnloading = Number(transporterUnloading) || 0;

    const finalHireRate = Number(hireRate) || 0;

    const finalTransporterHammali = Number(transporterHammali) || 0;

    const finalTransporterDetention = Number(transporterDetention) || 0;

    const finalLoadingWeight = Number(loadingWeight) || 0;

    const finalUnloadingWeight = Number(unloadingWeight) || 0;

    const finalShortage = Number(shortage) || 0;

    // ==================================================
    // DUPLICATE BOOKING NUMBER
    // ==================================================

    const existingBooking = await Booking.findOne({
      companyId,
      bookingNumber: bookingNumber.trim().toUpperCase(),
    }).session(session);

    if (existingBooking) {
      await session.abortTransaction();

      return res.status(409).json({
        success: false,
        message: "Booking number already exists",
      });
    }

    // ==================================================
    // DUPLICATE LR NUMBER
    // ==================================================

    const existingLR = await Booking.findOne({
      companyId,
      lrNumber: lrNumber.trim().toUpperCase(),
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
      _id: supplyOrderId,
      companyId,
    }).session(session);

    if (!supplyOrder) {
      await session.abortTransaction();

      return res.status(404).json({
        success: false,
        message: "Supply Order not found",
      });
    }

    // ==================================================
    // SUPPLY ORDER STATUS
    // ==================================================

    if (
      supplyOrder.status === "completed" ||
      supplyOrder.status === "cancelled"
    ) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: "This Supply Order cannot accept a new booking",
      });
    }

    // ==================================================
    // QUANTITY VALIDATION
    // ==================================================

    if (bookingQuantity > Number(supplyOrder.pendingQuantity)) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message:
          `Booking quantity exceeds pending quantity. ` +
          `Pending quantity is ${supplyOrder.pendingQuantity} ${supplyOrder.unit}`,
      });
    }

    // ==================================================
    // VALUES FROM SUPPLY ORDER
    // ==================================================

    const finalProductId = supplyOrder.productId;

    const finalFromCityId = supplyOrder.fromCityId;

    const finalToCityId = supplyOrder.toCityId;

    const finalBillingPartyId = supplyOrder.partyId;

    const finalUnit = supplyOrder.unit;

    // ==================================================
    // VEHICLE VALIDATION
    // ==================================================

    const vehicle = await Vehicle.findOne({
      _id: vehicleId,
      companyId,
    }).session(session);

    if (!vehicle) {
      await session.abortTransaction();

      return res.status(404).json({
        success: false,
        message: "Vehicle not found in your company",
      });
    }

    // ==================================================
    // DRIVER VALIDATION
    // ==================================================

    const driver = await Driver.findOne({
      _id: driverId,
      companyId,
    }).session(session);

    if (!driver) {
      await session.abortTransaction();

      return res.status(404).json({
        success: false,
        message: "Driver not found in your company",
      });
    }

    // ==================================================
    // CITY VALIDATION
    // ==================================================

    const fromCity = await City.findOne({
      _id: finalFromCityId,
      companyId,
    }).session(session);

    const toCity = await City.findOne({
      _id: finalToCityId,
      companyId,
    }).session(session);

    if (!fromCity || !toCity) {
      await session.abortTransaction();

      return res.status(404).json({
        success: false,
        message: "From city or To city not found",
      });
    }

    // ==================================================
    // PRODUCT VALIDATION
    // ==================================================

    const product = await Product.findOne({
      _id: finalProductId,
      companyId,
    }).session(session);

    if (!product) {
      await session.abortTransaction();

      return res.status(404).json({
        success: false,
        message: "Product not found in your company",
      });
    }

    // ==================================================
    // UNIT VALIDATION
    // ==================================================

    if (product.unit !== supplyOrder.unit) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message:
          `Unit mismatch. Product unit is ${product.unit}, ` +
          `but Supply Order unit is ${supplyOrder.unit}`,
      });
    }

    // ==================================================
    // BILLING PARTY VALIDATION
    // ==================================================

    const party = await Party.findOne({
      _id: finalBillingPartyId,
      companyId,
    }).session(session);

    if (!party) {
      await session.abortTransaction();

      return res.status(404).json({
        success: false,
        message: "Billing party linked with Supply Order was not found",
      });
    }

    // ==================================================
    // TRANSPORTER VALIDATION
    // ==================================================

    let transporter = null;

    if (transporterId) {
      try {
        transporter = await validateTransporter(
          transporterId,
          companyId,
          session,
        );
      } catch (error) {
        await session.abortTransaction();

        return res.status(error.statusCode || 500).json({
          success: false,
          message: error.message,
        });
      }
    }

    // ==================================================
    // CREATE BOOKING
    // ==================================================

    const [booking] = await Booking.create(
      [
        {
          companyId,

          bookingNumber: bookingNumber.trim().toUpperCase(),

          bookingDate,

          lrNumber: lrNumber.trim().toUpperCase(),

          supplyOrderId,

          vehicleId,

          driverId,

          // From Supply Order
          fromCityId: finalFromCityId,

          toCityId: finalToCityId,

          productId: finalProductId,

          unit: finalUnit,

          quantity: bookingQuantity,

          article,

          invoiceNumber,

          invoiceDate: invoiceDate || null,

          loadingWeight: finalLoadingWeight,

          unloadingWeight: finalUnloadingWeight,

          unloadingDate: unloadingDate || null,

          // From Supply Order
          billingPartyId: finalBillingPartyId,

          billingRate: finalBillingRate,

          billingHammali: finalBillingHammali,

          billingDetention: finalBillingDetention,

          // Transporter
          transporterId: transporter ? transporter._id : null,

          transporterLoading: finalTransporterLoading,

          transporterUnloading: finalTransporterUnloading,

          hireRate: finalHireRate,

          transporterHammali: finalTransporterHammali,

          transporterDetention: finalTransporterDetention,

          shortage: finalShortage,

          shortageDetails,

          status: status || "booked",

          remarks,
        },
      ],
      {
        session,
      },
    );

    // ==================================================
    // UPDATE SUPPLY ORDER
    // ==================================================

    supplyOrder.bookedQuantity =
      Number(supplyOrder.bookedQuantity || 0) + bookingQuantity;

    supplyOrder.pendingQuantity =
      Number(supplyOrder.orderQuantity) - Number(supplyOrder.bookedQuantity);

    if (supplyOrder.pendingQuantity === 0) {
      supplyOrder.status = "completed";
    } else {
      supplyOrder.status = "partial";
    }

    // ==================================================
    // AUTO CREATE CORRESPONDING LR / BILTY
    // ==================================================
    if (booking.lrNumber) {
      await LRBilty.create(
        [
          {
            companyId,
            bookingId: booking._id,
            lrNumber: booking.lrNumber,
            lrDate: booking.bookingDate || new Date(),
            partyId: finalBillingPartyId,
            consignorId: supplyOrder.consignorId,
            consigneeId: supplyOrder.consigneeId,
            productId: finalProductId,
            fromCityId: finalFromCityId,
            toCityId: finalToCityId,
            vehicleId: booking.vehicleId,
            driverId: booking.driverId,
            quantity: booking.quantity,
            unit: booking.unit,
            article: booking.article,
            invoiceNumber: booking.invoiceNumber,
            invoiceDate: booking.invoiceDate,
            loadingWeight: booking.loadingWeight,
            unloadingWeight: booking.unloadingWeight,
            unloadingDate: booking.unloadingDate,
            status: "generated",
            remarks: booking.remarks,
          },
        ],
        {
          session,
        },
      );
    }

    // ==================================================
    // COMMIT TRANSACTION
    // ==================================================

    await session.commitTransaction();

    // ==================================================
    // POPULATED RESPONSE
    // ==================================================

    const populatedBooking = await Booking.findById(booking._id)
      .populate("supplyOrderId")
      .populate("vehicleId", "vehicleNumber vehicleType ownerType")
      .populate("driverId", "name phone licenseNumber")
      .populate("fromCityId", "name state")
      .populate("toCityId", "name state")
      .populate("productId", "name code unit")
      .populate("billingPartyId", "name phone gstNumber")
      .populate(
        "transporterId",
        "vendorCode vendorName vendorType phone email gstNumber",
      );

    return res.status(201).json({
      success: true,
      message: "Booking created successfully",
      data: populatedBooking,
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    console.error("Create booking error:", error);

    // Duplicate key
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];

      return res.status(409).json({
        success: false,
        message:
          field === "bookingNumber"
            ? "Booking number already exists"
            : field === "lrNumber"
              ? "LR number already exists"
              : "Duplicate booking data",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create booking",
      error: error.message,
    });
  } finally {
    await session.endSession();
  }
};

// ======================================================
// GET ALL BOOKINGS
// ======================================================

const getBookings = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const bookings = await Booking.find({
      companyId,
    })
      .populate({
        path: "supplyOrderId",
        select:
          "soNumber orderQuantity bookedQuantity pendingQuantity status consignorId consigneeId partyId",
        populate: [
          {
            path: "consignorId",
            select: "name address city state gstNumber phone",
          },
          {
            path: "consigneeId",
            select: "name address city state gstNumber phone",
          },
          {
            path: "partyId",
            select: "name address city state gstNumber phone",
          },
        ],
      })
      .populate("vehicleId", "vehicleNumber vehicleType ownerType")
      .populate("driverId", "name phone licenseNumber")
      .populate("fromCityId", "name state")
      .populate("toCityId", "name state")
      .populate("productId", "name code unit")
      .populate("billingPartyId", "name phone gstNumber")
      .populate(
        "transporterId",
        "vendorCode vendorName vendorType phone email gstNumber",
      )
      .sort({
        createdAt: -1,
      });

    const bookingIds = bookings.map((b) => b._id);
    const trips = await Trip.find({
      companyId,
      bookingId: { $in: bookingIds },
      status: { $ne: "cancelled" },
    })
      .select("tripNumber status bookingId lrBiltyId")
      .lean();

    const tripMap = {};
    for (const t of trips) {
      if (t.bookingId) tripMap[t.bookingId.toString()] = t;
    }

    const invoices = await CustomerInvoice.find({
      companyId,
      bookingId: { $in: bookingIds },
      status: { $ne: "cancelled" },
    })
      .select("invoiceNumber status bookingId")
      .lean();

    const invoiceMap = {};
    for (const inv of invoices) {
      if (inv.bookingId) invoiceMap[inv.bookingId.toString()] = inv;
    }

    const data = bookings.map((b) => {
      const obj = b.toObject();
      const t = tripMap[obj._id.toString()];
      if (t) {
        obj.tripId = t._id;
        obj.tripNumber = t.tripNumber;
        obj.tripStatus = t.status;
      }
      const inv = invoiceMap[obj._id.toString()];
      if (inv) {
        obj.invoiceId = inv._id;
        obj.customerInvoiceNumber = inv.invoiceNumber;
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
    console.error("Get bookings error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch bookings",
      error: error.message,
    });
  }
};

// ======================================================
// GET SINGLE BOOKING
// ======================================================

const getBookingById = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const booking = await Booking.findOne({
      _id: req.params.id,
      companyId,
    })
      .populate({
        path: "supplyOrderId",
        select:
          "soNumber orderQuantity bookedQuantity pendingQuantity status consignorId consigneeId partyId",
        populate: [
          {
            path: "consignorId",
            select: "name address city state gstNumber phone",
          },
          {
            path: "consigneeId",
            select: "name address city state gstNumber phone",
          },
          {
            path: "partyId",
            select: "name address city state gstNumber phone",
          },
        ],
      })
      .populate("vehicleId", "vehicleNumber vehicleType ownerType")
      .populate("driverId", "name phone licenseNumber")
      .populate("fromCityId", "name state")
      .populate("toCityId", "name state")
      .populate("productId", "name code unit")
      .populate("billingPartyId", "name phone gstNumber")
      .populate(
        "transporterId",
        "vendorCode vendorName vendorType phone email gstNumber",
      );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    console.error("Get booking error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch booking",
      error: error.message,
    });
  }
};

// ======================================================
// UPDATE BOOKING
// ======================================================

const updateBooking = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const booking = await Booking.findOne({
      _id: req.params.id,
      companyId,
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (booking.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cancelled booking cannot be updated",
      });
    }

    const {
      bookingDate,
      vehicleId,
      driverId,

      unloadingWeight,
      unloadingDate,

      billingRate,
      billingHammali,
      billingDetention,

      transporterId,
      transporterLoading,
      transporterUnloading,

      shortage,
      shortageDetails,

      hireRate,
      transporterHammali,
      transporterDetention,

      status,
      remarks,
    } = req.body;

    // ==================================================
    // VEHICLE
    // ==================================================

    if (vehicleId !== undefined) {
      const vehicle = await Vehicle.findOne({
        _id: vehicleId,
        companyId,
      });

      if (!vehicle) {
        return res.status(404).json({
          success: false,
          message: "Vehicle not found",
        });
      }

      booking.vehicleId = vehicleId;
    }

    // ==================================================
    // DRIVER
    // ==================================================

    if (driverId !== undefined) {
      const driver = await Driver.findOne({
        _id: driverId,
        companyId,
      });

      if (!driver) {
        return res.status(404).json({
          success: false,
          message: "Driver not found",
        });
      }

      booking.driverId = driverId;
    }

    // ==================================================
    // TRANSPORTER
    // ==================================================

    if (transporterId !== undefined) {
      if (transporterId === null || transporterId === "") {
        booking.transporterId = null;
      } else {
        try {
          const transporter = await validateTransporter(
            transporterId,
            companyId,
          );

          booking.transporterId = transporter._id;
        } catch (error) {
          return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message,
          });
        }
      }
    }

    // ==================================================
    // OTHER FIELDS
    // ==================================================

    if (bookingDate !== undefined) {
      booking.bookingDate = bookingDate;
    }

    if (unloadingWeight !== undefined) {
      booking.unloadingWeight = Number(unloadingWeight) || 0;
    }

    if (unloadingDate !== undefined) {
      booking.unloadingDate = unloadingDate;
    }

    if (billingRate !== undefined) {
      booking.billingRate = Number(billingRate) || 0;
    }

    if (billingHammali !== undefined) {
      booking.billingHammali = Number(billingHammali) || 0;
    }

    if (billingDetention !== undefined) {
      booking.billingDetention = Number(billingDetention) || 0;
    }

    if (transporterLoading !== undefined) {
      booking.transporterLoading = Number(transporterLoading) || 0;
    }

    if (transporterUnloading !== undefined) {
      booking.transporterUnloading = Number(transporterUnloading) || 0;
    }

    if (shortage !== undefined) {
      booking.shortage = Number(shortage) || 0;
    }

    if (shortageDetails !== undefined) {
      booking.shortageDetails = shortageDetails;
    }

    if (hireRate !== undefined) {
      booking.hireRate = Number(hireRate) || 0;
    }

    if (transporterHammali !== undefined) {
      booking.transporterHammali = Number(transporterHammali) || 0;
    }

    if (transporterDetention !== undefined) {
      booking.transporterDetention = Number(transporterDetention) || 0;
    }

    if (status !== undefined) {
      booking.status = status;
    }

    if (remarks !== undefined) {
      booking.remarks = remarks;
    }

    await booking.save();

    const updatedBooking = await Booking.findById(booking._id)
      .populate("vehicleId", "vehicleNumber vehicleType ownerType")
      .populate("driverId", "name phone licenseNumber")
      .populate("productId", "name code unit")
      .populate("billingPartyId", "name phone gstNumber")
      .populate(
        "transporterId",
        "vendorCode vendorName vendorType phone email gstNumber",
      );

    return res.status(200).json({
      success: true,
      message: "Booking updated successfully",
      data: updatedBooking,
    });
  } catch (error) {
    console.error("Update booking error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update booking",
      error: error.message,
    });
  }
};

// ======================================================
// DELETE / CANCEL BOOKING
// ======================================================

// ======================================================
// CANCEL BOOKING (SOFT CANCEL & RESTORE QUANTITY)
// ======================================================

const cancelBooking = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const companyId = req.user.companyId;

    session.startTransaction();

    const booking = await Booking.findOne({
      _id: req.params.id,
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
        message: "Booking is already cancelled",
      });
    }

    // Return quantity to Supply Order
    if (booking.supplyOrderId) {
      const supplyOrder = await SupplyOrder.findOne({
        _id: booking.supplyOrderId,
        companyId,
      }).session(session);

      if (supplyOrder) {
        supplyOrder.bookedQuantity = Math.max(
          0,
          Number(supplyOrder.bookedQuantity || 0) - Number(booking.quantity || 0),
        );
        supplyOrder.pendingQuantity =
          Number(supplyOrder.orderQuantity) - Number(supplyOrder.bookedQuantity);

        if (supplyOrder.pendingQuantity === 0) {
          supplyOrder.status = "completed";
        } else if (supplyOrder.bookedQuantity > 0) {
          supplyOrder.status = "partial";
        } else {
          supplyOrder.status = "pending";
        }

        await supplyOrder.save({ session });
      }
    }

    booking.status = "cancelled";
    await booking.save({ session });

    await LRBilty.updateMany(
      { companyId, bookingId: booking._id },
      { $set: { status: "cancelled" } },
      { session },
    );

    // Also cancel any linked Trips
    await Trip.updateMany(
      { companyId, bookingId: booking._id },
      { $set: { status: "cancelled" } },
      { session },
    );

    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      message: "Booking cancelled and pending quantity restored",
      data: booking,
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    console.error("Cancel booking error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to cancel booking",
      error: error.message,
    });
  } finally {
    await session.endSession();
  }
};

// ======================================================
// DELETE BOOKING (HARD DELETE FROM DB & DELETE LINKED LR & TRIPS)
// ======================================================

const deleteBooking = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const companyId = req.user.companyId;

    session.startTransaction();

    const booking = await Booking.findOne({
      _id: req.params.id,
      companyId,
    }).session(session);

    if (!booking) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // If booking was NOT already cancelled, restore quantity to Supply Order
    if (booking.status !== "cancelled" && booking.supplyOrderId) {
      const supplyOrder = await SupplyOrder.findOne({
        _id: booking.supplyOrderId,
        companyId,
      }).session(session);

      if (supplyOrder) {
        supplyOrder.bookedQuantity = Math.max(
          0,
          Number(supplyOrder.bookedQuantity || 0) - Number(booking.quantity || 0),
        );
        supplyOrder.pendingQuantity =
          Number(supplyOrder.orderQuantity) - Number(supplyOrder.bookedQuantity);

        if (supplyOrder.pendingQuantity === 0) {
          supplyOrder.status = "completed";
        } else if (supplyOrder.bookedQuantity > 0) {
          supplyOrder.status = "partial";
        } else {
          supplyOrder.status = "pending";
        }

        await supplyOrder.save({ session });
      }
    }

    // Permanently delete linked LR/Bilty records from database
    await LRBilty.deleteMany(
      { companyId, bookingId: booking._id },
      { session },
    );

    // Also delete any LR matching the booking's lrNumber in this company
    if (booking.lrNumber) {
      await LRBilty.deleteMany(
        { companyId, lrNumber: booking.lrNumber },
        { session },
      );
    }

    // Permanently delete linked Trips from database
    await Trip.deleteMany(
      { companyId, bookingId: booking._id },
      { session },
    );

    // Permanently delete the booking from database
    await Booking.deleteOne(
      { _id: booking._id, companyId },
      { session },
    );

    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      message: "Booking, linked LR, and linked Trips permanently deleted from database",
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    console.error("Delete booking error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete booking",
      error: error.message,
    });
  } finally {
    await session.endSession();
  }
};

// ======================================================
// EXPORT
// ======================================================

module.exports = {
  createBooking,
  getBookings,
  getBookingById,
  updateBooking,
  cancelBooking,
  deleteBooking,
};
