const mongoose = require("mongoose");

const supplyOrderSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    soNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    soDate: {
      type: Date,
      required: true,
    },

    doReceivedId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DOReceived",
      default: null,
    },

    partyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Party",
      required: true,
    },

    consignorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Consignor",
      default: null,
    },

    consigneeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Consignee",
      default: null,
    },

    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    fromCityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "City",
      required: true,
    },

    toCityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "City",
      required: true,
    },

    orderQuantity: {
      type: Number,
      required: true,
      min: 0,
    },

    bookedQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },

    pendingQuantity: {
      type: Number,
      required: true,
      min: 0,
    },

    unit: {
      type: String,
      required: true,
      trim: true,
    },

    rate: {
      type: Number,
      default: 0,
      min: 0,
    },

    expectedDeliveryDate: {
      type: Date,
      default: null,
    },

    remarks: {
      type: String,
      trim: true,
    },

    status: {
      type: String,
      enum: ["pending", "partial", "completed", "cancelled"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  },
);

supplyOrderSchema.index({ companyId: 1, soNumber: 1 }, { unique: true });

module.exports = mongoose.model("SupplyOrder", supplyOrderSchema);
