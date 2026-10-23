const mongoose = require("mongoose");

const CustomerInvoice = require("../models/CustomerInvoice");
const LRBilty = require("../models/LRBilty");
const Trip = require("../models/Trip");
const VendorBill = require("../models/VendorBill");
const Expense = require("../models/Expense");
const ContainerDetention = require("../models/ContainerDetention");
const DriverTripSettlement = require("../models/DriverTripSettlement");
const AdvanceMemo = require("../models/AdvanceMemo");

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
  "container-detentions": {
    model: ContainerDetention,
    field: "detentionNumber",
    prefix: "DET",
  },
  container_detention: {
    model: ContainerDetention,
    field: "detentionNumber",
    prefix: "DET",
  },
  "driver-trip-settlements": {
    model: DriverTripSettlement,
    field: "voucherNumber",
    prefix: "VCH",
  },
  driver_trip_settlement: {
    model: DriverTripSettlement,
    field: "voucherNumber",
    prefix: "VCH",
  },
  "advance-memos": {
    model: AdvanceMemo,
    field: "memoNumber",
    prefix: "MEMO",
  },
  advance_memo: {
    model: AdvanceMemo,
    field: "memoNumber",
    prefix: "MEMO",
  },
};

/**
 * Calculates next sequence number for a given entity type and company
 * @param {ObjectId|string} companyId
 * @param {string} type - e.g. "customer-invoices", "lr-bilties", etc.
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

async function getNextLRNumber(companyId, session = null) {
  return getNextSequence(companyId, "lr-bilties", session);
}

module.exports = {
  SEQUENCE_CONFIGS,
  getNextSequence,
  getNextLRNumber,
  getNextBookingAndLR: getNextLRNumber,
};
