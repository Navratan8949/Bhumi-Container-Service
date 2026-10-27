const Trip = require("../models/Trip");
const Vehicle = require("../models/Vehicle");
const Driver = require("../models/Driver");
const Fuel = require("../models/Fuel");
const DriverTripSettlement = require("../models/DriverTripSettlement");
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
// TRIP DASHBOARD
// =====================================================

const getTripDashboard = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid company ID",
      });
    }

    const [
      totalTrips,
      plannedTrips,
      dispatchedTrips,
      inTransitTrips,
      deliveredTrips,
      completedTrips,
      cancelledTrips,
    ] = await Promise.all([
      Trip.countDocuments({
        companyId,
      }),

      Trip.countDocuments({
        companyId,
        status: "planned",
      }),

      Trip.countDocuments({
        companyId,
        status: "dispatched",
      }),

      Trip.countDocuments({
        companyId,
        status: "in_transit",
      }),

      Trip.countDocuments({
        companyId,
        status: "delivered",
      }),

      Trip.countDocuments({
        companyId,
        status: "completed",
      }),

      Trip.countDocuments({
        companyId,
        status: "cancelled",
      }),
    ]);

    console.log(
      "tripx",
      totalTrips,
      plannedTrips,
      dispatchedTrips,
      inTransitTrips,
      deliveredTrips,
      completedTrips,
      cancelledTrips,
    );
    return res.status(200).json({
      success: true,
      data: {
        totalTrips,
        plannedTrips,
        dispatchedTrips,
        inTransitTrips,
        deliveredTrips,
        completedTrips,
        cancelledTrips,
      },
    });
  } catch (error) {
    console.error("Trip dashboard error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch trip dashboard",
      error: error.message,
    });
  }
};

// =====================================================
// TRIP PROFITABILITY
// =====================================================

const getTripProfitability = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid company ID",
      });
    }

    const { status, fromDate, toDate } = req.query;

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

    const tripFilter = {
      companyId,
    };

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

    const trips = await Trip.find(tripFilter)
      .populate("vehicleId", "vehicleNumber vehicleType")
      .populate("driverId", "name phone")
      .sort({
        dispatchDate: -1,
      })
      .lean();

    const report = [];

    for (const trip of trips) {
      const bookingId = trip.bookingId?._id || trip.bookingId || null;
      const vehicleId = trip.vehicleId?._id || trip.vehicleId || null;

      // ===============================================
      // REVENUE
      // ===============================================

      const invOr = [{ tripId: trip._id }];
      if (bookingId) invOr.push({ bookingId });
      if (trip.partyName && vehicleId) invOr.push({ partyName: trip.partyName, vehicleId });

      const invoices = await CustomerInvoice.find({
        companyId,
        $or: invOr,
        status: {
          $ne: "cancelled",
        },
      }).lean();

      const invoiceRevenue = round2(
        invoices.reduce(
          (sum, invoice) => sum + Number(invoice.grandTotal || 0),
          0,
        ),
      );
      const revenue = invoiceRevenue > 0 ? invoiceRevenue : round2(Number(trip.rate || 0));

      // ===============================================
      // FUEL
      // ===============================================

      const fuelOr = [{ tripId: trip._id }];
      if (vehicleId) fuelOr.push({ vehicleId });
      if (bookingId) fuelOr.push({ bookingId });

      const fuels = await Fuel.find({
        companyId,
        $or: fuelOr,
      }).lean();

      const fuelCost = round2(
        fuels.reduce((sum, fuel) => sum + Number(fuel.totalCost || fuel.totalAmount || 0), 0),
      );

      const fuelQuantity = round2(
        fuels.reduce((sum, fuel) => sum + Number(fuel.quantity || 0), 0),
      );

      // ===============================================
      // TRIP EXPENSES (FROM DRIVER SETTLEMENT)
      // ===============================================

      const settlementOr = [{ tripId: trip._id }];
      if (vehicleId) settlementOr.push({ vehicleId });
      if (trip.tripNumber) settlementOr.push({ remarks: new RegExp(trip.tripNumber, "i") });

      const settlement = await DriverTripSettlement.findOne({
        companyId,
        $or: settlementOr,
      }).lean();

      const tripExpenseCost = round2(
        settlement
          ? Math.max(
              Number(settlement.totalDriverExpenditure || 0) -
                Number(settlement.dieselExpense || 0),
              0,
            )
          : 0,
      );

      // ===============================================
      // VENDOR BILLS (MARKET LORRY)
      // ===============================================

      const vbOr = [{ tripId: trip._id }];
      if (trip.advanceMemoId) vbOr.push({ advanceMemoId: trip.advanceMemoId });
      if (trip.lrBiltyId) vbOr.push({ lrBiltyId: trip.lrBiltyId });
      if (bookingId) vbOr.push({ bookingId });
      if (vehicleId && trip.partyName) vbOr.push({ vehicleId, partyName: trip.partyName });

      const vendorBills = await VendorBill.find({
        companyId,
        $or: vbOr,
        status: {
          $ne: "cancelled",
        },
      }).lean();

      const vendorBillCost = round2(
        vendorBills.reduce(
          (sum, bill) => sum + Number(bill.grandTotal || 0),
          0,
        ),
      );

      // ===============================================
      // KM
      // ===============================================

      const totalKm = getTotalKm(trip);

      // ===============================================
      // FUEL EFFICIENCY
      // ===============================================

      const fuelEfficiency =
        fuelQuantity > 0 && totalKm > 0 ? round2(totalKm / fuelQuantity) : null;

      // ===============================================
      // TOTAL COST
      // ===============================================

      const totalCost = round2(fuelCost + tripExpenseCost + vendorBillCost);

      // ===============================================
      // NET
      // ===============================================

      const netAmount = round2(revenue - totalCost);

      // ===============================================
      // RESULT
      // ===============================================

      const result = netAmount >= 0 ? "surplus" : "loss";

      report.push({
        tripId: trip._id,

        tripNumber: trip.tripNumber,

        status: trip.status,

        bookingNumber: trip.bookingId?.bookingNumber,

        lrNumber: trip.bookingId?.lrNumber,

        vehicle: trip.vehicleId?.vehicleNumber,

        driver: trip.driverId?.name,

        fromCity: trip.fromCity || "",

        toCity: trip.toCity || "",

        quantity: trip.bookingId?.quantity,

        unit: trip.bookingId?.unit,

        totalKm,

        fuelQuantity,

        fuelEfficiency,

        revenue,

        fuelCost,

        tripExpenseCost,

        vendorBillCost,

        totalCost,

        netAmount,

        result,
      });
    }

    return res.status(200).json({
      success: true,
      count: report.length,
      data: report,
    });
  } catch (error) {
    console.error("Trip profitability error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate trip profitability report",
      error: error.message,
    });
  }
};

// =====================================================
// VEHICLE REPORT
// =====================================================

const getVehicleReport = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid company ID",
      });
    }

    const { vehicleId, fromDate, toDate, status } = req.query;

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
    // Filter
    // -------------------------------------------------

    const filter = {
      companyId,
    };

    if (vehicleId) {
      filter.vehicleId = vehicleId;
    }

    if (status) {
      filter.status = status;
    }

    if (dateValidation.startDate || dateValidation.endDate) {
      filter.dispatchDate = {};

      if (dateValidation.startDate) {
        filter.dispatchDate.$gte = dateValidation.startDate;
      }

      if (dateValidation.endDate) {
        filter.dispatchDate.$lte = dateValidation.endDate;
      }
    }

    const trips = await Trip.find(filter)
      .populate("vehicleId", "vehicleNumber vehicleType ownerType")
      .populate("driverId", "name")
      .lean();

    const report = {};

    for (const trip of trips) {
      // -------------------------------------------------
      // Safety
      // -------------------------------------------------

      if (!trip.vehicleId) {
        continue;
      }

      if (!trip.bookingId) {
        continue;
      }

      const vehicleKey = trip.vehicleId._id.toString();

      if (!report[vehicleKey]) {
        report[vehicleKey] = {
          vehicleId: trip.vehicleId._id,

          vehicleNumber: trip.vehicleId.vehicleNumber,

          vehicleType: trip.vehicleId.vehicleType,

          ownerType: trip.vehicleId.ownerType,

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

      const item = report[vehicleKey];

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
        vehicleId: trip.vehicleId._id,
        bookingId: trip.bookingId,
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

      const settlement = await DriverTripSettlement.findOne({
        companyId,
        $or: [
          { tripId: trip._id },
          ...(trip.tripNumber ? [{ remarks: new RegExp(trip.tripNumber, "i") }] : []),
        ],
      }).lean();

      item.tripExpenseCost += settlement
        ? Math.max(
            Number(settlement.totalDriverExpenditure || 0) -
              Number(settlement.dieselExpense || 0),
            0,
          )
        : 0;

      // ===============================================
      // CUSTOMER REVENUE
      // ===============================================

      const invoices = await CustomerInvoice.find({
        companyId,
        $or: [
          { lrBiltyId: trip.lrBiltyId },
          ...(trip.bookingId ? [{ bookingId: trip.bookingId }] : []),
        ],
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
        bookingId: trip.bookingId,
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

      item.totalCost = round2(
        item.fuelCost + item.tripExpenseCost + item.vendorBillCost,
      );

      item.netAmount = round2(item.revenue - item.totalCost);

      item.fuelEfficiency =
        item.fuelQuantity > 0 && item.totalKm > 0
          ? round2(item.totalKm / item.fuelQuantity)
          : null;

      item.costPerKm =
        item.totalKm > 0 ? round2(item.totalCost / item.totalKm) : null;

      item.result = item.netAmount >= 0 ? "surplus" : "loss";
    });

    return res.status(200).json({
      success: true,

      count: Object.keys(report).length,

      data: Object.values(report),
    });
  } catch (error) {
    console.error("Vehicle report error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate vehicle report",
      error: error.message,
    });
  }
};

// =====================================================
// EXPORT
// =====================================================

module.exports = {
  getTripDashboard,
  getTripProfitability,
  getVehicleReport,
};
