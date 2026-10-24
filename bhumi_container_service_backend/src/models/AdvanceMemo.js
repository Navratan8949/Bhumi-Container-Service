const mongoose = require("mongoose");

const advanceMemoSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    memoNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    date: {
      type: Date,
      required: true,
      default: Date.now,
    },

    partyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
    },

    partyName: {
      type: String,
      required: true,
      trim: true,
    },

    fromLocation: {
      type: String,
      required: true,
      trim: true,
    },

    toLocation: {
      type: String,
      required: true,
      trim: true,
    },

    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      default: null,
    },

    truckNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      default: null,
    },

    driverName: {
      type: String,
      trim: true,
      default: "",
    },

    driverPhone: {
      type: String,
      trim: true,
      default: "",
    },

    guaranteeWeight: {
      type: String,
      trim: true,
      default: "20 Feet", // e.g. "20 Feet", "22 Feet", "40 Feet", "32 Feet S"
    },

    totalFreight: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    advance: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    balance: {
      type: Number,
      required: true,
      default: 0,
    },

    remarks: {
      type: String,
      trim: true,
      default: "",
    },

    ownerType: {
      type: String,
      enum: ["company", "market", "own", "self"],
      default: "company",
    },

    brokerName: {
      type: String,
      trim: true,
      default: "",
    },

    status: {
      type: String,
      enum: ["pending", "dispatched", "delivered", "settled", "cancelled"],
      default: "pending",
    },

    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      default: null,
    },

    bankDetails: {
      bankName: { type: String, default: "AXIS BANK" },
      accountName: { type: String, default: "BHUMI CONTAINER SERVICE" },
      accountNumber: { type: String, default: "920020062626814" },
      ifscCode: { type: String, default: "UTIB0003260" },
    },

    // Market Lorry & Driver Documents
    rcDocument: {
      type: String,
      default: "",
    },

    driverLicenseDoc: {
      type: String,
      default: "",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

advanceMemoSchema.index({ companyId: 1, memoNumber: 1 }, { unique: true });
advanceMemoSchema.index({ companyId: 1, date: -1 });
advanceMemoSchema.index({ companyId: 1, truckNumber: 1 });
advanceMemoSchema.index({ companyId: 1, driverPhone: 1 });
advanceMemoSchema.index({ companyId: 1, status: 1 });

module.exports = mongoose.model("AdvanceMemo", advanceMemoSchema);
