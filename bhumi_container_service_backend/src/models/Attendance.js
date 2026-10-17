const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },

    attendanceDate: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      enum: ["present", "absent", "half_day", "leave", "holiday"],
      required: true,
    },

    checkIn: {
      type: Date,
      default: null,
    },

    checkOut: {
      type: Date,
      default: null,
    },

    workingHours: {
      type: Number,
      default: 0,
      min: 0,
    },

    overtimeHours: {
      type: Number,
      default: 0,
      min: 0,
    },

    remarks: {
      type: String,
      trim: true,
      default: "",
    },

    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// Same employee cannot have duplicate attendance for same company/date
attendanceSchema.index(
  {
    companyId: 1,
    employeeId: 1,
    attendanceDate: 1,
  },
  {
    unique: true,
  },
);

attendanceSchema.index({
  companyId: 1,
  attendanceDate: -1,
});

attendanceSchema.index({
  companyId: 1,
  employeeId: 1,
  attendanceDate: -1,
});

module.exports = mongoose.model("Attendance", attendanceSchema);
