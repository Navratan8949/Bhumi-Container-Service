const mongoose = require("mongoose");

const vehicleSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: false,
    },

    vehicleNumber: {
      type: String,
      required: false,
      trim: true,
      uppercase: true,
    },

    vehicleType: {
      type: String,
      required: false,
      trim: true,
    },

    make: {
      type: String,
      trim: true,
      default: "Tata Motors",
    },

    model: {
      type: String,
      trim: true,
      default: "",
    },

    yearOfManufacture: {
      type: Number,
      default: new Date().getFullYear(),
    },

    fuelType: {
      type: String,
      enum: ["Diesel", "CNG", "LNG", "Electric", "Other"],
      default: "Diesel",
    },

    payloadCapacity: {
      type: Number,
      default: 20,
      min: 0,
    },

    chassisNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },

    engineNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },

    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      default: null,
    },

    ownerType: {
      type: String,
      enum: ["own", "market"],
      default: "own",
    },

    ownerName: {
      type: String,
      trim: true,
    },

    ownerPhone: {
      type: String,
      trim: true,
    },

    currentOdometer: {
      type: Number,
      default: 0,
      min: 0,
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      set: (v) =>
        !v || (typeof v === "string" && (!v.trim() || v.trim().toLowerCase().startsWith("select")))
          ? "active"
          : typeof v === "string"
            ? v.trim().toLowerCase()
            : v,
    },
  },
  {
    timestamps: true,
  },
);

vehicleSchema.index({ companyId: 1, vehicleNumber: 1 }, { unique: true });

module.exports = mongoose.model("Vehicle", vehicleSchema);
