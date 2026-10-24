const mongoose = require("mongoose");

const vehicleDocumentSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: false,
      default: null,
    },

    truckNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },

    ownerType: {
      type: String,
      enum: ["own", "market", "company"],
      default: "own",
    },

    brokerName: {
      type: String,
      trim: true,
      default: "",
    },

    documentType: {
      type: String,
      enum: [
        "rc",
        "insurance",
        "fitness",
        "permit",
        "puc",
        "national_permit",
        "driver_license",
        "pan_card",
        "tds_declaration",
        "bank_passbook",
        "other",
      ],
      required: true,
    },

    documentNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    issueDate: {
      type: Date,
      default: null,
    },

    expiryDate: {
      type: Date,
      required: true,
    },

    issuingAuthority: {
      type: String,
      trim: true,
      default: "",
    },

    documentFile: {
      type: String,
      default: null,
    },

    status: {
      type: String,
      enum: ["active", "expired", "cancelled"],
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

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// Same document number cannot repeat within company
vehicleDocumentSchema.index(
  {
    companyId: 1,
    documentNumber: 1,
  },
  {
    unique: true,
  },
);

vehicleDocumentSchema.index({
  companyId: 1,
  vehicleId: 1,
});

vehicleDocumentSchema.index({
  companyId: 1,
  documentType: 1,
});

vehicleDocumentSchema.index({
  companyId: 1,
  expiryDate: 1,
});

module.exports = mongoose.model("VehicleDocument", vehicleDocumentSchema);
