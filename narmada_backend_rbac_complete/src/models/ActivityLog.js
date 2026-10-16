const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: false,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // Could be null for system actions or login before auth
    },
    action: {
      type: String,
      required: true,
      enum: ["CREATE", "UPDATE", "DELETE", "LOGIN", "LOGOUT", "OTHER"],
    },
    entity: {
      type: String,
      required: true,
      // e.g., 'bookings', 'users', 'trips', etc.
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    },
    description: {
      type: String,
      required: false,
    },
    ipAddress: {
      type: String,
      required: false,
    },
    endpoint: {
      type: String,
      required: false,
    },
    method: {
      type: String,
      required: false,
    },
    changes: {
      type: mongoose.Schema.Types.Mixed, // To store what changed, optional
      required: false,
    },
  },
  {
    timestamps: true,
  },
);

const ActivityLog = mongoose.model("ActivityLog", activityLogSchema);

module.exports = ActivityLog;
