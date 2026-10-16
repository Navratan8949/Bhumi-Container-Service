const mongoose = require("mongoose");

const fuelSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
    },

    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      default: null,
    },

    fuelDate: {
      type: Date,
      required: true,
    },

    fuelType: {
      type: String,
      enum: ["diesel", "petrol", "cng", "other"],
      default: "diesel",
    },

    quantity: {
      type: Number,
      required: true,
      min: 0,
    },

    ratePerLiter: {
      type: Number,
      required: true,
      min: 0,
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    odometerReading: {
      type: Number,
      required: true,
      min: 0,
    },

    fuelStationVendor: {
      type: String,
      trim: true,
    },

    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      default: null,
    },

    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
    },

    receiptNumber: {
      type: String,
      trim: true,
    },

    paymentMode: {
      type: String,
      enum: ["cash", "credit", "card", "upi", "company_account"],
      default: "cash",
    },

    notes: {
      type: String,
      trim: true,
    },

    enteredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// Company + vehicle + date index
fuelSchema.index({
  companyId: 1,
  vehicleId: 1,
  fuelDate: -1,
});

// Receipt number unique only when provided
fuelSchema.index(
  {
    companyId: 1,
    receiptNumber: 1,
  },
  {
    unique: true,
    sparse: true,
  },
);

module.exports = mongoose.model("Fuel", fuelSchema);
