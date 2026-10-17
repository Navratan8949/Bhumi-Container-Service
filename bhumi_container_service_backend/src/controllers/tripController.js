const mongoose = require("mongoose");

const Trip = require("../models/Trip");
const Booking = require("../models/Booking");
const LRBilty = require("../models/LRBilty");
const SupplyOrder = require("../models/SupplyOrder");
const Vehicle = require("../models/Vehicle");
const Driver = require("../models/Driver");
const City = require("../models/City");
const VehicleDriverAssignment = require("../models/VehicleDriverAssignment");
const { getNextSequence } = require("../utils/sequenceService");

// =====================================================
// COMMON HELPERS
// =====================================================

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

const parseDate = (value) => {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
};

// =====================================================
// GET VALID VEHICLE-DRIVER ASSIGNMENT
// Assignment must cover given date
// =====================================================

const findValidAssignment = async ({
  companyId,
  vehicleId,
  driverId,
  assignmentDate,
  createdBy = null,
}) => {
  let assignment = await VehicleDriverAssignment.findOne({
    companyId,
    vehicleId,
    driverId,
    status: { $in: ["active", "completed"] },
    assignedDate: { $lte: assignmentDate },
    $or: [
      { unassignedDate: null },
      { unassignedDate: { $gte: assignmentDate } },
    ],
  }).sort({
    assignedDate: -1,
  });

  if (!assignment) {
    assignment = await VehicleDriverAssignment.findOne({
      companyId,
      vehicleId,
      driverId,
      status: "active",
    });
  }

  if (!assignment) {
    try {
      assignment = await VehicleDriverAssignment.create({
        companyId,
        vehicleId,
        driverId,
        assignedDate: assignmentDate || new Date(),
        status: "active",
        assignedBy: createdBy || companyId,
        remarks: "Auto-assigned during trip dispatch",
      });
    } catch (err) {
      console.warn("Auto-assignment creation warning:", err.message);
    }
  }

  return assignment;
};

// =====================================================
// GET BOOKING STATUS FROM TRIPS
// =====================================================

const getBookingStatusFromTrips = async (companyId, bookingId) => {
  const trips = await Trip.find({
    companyId,
    bookingId,
    status: { $ne: "cancelled" },
  })
    .select("status createdAt")
    .sort({
      createdAt: -1,
    });

  if (!trips.length) {
    return "booked";
  }

  const latestTrip = trips[0];

  if (latestTrip.status === "delivered" || latestTrip.status === "completed") {
    return "delivered";
  }

  if (
    latestTrip.status === "dispatched" ||
    latestTrip.status === "in_transit"
  ) {
    return "in_transit";
  }

  return "booked";
};

// =====================================================
// GET LR STATUS FROM TRIPS
// =====================================================

const getLRStatusFromTrips = async (companyId, lrBiltyId) => {
  if (!lrBiltyId) {
    return "generated";
  }

  const trips = await Trip.find({
    companyId,
    lrBiltyId,
    status: { $ne: "cancelled" },
  })
    .select("status createdAt")
    .sort({
      createdAt: -1,
    });

  if (!trips.length) {
    return "generated";
  }

  const latestTrip = trips[0];

  if (latestTrip.status === "delivered" || latestTrip.status === "completed") {
    return "delivered";
  }

  if (
    latestTrip.status === "dispatched" ||
    latestTrip.status === "in_transit"
  ) {
    return "in_transit";
  }

  return "generated";
};

// =====================================================
// SYNC TRIP RELATED STATUSES
// Trip → Booking → LR → Supply Order
// =====================================================

const syncTripRelatedStatuses = async (trip) => {
  try {
    // -------------------------------------------------
    // Booking Status
    // -------------------------------------------------

    const bookingStatus = await getBookingStatusFromTrips(
      trip.companyId,
      trip.bookingId,
    );

    await Booking.findOneAndUpdate(
      {
        _id: trip.bookingId,
        companyId: trip.companyId,
      },
      {
        $set: {
          status: bookingStatus,
        },
      },
    );

    // -------------------------------------------------
    // LR Status
    // -------------------------------------------------

    if (trip.lrBiltyId) {
      const lrStatus = await getLRStatusFromTrips(
        trip.companyId,
        trip.lrBiltyId,
      );

      await LRBilty.findOneAndUpdate(
        {
          _id: trip.lrBiltyId,
          companyId: trip.companyId,
        },
        {
          $set: {
            status: lrStatus,
          },
        },
      );
    }

    // -------------------------------------------------
    // Get Booking
    // -------------------------------------------------

    const booking = await Booking.findOne({
      _id: trip.bookingId,
      companyId: trip.companyId,
    }).select("supplyOrderId");

    if (!booking || !booking.supplyOrderId) {
      return;
    }

    // -------------------------------------------------
    // Get Supply Order
    // -------------------------------------------------

    const supplyOrder = await SupplyOrder.findOne({
      _id: booking.supplyOrderId,
      companyId: trip.companyId,
    });

    if (!supplyOrder) {
      return;
    }

    // -------------------------------------------------
    // Get All Non-Cancelled Bookings
    // -------------------------------------------------

    const bookings = await Booking.find({
      companyId: trip.companyId,
      supplyOrderId: supplyOrder._id,
      status: {
        $ne: "cancelled",
      },
    }).select("quantity status");

    let totalBookedQuantity = 0;
    let totalDeliveredQuantity = 0;

    for (const item of bookings) {
      const quantity = Number(item.quantity || 0);

      totalBookedQuantity += quantity;

      if (item.status === "delivered") {
        totalDeliveredQuantity += quantity;
      }
    }

    // -------------------------------------------------
    // Supply Order Quantity
    // -------------------------------------------------

    const orderQuantity = Number(supplyOrder.orderQuantity || 0);

    const pendingQuantity = Math.max(orderQuantity - totalBookedQuantity, 0);

    // -------------------------------------------------
    // Supply Order Status
    // -------------------------------------------------

    let supplyOrderStatus = "pending";

    if (totalBookedQuantity >= orderQuantity && orderQuantity > 0) {
      supplyOrderStatus = "completed";
    } else if (totalBookedQuantity > 0) {
      supplyOrderStatus = "partial";
    }

    // -------------------------------------------------
    // Update Supply Order
    // -------------------------------------------------

    await SupplyOrder.findOneAndUpdate(
      {
        _id: supplyOrder._id,
        companyId: trip.companyId,
      },
      {
        $set: {
          bookedQuantity: totalBookedQuantity,
          pendingQuantity,
          status: supplyOrderStatus,
        },
      },
    );

    console.log(
      `Trip sync completed: ${trip.tripNumber} | ` +
        `SO Booked: ${totalBookedQuantity} | ` +
        `SO Delivered: ${totalDeliveredQuantity} | ` +
        `SO Pending: ${pendingQuantity} | ` +
        `SO Status: ${supplyOrderStatus}`,
    );
  } catch (error) {
    console.error("Trip related status sync error:", error.message);

    throw error;
  }
};

// =====================================================
// VALIDATE VEHICLE + DRIVER
// =====================================================

const validateVehicleAndDriver = async ({ companyId, vehicleId, driverId }) => {
  const vehicle = await Vehicle.findOne({
    _id: vehicleId,
    companyId,
  });

  if (!vehicle) {
    return {
      error: {
        status: 404,
        message: "Vehicle not found in this company",
      },
    };
  }

  if (vehicle.status !== "active") {
    return {
      error: {
        status: 400,
        message: "Inactive vehicle cannot be used for trip",
      },
    };
  }

  const driver = await Driver.findOne({
    _id: driverId,
    companyId,
  });

  if (!driver) {
    return {
      error: {
        status: 404,
        message: "Driver not found in this company",
      },
    };
  }

  if (driver.status !== "active") {
    return {
      error: {
        status: 400,
        message: "Inactive driver cannot be used for trip",
      },
    };
  }

  return {
    vehicle,
    driver,
  };
};

// =====================================================
// CHECK ACTIVE TRIP FOR VEHICLE / DRIVER
// =====================================================

const checkVehicleDriverActiveTrip = async ({
  companyId,
  vehicleId,
  driverId,
  excludeTripId = null,
}) => {
  const filter = {
    companyId,
    status: {
      $in: ["planned", "dispatched", "in_transit"],
    },
    $or: [{ vehicleId }, { driverId }],
  };

  if (excludeTripId) {
    filter._id = {
      $ne: excludeTripId,
    };
  }

  return Trip.findOne(filter);
};

// =====================================================
// VALIDATE CITY
// =====================================================

const validateCity = async (companyId, cityId, fieldName) => {
  if (!isValidObjectId(cityId)) {
    return {
      error: {
        status: 400,
        message: `${fieldName} is invalid`,
      },
    };
  }

  const city = await City.findOne({
    _id: cityId,
    companyId,
  });

  if (!city) {
    return {
      error: {
        status: 404,
        message: `${fieldName} not found in this company`,
      },
    };
  }

  if (city.status !== "active") {
    return {
      error: {
        status: 400,
        message: `${fieldName} is inactive`,
      },
    };
  }

  return {
    city,
  };
};

// =====================================================
// CREATE TRIP
// =====================================================

const createTrip = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const createdBy = req.user.userId;

    let {
      tripNumber,
      bookingId,
      lrBiltyId,
      vehicleId,
      driverId,
      dispatchDate,
      fromCityId,
      toCityId,
      startingOdometer,
      remarks,
    } = req.body;

    if (!tripNumber || !tripNumber.toString().trim()) {
      tripNumber = await getNextSequence(companyId, "trips");
    }

    // -------------------------------------------------
    // Required Fields
    // -------------------------------------------------

    if (
      !bookingId ||
      !vehicleId ||
      !driverId ||
      !dispatchDate ||
      !fromCityId ||
      !toCityId
    ) {
      return res.status(400).json({
        success: false,
        message:
          "bookingId, vehicleId, driverId, dispatchDate, fromCityId and toCityId are required",
      });
    }

    // -------------------------------------------------
    // ObjectId Validation
    // -------------------------------------------------

    const objectIds = [
      ["bookingId", bookingId],
      ["vehicleId", vehicleId],
      ["driverId", driverId],
      ["fromCityId", fromCityId],
      ["toCityId", toCityId],
    ];

    if (lrBiltyId) {
      objectIds.push(["lrBiltyId", lrBiltyId]);
    }

    for (const [field, value] of objectIds) {
      if (!isValidObjectId(value)) {
        return res.status(400).json({
          success: false,
          message: `${field} is invalid`,
        });
      }
    }

    // -------------------------------------------------
    // Normalize Trip Number
    // -------------------------------------------------

    const normalizedTripNumber = tripNumber.toString().trim().toUpperCase();

    if (!normalizedTripNumber) {
      return res.status(400).json({
        success: false,
        message: "Trip number is required",
      });
    }

    // -------------------------------------------------
    // Validate Booking
    // -------------------------------------------------

    const booking = await Booking.findOne({
      _id: bookingId,
      companyId,
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found in this company",
      });
    }

    if (booking.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Trip cannot be created for cancelled booking",
      });
    }

    // -------------------------------------------------
    // Check Existing Active Trip For Booking
    // -------------------------------------------------

    const existingBookingTrip = await Trip.findOne({
      companyId,
      bookingId,
      status: {
        $in: ["planned", "dispatched", "in_transit"],
      },
    });

    if (existingBookingTrip) {
      return res.status(409).json({
        success: false,
        message: "An active trip already exists for this booking",
        tripId: existingBookingTrip._id,
      });
    }

    // -------------------------------------------------
    // Validate Vehicle + Driver
    // -------------------------------------------------

    const vehicleDriverResult = await validateVehicleAndDriver({
      companyId,
      vehicleId,
      driverId,
    });

    if (vehicleDriverResult.error) {
      return res.status(vehicleDriverResult.error.status).json({
        success: false,
        message: vehicleDriverResult.error.message,
      });
    }

    // -------------------------------------------------
    // Validate Cities
    // -------------------------------------------------

    const fromCityResult = await validateCity(
      companyId,
      fromCityId,
      "From city",
    );

    if (fromCityResult.error) {
      return res.status(fromCityResult.error.status).json({
        success: false,
        message: fromCityResult.error.message,
      });
    }

    const toCityResult = await validateCity(companyId, toCityId, "To city");

    if (toCityResult.error) {
      return res.status(toCityResult.error.status).json({
        success: false,
        message: toCityResult.error.message,
      });
    }

    // -------------------------------------------------
    // Validate Dispatch Date
    // -------------------------------------------------

    const dispatch = parseDate(dispatchDate);

    if (!dispatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid dispatch date",
      });
    }

    // -------------------------------------------------
    // Validate Starting Odometer
    // -------------------------------------------------

    let startOdometer = null;

    if (
      startingOdometer !== undefined &&
      startingOdometer !== null &&
      startingOdometer !== ""
    ) {
      startOdometer = Number(startingOdometer);

      if (!Number.isFinite(startOdometer) || startOdometer < 0) {
        return res.status(400).json({
          success: false,
          message: "Starting odometer is invalid",
        });
      }
    }

    // -------------------------------------------------
    // Validate Vehicle-Driver Assignment
    // -------------------------------------------------

    const assignment = await findValidAssignment({
      companyId,
      vehicleId,
      driverId,
      assignmentDate: dispatch,
      createdBy,
    });

    if (!assignment) {
      return res.status(400).json({
        success: false,
        message:
          "Vehicle and driver do not have a valid assignment for the dispatch date",
      });
    }

    // -------------------------------------------------
    // Sync Vehicle Driver Field
    // -------------------------------------------------

    const vehicle = vehicleDriverResult.vehicle;

    if (
      !vehicle.driverId ||
      vehicle.driverId.toString() !== driverId.toString()
    ) {
      await Vehicle.updateOne(
        { _id: vehicleId, companyId },
        { $set: { driverId } },
      );
    }

    // -------------------------------------------------
    // Check Vehicle / Driver Existing Active Trip
    // -------------------------------------------------

    const existingVehicleDriverTrip = await checkVehicleDriverActiveTrip({
      companyId,
      vehicleId,
      driverId,
    });

    if (existingVehicleDriverTrip) {
      return res.status(409).json({
        success: false,
        message: "Selected vehicle or driver already has an active trip",
        tripId: existingVehicleDriverTrip._id,
      });
    }

    // -------------------------------------------------
    // Validate LR/Bilty
    // -------------------------------------------------

    let lrBilty = null;

    if (lrBiltyId) {
      lrBilty = await LRBilty.findOne({
        _id: lrBiltyId,
        companyId,
      });

      if (!lrBilty) {
        return res.status(404).json({
          success: false,
          message: "LR/Bilty not found in this company",
        });
      }

      if (lrBilty.bookingId.toString() !== bookingId.toString()) {
        return res.status(400).json({
          success: false,
          message: "LR/Bilty does not belong to this booking",
        });
      }

      if (lrBilty.status === "cancelled") {
        return res.status(400).json({
          success: false,
          message: "Cancelled LR/Bilty cannot be used for trip",
        });
      }

      const existingLRTrip = await Trip.findOne({
        companyId,
        lrBiltyId,
        status: {
          $in: ["planned", "dispatched", "in_transit"],
        },
      });

      if (existingLRTrip) {
        return res.status(409).json({
          success: false,
          message: "An active trip already exists for this LR/Bilty",
          tripId: existingLRTrip._id,
        });
      }
    }

    // -------------------------------------------------
    // Duplicate Trip Number
    // -------------------------------------------------

    const duplicateTrip = await Trip.findOne({
      companyId,
      tripNumber: normalizedTripNumber,
    });

    if (duplicateTrip) {
      return res.status(409).json({
        success: false,
        message: "Trip number already exists",
      });
    }

    // -------------------------------------------------
    // Create Trip
    // -------------------------------------------------

    const trip = await Trip.create({
      companyId,

      tripNumber: normalizedTripNumber,

      bookingId,

      lrBiltyId: lrBiltyId || null,

      // Container & Customs specifications
      containerNumber: (req.body.containerNumber || lrBilty?.containerNumber || "").toString().trim().toUpperCase(),
      containerSize: req.body.containerSize || lrBilty?.containerSize || "40_ft_hc",
      containerType: req.body.containerType || lrBilty?.containerType || "standard",
      customsSealNumber: (req.body.customsSealNumber || lrBilty?.customsSealNumber || "").toString().trim().toUpperCase(),
      shippingLine: req.body.shippingLine || lrBilty?.shippingLine || "",

      vehicleId,

      driverId,

      dispatchDate: dispatch,

      fromCityId,

      toCityId,

      startingOdometer: startOdometer,

      status: "planned",

      remarks: remarks ? remarks.toString().trim() : "",

      createdBy,
    });

    // -------------------------------------------------
    // Populate Response
    // -------------------------------------------------

    const populatedTrip = await Trip.findOne({
      _id: trip._id,
      companyId,
    })
      .populate(
        "bookingId",
        "bookingNumber lrNumber quantity unit productId status",
      )
      .populate("lrBiltyId", "lrNumber lrDate status")
      .populate("vehicleId", "vehicleNumber vehicleType ownerType ownerName")
      .populate("driverId", "name phone license status")
      .populate("fromCityId", "name state status")
      .populate("toCityId", "name state status")
      .populate("createdBy", "name email");

    return res.status(201).json({
      success: true,
      message: "Trip created successfully",
      data: populatedTrip,
    });
  } catch (error) {
    console.error("Create trip error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Trip number already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create trip",
      error: error.message,
    });
  }
};

// =====================================================
// GET TRIPS
// =====================================================

const getTrips = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const { bookingId, vehicleId, driverId, status, fromDate, toDate } =
      req.query;

    const filter = {
      companyId,
    };

    // -------------------------------------------------
    // Validate Query ObjectIds
    // -------------------------------------------------

    if (bookingId) {
      if (!isValidObjectId(bookingId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid bookingId",
        });
      }

      filter.bookingId = bookingId;
    }

    if (vehicleId) {
      if (!isValidObjectId(vehicleId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid vehicleId",
        });
      }

      filter.vehicleId = vehicleId;
    }

    if (driverId) {
      if (!isValidObjectId(driverId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid driverId",
        });
      }

      filter.driverId = driverId;
    }

    if (req.user.role === "driver" && !filter.driverId) {
      const orClauses = [
        ...(req.user.phone ? [{ phone: req.user.phone }] : []),
        ...(req.user.name ? [{ name: new RegExp(`^${req.user.name}$`, "i") }] : []),
      ];

      if (orClauses.length > 0) {
        const driverDoc = await Driver.findOne({
          companyId,
          $or: orClauses,
        });
        if (driverDoc) {
          filter.driverId = driverDoc._id;
        } else {
          filter.driverId = new mongoose.Types.ObjectId();
        }
      } else {
        filter.driverId = new mongoose.Types.ObjectId();
      }
    }

    // -------------------------------------------------
    // Validate Status
    // -------------------------------------------------

    const allowedStatuses = [
      "planned",
      "dispatched",
      "in_transit",
      "delivered",
      "completed",
      "cancelled",
    ];

    if (status) {
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid trip status",
        });
      }

      filter.status = status;
    }

    // -------------------------------------------------
    // Date Filters
    // -------------------------------------------------

    if (fromDate || toDate) {
      filter.dispatchDate = {};

      if (fromDate) {
        const startDate = parseDate(fromDate);

        if (!startDate) {
          return res.status(400).json({
            success: false,
            message: "Invalid fromDate",
          });
        }

        startDate.setHours(0, 0, 0, 0);

        filter.dispatchDate.$gte = startDate;
      }

      if (toDate) {
        const endDate = parseDate(toDate);

        if (!endDate) {
          return res.status(400).json({
            success: false,
            message: "Invalid toDate",
          });
        }

        endDate.setHours(23, 59, 59, 999);

        if (filter.dispatchDate.$gte && endDate < filter.dispatchDate.$gte) {
          return res.status(400).json({
            success: false,
            message: "toDate cannot be earlier than fromDate",
          });
        }

        filter.dispatchDate.$lte = endDate;
      }
    }

    // -------------------------------------------------
    // Fetch Trips
    // -------------------------------------------------

    const trips = await Trip.find(filter)
      .populate({
        path: "bookingId",
        select:
          "bookingNumber lrNumber quantity unit productId status billingPartyId billingRate transporterId hireRate supplyOrderId article invoiceNumber invoiceDate loadingWeight unloadingWeight",
        populate: [
          {
            path: "billingPartyId",
            select: "name phone email gstNumber address",
          },
          {
            path: "transporterId",
            select: "vendorName phone gstNumber",
          },
          {
            path: "productId",
            select: "name code unit",
          },
          {
            path: "supplyOrderId",
            select: "soNumber consignorId consigneeId partyId",
            populate: [
              { path: "consignorId", select: "name phone city state address gstNumber" },
              { path: "consigneeId", select: "name phone city state address gstNumber" },
            ],
          },
        ],
      })
      .populate({
        path: "lrBiltyId",
        select:
          "lrNumber lrDate status consignorId consigneeId productId partyId vehicleId driverId fromCityId toCityId quantity unit loadingWeight unloadingWeight article invoiceNumber invoiceDate remarks",
        populate: [
          { path: "consignorId", select: "name phone city state address gstNumber" },
          { path: "consigneeId", select: "name phone city state address gstNumber" },
          { path: "productId", select: "name code unit" },
          { path: "partyId", select: "name phone" },
          { path: "vehicleId", select: "vehicleNumber vehicleType ownerType" },
          { path: "driverId", select: "name phone license" },
          { path: "fromCityId", select: "name state" },
          { path: "toCityId", select: "name state" },
        ],
      })
      .populate("vehicleId", "vehicleNumber vehicleType ownerType ownerName")
      .populate("driverId", "name phone license status")
      .populate("fromCityId", "name state status")
      .populate("toCityId", "name state status")
      .populate("createdBy", "name email")
      .sort({
        dispatchDate: -1,
        createdAt: -1,
      });

    return res.status(200).json({
      success: true,
      count: trips.length,
      data: trips,
    });
  } catch (error) {
    console.error("Get trips error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch trips",
      error: error.message,
    });
  }
};

// =====================================================
// GET TRIP BY ID
// =====================================================

const getTripById = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid trip ID",
      });
    }

    const trip = await Trip.findOne({
      _id: id,
      companyId,
    })
      .populate({
        path: "bookingId",
        select:
          "bookingNumber lrNumber quantity unit productId status billingPartyId billingRate transporterId hireRate supplyOrderId article invoiceNumber invoiceDate loadingWeight unloadingWeight",
        populate: [
          {
            path: "billingPartyId",
            select: "name phone email gstNumber address",
          },
          {
            path: "transporterId",
            select: "vendorName phone gstNumber",
          },
          {
            path: "productId",
            select: "name code unit",
          },
          {
            path: "supplyOrderId",
            select: "soNumber consignorId consigneeId partyId",
            populate: [
              { path: "consignorId", select: "name phone city state address gstNumber" },
              { path: "consigneeId", select: "name phone city state address gstNumber" },
            ],
          },
        ],
      })
      .populate({
        path: "lrBiltyId",
        select:
          "lrNumber lrDate status consignorId consigneeId productId partyId vehicleId driverId fromCityId toCityId quantity unit loadingWeight unloadingWeight article invoiceNumber invoiceDate remarks",
        populate: [
          { path: "consignorId", select: "name phone city state address gstNumber" },
          { path: "consigneeId", select: "name phone city state address gstNumber" },
          { path: "productId", select: "name code unit" },
          { path: "partyId", select: "name phone" },
          { path: "vehicleId", select: "vehicleNumber vehicleType ownerType" },
          { path: "driverId", select: "name phone license" },
          { path: "fromCityId", select: "name state" },
          { path: "toCityId", select: "name state" },
        ],
      })
      .populate("vehicleId", "vehicleNumber vehicleType ownerType ownerName")
      .populate("driverId", "name phone license status")
      .populate("fromCityId", "name state status")
      .populate("toCityId", "name state status")
      .populate("createdBy", "name email");

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: trip,
    });
  } catch (error) {
    console.error("Get trip error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch trip",
      error: error.message,
    });
  }
};

// =====================================================
// DISPATCH TRIP
// =====================================================

const dispatchTrip = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    const { tripStartDate, startingOdometer, remarks } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid trip ID",
      });
    }

    const trip = await Trip.findOne({
      _id: id,
      companyId,
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    if (trip.status !== "planned") {
      return res.status(400).json({
        success: false,
        message: "Only planned trip can be dispatched",
      });
    }

    // -------------------------------------------------
    // Validate Vehicle + Driver Again
    // -------------------------------------------------

    const vehicleDriverResult = await validateVehicleAndDriver({
      companyId,
      vehicleId: trip.vehicleId,
      driverId: trip.driverId,
    });

    if (vehicleDriverResult.error) {
      return res.status(vehicleDriverResult.error.status).json({
        success: false,
        message: vehicleDriverResult.error.message,
      });
    }

    // -------------------------------------------------
    // Trip Start Date
    // -------------------------------------------------

    const startDate = tripStartDate ? parseDate(tripStartDate) : new Date();

    if (!startDate) {
      return res.status(400).json({
        success: false,
        message: "Invalid trip start date",
      });
    }

    if (startDate < trip.dispatchDate) {
      return res.status(400).json({
        success: false,
        message: "Trip start date cannot be earlier than dispatch date",
      });
    }

    // -------------------------------------------------
    // Validate Assignment On Start Date
    // -------------------------------------------------

    const assignment = await findValidAssignment({
      companyId,
      vehicleId: trip.vehicleId,
      driverId: trip.driverId,
      assignmentDate: startDate,
    });

    if (!assignment) {
      return res.status(400).json({
        success: false,
        message:
          "Vehicle and driver do not have a valid assignment for the trip start date",
      });
    }

    // -------------------------------------------------
    // Starting Odometer
    // -------------------------------------------------

    let startOdometer = trip.startingOdometer;

    if (
      startingOdometer !== undefined &&
      startingOdometer !== null &&
      startingOdometer !== ""
    ) {
      startOdometer = Number(startingOdometer);

      if (!Number.isFinite(startOdometer) || startOdometer < 0) {
        return res.status(400).json({
          success: false,
          message: "Starting odometer is invalid",
        });
      }
    }

    // -------------------------------------------------
    // Save
    // -------------------------------------------------

    trip.tripStartDate = startDate;
    trip.startingOdometer = startOdometer;
    trip.status = "dispatched";

    if (remarks !== undefined) {
      trip.remarks = remarks ? remarks.toString().trim() : "";
    }

    await trip.save();

    // -------------------------------------------------
    // Sync
    // -------------------------------------------------

    await syncTripRelatedStatuses(trip);

    const updatedTrip = await Trip.findOne({
      _id: trip._id,
      companyId,
    })
      .populate("bookingId", "bookingNumber lrNumber quantity unit status")
      .populate("lrBiltyId", "lrNumber lrDate status")
      .populate("vehicleId", "vehicleNumber vehicleType")
      .populate("driverId", "name phone license");

    return res.status(200).json({
      success: true,
      message: "Trip dispatched successfully",
      data: updatedTrip,
    });
  } catch (error) {
    console.error("Dispatch trip error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to dispatch trip",
      error: error.message,
    });
  }
};

// =====================================================
// START TRIP / IN TRANSIT
// =====================================================

const startTrip = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid trip ID",
      });
    }

    const trip = await Trip.findOne({
      _id: id,
      companyId,
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    if (trip.status !== "dispatched") {
      return res.status(400).json({
        success: false,
        message: "Only dispatched trip can be started",
      });
    }

    if (!trip.tripStartDate) {
      trip.tripStartDate = req.body?.tripStartDate
        ? new Date(req.body.tripStartDate)
        : new Date();
    }

    // -------------------------------------------------
    // Validate Vehicle + Driver
    // -------------------------------------------------

    const vehicleDriverResult = await validateVehicleAndDriver({
      companyId,
      vehicleId: trip.vehicleId,
      driverId: trip.driverId,
    });

    if (vehicleDriverResult.error) {
      return res.status(vehicleDriverResult.error.status).json({
        success: false,
        message: vehicleDriverResult.error.message,
      });
    }

    // -------------------------------------------------
    // Validate Assignment
    // -------------------------------------------------

    const assignment = await findValidAssignment({
      companyId,
      vehicleId: trip.vehicleId,
      driverId: trip.driverId,
      assignmentDate: trip.tripStartDate,
    });

    if (!assignment) {
      return res.status(400).json({
        success: false,
        message: "Vehicle and driver assignment is not valid for this trip",
      });
    }

    trip.status = "in_transit";

    await trip.save();

    // -------------------------------------------------
    // Sync
    // -------------------------------------------------

    await syncTripRelatedStatuses(trip);

    const updatedTrip = await Trip.findOne({
      _id: trip._id,
      companyId,
    })
      .populate("bookingId", "bookingNumber lrNumber quantity unit status")
      .populate("lrBiltyId", "lrNumber lrDate status")
      .populate("vehicleId", "vehicleNumber vehicleType")
      .populate("driverId", "name phone license");

    return res.status(200).json({
      success: true,
      message: "Trip started successfully",
      data: updatedTrip,
    });
  } catch (error) {
    console.error("Start trip error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to start trip",
      error: error.message,
    });
  }
};

// =====================================================
// DELIVER TRIP
// =====================================================

const deliverTrip = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    const { deliveryDate, endingOdometer, remarks } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid trip ID",
      });
    }

    const trip = await Trip.findOne({
      _id: id,
      companyId,
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    if (trip.status !== "in_transit") {
      return res.status(400).json({
        success: false,
        message: "Only in-transit trip can be delivered",
      });
    }

    // -------------------------------------------------
    // Delivery Date
    // -------------------------------------------------

    const delivery = deliveryDate ? parseDate(deliveryDate) : new Date();

    if (!delivery) {
      return res.status(400).json({
        success: false,
        message: "Invalid delivery date",
      });
    }

    if (trip.tripStartDate && delivery < trip.tripStartDate) {
      return res.status(400).json({
        success: false,
        message: "Delivery date cannot be earlier than trip start date",
      });
    }

    // -------------------------------------------------
    // Ending Odometer
    // -------------------------------------------------

    let endOdometer =
      endingOdometer !== undefined &&
      endingOdometer !== null &&
      endingOdometer !== ""
        ? Number(endingOdometer)
        : trip.endingOdometer;

    if (endOdometer !== null && endOdometer !== undefined) {
      if (!Number.isFinite(endOdometer) || endOdometer < 0) {
        return res.status(400).json({
          success: false,
          message: "Ending odometer is invalid",
        });
      }

      if (
        trip.startingOdometer !== null &&
        trip.startingOdometer !== undefined &&
        endOdometer < trip.startingOdometer
      ) {
        return res.status(400).json({
          success: false,
          message: "Ending odometer cannot be less than starting odometer",
        });
      }
    }

    // -------------------------------------------------
    // Validate Vehicle + Driver
    // -------------------------------------------------

    const vehicleDriverResult = await validateVehicleAndDriver({
      companyId,
      vehicleId: trip.vehicleId,
      driverId: trip.driverId,
    });

    if (vehicleDriverResult.error) {
      return res.status(vehicleDriverResult.error.status).json({
        success: false,
        message: vehicleDriverResult.error.message,
      });
    }

    trip.deliveryDate = delivery;
    trip.endingOdometer = endOdometer;
    trip.status = "delivered";

    if (remarks !== undefined) {
      trip.remarks = remarks ? remarks.toString().trim() : "";
    }

    await trip.save();

    // -------------------------------------------------
    // Sync
    // -------------------------------------------------

    await syncTripRelatedStatuses(trip);

    const updatedTrip = await Trip.findOne({
      _id: trip._id,
      companyId,
    })
      .populate("bookingId", "bookingNumber lrNumber quantity unit status")
      .populate("lrBiltyId", "lrNumber lrDate status")
      .populate("vehicleId", "vehicleNumber vehicleType")
      .populate("driverId", "name phone license");

    return res.status(200).json({
      success: true,
      message: "Trip marked as delivered",
      data: updatedTrip,
    });
  } catch (error) {
    console.error("Deliver trip error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to deliver trip",
      error: error.message,
    });
  }
};

// =====================================================
// COMPLETE TRIP
// =====================================================

const completeTrip = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid trip ID",
      });
    }

    const trip = await Trip.findOne({
      _id: id,
      companyId,
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    if (trip.status !== "delivered") {
      return res.status(400).json({
        success: false,
        message: "Only delivered trip can be completed",
      });
    }

    if (!trip.deliveryDate) {
      return res.status(400).json({
        success: false,
        message: "Delivery date is required before completing trip",
      });
    }

    if (trip.tripStartDate && trip.deliveryDate < trip.tripStartDate) {
      return res.status(400).json({
        success: false,
        message: "Delivery date cannot be earlier than trip start date",
      });
    }

    trip.status = "completed";

    await trip.save();

    // -------------------------------------------------
    // Sync
    // -------------------------------------------------

    await syncTripRelatedStatuses(trip);

    const updatedTrip = await Trip.findOne({
      _id: trip._id,
      companyId,
    })
      .populate("bookingId", "bookingNumber lrNumber quantity unit status")
      .populate("lrBiltyId", "lrNumber lrDate status")
      .populate("vehicleId", "vehicleNumber vehicleType")
      .populate("driverId", "name phone license");

    return res.status(200).json({
      success: true,
      message: "Trip completed successfully",
      data: updatedTrip,
    });
  } catch (error) {
    console.error("Complete trip error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to complete trip",
      error: error.message,
    });
  }
};

// =====================================================
// UPDATE TRIP
// =====================================================

const updateTrip = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid trip ID" });
    }

    const trip = await Trip.findOne({ _id: id, companyId });
    if (!trip) {
      return res.status(404).json({ success: false, message: "Trip not found" });
    }

    const updatableFields = [
      "tripNumber", "bookingId", "lrBiltyId", "vehicleId", "driverId",
      "dispatchDate", "fromCityId", "toCityId", "startingOdometer", "endingOdometer", "deliveryDate", "remarks",
      "containerNumber", "containerSize", "containerType", "customsSealNumber", "shippingLine"
    ];

    updatableFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        trip[field] = req.body[field];
      }
    });

    const allowedStatuses = ["planned", "dispatched", "in_transit", "delivered", "completed", "cancelled"];
    let statusChanged = false;
    if (req.body.status && allowedStatuses.includes(req.body.status)) {
      if (trip.status !== req.body.status) {
        trip.status = req.body.status;
        statusChanged = true;
      }
    }

    await trip.save();

    if (statusChanged || req.body.bookingId || req.body.lrBiltyId) {
      await syncTripRelatedStatuses(trip);
    }

    return res.status(200).json({ success: true, message: "Trip updated successfully", data: trip });
  } catch (error) {
    console.error("Update trip error:", error);
    return res.status(500).json({ success: false, message: "Failed to update trip", error: error.message });
  }
};

// =====================================================
// DELETE TRIP
// =====================================================

const deleteTrip = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid trip ID" });
    }

    const trip = await Trip.findOneAndDelete({ _id: id, companyId });
    if (!trip) {
      return res.status(404).json({ success: false, message: "Trip not found" });
    }

    return res.status(200).json({ success: true, message: "Trip deleted successfully" });
  } catch (error) {
    console.error("Delete trip error:", error);
    return res.status(500).json({ success: false, message: "Failed to delete trip", error: error.message });
  }
};

// =====================================================
// CANCEL TRIP
// =====================================================

const cancelTrip = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid trip ID",
      });
    }

    const trip = await Trip.findOne({
      _id: id,
      companyId,
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    if (trip.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Trip is already cancelled",
      });
    }

    if (["delivered", "completed"].includes(trip.status)) {
      return res.status(400).json({
        success: false,
        message: "Delivered or completed trip cannot be cancelled",
      });
    }

    // -------------------------------------------------
    // Cancel Trip
    // -------------------------------------------------

    trip.status = "cancelled";

    await trip.save();

    // -------------------------------------------------
    // IMPORTANT:
    // Recalculate Booking / LR / Supply Order
    // -------------------------------------------------

    await syncTripRelatedStatuses(trip);

    // -------------------------------------------------
    // Return Updated Trip
    // -------------------------------------------------

    const updatedTrip = await Trip.findOne({
      _id: trip._id,
      companyId,
    })
      .populate("bookingId", "bookingNumber lrNumber quantity unit status")
      .populate("lrBiltyId", "lrNumber lrDate status")
      .populate("vehicleId", "vehicleNumber vehicleType")
      .populate("driverId", "name phone license");

    return res.status(200).json({
      success: true,
      message: "Trip cancelled and related statuses recalculated successfully",
      data: updatedTrip,
    });
  } catch (error) {
    console.error("Cancel trip error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to cancel trip",
      error: error.message,
    });
  }
};

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  createTrip,
  getTrips,
  getTripById,
  dispatchTrip,
  startTrip,
  deliverTrip,
  completeTrip,
  cancelTrip,
  updateTrip,
  deleteTrip,
};
