const mongoose = require("mongoose");

const vendorSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: false,
    },

    vendorCode: {
      type: String,
      required: false,
      trim: true,
      uppercase: true,
    },

    vendorName: {
      type: String,
      required: false,
      trim: true,
    },

    vendorType: {
      type: String,
      enum: [
        "transporter",
        "workshop",
        "fuel_station",
        "tyre_vendor",
        "supplier",
        "other",
      ],
      required: false,
    },

    phone: {
      type: String,
      trim: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
    },

    address: {
      type: String,
      trim: true,
    },

    city: {
      type: String,
      trim: true,
    },

    state: {
      type: String,
      trim: true,
    },

    gstNumber: {
      type: String,
      trim: true,
      uppercase: true,
    },

    panNumber: {
      type: String,
      trim: true,
      uppercase: true,
    },

    bankName: {
      type: String,
      trim: true,
    },

    accountNumber: {
      type: String,
      trim: true,
    },

    ifscCode: {
      type: String,
      trim: true,
      uppercase: true,
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

    remarks: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

// Same company me vendorCode unique
vendorSchema.index({ companyId: 1, vendorCode: 1 }, { unique: true });

// Same company me same vendor name duplicate avoid
vendorSchema.index({ companyId: 1, vendorName: 1 });

module.exports = mongoose.model("Vendor", vendorSchema);
