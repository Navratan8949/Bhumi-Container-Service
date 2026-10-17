const mongoose = require("mongoose");

const vehicleDriverAssignmentSchema = new mongoose.Schema(
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

    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      required: true,
    },

    assignedDate: {
      type: Date,
      required: true,
    },

    unassignedDate: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: ["active", "completed", "cancelled"],
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

    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// Current active assignment lookup
vehicleDriverAssignmentSchema.index({
  companyId: 1,
  vehicleId: 1,
  status: 1,
});

vehicleDriverAssignmentSchema.index({
  companyId: 1,
  driverId: 1,
  status: 1,
});

vehicleDriverAssignmentSchema.index({
  companyId: 1,
  assignedDate: -1,
});

module.exports = mongoose.model(
  "VehicleDriverAssignment",
  vehicleDriverAssignmentSchema,
);
