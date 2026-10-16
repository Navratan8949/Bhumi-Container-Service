const mongoose = require("mongoose");

const CustomerInvoice = require("../models/CustomerInvoice");
const CustomerPayment = require("../models/CustomerPayment");
const Booking = require("../models/Booking");
const LRBilty = require("../models/LRBilty");
const Trip = require("../models/Trip");
const SupplyOrder = require("../models/SupplyOrder");
const DOReceived = require("../models/DOReceived");
const VendorBill = require("../models/VendorBill");
const VendorPayment = require("../models/VendorPayment");
const Expense = require("../models/Expense");
const TripExpense = require("../models/TripExpense");
const EmployeeAdvance = require("../models/EmployeeAdvance");
const SalaryPayment = require("../models/SalaryPayment");

const SEQUENCE_CONFIGS = {
  "customer-invoices": {
    model: CustomerInvoice,
    field: "invoiceNumber",
    prefix: "INV",
  },
  customer_invoice: {
    model: CustomerInvoice,
    field: "invoiceNumber",
    prefix: "INV",
  },
  "customer-payments": {
    model: CustomerPayment,
    field: "paymentNumber",
    prefix: "PAY",
  },
  customer_payment: {
    model: CustomerPayment,
    field: "paymentNumber",
    prefix: "PAY",
  },
  bookings: {
    model: Booking,
    field: "bookingNumber",
    prefix: "BK",
  },
  booking: {
    model: Booking,
    field: "bookingNumber",
    prefix: "BK",
  },
  "lr-bilties": {
    model: LRBilty,
    field: "lrNumber",
    prefix: "LR",
  },
  lr_bilty: {
    model: LRBilty,
    field: "lrNumber",
    prefix: "LR",
  },
  trips: {
    model: Trip,
    field: "tripNumber",
    prefix: "TRIP",
  },
  trip: {
    model: Trip,
    field: "tripNumber",
    prefix: "TRIP",
  },
  "supply-orders": {
    model: SupplyOrder,
    field: "soNumber",
    prefix: "SO",
  },
  supply_order: {
    model: SupplyOrder,
    field: "soNumber",
    prefix: "SO",
  },
  "do-received": {
    model: DOReceived,
    field: "doNumber",
    prefix: "DO",
  },
  do_received: {
    model: DOReceived,
    field: "doNumber",
    prefix: "DO",
  },
  "vendor-bills": {
    model: VendorBill,
    field: "billNumber",
    prefix: "VB",
  },
  vendor_bill: {
    model: VendorBill,
    field: "billNumber",
    prefix: "VB",
  },
  "vendor-payments": {
    model: VendorPayment,
    field: "paymentNumber",
    prefix: "VPAY",
  },
  vendor_payment: {
    model: VendorPayment,
    field: "paymentNumber",
    prefix: "VPAY",
  },
  expenses: {
    model: Expense,
    field: "expenseNumber",
    prefix: "EXP",
  },
  expense: {
    model: Expense,
    field: "expenseNumber",
    prefix: "EXP",
  },
  "trip-expenses": {
    model: TripExpense,
    field: "expenseNumber",
    prefix: "TEX",
  },
  trip_expense: {
    model: TripExpense,
    field: "expenseNumber",
    prefix: "TEX",
  },
  "employee-advances": {
    model: EmployeeAdvance,
    field: "advanceNumber",
    prefix: "ADV",
  },
  employee_advance: {
    model: EmployeeAdvance,
    field: "advanceNumber",
    prefix: "ADV",
  },
  "salary-payments": {
    model: SalaryPayment,
    field: "paymentNumber",
    prefix: "SPAY",
  },
  salary_payment: {
    model: SalaryPayment,
    field: "paymentNumber",
    prefix: "SPAY",
  },
};

/**
 * Calculates next sequence number for a given entity type and company
 * @param {ObjectId|string} companyId
 * @param {string} type - e.g. "customer-invoices", "bookings", etc.
 * @param {object} session - optional mongoose session
 * @returns {Promise<string>} e.g. "INV-2026-003"
 */
async function getNextSequence(companyId, type, session = null) {
  const cfg = SEQUENCE_CONFIGS[type];
  if (!cfg) {
    throw new Error(`Unsupported sequence type: ${type}`);
  }

  const companyObjectId =
    typeof companyId === "string"
      ? new mongoose.Types.ObjectId(companyId)
      : companyId;

  const year = new Date().getFullYear();
  let query = cfg.model.find({ companyId: companyObjectId }).select(cfg.field);
  if (session) {
    query = query.session(session);
  }

  const records = await query.lean();

  let maxNum = 0;
  const regex = new RegExp(`^${cfg.prefix}-${year}-(\\d+)$`, "i");

  for (const r of records) {
    const val = r[cfg.field];
    if (val) {
      const match = String(val).match(regex);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      } else {
        // Fallback for custom formats ending in numbers
        const match2 = String(val).match(/(\d+)$/);
        if (match2) {
          const num2 = parseInt(match2[1], 10);
          if (num2 > maxNum) maxNum = num2;
        }
      }
    }
  }

  const nextVal = maxNum + 1;
  const padded = String(nextVal).padStart(3, "0");
  return `${cfg.prefix}-${year}-${padded}`;
}

/**
 * Specifically for bookings: returns both next bookingNumber and next lrNumber
 */
async function getNextBookingAndLR(companyId, session = null) {
  const bookingNumber = await getNextSequence(companyId, "bookings", session);

  // For LR, also consider existing LR numbers in Bookings and LRBilties
  const companyObjectId =
    typeof companyId === "string"
      ? new mongoose.Types.ObjectId(companyId)
      : companyId;

  const year = new Date().getFullYear();
  let bQuery = Booking.find({ companyId: companyObjectId }).select("lrNumber");
  let lrQuery = LRBilty.find({ companyId: companyObjectId }).select("lrNumber");
  if (session) {
    bQuery = bQuery.session(session);
    lrQuery = lrQuery.session(session);
  }

  const [bRecs, lrRecs] = await Promise.all([
    bQuery.lean(),
    lrQuery.lean(),
  ]);

  let maxLR = 0;
  const regex = new RegExp(`^LR-${year}-(\\d+)$`, "i");

  const checkVal = (val) => {
    if (!val) return;
    const m = String(val).match(regex);
    if (m) {
      const num = parseInt(m[1], 10);
      if (num > maxLR) maxLR = num;
    } else {
      const m2 = String(val).match(/(\d+)$/);
      if (m2) {
        const num2 = parseInt(m2[1], 10);
        if (num2 > maxLR) maxLR = num2;
      }
    }
  };

  bRecs.forEach((r) => checkVal(r.lrNumber));
  lrRecs.forEach((r) => checkVal(r.lrNumber));

  const lrNumber = `LR-${year}-${String(maxLR + 1).padStart(3, "0")}`;

  return { bookingNumber, lrNumber };
}

module.exports = {
  SEQUENCE_CONFIGS,
  getNextSequence,
  getNextBookingAndLR,
};
