const mongoose = require("mongoose");

const Fuel = require("../models/Fuel");
const Trip = require("../models/Trip");
const Vehicle = require("../models/Vehicle");
const Driver = require("../models/Driver");

// =====================================================
// HELPERS
// =====================================================

const round2 = (value) => {
  return Number(Number(value || 0).toFixed(2));
};

const buildDateRange = (fromDate, toDate) => {
  let startDate = null;
  let endDate = null;

  if (fromDate) {
    startDate = new Date(fromDate);

    if (Number.isNaN(startDate.getTime())) {
      return {
        valid: false,
        message: "Invalid fromDate",
      };
    }

    startDate.setHours(0, 0, 0, 0);
  }

  if (toDate) {
    endDate = new Date(toDate);

    if (Number.isNaN(endDate.getTime())) {
      return {
        valid: false,
        message: "Invalid toDate",
      };
    }

    endDate.setHours(23, 59, 59, 999);
  }

  if (startDate && endDate && startDate > endDate) {
    return {
      valid: false,
      message: "fromDate cannot be greater than toDate",
    };
  }

  return {
    valid: true,
    startDate,
    endDate,
  };
};

// =====================================================
// GET FUEL REPORT
// =====================================================

const getFuelReport = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid company ID",
      });
    }

    const { vehicleId, driverId, fromDate, toDate, fuelType } = req.query;

    // -------------------------------------------------
    // Validate Vehicle ID
    // -------------------------------------------------

    if (vehicleId && !mongoose.Types.ObjectId.isValid(vehicleId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vehicle ID",
      });
    }

    // -------------------------------------------------
    // Validate Driver ID
    // -------------------------------------------------

    if (driverId && !mongoose.Types.ObjectId.isValid(driverId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid driver ID",
      });
    }

    // -------------------------------------------------
    // Validate Vehicle Belongs To Company
    // -------------------------------------------------

    if (vehicleId) {
      const vehicle = await Vehicle.findOne({
        _id: vehicleId,
        companyId,
      }).select("_id");

      if (!vehicle) {
        return res.status(404).json({
          success: false,
          message: "Vehicle not found in this company",
        });
      }
    }

    // -------------------------------------------------
    // Validate Driver Belongs To Company
    // -------------------------------------------------

    if (driverId) {
      const driver = await Driver.findOne({
        _id: driverId,
        companyId,
      }).select("_id");

      if (!driver) {
        return res.status(404).json({
          success: false,
          message: "Driver not found in this company",
        });
      }
    }

    // -------------------------------------------------
    // Date Validation
    // -------------------------------------------------

    const dateRange = buildDateRange(fromDate, toDate);

    if (!dateRange.valid) {
      return res.status(400).json({
        success: false,
        message: dateRange.message,
      });
    }

    // =================================================
    // BUILD QUERY
    // =================================================

    const query = {
      companyId,
    };

    if (vehicleId) {
      query.vehicleId = vehicleId;
    }

    if (driverId) {
      query.driverId = driverId;
    }

    if (fuelType) {
      query.fuelType = fuelType;
    }

    if (dateRange.startDate || dateRange.endDate) {
      query.fuelDate = {};

      if (dateRange.startDate) {
        query.fuelDate.$gte = dateRange.startDate;
      }

      if (dateRange.endDate) {
        query.fuelDate.$lte = dateRange.endDate;
      }
    }

    // =================================================
    // GET FUEL RECORDS
    // =================================================

    const fuels = await Fuel.find(query)
      .populate("vehicleId", "vehicleNumber vehicleType ownerType")
      .populate("driverId", "name phone licenseNumber")
      .populate("bookingId", "bookingNumber lrNumber")
      .sort({
        fuelDate: -1,
      })
      .lean();

    // =================================================
    // SUMMARY
    // =================================================

    let totalQuantity = 0;
    let totalCost = 0;

    const fuelTypeSummary = {};
    const vehicleSummary = {};
    const driverSummary = {};

    for (const fuel of fuels) {
      const quantity = Number(fuel.quantity || 0);

      const amount = Number(fuel.totalAmount || 0);

      totalQuantity += quantity;
      totalCost += amount;

      // ---------------------------------------------
      // Fuel Type Summary
      // ---------------------------------------------

      const type = fuel.fuelType || "other";

      if (!fuelTypeSummary[type]) {
        fuelTypeSummary[type] = {
          fuelType: type,
          quantity: 0,
          cost: 0,
          records: 0,
        };
      }

      fuelTypeSummary[type].quantity += quantity;

      fuelTypeSummary[type].cost += amount;

      fuelTypeSummary[type].records++;

      // ---------------------------------------------
      // Vehicle Summary
      // ---------------------------------------------

      if (fuel.vehicleId) {
        const id = fuel.vehicleId._id.toString();

        if (!vehicleSummary[id]) {
          vehicleSummary[id] = {
            vehicleId: fuel.vehicleId._id,

            vehicleNumber: fuel.vehicleId.vehicleNumber,

            vehicleType: fuel.vehicleId.vehicleType,

            ownerType: fuel.vehicleId.ownerType,

            quantity: 0,
            cost: 0,
            records: 0,
            averageRate: 0,
          };
        }

        vehicleSummary[id].quantity += quantity;

        vehicleSummary[id].cost += amount;

        vehicleSummary[id].records++;
      }

      // ---------------------------------------------
      // Driver Summary
      // ---------------------------------------------

      if (fuel.driverId) {
        const id = fuel.driverId._id.toString();

        if (!driverSummary[id]) {
          driverSummary[id] = {
            driverId: fuel.driverId._id,

            driverName: fuel.driverId.name,

            phone: fuel.driverId.phone,

            quantity: 0,
            cost: 0,
            records: 0,
            averageRate: 0,
          };
        }

        driverSummary[id].quantity += quantity;

        driverSummary[id].cost += amount;

        driverSummary[id].records++;
      }
    }

    // =================================================
    // ROUND SUMMARY
    // =================================================

    totalQuantity = round2(totalQuantity);

    totalCost = round2(totalCost);

    const averageRate =
      totalQuantity > 0 ? round2(totalCost / totalQuantity) : 0;

    Object.values(fuelTypeSummary).forEach((item) => {
      item.quantity = round2(item.quantity);

      item.cost = round2(item.cost);

      item.averageRate =
        item.quantity > 0 ? round2(item.cost / item.quantity) : 0;
    });

    Object.values(vehicleSummary).forEach((item) => {
      item.quantity = round2(item.quantity);

      item.cost = round2(item.cost);

      item.averageRate =
        item.quantity > 0 ? round2(item.cost / item.quantity) : 0;
    });

    Object.values(driverSummary).forEach((item) => {
      item.quantity = round2(item.quantity);

      item.cost = round2(item.cost);

      item.averageRate =
        item.quantity > 0 ? round2(item.cost / item.quantity) : 0;
    });

    // =================================================
    // RESPONSE
    // =================================================

    return res.status(200).json({
      success: true,

      count: fuels.length,

      summary: {
        totalRecords: fuels.length,

        totalQuantity,

        totalCost,

        averageRatePerLiter: averageRate,
      },

      fuelTypeSummary: Object.values(fuelTypeSummary),

      vehicleSummary: Object.values(vehicleSummary),

      driverSummary: Object.values(driverSummary),

      data: fuels,
    });
  } catch (error) {
    console.error("Get fuel report error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate fuel report",
      error: error.message,
    });
  }
};

// =====================================================
// VEHICLE FUEL EFFICIENCY REPORT
// =====================================================

const getVehicleFuelEfficiency = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid company ID",
      });
    }

    const { vehicleId, fromDate, toDate } = req.query;

    // -------------------------------------------------
    // Validate Vehicle
    // -------------------------------------------------

    if (vehicleId && !mongoose.Types.ObjectId.isValid(vehicleId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vehicle ID",
      });
    }

    // -------------------------------------------------
    // Validate Vehicle Company
    // -------------------------------------------------

    if (vehicleId) {
      const vehicle = await Vehicle.findOne({
        _id: vehicleId,
        companyId,
      }).select("_id");

      if (!vehicle) {
        return res.status(404).json({
          success: false,
          message: "Vehicle not found in this company",
        });
      }
    }

    // -------------------------------------------------
    // Date Validation
    // -------------------------------------------------

    const dateRange = buildDateRange(fromDate, toDate);

    if (!dateRange.valid) {
      return res.status(400).json({
        success: false,
        message: dateRange.message,
      });
    }

    // =================================================
    // VEHICLES
    // =================================================

    const vehicleQuery = {
      companyId,
      status: "active",
    };

    if (vehicleId) {
      vehicleQuery._id = vehicleId;
    }

    const vehicles = await Vehicle.find(vehicleQuery)
      .select("vehicleNumber vehicleType ownerType")
      .lean();

    const report = [];

    // =================================================
    // PROCESS VEHICLES
    // =================================================

    for (const vehicle of vehicles) {
      // ---------------------------------------------
      // Fuel Query
      // ---------------------------------------------

      const fuelQuery = {
        companyId,
        vehicleId: vehicle._id,
      };

      if (dateRange.startDate || dateRange.endDate) {
        fuelQuery.fuelDate = {};

        if (dateRange.startDate) {
          fuelQuery.fuelDate.$gte = dateRange.startDate;
        }

        if (dateRange.endDate) {
          fuelQuery.fuelDate.$lte = dateRange.endDate;
        }
      }

      const fuels = await Fuel.find(fuelQuery).lean();

      const fuelQuantity = fuels.reduce(
        (sum, fuel) => sum + Number(fuel.quantity || 0),
        0,
      );

      const fuelCost = fuels.reduce(
        (sum, fuel) => sum + Number(fuel.totalAmount || 0),
        0,
      );

      // ---------------------------------------------
      // Trip Query
      // ---------------------------------------------

      const tripQuery = {
        companyId,

        vehicleId: vehicle._id,
      };

      if (dateRange.startDate || dateRange.endDate) {
        tripQuery.dispatchDate = {};

        if (dateRange.startDate) {
          tripQuery.dispatchDate.$gte = dateRange.startDate;
        }

        if (dateRange.endDate) {
          tripQuery.dispatchDate.$lte = dateRange.endDate;
        }
      }

      const trips = await Trip.find(tripQuery).lean();

      let totalKm = 0;

      let completedTrips = 0;

      trips.forEach((trip) => {
        if (trip.status === "completed") {
          completedTrips++;
        }

        if (trip.startingOdometer != null && trip.endingOdometer != null) {
          const km =
            Number(trip.endingOdometer) - Number(trip.startingOdometer);

          if (km >= 0) {
            totalKm += km;
          }
        }
      });

      // ---------------------------------------------
      // Efficiency
      // ---------------------------------------------

      const fuelEfficiency =
        fuelQuantity > 0 && totalKm > 0 ? round2(totalKm / fuelQuantity) : null;

      // ---------------------------------------------
      // Cost Per KM
      // ---------------------------------------------

      const fuelCostPerKm = totalKm > 0 ? round2(fuelCost / totalKm) : null;

      report.push({
        vehicleId: vehicle._id,

        vehicleNumber: vehicle.vehicleNumber,

        vehicleType: vehicle.vehicleType,

        ownerType: vehicle.ownerType,

        totalTrips: trips.length,

        completedTrips,

        totalKm: round2(totalKm),

        fuelQuantity: round2(fuelQuantity),

        fuelCost: round2(fuelCost),

        fuelEfficiency,

        fuelCostPerKm,
      });
    }

    // =================================================
    // RESPONSE
    // =================================================

    return res.status(200).json({
      success: true,

      count: report.length,

      data: report,
    });
  } catch (error) {
    console.error("Get vehicle fuel efficiency error:", error);

    return res.status(500).json({
      success: false,

      message: "Failed to generate vehicle fuel efficiency report",

      error: error.message,
    });
  }
};

// =====================================================
// EXPORT
// =====================================================

module.exports = {
  getFuelReport,
  getVehicleFuelEfficiency,
};
