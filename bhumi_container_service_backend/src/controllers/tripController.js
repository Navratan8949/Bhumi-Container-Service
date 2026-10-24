const mongoose = require("mongoose");

const Trip = require("../models/Trip");
const LRBilty = require("../models/LRBilty");
const Vehicle = require("../models/Vehicle");
const Driver = require("../models/Driver");
const AdvanceMemo = require("../models/AdvanceMemo");
const { getNextSequence } = require("../utils/sequenceService");

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

// =====================================================
// VALIDATE VEHICLE AND DRIVER
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

  return { vehicle, driver };
};

// =====================================================
// GET LR STATUS FROM TRIPS
// =====================================================
const getLRStatusFromTrips = async (companyId, lrBiltyId) => {
  if (!lrBiltyId) return "generated";

  const trips = await Trip.find({
    companyId,
    lrBiltyId,
    status: { $ne: "cancelled" },
  })
    .select("status createdAt")
    .sort({ createdAt: -1 });

  if (!trips.length) return "generated";

  const latestTrip = trips[0];
  if (latestTrip.status === "delivered" || latestTrip.status === "completed") {
    return "delivered";
  }
  if (latestTrip.status === "dispatched" || latestTrip.status === "in_transit") {
    return "in_transit";
  }
  return "generated";
};

// =====================================================
// SYNC LR STATUS
// =====================================================
const syncTripRelatedStatuses = async (trip) => {
  try {
    if (trip.lrBiltyId) {
      const lrStatus = await getLRStatusFromTrips(trip.companyId, trip.lrBiltyId);
      await LRBilty.findOneAndUpdate(
        {
          _id: trip.lrBiltyId,
          companyId: trip.companyId,
        },
        {
          $set: { status: lrStatus },
        },
      );
    }

    // Sync Advance Memo status with Trip status
    if (trip.advanceMemoId || trip.advanceMemoNumber || trip._id) {
      let memoStatus = null;
      if (trip.status === "completed" || trip.status === "settled" || trip.status === "delivered") {
        memoStatus = "delivered";
      } else if (trip.status === "cancelled") {
        memoStatus = "pending";
      } else if (trip.status === "dispatched" || trip.status === "in_transit") {
        memoStatus = "dispatched";
      }

      if (memoStatus) {
        const memoOr = [];
        if (trip.advanceMemoId) memoOr.push({ _id: trip.advanceMemoId });
        if (trip._id) memoOr.push({ tripId: trip._id });
        if (trip.advanceMemoNumber) memoOr.push({ memoNumber: trip.advanceMemoNumber });

        if (memoOr.length > 0) {
          await AdvanceMemo.updateMany(
            {
              $or: memoOr,
              companyId: trip.companyId,
            },
            {
              $set: {
                status: memoStatus,
                tripId: trip._id,
              },
            }
          ).catch((e) => console.error("AdvanceMemo sync error:", e.message));
        }
      }
    }
  } catch (err) {
    console.error("syncTripRelatedStatuses error:", err.message);
  }
};

// =====================================================
// CREATE TRIP
// =====================================================
const createTrip = async (req, res) => {
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
      tripNumber,
      bookingId,
      lrBiltyId,
      containerNumber,
      containerSize,
      containerType,
      customsSealNumber,
      shippingLine,
      vehicleId,
      driverId,
      dispatchDate,
      tripStartDate,
      deliveryDate,
      fromCity,
      toCity,
      fromCityId,
      toCityId,
      startingOdometer,
      endingOdometer,
      remarks,
      partyName,
      ownerName,
      ownerType,
      rate,
      advanceAmount,
      advanceDate,
      balanceAmount,
      podDate,
      podStatus,
    } = req.body;

    if (!tripNumber || !tripNumber.toString().trim()) {
      tripNumber = await getNextSequence(companyId, "trips");
    }

    const normalizedTripNumber = tripNumber.toString().trim().toUpperCase();

    if (!vehicleId || !driverId) {
      return res.status(400).json({
        success: false,
        message: "vehicleId and driverId are required",
      });
    }

    if (!isValidObjectId(vehicleId) || !isValidObjectId(driverId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vehicleId or driverId",
      });
    }

    // Check duplicate trip number
    const existingTripNumber = await Trip.findOne({
      companyId,
      tripNumber: normalizedTripNumber,
    });

    if (existingTripNumber) {
      return res.status(409).json({
        success: false,
        message: "Trip number already exists",
      });
    }

    // Validate Vehicle & Driver
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

    const dispatch = parseDate(dispatchDate) || new Date();

    // Odometer
    let startOdo = null;
    if (startingOdometer !== undefined && startingOdometer !== null && startingOdometer !== "") {
      startOdo = Number(startingOdometer);
      if (Number.isNaN(startOdo) || startOdo < 0) {
        return res.status(400).json({
          success: false,
          message: "Starting odometer must be a non-negative number",
        });
      }
    }

    let endOdo = null;
    if (endingOdometer !== undefined && endingOdometer !== null && endingOdometer !== "") {
      endOdo = Number(endingOdometer);
      if (Number.isNaN(endOdo) || endOdo < 0) {
        return res.status(400).json({
          success: false,
          message: "Ending odometer must be a non-negative number",
        });
      }
    }

    // Update vehicle's assigned driver
    await Vehicle.updateOne(
      { _id: vehicleId, companyId },
      { $set: { driverId } },
    );

    const newTrip = await Trip.create({
      companyId,
      tripNumber: normalizedTripNumber,
      bookingId: bookingId && isValidObjectId(bookingId) ? bookingId : null,
      lrBiltyId: lrBiltyId && isValidObjectId(lrBiltyId) ? lrBiltyId : null,

      containerNumber: (containerNumber || "").toString().trim().toUpperCase(),
      containerSize: containerSize || "40_ft_hc",
      containerType: containerType || "standard",
      customsSealNumber: (customsSealNumber || "").toString().trim().toUpperCase(),
      shippingLine: (shippingLine || "").toString().trim(),

      vehicleId,
      driverId,
      dispatchDate: dispatch,
      transitDays: (() => {
        const rawDays = req.body.transitDays !== undefined && req.body.transitDays !== "" ? Number(req.body.transitDays) : 0;
        const exp = req.body.expectedDeliveryDate ? parseDate(req.body.expectedDeliveryDate) : null;
        if ((!rawDays || rawDays <= 0) && dispatch && exp) {
          const diffDays = Math.round((new Date(exp) - new Date(dispatch)) / (1000 * 60 * 60 * 24));
          return Math.max(0, diffDays);
        }
        return rawDays;
      })(),
      expectedDeliveryDate: (() => {
        const exp = req.body.expectedDeliveryDate ? parseDate(req.body.expectedDeliveryDate) : null;
        const rawDays = req.body.transitDays !== undefined && req.body.transitDays !== "" ? Number(req.body.transitDays) : 0;
        if (!exp && dispatch && rawDays > 0) {
          const d = new Date(dispatch);
          d.setDate(d.getDate() + rawDays);
          return d;
        }
        return exp;
      })(),
      tripStartDate: parseDate(tripStartDate),
      deliveryDate: parseDate(deliveryDate),

      fromCity: fromCity || "",
      toCity: toCity || "",
      fromCityId: fromCityId && isValidObjectId(fromCityId) ? fromCityId : null,
      toCityId: toCityId && isValidObjectId(toCityId) ? toCityId : null,

      startingOdometer: startOdo,
      endingOdometer: endOdo,
      status: "dispatched",
      partyName: (partyName || "").toString().trim(),
      ownerName: (ownerName || "").toString().trim(),
      ownerType: ownerType || "company",
      rate: Number(rate) || 0,
      advanceAmount: Number(advanceAmount) || 0,
      advanceDate: parseDate(advanceDate),
      balanceAmount: balanceAmount !== undefined && balanceAmount !== "" ? Number(balanceAmount) : (Number(rate || 0) - Number(advanceAmount || 0)),
      podDate: (podDate || "").toString().trim(),
      podStatus: (podStatus || "pending").toString().trim(),
      remarks: (remarks || "").toString().trim(),
      truckNumber: (req.body.truckNumber || vehicleDriverResult?.vehicle?.vehicleNumber || "").toString().trim().toUpperCase(),
      driverName: (req.body.driverName || vehicleDriverResult?.driver?.name || "").toString().trim(),
      driverPhone: (req.body.driverPhone || vehicleDriverResult?.driver?.phone || "").toString().trim(),
      brokerName: (req.body.brokerName || "").toString().trim(),
      advanceMemoId: req.body.advanceMemoId && isValidObjectId(req.body.advanceMemoId) ? req.body.advanceMemoId : null,
      advanceMemoNumber: (req.body.advanceMemoNumber || "").toString().trim(),
      createdBy: createdBy && isValidObjectId(createdBy) ? createdBy : null,
    });

    await syncTripRelatedStatuses(newTrip);

    if (newTrip.advanceMemoId) {
      await AdvanceMemo.findOneAndUpdate(
        { _id: newTrip.advanceMemoId, companyId },
        { $set: { status: "dispatched", tripId: newTrip._id } }
      ).catch(() => {});
    }

    const populatedTrip = await Trip.findOne({
      _id: newTrip._id,
      companyId,
    })
      .populate("vehicleId", "vehicleNumber vehicleType ownerType ownerName")
      .populate("driverId", "name phone licenseNumber status")
      .populate("lrBiltyId", "lrNumber lrDate status containerNumber consignorName consigneeName partyName fromCity toCity article");

    return res.status(201).json({
      success: true,
      message: "Trip created and dispatched successfully",
      data: populatedTrip,
    });
  } catch (error) {
    console.error("Create trip error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create trip",
      error: error.message,
    });
  }
};

// =====================================================
// GET ALL TRIPS
// =====================================================
const getTrips = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const { vehicleId, driverId, status, fromDate, toDate } = req.query;

    const filter = {
      companyId,
    };

    if (vehicleId && isValidObjectId(vehicleId)) {
      filter.vehicleId = vehicleId;
    }

    if (driverId && isValidObjectId(driverId)) {
      filter.driverId = driverId;
    }

    if (status) {
      filter.status = status;
    }

    if (fromDate || toDate) {
      filter.dispatchDate = {};
      if (fromDate) {
        const start = parseDate(fromDate);
        if (start) {
          start.setHours(0, 0, 0, 0);
          filter.dispatchDate.$gte = start;
        }
      }
      if (toDate) {
        const end = parseDate(toDate);
        if (end) {
          end.setHours(23, 59, 59, 999);
          filter.dispatchDate.$lte = end;
        }
      }
    }

    const trips = await Trip.find(filter)
      .populate("vehicleId", "vehicleNumber vehicleType ownerType ownerName")
      .populate("driverId", "name phone licenseNumber status")
      .populate("lrBiltyId", "lrNumber lrDate status containerNumber customsSealNumber shippingLine consignorName consigneeName partyName fromCity toCity article quantity unit loadingWeight unloadingWeight")
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
    const companyId = req.user.companyId;

    const trip = await Trip.findOne({
      _id: req.params.id,
      companyId,
    })
      .populate("vehicleId", "vehicleNumber vehicleType ownerType ownerName")
      .populate("driverId", "name phone licenseNumber status")
      .populate("lrBiltyId", "lrNumber lrDate status containerNumber customsSealNumber shippingLine consignorName consigneeName partyName fromCity toCity article quantity unit loadingWeight unloadingWeight")
      .populate("createdBy", "name email");

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found in this company",
      });
    }

    return res.status(200).json({
      success: true,
      data: trip,
    });
  } catch (error) {
    console.error("Get trip by ID error:", error);
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
    const companyId = req.user.companyId;
    const trip = await Trip.findOne({ _id: req.params.id, companyId });

    if (!trip) {
      return res.status(404).json({ success: false, message: "Trip not found" });
    }

    trip.status = "dispatched";
    if (!trip.tripStartDate) trip.tripStartDate = new Date();
    await trip.save();

    await syncTripRelatedStatuses(trip);

    return res.status(200).json({
      success: true,
      message: "Trip dispatched successfully",
      data: trip,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================
// START TRIP
// =====================================================
const startTrip = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const trip = await Trip.findOne({ _id: req.params.id, companyId });

    if (!trip) {
      return res.status(404).json({ success: false, message: "Trip not found" });
    }

    trip.status = "in_transit";
    if (!trip.tripStartDate) trip.tripStartDate = new Date();
    if (req.body.startingOdometer !== undefined) {
      trip.startingOdometer = Number(req.body.startingOdometer) || trip.startingOdometer;
    }
    await trip.save();

    await syncTripRelatedStatuses(trip);

    return res.status(200).json({
      success: true,
      message: "Trip marked in-transit",
      data: trip,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================
// DELIVER TRIP
// =====================================================
const deliverTrip = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const trip = await Trip.findOne({ _id: req.params.id, companyId });

    if (!trip) {
      return res.status(404).json({ success: false, message: "Trip not found" });
    }

    trip.status = "delivered";
    trip.deliveryDate = new Date();
    if (req.body.endingOdometer !== undefined) {
      trip.endingOdometer = Number(req.body.endingOdometer) || trip.endingOdometer;
    }
    await trip.save();

    await syncTripRelatedStatuses(trip);

    return res.status(200).json({
      success: true,
      message: "Trip marked delivered",
      data: trip,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================
// COMPLETE TRIP
// =====================================================
const completeTrip = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const trip = await Trip.findOne({ _id: req.params.id, companyId });

    if (!trip) {
      return res.status(404).json({ success: false, message: "Trip not found" });
    }

    trip.status = "completed";
    if (!trip.deliveryDate) trip.deliveryDate = new Date();
    if (req.body.endingOdometer !== undefined) {
      trip.endingOdometer = Number(req.body.endingOdometer) || trip.endingOdometer;
    }
    await trip.save();

    await syncTripRelatedStatuses(trip);

    return res.status(200).json({
      success: true,
      message: "Trip marked completed",
      data: trip,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================
// CANCEL TRIP
// =====================================================
const cancelTrip = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const trip = await Trip.findOne({ _id: req.params.id, companyId });

    if (!trip) {
      return res.status(404).json({ success: false, message: "Trip not found" });
    }

    trip.status = "cancelled";
    await trip.save();

    await syncTripRelatedStatuses(trip);

    return res.status(200).json({
      success: true,
      message: "Trip cancelled successfully",
      data: trip,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================
// UPDATE TRIP
// =====================================================
const updateTrip = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const trip = await Trip.findOne({ _id: req.params.id, companyId });

    if (!trip) {
      return res.status(404).json({ success: false, message: "Trip not found" });
    }

    const {
      containerNumber,
      containerSize,
      containerType,
      customsSealNumber,
      shippingLine,
      fromCity,
      toCity,
      startingOdometer,
      endingOdometer,
      dispatchDate,
      deliveryDate,
      status,
      remarks,
      partyName,
      ownerName,
      ownerType,
      rate,
      advanceAmount,
      advanceDate,
      balanceAmount,
      podDate,
      podStatus,
    } = req.body;

    if (containerNumber !== undefined) trip.containerNumber = containerNumber.toString().trim().toUpperCase();
    if (containerSize !== undefined) trip.containerSize = containerSize;
    if (containerType !== undefined) trip.containerType = containerType;
    if (customsSealNumber !== undefined) trip.customsSealNumber = customsSealNumber.toString().trim().toUpperCase();
    if (shippingLine !== undefined) trip.shippingLine = shippingLine.toString().trim();

    if (fromCity !== undefined) trip.fromCity = fromCity;
    if (toCity !== undefined) trip.toCity = toCity;

    if (startingOdometer !== undefined) trip.startingOdometer = Number(startingOdometer);
    if (endingOdometer !== undefined) trip.endingOdometer = Number(endingOdometer);

    if (partyName !== undefined) trip.partyName = partyName.toString().trim();
    if (ownerName !== undefined) trip.ownerName = ownerName.toString().trim();
    if (ownerType !== undefined) trip.ownerType = ownerType;
    if (rate !== undefined) trip.rate = Number(rate) || 0;
    if (advanceAmount !== undefined) trip.advanceAmount = Number(advanceAmount) || 0;
    if (advanceDate !== undefined) trip.advanceDate = parseDate(advanceDate);
    if (balanceAmount !== undefined) {
      trip.balanceAmount = Number(balanceAmount);
    } else if (rate !== undefined || advanceAmount !== undefined) {
      trip.balanceAmount = (trip.rate || 0) - (trip.advanceAmount || 0);
    }
    if (podDate !== undefined) trip.podDate = podDate.toString().trim();
    if (podStatus !== undefined) trip.podStatus = podStatus.toString().trim();

    if (dispatchDate) trip.dispatchDate = new Date(dispatchDate);
    if (deliveryDate) trip.deliveryDate = new Date(deliveryDate);
    if (req.body.transitDays !== undefined) trip.transitDays = Number(req.body.transitDays) || 0;
    if (req.body.expectedDeliveryDate !== undefined) {
      trip.expectedDeliveryDate = req.body.expectedDeliveryDate ? new Date(req.body.expectedDeliveryDate) : null;
    }
    // Auto-calculate expectedDeliveryDate or transitDays if one is missing
    if (trip.dispatchDate && trip.transitDays > 0 && !trip.expectedDeliveryDate) {
      const d = new Date(trip.dispatchDate);
      d.setDate(d.getDate() + trip.transitDays);
      trip.expectedDeliveryDate = d;
    } else if (trip.dispatchDate && trip.expectedDeliveryDate && (!trip.transitDays || trip.transitDays <= 0)) {
      const diffDays = Math.round((new Date(trip.expectedDeliveryDate) - new Date(trip.dispatchDate)) / (1000 * 60 * 60 * 24));
      trip.transitDays = Math.max(0, diffDays);
    }
    if (req.body.driverId && isValidObjectId(req.body.driverId)) trip.driverId = req.body.driverId;
    if (req.body.vehicleId && isValidObjectId(req.body.vehicleId)) trip.vehicleId = req.body.vehicleId;
    if (status) trip.status = status;
    if (remarks !== undefined) trip.remarks = remarks;

    await trip.save();
    await syncTripRelatedStatuses(trip);

    return res.status(200).json({
      success: true,
      message: "Trip updated successfully",
      data: trip,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================
// DELETE TRIP
// =====================================================
const deleteTrip = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const trip = await Trip.findOne({ _id: req.params.id, companyId });

    if (!trip) {
      return res.status(404).json({ success: false, message: "Trip not found" });
    }

    await Trip.deleteOne({ _id: trip._id, companyId });
    await syncTripRelatedStatuses(trip);

    return res.status(200).json({
      success: true,
      message: "Trip deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

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
