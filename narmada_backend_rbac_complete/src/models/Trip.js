const mongoose = require("mongoose");

const tripSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: false,
    },

    tripNumber: {
      type: String,
      required: false,
      trim: true,
      uppercase: true,
    },

    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: false,
    },

    lrBiltyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LRBilty",
      default: null,
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

    dispatchDate: {
      type: Date,
      required: false,
    },

    tripStartDate: {
      type: Date,
      default: null,
    },

    deliveryDate: {
      type: Date,
      default: null,
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

    startingOdometer: {
      type: Number,
      default: null,
      min: 0,
    },

    endingOdometer: {
      type: Number,
      default: null,
      min: 0,
    },

    status: {
      type: String,
      enum: [
        "planned",
        "dispatched",
        "in_transit",
        "delivered",
        "completed",
        "cancelled",
      ],
      default: "planned",
    },

    remarks: {
      type: String,
      trim: true,
      default: "",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
  },
  {
    timestamps: true,
  },
);

// Unique trip number per company
tripSchema.index(
  {
    companyId: 1,
    tripNumber: 1,
  },
  {
    unique: true,
  },
);

// One booking should have only one active trip
tripSchema.index({
  companyId: 1,
  bookingId: 1,
  status: 1,
});

tripSchema.index({
  companyId: 1,
  vehicleId: 1,
  status: 1,
});

tripSchema.index({
  companyId: 1,
  driverId: 1,
  status: 1,
});

tripSchema.index({
  companyId: 1,
  dispatchDate: -1,
});

module.exports = mongoose.model("Trip", tripSchema);
