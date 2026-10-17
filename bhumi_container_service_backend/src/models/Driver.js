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

    licenseNumber: {
      type: String,
      trim: true,
      uppercase: true,
    },

    licenseExpiryDate: {
      type: Date,
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
