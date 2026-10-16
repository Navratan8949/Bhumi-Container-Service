const mongoose = require("mongoose");

const doReceivedSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    doNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    doDate: {
      type: Date,
      required: true,
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

    quantity: {
      type: Number,
      required: true,
      min: 0,
    },

    unit: {
      type: String,
      required: true,
      trim: true,
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
      enum: ["received", "pending", "converted", "cancelled"],
      default: "received",
    },
  },
  {
    timestamps: true,
  },
);

doReceivedSchema.index({ companyId: 1, doNumber: 1 }, { unique: true });

module.exports = mongoose.model("DOReceived", doReceivedSchema);
