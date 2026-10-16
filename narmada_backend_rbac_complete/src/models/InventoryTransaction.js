const mongoose = require("mongoose");

const inventoryTransactionSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryItem",
      required: true,
      index: true,
    },

    transactionType: {
      type: String,
      enum: ["stock_in", "stock_out", "adjustment"],
      required: true,
    },

    adjustmentType: {
      type: String,
      enum: ["increase", "decrease"],
      default: null,
    },

    quantity: {
      type: Number,
      required: true,
      min: 0.01,
    },

    previousStock: {
      type: Number,
      required: true,
      min: 0,
    },

    newStock: {
      type: Number,
      required: true,
      min: 0,
    },

    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
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

    referenceNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },

    transactionDate: {
      type: Date,
      required: true,
      default: Date.now,
    },

    purpose: {
      type: String,
      trim: true,
      default: "",
    },

    remarks: {
      type: String,
      trim: true,
      default: "",
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

inventoryTransactionSchema.index({
  companyId: 1,
  itemId: 1,
  transactionDate: -1,
});

module.exports = mongoose.model(
  "InventoryTransaction",
  inventoryTransactionSchema,
);
