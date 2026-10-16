const mongoose = require("mongoose");

const Trip = require("../models/Trip");
const Fuel = require("../models/Fuel");
const TripExpense = require("../models/TripExpense");
const CustomerInvoice = require("../models/CustomerInvoice");
const VendorBill = require("../models/VendorBill");

// =====================================================
// HELPERS
// =====================================================

const round2 = (value) => {
  return Number(Number(value || 0).toFixed(2));
};

const getTotalKm = (trip) => {
  if (trip.startingOdometer == null || trip.endingOdometer == null) {
    return 0;
  }

  const km = Number(trip.endingOdometer) - Number(trip.startingOdometer);

  return km >= 0 ? round2(km) : 0;
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

// =====================================================
// DRIVER REPORT
// =====================================================

const getDriverReport = async (req, res) => {
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

    const { driverId, fromDate, toDate, status } = req.query;

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

    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid trip status",
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

    // -------------------------------------------------
    // Trip Filter
    // -------------------------------------------------

    const tripFilter = {
      companyId,
    };

    if (driverId) {
      tripFilter.driverId = driverId;
    }

    if (status) {
      tripFilter.status = status;
    }

    if (dateValidation.startDate || dateValidation.endDate) {
      tripFilter.dispatchDate = {};

      if (dateValidation.startDate) {
        tripFilter.dispatchDate.$gte = dateValidation.startDate;
      }

      if (dateValidation.endDate) {
        tripFilter.dispatchDate.$lte = dateValidation.endDate;
      }
    }

    // -------------------------------------------------
    // Fetch Trips
    // -------------------------------------------------

    const trips = await Trip.find(tripFilter)
      .populate("driverId", "name phone licenseNumber")
      .populate("vehicleId", "vehicleNumber vehicleType")
      .populate("bookingId", "bookingNumber lrNumber quantity unit")
      .populate("fromCityId", "name")
      .populate("toCityId", "name")
      .sort({
        dispatchDate: -1,
      })
      .lean();

    const report = {};

    // =================================================
    // PROCESS TRIPS
    // =================================================

    for (const trip of trips) {
      // -------------------------------------------------
      // Safety Checks
      // -------------------------------------------------

      if (!trip.driverId) {
        continue;
      }

      if (!trip.bookingId) {
        continue;
      }

      const driverKey = trip.driverId._id.toString();

      const bookingId = trip.bookingId._id;

      // -------------------------------------------------
      // Initialize Driver
      // -------------------------------------------------

      if (!report[driverKey]) {
        report[driverKey] = {
          driverId: trip.driverId._id,

          driverName: trip.driverId.name,

          phone: trip.driverId.phone,

          licenseNumber: trip.driverId.licenseNumber,

          totalTrips: 0,

          completedTrips: 0,

          deliveredTrips: 0,

          inTransitTrips: 0,

          cancelledTrips: 0,

          totalKm: 0,

          fuelQuantity: 0,

          fuelCost: 0,

          tripExpenseCost: 0,

          vendorBillCost: 0,

          revenue: 0,

          totalCost: 0,

          netAmount: 0,
        };
      }

      const item = report[driverKey];

      // ===============================================
      // TRIP COUNTS
      // ===============================================

      item.totalTrips++;

      if (trip.status === "completed") {
        item.completedTrips++;
      }

      if (trip.status === "delivered") {
        item.deliveredTrips++;
      }

      if (trip.status === "in_transit") {
        item.inTransitTrips++;
      }

      if (trip.status === "cancelled") {
        item.cancelledTrips++;
      }

      // ===============================================
      // KM
      // ===============================================

      item.totalKm += getTotalKm(trip);

      // ===============================================
      // FUEL
      // ===============================================

      const fuels = await Fuel.find({
        companyId,

        driverId: trip.driverId._id,

        bookingId,
      }).lean();

      item.fuelQuantity += fuels.reduce(
        (sum, fuel) => sum + Number(fuel.quantity || 0),
        0,
      );

      item.fuelCost += fuels.reduce(
        (sum, fuel) => sum + Number(fuel.totalAmount || 0),
        0,
      );

      // ===============================================
      // TRIP EXPENSES
      // ===============================================

      const expenses = await TripExpense.find({
        companyId,

        tripId: trip._id,

        status: "active",
      }).lean();

      item.tripExpenseCost += expenses
        .filter((expense) => expense.expenseType !== "fuel")
        .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

      // ===============================================
      // CUSTOMER REVENUE
      // ===============================================

      const invoices = await CustomerInvoice.find({
        companyId,

        bookingId,

        status: {
          $ne: "cancelled",
        },
      }).lean();

      item.revenue += invoices.reduce(
        (sum, invoice) => sum + Number(invoice.grandTotal || 0),
        0,
      );

      // ===============================================
      // VENDOR BILLS
      // ===============================================

      const vendorBills = await VendorBill.find({
        companyId,

        bookingId,

        status: {
          $ne: "cancelled",
        },
      }).lean();

      item.vendorBillCost += vendorBills.reduce(
        (sum, bill) => sum + Number(bill.grandTotal || 0),
        0,
      );
    }

    // =================================================
    // FINAL CALCULATIONS
    // =================================================

    Object.values(report).forEach((item) => {
      item.totalKm = round2(item.totalKm);

      item.fuelQuantity = round2(item.fuelQuantity);

      item.fuelCost = round2(item.fuelCost);

      item.tripExpenseCost = round2(item.tripExpenseCost);

      item.vendorBillCost = round2(item.vendorBillCost);

      item.revenue = round2(item.revenue);

      // ---------------------------------------------
      // Total Cost
      // ---------------------------------------------

      item.totalCost = round2(
        item.fuelCost + item.tripExpenseCost + item.vendorBillCost,
      );

      // ---------------------------------------------
      // Net Amount
      // ---------------------------------------------

      item.netAmount = round2(item.revenue - item.totalCost);

      // ---------------------------------------------
      // Fuel Efficiency
      // ---------------------------------------------

      item.fuelEfficiency =
        item.fuelQuantity > 0 && item.totalKm > 0
          ? round2(item.totalKm / item.fuelQuantity)
          : null;

      // ---------------------------------------------
      // Cost Per KM
      // ---------------------------------------------

      item.costPerKm =
        item.totalKm > 0 ? round2(item.totalCost / item.totalKm) : null;

      // ---------------------------------------------
      // Result
      // ---------------------------------------------

      item.result = item.netAmount >= 0 ? "surplus" : "loss";
    });

    // =================================================
    // RESPONSE
    // =================================================

    return res.status(200).json({
      success: true,

      count: Object.keys(report).length,

      data: Object.values(report),
    });
  } catch (error) {
    console.error("Driver report error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate driver report",
      error: error.message,
    });
  }
};

// =====================================================
// EXPORT
// =====================================================

module.exports = {
  getDriverReport,
};
