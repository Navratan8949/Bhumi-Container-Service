const mongoose = require("mongoose");

const driverSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    photo: {
      type: String,
      default: null,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    address: {
      type: String,
      trim: true,
    },

    aadhaarNumber: {
      type: String,
      trim: true,
    },

    panNumber: {
      type: String,
      trim: true,
      uppercase: true,
    },

    licenseNumber: {
      type: String,
      trim: true,
      uppercase: true,
    },

    licenseType: {
      type: String,
      default: "Heavy Commercial",
      trim: true,
    },

    licenseExpiryDate: {
      type: Date,
    },

    bloodGroup: {
      type: String,
      trim: true,
      default: "",
    },

    emergencyContactName: {
      type: String,
      trim: true,
      default: "",
    },

    emergencyContact: {
      type: String,
      trim: true,
      default: "",
    },

    dailyBataRate: {
      type: Number,
      default: 400,
      min: 0,
    },

    dateOfJoining: {
      type: Date,
      default: Date.now,
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

driverSchema.index({ companyId: 1, phone: 1 }, { unique: true });

driverSchema.index(
  { companyId: 1, licenseNumber: 1 },
  { unique: true, sparse: true },
);

module.exports = mongoose.model("Driver", driverSchema);
