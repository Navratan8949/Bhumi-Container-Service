const mongoose = require("mongoose");

const Trip = require("../models/Trip");
const CustomerInvoice = require("../models/CustomerInvoice");
const VendorBill = require("../models/VendorBill");
const Fuel = require("../models/Fuel");
const TripExpense = require("../models/TripExpense");

// =====================================================
// GET TRIP SETTLEMENT
// =====================================================

const getTripSettlement = async (req, res) => {
  try {
    const { tripId } = req.params;
    const companyId = req.user.companyId;

    // -------------------------------------------------
    // Validate Trip ID
    // -------------------------------------------------

    if (!mongoose.Types.ObjectId.isValid(tripId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid trip ID",
      });
    }

    // -------------------------------------------------
    // Find Trip
    // -------------------------------------------------

    const trip = await Trip.findOne({
      _id: tripId,
      companyId,
    })
      .populate(
        "bookingId",
        "bookingNumber lrNumber quantity unit billingRate billingHammali billingDetention status",
      )
      .populate("vehicleId", "vehicleNumber vehicleType ownerType")
      .populate("driverId", "name phone licenseNumber")
      .populate("fromCityId", "name state")
      .populate("toCityId", "name state");

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    // -------------------------------------------------
    // Cancelled Trip Protection
    // -------------------------------------------------

    if (trip.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Settlement cannot be generated for a cancelled trip",
      });
    }

    // -------------------------------------------------
    // Settlement should be generated after completion
    // -------------------------------------------------

    if (trip.status !== "completed" && trip.status !== "delivered") {
      return res.status(400).json({
        success: false,
        message:
          "Trip must be delivered or completed before generating settlement",
        currentStatus: trip.status,
      });
    }

    // -------------------------------------------------
    // Required Trip References
    // -------------------------------------------------

    if (!trip.bookingId) {
      return res.status(400).json({
        success: false,
        message: "Trip booking information is missing",
      });
    }

    if (!trip.vehicleId) {
      return res.status(400).json({
        success: false,
        message: "Trip vehicle information is missing",
      });
    }

    // =================================================
    // BASIC IDs
    // =================================================

    const bookingId = trip.bookingId._id;
    const vehicleId = trip.vehicleId._id;

    // =================================================
    // CUSTOMER INVOICE / REVENUE
    // =================================================

    const customerInvoices = await CustomerInvoice.find({
      companyId,

      bookingId,

      status: {
        $ne: "cancelled",
      },
    }).lean();

    const revenue = Number(
      customerInvoices
        .reduce((sum, invoice) => sum + Number(invoice.grandTotal || 0), 0)
        .toFixed(2),
    );

    // =================================================
    // FUEL
    // =================================================

    const fuels = await Fuel.find({
      companyId,

      vehicleId,

      bookingId,
    }).lean();

    const fuelCost = Number(
      fuels
        .reduce((sum, fuel) => sum + Number(fuel.totalAmount || 0), 0)
        .toFixed(2),
    );

    const fuelQuantity = Number(
      fuels
        .reduce((sum, fuel) => sum + Number(fuel.quantity || 0), 0)
        .toFixed(2),
    );

    // =================================================
    // TRIP EXPENSES
    // =================================================

    const tripExpenses = await TripExpense.find({
      companyId,
      tripId,
      status: "active",
    }).lean();

    // -------------------------------------------------
    // Expense Breakdown
    // -------------------------------------------------

    const expenseBreakdown = {};

    tripExpenses.forEach((expense) => {
      const expenseType = expense.expenseType || "other";

      const amount = Number(expense.amount || 0);

      if (!expenseBreakdown[expenseType]) {
        expenseBreakdown[expenseType] = 0;
      }

      expenseBreakdown[expenseType] += amount;
    });

    // -------------------------------------------------
    // Round Breakdown
    // -------------------------------------------------

    Object.keys(expenseBreakdown).forEach((key) => {
      expenseBreakdown[key] = Number(expenseBreakdown[key].toFixed(2));
    });

    // -------------------------------------------------
    // Fuel Protection
    // -------------------------------------------------
    //
    // Fuel records are already calculated separately.
    // Therefore TripExpense with expenseType=fuel
    // must not be counted again.
    //

    const nonFuelTripExpenseRecords = tripExpenses.filter(
      (expense) => expense.expenseType !== "fuel",
    );

    const nonFuelTripExpenses = Number(
      nonFuelTripExpenseRecords
        .reduce((sum, expense) => sum + Number(expense.amount || 0), 0)
        .toFixed(2),
    );

    // =================================================
    // VENDOR BILLS
    // =================================================

    const vendorBills = await VendorBill.find({
      companyId,

      bookingId,

      status: {
        $ne: "cancelled",
      },
    })
      .populate("vendorId", "vendorCode vendorName vendorType")
      .lean();

    const vendorBillAmount = Number(
      vendorBills
        .reduce((sum, bill) => sum + Number(bill.grandTotal || 0), 0)
        .toFixed(2),
    );

    // =================================================
    // KM CALCULATION
    // =================================================

    let totalKm = 0;

    const hasStartingOdometer =
      trip.startingOdometer !== null && trip.startingOdometer !== undefined;

    const hasEndingOdometer =
      trip.endingOdometer !== null && trip.endingOdometer !== undefined;

    if (hasStartingOdometer && hasEndingOdometer) {
      totalKm = Number(trip.endingOdometer) - Number(trip.startingOdometer);

      if (totalKm < 0) {
        totalKm = 0;
      }
    }

    totalKm = Number(totalKm.toFixed(2));

    // =================================================
    // FUEL EFFICIENCY
    // =================================================

    const fuelEfficiency =
      fuelQuantity > 0 && totalKm > 0
        ? Number((totalKm / fuelQuantity).toFixed(2))
        : null;

    // =================================================
    // TOTAL TRIP COST
    // =================================================

    const totalTripCost = Number(
      (fuelCost + nonFuelTripExpenses + vendorBillAmount).toFixed(2),
    );

    // =================================================
    // NET TRIP AMOUNT
    // =================================================

    const netTripAmount = Number((revenue - totalTripCost).toFixed(2));

    // =================================================
    // COST PER KM
    // =================================================

    const costPerKm =
      totalKm > 0 ? Number((totalTripCost / totalKm).toFixed(2)) : null;

    // =================================================
    // RESULT
    // =================================================

    const result = netTripAmount >= 0 ? "surplus" : "loss";

    // =================================================
    // PAYMENT STATUS
    // =================================================

    const receivedAmount = Number(
      customerInvoices
        .reduce((sum, invoice) => sum + Number(invoice.paidAmount || 0), 0)
        .toFixed(2),
    );

    const outstandingRevenue = Number((revenue - receivedAmount).toFixed(2));

    // =================================================
    // VENDOR PAYMENT STATUS
    // =================================================

    const vendorPaidAmount = Number(
      vendorBills
        .reduce((sum, bill) => sum + Number(bill.paidAmount || 0), 0)
        .toFixed(2),
    );

    const vendorOutstandingAmount = Number(
      (vendorBillAmount - vendorPaidAmount).toFixed(2),
    );

    // =================================================
    // SETTLEMENT STATUS
    // =================================================

    const settlementStatus =
      outstandingRevenue <= 0 && vendorOutstandingAmount <= 0
        ? "settled"
        : "pending";

    // =================================================
    // RESPONSE
    // =================================================

    return res.status(200).json({
      success: true,

      data: {
        // =============================================
        // TRIP
        // =============================================

        trip: {
          id: trip._id,

          tripNumber: trip.tripNumber,

          status: trip.status,

          booking: trip.bookingId,

          vehicle: trip.vehicleId,

          driver: trip.driverId,

          fromCity: trip.fromCityId,

          toCity: trip.toCityId,

          startingOdometer: trip.startingOdometer,

          endingOdometer: trip.endingOdometer,

          totalKm,
        },

        // =============================================
        // REVENUE
        // =============================================

        revenue: {
          customerInvoiceCount: customerInvoices.length,

          totalRevenue: revenue,

          receivedAmount,

          outstandingAmount: outstandingRevenue,

          invoices: customerInvoices,
        },

        // =============================================
        // FUEL
        // =============================================

        fuel: {
          fuelCount: fuels.length,

          totalQuantity: fuelQuantity,

          totalCost: fuelCost,

          fuelEfficiency,

          records: fuels,
        },

        // =============================================
        // TRIP EXPENSES
        // =============================================

        tripExpenses: {
          totalExpense: nonFuelTripExpenses,

          breakdown: expenseBreakdown,

          records: nonFuelTripExpenseRecords,
        },

        // =============================================
        // VENDOR BILLS
        // =============================================

        vendorBills: {
          billCount: vendorBills.length,

          totalAmount: vendorBillAmount,

          paidAmount: vendorPaidAmount,

          outstandingAmount: vendorOutstandingAmount,

          bills: vendorBills,
        },

        // =============================================
        // FINAL SETTLEMENT
        // =============================================

        settlement: {
          revenue,

          receivedAmount,

          outstandingRevenue,

          fuelCost,

          tripExpenseCost: nonFuelTripExpenses,

          vendorBillCost: vendorBillAmount,

          vendorPaidAmount,

          vendorOutstandingAmount,

          totalTripCost,

          netTripAmount,

          totalKm,

          fuelQuantity,

          fuelEfficiency,

          costPerKm,

          result,

          settlementStatus,
        },
      },
    });
  } catch (error) {
    console.error("Get trip settlement error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate trip settlement",
      error: error.message,
    });
  }
};

// =====================================================
// EXPORT
// =====================================================

module.exports = {
  getTripSettlement,
};
