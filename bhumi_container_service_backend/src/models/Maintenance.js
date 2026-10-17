const mongoose = require("mongoose");

const maintenanceSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
    },

    maintenanceDate: {
      type: Date,
      required: true,
    },

    odometerReading: {
      type: Number,
      required: true,
      min: 0,
    },

    serviceType: {
      type: String,
      enum: [
        "general_service",
        "engine_oil",
        "engine_service",
        "brake_service",
        "clutch_work",
        "battery",
        "suspension",
        "electrical",
        "body_work",
        "tyre_work",
        "repair",
        "other",
      ],
      required: true,
    },

    workshopVendor: {
      type: String,
      trim: true,
      default: "",
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    partsUsed: [
      {
        itemId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "InventoryItem",
          default: null,
        },
        partName: {
          type: String,
          trim: true,
          default: "",
        },
        quantity: {
          type: Number,
          default: 1,
          min: 0.01,
        },
        unitCost: {
          type: Number,
          default: 0,
          min: 0,
        },
        totalCost: {
          type: Number,
          default: 0,
          min: 0,
        },
      },
    ],

    partsCost: {
      type: Number,
      min: 0,
      default: 0,
    },

    labourCost: {
      type: Number,
      min: 0,
      default: 0,
    },

    totalCost: {
      type: Number,
      min: 0,
      required: true,
    },

    nextServiceDate: {
      type: Date,
      default: null,
    },

    nextServiceOdometer: {
      type: Number,
      min: 0,
      default: null,
    },

    paymentMode: {
      type: String,
      enum: ["cash", "credit", "card", "upi", "company_account"],
      default: "cash",
    },

    invoiceNumber: {
      type: String,
      trim: true,
      default: "",
    },

    status: {
      type: String,
      enum: ["completed", "pending", "cancelled"],
      default: "completed",
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

maintenanceSchema.index({
  companyId: 1,
  vehicleId: 1,
  maintenanceDate: -1,
});

maintenanceSchema.index({
  companyId: 1,
  invoiceNumber: 1,
});

module.exports = mongoose.model("Maintenance", maintenanceSchema);
