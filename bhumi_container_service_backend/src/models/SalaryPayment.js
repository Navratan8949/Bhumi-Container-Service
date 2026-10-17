const mongoose = require("mongoose");

const salaryPaymentSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    paymentNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    paymentDate: {
      type: Date,
      required: true,
    },

    payrollId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payroll",
      required: true,
    },

    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    paymentMode: {
      type: String,
      enum: [
        "cash",
        "bank_transfer",
        "upi",
        "cheque",
        "neft",
        "rtgs",
        "imps",
        "other",
      ],
      required: true,
    },

    referenceNumber: {
      type: String,
      trim: true,
      default: "",
    },

    remarks: {
      type: String,
      trim: true,
      default: "",
    },

    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

salaryPaymentSchema.index({ companyId: 1, paymentNumber: 1 }, { unique: true });

salaryPaymentSchema.index({
  companyId: 1,
  payrollId: 1,
  paymentDate: -1,
});

module.exports = mongoose.model("SalaryPayment", salaryPaymentSchema);
