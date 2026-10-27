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
      required: false,
      default: null,
    },

    advanceMemoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdvanceMemo",
      required: false,
      default: null,
    },

    partyName: {
      type: String,
      trim: true,
      default: "",
    },

    containerSize: {
      type: String,
      trim: true,
      default: "22F",
    },

    fromLocation: {
      type: String,
      trim: true,
      default: "",
    },

    toLocation: {
      type: String,
      trim: true,
      default: "",
    },

    // Odometer KM readings from Excel
    startKm: {
      type: Number,
      default: 0,
    },

    returnKm: {
      type: Number,
      default: 0,
    },

    totalKm: {
      type: Number,
      default: 0,
    },

    driverPhone: {
      type: String,
      trim: true,
      default: "",
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

    advanceDate: {
      type: Date,
      default: null,
    },

    // 2. Driver Road Expenses with receipts/slips
    dieselExpense: {
      type: Number,
      default: 0,
      min: 0,
    },

    dieselDate: {
      type: Date,
      default: null,
    },

    tollExpense: {
      type: Number,
      default: 0,
      min: 0,
    },

    tollDate: {
      type: Date,
      default: null,
    },

    ureaExpense: {
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
    },

    deliveryDate: {
      type: Date,
      default: null,
    },

    podDate: {
      type: String,
      trim: true,
      default: "",
    },

    rs: {
      type: Number,
      default: 0,
    },

    accountAdvance: {
      type: Number,
      default: 0,
    },

    acDate: {
      type: Date,
      default: null,
    },

    extraExpense: {
      type: Number,
      default: 0,
    },

    extraDate: {
      type: Date,
      default: null,
    },

    finalAmount: {
      type: Number,
      default: 0,
    },

    isOk: {
      type: Boolean,
      default: false,
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
