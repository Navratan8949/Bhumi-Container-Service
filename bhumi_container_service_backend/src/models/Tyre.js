const mongoose = require("mongoose");

const tyreSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    tyreNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    brand: {
      type: String,
      required: true,
      trim: true,
    },

    tyreSize: {
      type: String,
      required: true,
      trim: true,
    },

    tyreType: {
      type: String,
      enum: ["new", "used", "retreaded"],
      default: "new",
    },

    purchaseDate: {
      type: Date,
      default: null,
    },

    purchasePrice: {
      type: Number,
      min: 0,
      default: 0,
    },

    status: {
      type: String,
      enum: ["in_stock", "fitted", "removed", "repair", "retread", "scrapped"],
      default: "in_stock",
    },

    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      default: null,
    },

    position: {
      type: String,
      trim: true,
      default: null,
    },

    fittingDate: {
      type: Date,
      default: null,
    },

    fittingOdometer: {
      type: Number,
      min: 0,
      default: null,
    },

    remarks: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true },
);

tyreSchema.index({ companyId: 1, tyreNumber: 1 }, { unique: true });

// Same vehicle position par sirf ek fitted tyre.
tyreSchema.index(
  { companyId: 1, vehicleId: 1, position: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: "fitted",
      vehicleId: { $type: "objectId" },
      position: { $type: "string" },
    },
  },
);

module.exports = mongoose.model("Tyre", tyreSchema);
