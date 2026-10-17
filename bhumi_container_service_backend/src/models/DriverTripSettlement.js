const mongoose = require("mongoose");

const driverTripSettlementSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    voucherNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      required: true,
    },

    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      required: true,
    },

    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
    },

    settlementDate: {
      type: Date,
      required: true,
      default: Date.now,
    },

    // 1. Advance provided to driver at trip start
    advanceGiven: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    // 2. Driver Road Expenses with receipts/slips
    dieselExpense: {
      type: Number,
      default: 0,
      min: 0,
    },

    tollExpense: {
      type: Number,
      default: 0,
      min: 0,
    },

    loadingHammali: {
      type: Number,
      default: 0,
      min: 0,
    },

    weighbridgeKanta: {
      type: Number,
      default: 0,
      min: 0,
    },

    policeRTOExpense: {
      type: Number,
      default: 0,
      min: 0,
    },

    otherRoadExpense: {
      type: Number,
      default: 0,
      min: 0,
    },

    // 3. Driver Trip Bata (Daily Allowance / Per-diem)
    bataDays: {
      type: Number,
      default: 1,
      min: 0.5,
    },

    perDayBataRate: {
      type: Number,
      default: 500,
      min: 0,
    },

    totalDriverBata: {
      type: Number,
      default: 500,
      min: 0,
    },

    // 4. Totals and Net Balance
    totalDriverExpenditure: {
      type: Number,
      default: 0,
    },

    netPayableToDriver: {
      type: Number,
      default: 0, // Positive = Company owes driver; Negative = Driver owes company
    },

    settlementStatus: {
      type: String,
      enum: ["draft", "verified", "paid_settled"],
      default: "draft",
    },

    paymentMode: {
      type: String,
      enum: ["cash", "upi", "bank_transfer", "adjusted"],
      default: "cash",
    },

    remarks: {
      type: String,
      trim: true,
      default: "",
    },

    settledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
  },
  {
    timestamps: true,
  },
);

driverTripSettlementSchema.index({ companyId: 1, voucherNumber: 1 }, { unique: true });
driverTripSettlementSchema.index({ companyId: 1, tripId: 1 });
driverTripSettlementSchema.index({ companyId: 1, driverId: 1 });

module.exports = mongoose.model("DriverTripSettlement", driverTripSettlementSchema);
