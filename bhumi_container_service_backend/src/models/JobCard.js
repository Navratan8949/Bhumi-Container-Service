const mongoose = require("mongoose");

const jobCardSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    jobCardNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    jobCardType: {
      type: String,
      enum: [
        "routine_service",
        "preventive_pm",
        "highway_breakdown_sos",
        "accidental_bodywork",
        "tyre_overhaul",
      ],
      default: "routine_service",
    },

    priority: {
      type: String,
      enum: ["normal", "urgent", "emergency_sos"],
      default: "normal",
    },

    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
    },

    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      default: null,
    },

    odometerReading: {
      type: Number,
      required: true,
      min: 0,
    },

    inwardDate: {
      type: Date,
      default: Date.now,
      required: true,
    },

    workflowStage: {
      type: String,
      enum: [
        "vehicle_inward",
        "inspection_estimation",
        "parts_requisition",
        "under_repair",
        "qc_tested",
        "ready_gate_pass",
        "delivered_closed",
      ],
      default: "vehicle_inward",
    },

    mechanicName: {
      type: String,
      trim: true,
      default: "",
    },

    workshopVendor: {
      type: String,
      trim: true,
      default: "Bhumi In-House Workshop (Puzhal)",
    },

    complaints: {
      type: String,
      trim: true,
      default: "",
    },

    diagnosis: {
      type: String,
      trim: true,
      default: "",
    },

    actionTaken: {
      type: String,
      trim: true,
      default: "",
    },

    // ==========================================
    // Highway SOS & Breakdown Logging Fields
    // ==========================================
    isHighwaySOS: {
      type: Boolean,
      default: false,
    },

    breakdownLocation: {
      type: String,
      trim: true,
      default: "",
    },

    breakdownDateTime: {
      type: Date,
      default: null,
    },

    mechanicDispatchDateTime: {
      type: Date,
      default: null,
    },

    mechanicArrivalDateTime: {
      type: Date,
      default: null,
    },

    totalDowntimeHours: {
      type: Number,
      default: 0,
      min: 0,
    },

    towingRequired: {
      type: Boolean,
      default: false,
    },

    towingVendor: {
      type: String,
      trim: true,
      default: "",
    },

    // ==========================================
    // Financials
    // ==========================================
    partsCost: {
      type: Number,
      default: 0,
      min: 0,
    },

    labourCost: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalCost: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ==========================================
    // Gate Pass Details
    // ==========================================
    gatePassNumber: {
      type: String,
      trim: true,
      default: "",
    },

    gatePassIssuedAt: {
      type: Date,
      default: null,
    },

    remarks: {
      type: String,
      trim: true,
      default: "",
    },

    enteredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
  },
  {
    timestamps: true,
  },
);

jobCardSchema.index({ companyId: 1, jobCardNumber: 1 }, { unique: true });
jobCardSchema.index({ companyId: 1, vehicleId: 1, workflowStage: 1 });
jobCardSchema.index({ companyId: 1, isHighwaySOS: 1 });

module.exports = mongoose.model("JobCard", jobCardSchema);
