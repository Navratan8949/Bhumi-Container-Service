const mongoose = require("mongoose");

const lrBiltySchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: false,
    },

    // Original Booking
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: false,
    },

    // LR Information
    lrNumber: {
      type: String,
      required: false,
      trim: true,
      uppercase: true,
    },

    lrDate: {
      type: Date,
      required: false,
    },

    center: {
      type: String,
      enum: ["PLANT", "GODOWN", "MARKET"],
      default: "PLANT",
      trim: true,
      uppercase: true,
    },

    freightBy: {
      type: String,
      enum: ["TBB", "PAID", "TO_PAY"],
      default: "TBB",
      trim: true,
      uppercase: true,
    },

    // Snapshot from Booking / Supply Order
    partyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Party",
      default: null,
    },

    consignorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Consignor",
      default: null,
    },

    consigneeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Consignee",
      default: null,
    },

    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: false,
    },

    fromCityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "City",
      required: false,
    },

    toCityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "City",
      required: false,
    },

    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: false,
    },

    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      required: false,
    },

    // Cargo
    quantity: {
      type: Number,
      required: false,
      min: 0,
    },

    unit: {
      type: String,
      required: false,
      trim: true,
    },

    article: {
      type: String,
      trim: true,
    },

    // Invoice
    invoiceNumber: {
      type: String,
      trim: true,
    },

    invoiceDate: {
      type: Date,
      default: null,
    },

    // Loading / Unloading
    loadingWeight: {
      type: Number,
      default: 0,
      min: 0,
    },

    unloadingWeight: {
      type: Number,
      default: 0,
      min: 0,
    },

    unloadingDate: {
      type: Date,
      default: null,
    },

    // LR Status
    status: {
      type: String,
      enum: ["generated", "in_transit", "delivered", "cancelled"],
      default: "generated",
    },

    remarks: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

// One LR number per company
lrBiltySchema.index(
  {
    companyId: 1,
    lrNumber: 1,
  },
  {
    unique: true,
  },
);

// One Booking can have only one LR/Bilty
lrBiltySchema.index(
  {
    companyId: 1,
    bookingId: 1,
  },
  {
    unique: true,
  },
);

module.exports = mongoose.model("LRBilty", lrBiltySchema);
