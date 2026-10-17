const mongoose = require("mongoose");

const payrollSchema = new mongoose.Schema(
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

    payrollMonth: {
      type: String,
      required: true,
      trim: true,
    },

    workingDays: {
      type: Number,
      required: true,
      min: 0,
    },

    presentDays: {
      type: Number,
      required: true,
      min: 0,
    },

    leaveDays: {
      type: Number,
      default: 0,
      min: 0,
    },

    basicSalary: {
      type: Number,
      required: true,
      min: 0,
    },

    earnedBasicSalary: {
      type: Number,
      required: true,
      min: 0,
    },

    overtimeAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    allowances: {
      type: Number,
      default: 0,
      min: 0,
    },

    advanceDeduction: {
      type: Number,
      default: 0,
      min: 0,
    },

    otherDeduction: {
      type: Number,
      default: 0,
      min: 0,
    },

    grossSalary: {
      type: Number,
      required: true,
      min: 0,
    },

    totalDeduction: {
      type: Number,
      required: true,
      min: 0,
    },

    netSalary: {
      type: Number,
      required: true,
      min: 0,
    },

    paymentStatus: {
      type: String,
      enum: ["unpaid", "partial", "paid"],
      default: "unpaid",
    },

    status: {
      type: String,
      enum: ["draft", "processed", "cancelled"],
      default: "draft",
    },

    remarks: {
      type: String,
      trim: true,
      default: "",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

payrollSchema.index(
  {
    companyId: 1,
    employeeId: 1,
    payrollMonth: 1,
  },
  {
    unique: true,
  },
);

payrollSchema.index({
  companyId: 1,
  payrollMonth: 1,
});

module.exports = mongoose.model("Payroll", payrollSchema);
