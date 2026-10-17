const mongoose = require("mongoose");

const preventiveScheduleSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    ruleName: {
      type: String,
      required: true,
      trim: true,
    },

    serviceType: {
      type: String,
      enum: [
        "engine_oil",
        "general_service",
        "engine_service",
        "brake_service",
        "clutch_work",
        "battery",
        "suspension",
        "electrical",
        "tyre_work",
        "other",
      ],
      required: true,
    },

    intervalKm: {
      type: Number,
      required: true,
      default: 15000,
      min: 100,
    },

    intervalDays: {
      type: Number,
      default: 90,
      min: 1,
    },

    alertThresholdKm: {
      type: Number,
      default: 500,
      min: 0,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  {
    timestamps: true,
  },
);

preventiveScheduleSchema.index({ companyId: 1, serviceType: 1 });
preventiveScheduleSchema.index({ companyId: 1, status: 1 });

module.exports = mongoose.model("PreventiveSchedule", preventiveScheduleSchema);
