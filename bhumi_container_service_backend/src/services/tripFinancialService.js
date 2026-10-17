const mongoose = require("mongoose");

const Trip = require("../models/Trip");
const CustomerInvoice = require("../models/CustomerInvoice");
const CustomerPayment = require("../models/CustomerPayment");
const VendorBill = require("../models/VendorBill");
const Fuel = require("../models/Fuel");
const TripExpense = require("../models/TripExpense");
const Maintenance = require("../models/Maintenance");
const Tyre = require("../models/Tyre");

// =====================================================
// HELPERS
// =====================================================

const round2 = (value) => {
  return Number(Number(value || 0).toFixed(2));
};

const buildDateFilter = (field, fromDate, toDate) => {
  if (!fromDate && !toDate) {
    return {};
  }

  const filter = {};

  if (fromDate) {
    const start = new Date(fromDate);
    start.setHours(0, 0, 0, 0);
    filter.$gte = start;
  }

  if (toDate) {
    const end = new Date(toDate);
    end.setHours(23, 59, 59, 999);
    filter.$lte = end;
  }

  return {
    [field]: filter,
  };
};

// =====================================================
// GET SINGLE TRIP FINANCIAL DATA
// =====================================================

const getTripFinancialData = async ({ companyId, tripId }) => {
  const trip = await Trip.findOne({
    _id: tripId,
    companyId,
  });

  if (!trip) {
    throw new Error("Trip not found");
  }

  // -------------------------------------------------
  // CUSTOMER REVENUE
  // -------------------------------------------------

  const invoices = await CustomerInvoice.find({
    companyId,
    bookingId: trip.bookingId,
    status: {
      $ne: "cancelled",
    },
  });

  const revenue = round2(
    invoices.reduce((sum, invoice) => sum + Number(invoice.grandTotal || 0), 0),
  );

  // -------------------------------------------------
  // CUSTOMER PAYMENTS
  // -------------------------------------------------

  const customerPayments = await CustomerPayment.find({
    companyId,
    invoiceId: {
      $in: invoices.map((invoice) => invoice._id),
    },
  });

  const receivedAmount = round2(
    customerPayments.reduce(
      (sum, payment) => sum + Number(payment.amount || 0),
      0,
    ),
  );

  // -------------------------------------------------
  // FUEL
  // -------------------------------------------------

  const fuelRecords = await Fuel.find({
    companyId,
    vehicleId: trip.vehicleId,
    bookingId: trip.bookingId,
  });

  const fuelQuantity = round2(
    fuelRecords.reduce((sum, fuel) => sum + Number(fuel.quantity || 0), 0),
  );

  const fuelCost = round2(
    fuelRecords.reduce((sum, fuel) => sum + Number(fuel.totalAmount || 0), 0),
  );

  // -------------------------------------------------
  // TRIP EXPENSES
  // -------------------------------------------------

  const tripExpenses = await TripExpense.find({
    companyId,
    tripId: trip._id,
    status: "active",
  });

  const tripExpenseBreakdown = {};

  let tripExpenseCost = 0;

  for (const expense of tripExpenses) {
    const amount = Number(expense.amount || 0);

    // Fuel is tracked and calculated from Fuel collection.
    // If fuelCost already has records, ignore duplicate fuel in tripExpense to avoid double counting.
    if (!(fuelCost > 0 && expense.expenseType === "fuel")) {
      tripExpenseCost += amount;
    }

    if (!tripExpenseBreakdown[expense.expenseType]) {
      tripExpenseBreakdown[expense.expenseType] = 0;
    }

    tripExpenseBreakdown[expense.expenseType] += amount;
  }

  tripExpenseCost = round2(tripExpenseCost);

  // -------------------------------------------------
  // VENDOR BILL
  // -------------------------------------------------

  const vendorBills = await VendorBill.find({
    companyId,
    bookingId: trip.bookingId,
    status: {
      $ne: "cancelled",
    },
  });

  const vendorBillCost = round2(
    vendorBills.reduce((sum, bill) => sum + Number(bill.grandTotal || 0), 0),
  );

  // -------------------------------------------------
  // MAINTENANCE
  // -------------------------------------------------

  const maintenanceRecords = await Maintenance.find({
    companyId,
    vehicleId: trip.vehicleId,
    status: "completed",
  });

  const maintenanceCost = round2(
    maintenanceRecords.reduce(
      (sum, maintenance) => sum + Number(maintenance.totalCost || 0),
      0,
    ),
  );

  // -------------------------------------------------
  // KM
  // -------------------------------------------------

  let totalKm = 0;

  if (
    trip.startingOdometer !== null &&
    trip.startingOdometer !== undefined &&
    trip.endingOdometer !== null &&
    trip.endingOdometer !== undefined
  ) {
    totalKm = Number(trip.endingOdometer) - Number(trip.startingOdometer);

    if (totalKm < 0) {
      totalKm = 0;
    }
  }

  totalKm = round2(totalKm);

  // -------------------------------------------------
  // FUEL EFFICIENCY
  // -------------------------------------------------

  const fuelEfficiency = fuelQuantity > 0 ? round2(totalKm / fuelQuantity) : 0;

  // -------------------------------------------------
  // TOTAL COST
  // -------------------------------------------------

  const totalCost = round2(
    fuelCost + tripExpenseCost + vendorBillCost + maintenanceCost,
  );

  // -------------------------------------------------
  // NET
  // -------------------------------------------------

  const netAmount = round2(revenue - totalCost);

  // -------------------------------------------------
  // COST PER KM
  // -------------------------------------------------

  const costPerKm = totalKm > 0 ? round2(totalCost / totalKm) : 0;

  return {
    tripId: trip._id,
    tripNumber: trip.tripNumber,
    bookingId: trip.bookingId,
    vehicleId: trip.vehicleId,
    driverId: trip.driverId,
    status: trip.status,

    totalKm,

    revenue,

    receivedAmount,

    outstandingRevenue: round2(revenue - receivedAmount),

    fuelQuantity,
    fuelCost,
    fuelEfficiency,

    tripExpenseCost,
    tripExpenseBreakdown,

    vendorBillCost,

    maintenanceCost,

    totalCost,

    netAmount,

    costPerKm,

    result: netAmount >= 0 ? "surplus" : "loss",
  };
};

// =====================================================
// GET VEHICLE FINANCIAL SUMMARY
// =====================================================

const getVehicleFinancialSummary = async ({
  companyId,
  vehicleId,
  fromDate,
  toDate,
}) => {
  const tripFilter = {
    companyId,
    vehicleId,
  };

  Object.assign(tripFilter, buildDateFilter("dispatchDate", fromDate, toDate));

  const trips = await Trip.find(tripFilter);

  let totalKm = 0;
  let completedTrips = 0;
  let revenue = 0;
  let fuelQuantity = 0;
  let fuelCost = 0;
  let tripExpenseCost = 0;
  let vendorBillCost = 0;
  let maintenanceCost = 0;

  const tripIds = trips.map((trip) => trip._id);

  const bookingIds = trips.map((trip) => trip.bookingId);

  // -------------------------------------------------
  // TRIP KM
  // -------------------------------------------------

  for (const trip of trips) {
    if (
      trip.startingOdometer !== null &&
      trip.startingOdometer !== undefined &&
      trip.endingOdometer !== null &&
      trip.endingOdometer !== undefined
    ) {
      const km = Number(trip.endingOdometer) - Number(trip.startingOdometer);

      if (km > 0) {
        totalKm += km;
      }
    }

    if (["delivered", "completed"].includes(trip.status)) {
      completedTrips++;
    }
  }

  // -------------------------------------------------
  // CUSTOMER REVENUE
  // -------------------------------------------------

  const invoices = await CustomerInvoice.find({
    companyId,
    bookingId: {
      $in: bookingIds,
    },
    status: {
      $ne: "cancelled",
    },
  });

  revenue = invoices.reduce(
    (sum, invoice) => sum + Number(invoice.grandTotal || 0),
    0,
  );

  // -------------------------------------------------
  // FUEL
  // -------------------------------------------------

  const fuelFilter = {
    companyId,
    vehicleId,
  };

  Object.assign(fuelFilter, buildDateFilter("fuelDate", fromDate, toDate));

  const fuelRecords = await Fuel.find(fuelFilter);

  fuelQuantity = fuelRecords.reduce(
    (sum, fuel) => sum + Number(fuel.quantity || 0),
    0,
  );

  fuelCost = fuelRecords.reduce(
    (sum, fuel) => sum + Number(fuel.totalAmount || 0),
    0,
  );

  // -------------------------------------------------
  // TRIP EXPENSES
  // -------------------------------------------------

  const tripExpenses = await TripExpense.find({
    companyId,
    vehicleId,
    tripId: {
      $in: tripIds,
    },
    status: "active",
  });

  tripExpenseCost = tripExpenses
    .filter((expense) => !(fuelCost > 0 && expense.expenseType === "fuel"))
    .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

  // -------------------------------------------------
  // VENDOR BILLS
  // -------------------------------------------------

  const vendorBills = await VendorBill.find({
    companyId,
    bookingId: {
      $in: bookingIds,
    },
    status: {
      $ne: "cancelled",
    },
  });

  vendorBillCost = vendorBills.reduce(
    (sum, bill) => sum + Number(bill.grandTotal || 0),
    0,
  );

  // -------------------------------------------------
  // MAINTENANCE
  // -------------------------------------------------

  const maintenanceFilter = {
    companyId,
    vehicleId,
    status: "completed",
  };

  Object.assign(
    maintenanceFilter,
    buildDateFilter("maintenanceDate", fromDate, toDate),
  );

  const maintenanceRecords = await Maintenance.find(maintenanceFilter);

  maintenanceCost = maintenanceRecords.reduce(
    (sum, maintenance) => sum + Number(maintenance.totalCost || 0),
    0,
  );

  // -------------------------------------------------
  // TOTAL COST
  // -------------------------------------------------

  const totalCost =
    fuelCost + tripExpenseCost + vendorBillCost + maintenanceCost;

  const netAmount = revenue - totalCost;

  const fuelEfficiency = fuelQuantity > 0 ? totalKm / fuelQuantity : 0;

  const costPerKm = totalKm > 0 ? totalCost / totalKm : 0;

  return {
    vehicleId,

    totalTrips: trips.length,

    completedTrips,

    totalKm: round2(totalKm),

    revenue: round2(revenue),

    fuelQuantity: round2(fuelQuantity),

    fuelCost: round2(fuelCost),

    fuelEfficiency: round2(fuelEfficiency),

    tripExpenseCost: round2(tripExpenseCost),

    vendorBillCost: round2(vendorBillCost),

    maintenanceCost: round2(maintenanceCost),

    totalCost: round2(totalCost),

    netAmount: round2(netAmount),

    costPerKm: round2(costPerKm),

    result: netAmount >= 0 ? "surplus" : "loss",
  };
};

module.exports = {
  getTripFinancialData,
  getVehicleFinancialSummary,
};
