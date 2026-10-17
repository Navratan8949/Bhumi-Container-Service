const mongoose = require("mongoose");

const containerDetentionSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    detentionNumber: {
      type: String,
      trim: true,
      uppercase: true,
    },

    containerNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    customsSealNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },

    shippingLine: {
      type: String,
      trim: true,
      default: "Maersk Line",
    },

    containerSize: {
      type: String,
      enum: ["20_ft", "40_ft", "40_ft_hc", "45_ft", "other"],
      default: "40_ft_hc",
    },

    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
    },

    lrBiltyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LRBilty",
      default: null,
    },

    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      default: null,
    },

    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      default: null,
    },

    portName: {
      type: String,
      trim: true,
      default: "Chennai Port (CITPL)",
    },

    portGateOutDate: {
      type: Date,
      required: true,
    },

    freeDays: {
      type: Number,
      required: true,
      default: 14,
      min: 1,
    },

    freeDaysExpiryDate: {
      type: Date,
    },

    emptyReturnDate: {
      type: Date,
      default: null,
    },

    emptyReturnYard: {
      type: String,
      trim: true,
      default: "",
    },

    perDayDetentionRate: {
      type: Number,
      default: 3000,
      min: 0,
    },

    daysElapsed: {
      type: Number,
      default: 0,
    },

    daysRemaining: {
      type: Number,
      default: 14,
    },

    detentionDays: {
      type: Number,
      default: 0,
    },

    detentionAmount: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: [
        "within_free_time",
        "expiring_soon",
        "detention_active",
        "returned_clean",
        "settled",
      ],
      default: "within_free_time",
    },

    remarks: {
      type: String,
      trim: true,
      default: "",
    },

    enteredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
containerDetentionSchema.index({ companyId: 1, containerNumber: 1 });
containerDetentionSchema.index({ companyId: 1, freeDaysExpiryDate: 1 });
containerDetentionSchema.index({ companyId: 1, status: 1 });

module.exports = mongoose.model("ContainerDetention", containerDetentionSchema);
