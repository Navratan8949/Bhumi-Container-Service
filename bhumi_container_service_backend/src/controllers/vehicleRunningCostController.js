const mongoose = require("mongoose");

const Vehicle = require("../models/Vehicle");
const Trip = require("../models/Trip");
const Fuel = require("../models/Fuel");
const Maintenance = require("../models/Maintenance");
const Tyre = require("../models/Tyre");
const TripExpense = require("../models/TripExpense");
const CustomerInvoice = require("../models/CustomerInvoice");
const VendorBill = require("../models/VendorBill");

// =====================================================
// HELPERS
// =====================================================

const round2 = (value) => {
  return Number(Number(value || 0).toFixed(2));
};

const validateDateRange = (fromDate, toDate) => {
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

const getTripKm = (trip) => {
  if (trip.startingOdometer == null || trip.endingOdometer == null) {
    return 0;
  }

  const km = Number(trip.endingOdometer) - Number(trip.startingOdometer);

  return km >= 0 ? round2(km) : 0;
};

// =====================================================
// VEHICLE RUNNING COST REPORT
// =====================================================

const getVehicleRunningCost = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    // -------------------------------------------------
    // Validate Company ID
    // -------------------------------------------------

    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid company ID",
      });
    }

    const { vehicleId, fromDate, toDate } = req.query;

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
    // Validate Dates
    // -------------------------------------------------

    const dateValidation = validateDateRange(fromDate, toDate);

    if (!dateValidation.valid) {
      return res.status(400).json({
        success: false,
        message: dateValidation.message,
      });
    }

    // =================================================
    // VEHICLES
    // =================================================

    const vehicleFilter = {
      companyId,
      status: "active",
    };

    if (vehicleId) {
      vehicleFilter._id = vehicleId;
    }

    const vehicles = await Vehicle.find(vehicleFilter).lean();

    const report = [];

    // =================================================
    // LOOP VEHICLES
    // =================================================

    for (const vehicle of vehicles) {
      // =================================================
      // TRIPS
      // =================================================

      const tripFilter = {
        companyId,
        vehicleId: vehicle._id,
      };

      if (dateValidation.startDate || dateValidation.endDate) {
        tripFilter.dispatchDate = {};

        if (dateValidation.startDate) {
          tripFilter.dispatchDate.$gte = dateValidation.startDate;
        }

        if (dateValidation.endDate) {
          tripFilter.dispatchDate.$lte = dateValidation.endDate;
        }
      }

      const trips = await Trip.find(tripFilter).lean();

      // -------------------------------------------------
      // Trip IDs / Booking IDs
      // -------------------------------------------------

      const tripIds = trips.map((trip) => trip._id);

      const bookingIds = trips.map((trip) => trip.bookingId).filter(Boolean);

      // -------------------------------------------------
      // Distance
      // -------------------------------------------------

      let totalKm = 0;

      let completedTrips = 0;

      trips.forEach((trip) => {
        if (trip.status === "completed") {
          completedTrips++;
        }

        totalKm += getTripKm(trip);
      });

      totalKm = round2(totalKm);

      // =================================================
      // CUSTOMER REVENUE
      // =================================================

      let revenue = 0;

      if (bookingIds.length > 0) {
        const invoices = await CustomerInvoice.find({
          companyId,

          bookingId: {
            $in: bookingIds,
          },

          status: {
            $ne: "cancelled",
          },
        }).lean();

        revenue = round2(
          invoices.reduce(
            (sum, invoice) => sum + Number(invoice.grandTotal || 0),
            0,
          ),
        );
      }

      // =================================================
      // FUEL
      // =================================================

      const fuelFilter = {
        companyId,
        vehicleId: vehicle._id,
      };

      if (dateValidation.startDate || dateValidation.endDate) {
        fuelFilter.fuelDate = {};

        if (dateValidation.startDate) {
          fuelFilter.fuelDate.$gte = dateValidation.startDate;
        }

        if (dateValidation.endDate) {
          fuelFilter.fuelDate.$lte = dateValidation.endDate;
        }
      }

      const fuels = await Fuel.find(fuelFilter).lean();

      const fuelQuantity = round2(
        fuels.reduce((sum, fuel) => sum + Number(fuel.quantity || 0), 0),
      );

      const fuelCost = round2(
        fuels.reduce((sum, fuel) => sum + Number(fuel.totalAmount || 0), 0),
      );

      // =================================================
      // MAINTENANCE
      // =================================================

      const maintenanceFilter = {
        companyId,

        vehicleId: vehicle._id,

        status: "completed",
      };

      if (dateValidation.startDate || dateValidation.endDate) {
        maintenanceFilter.maintenanceDate = {};

        if (dateValidation.startDate) {
          maintenanceFilter.maintenanceDate.$gte = dateValidation.startDate;
        }

        if (dateValidation.endDate) {
          maintenanceFilter.maintenanceDate.$lte = dateValidation.endDate;
        }
      }

      const maintenances = await Maintenance.find(maintenanceFilter).lean();

      const maintenanceCost = round2(
        maintenances.reduce(
          (sum, maintenance) => sum + Number(maintenance.totalCost || 0),
          0,
        ),
      );

      // =================================================
      // TYRE PURCHASE COST
      // =================================================
      //
      // Current business logic treats tyre purchase
      // as vehicle running cost.
      //
      // This is kept separate so it can later be
      // changed to tyre depreciation / usage cost.
      //

      const tyreFilter = {
        companyId,
        vehicleId: vehicle._id,
      };

      if (dateValidation.startDate || dateValidation.endDate) {
        tyreFilter.purchaseDate = {};

        if (dateValidation.startDate) {
          tyreFilter.purchaseDate.$gte = dateValidation.startDate;
        }

        if (dateValidation.endDate) {
          tyreFilter.purchaseDate.$lte = dateValidation.endDate;
        }
      }

      const vehicleTyres = await Tyre.find(tyreFilter).lean();

      const tyreCost = round2(
        vehicleTyres.reduce(
          (sum, tyre) => sum + Number(tyre.purchasePrice || 0),
          0,
        ),
      );

      // =================================================
      // TRIP EXPENSES
      // =================================================

      let tripExpenseCost = 0;

      if (tripIds.length > 0) {
        const expenses = await TripExpense.find({
          companyId,

          vehicleId: vehicle._id,

          tripId: {
            $in: tripIds,
          },

          status: "active",

          // Fuel is already counted from Fuel collection
          expenseType: {
            $ne: "fuel",
          },
        }).lean();

        tripExpenseCost = round2(
          expenses.reduce(
            (sum, expense) => sum + Number(expense.amount || 0),
            0,
          ),
        );
      }

      // =================================================
      // VENDOR BILLS
      // =================================================

      let vendorBillCost = 0;

      if (bookingIds.length > 0) {
        const vendorBills = await VendorBill.find({
          companyId,

          bookingId: {
            $in: bookingIds,
          },

          status: {
            $ne: "cancelled",
          },
        }).lean();

        vendorBillCost = round2(
          vendorBills.reduce(
            (sum, bill) => sum + Number(bill.grandTotal || 0),
            0,
          ),
        );
      }

      // =================================================
      // TOTAL RUNNING COST
      // =================================================

      const totalRunningCost = round2(
        fuelCost +
          maintenanceCost +
          tyreCost +
          tripExpenseCost +
          vendorBillCost,
      );

      // =================================================
      // FUEL EFFICIENCY
      // =================================================

      const fuelEfficiency =
        fuelQuantity > 0 && totalKm > 0 ? round2(totalKm / fuelQuantity) : null;

      // =================================================
      // COST PER KM
      // =================================================

      const costPerKm = totalKm > 0 ? round2(totalRunningCost / totalKm) : null;

      // =================================================
      // NET AMOUNT
      // =================================================

      const netAmount = round2(revenue - totalRunningCost);

      // =================================================
      // RESULT
      // =================================================

      const result = netAmount >= 0 ? "surplus" : "loss";

      // =================================================
      // PUSH REPORT
      // =================================================

      report.push({
        vehicleId: vehicle._id,

        vehicleNumber: vehicle.vehicleNumber,

        vehicleType: vehicle.vehicleType,

        ownerType: vehicle.ownerType,

        ownerName: vehicle.ownerName || null,

        // ---------------------------------------------
        // Trips
        // ---------------------------------------------

        totalTrips: trips.length,

        completedTrips,

        // ---------------------------------------------
        // Distance
        // ---------------------------------------------

        totalKm,

        // ---------------------------------------------
        // Revenue
        // ---------------------------------------------

        revenue,

        // ---------------------------------------------
        // Fuel
        // ---------------------------------------------

        fuelQuantity,

        fuelCost,

        fuelEfficiency,

        // ---------------------------------------------
        // Maintenance
        // ---------------------------------------------

        maintenanceCost,

        // ---------------------------------------------
        // Tyre
        // ---------------------------------------------

        tyreCost,

        // ---------------------------------------------
        // Trip Expenses
        // ---------------------------------------------

        tripExpenseCost,

        // ---------------------------------------------
        // Vendor Bills
        // ---------------------------------------------

        vendorBillCost,

        // ---------------------------------------------
        // Total Cost
        // ---------------------------------------------

        totalRunningCost,

        // ---------------------------------------------
        // Net
        // ---------------------------------------------

        netAmount,

        result,

        // ---------------------------------------------
        // Cost Per KM
        // ---------------------------------------------

        costPerKm,
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
    console.error("Vehicle running cost error:", error);

    return res.status(500).json({
      success: false,

      message: "Failed to generate vehicle running cost report",

      error: error.message,
    });
  }
};

// =====================================================
// EXPORT
// =====================================================

module.exports = {
  getVehicleRunningCost,
};
