const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    bookingNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    bookingDate: {
      type: Date,
      required: true,
    },

    lrNumber: {
      type: String,
      trim: true,
      uppercase: true,
    },

    supplyOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SupplyOrder",
      default: null,
    },

    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      default: null,
    },

    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      default: null,
    },

    fromCityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "City",
      required: true,
    },

    toCityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "City",
      required: true,
    },

    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 0,
    },

    unit: {
      type: String,
      required: true,
      trim: true,
    },

    article: {
      type: String,
      trim: true,
    },

    invoiceNumber: {
      type: String,
      trim: true,
    },

    invoiceDate: {
      type: Date,
      default: null,
    },

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

    billingPartyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Party",
      default: null,
    },

    billingRate: {
      type: Number,
      default: 0,
      min: 0,
    },

    billingHammali: {
      type: Number,
      default: 0,
      min: 0,
    },

    billingDetention: {
      type: Number,
      default: 0,
      min: 0,
    },

    transporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      default: null,
    },

    transporterLoading: {
      type: Number,
      default: 0,
      min: 0,
    },

    transporterUnloading: {
      type: Number,
      default: 0,
      min: 0,
    },

    shortage: {
      type: Number,
      default: 0,
      min: 0,
    },

    shortageDetails: {
      type: String,
      trim: true,
    },

    hireRate: {
      type: Number,
      default: 0,
      min: 0,
    },

    transporterHammali: {
      type: Number,
      default: 0,
      min: 0,
    },

    transporterDetention: {
      type: Number,
      default: 0,
      min: 0,
    },

    status: {
      type: String,
      enum: ["booked", "in_transit", "delivered", "cancelled"],
      default: "booked",
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

bookingSchema.index({ companyId: 1, bookingNumber: 1 }, { unique: true });

bookingSchema.index({ companyId: 1, lrNumber: 1 }, { unique: true });

module.exports = mongoose.model("Booking", bookingSchema);
