const mongoose = require("mongoose");

const tyreHistorySchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    tyreId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tyre",
      required: true,
    },

    action: {
      type: String,
      enum: [
        "purchased",
        "fitted",
        "removed",
        "repair",
        "retread",
        "returned_to_stock",
        "scrapped",
      ],
      required: true,
    },

    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      default: null,
    },

    position: {
      type: String,
      default: null,
    },

    actionDate: {
      type: Date,
      required: true,
    },

    odometerReading: {
      type: Number,
      min: 0,
      default: null,
    },

    cost: {
      type: Number,
      min: 0,
      default: 0,
    },

    reason: {
      type: String,
      trim: true,
      default: "",
    },

    remarks: {
      type: String,
      trim: true,
      default: "",
    },

    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

tyreHistorySchema.index({
  companyId: 1,
  tyreId: 1,
  actionDate: -1,
});

module.exports = mongoose.model("TyreHistory", tyreHistorySchema);
