const mongoose = require("mongoose");

const emiScheduleSchema = new mongoose.Schema({
  installmentNumber: {
    type: Number,
    required: true,
  },
  dueDate: {
    type: Date,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "paid", "overdue"],
    default: "pending",
  },
  paidDate: {
    type: Date,
    default: null,
  },
  paymentMode: {
    type: String,
    enum: ["bank_transfer", "cheque", "upi", "cash", "auto_debit", "other", ""],
    default: "auto_debit",
  },
  referenceNumber: {
    type: String,
    trim: true,
    default: "",
  },
  notes: {
    type: String,
    trim: true,
    default: "",
  },
});

const loanSchema = new mongoose.Schema(
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
    bankName: {
      type: String,
      required: true,
      trim: true,
    },
    accountNumber: {
      type: String,
      trim: true,
      default: "",
    },
    loanAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    downPayment: {
      type: Number,
      default: 0,
      min: 0,
    },
    interestRate: {
      type: Number,
      default: 0,
      min: 0,
    },
    interestType: {
      type: String,
      enum: ["reducing_balance", "flat_rate"],
      default: "reducing_balance",
    },
    installments: {
      type: Number,
      required: true,
      min: 1,
    },
    paidInstallments: {
      type: Number,
      default: 0,
      min: 0,
    },
    emiAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    loanStartDate: {
      type: Date,
      default: Date.now,
    },
    loanEndDate: {
      type: Date,
      default: null,
    },
    emiDeductionDay: {
      type: Number,
      required: true,
      min: 1,
      max: 31,
      default: 5,
    },
    status: {
      type: String,
      enum: ["active", "closed", "defaulted"],
      default: "active",
    },
    totalInterest: {
      type: Number,
      default: 0,
    },
    totalPayable: {
      type: Number,
      default: 0,
    },
    pendingBalance: {
      type: Number,
      default: 0,
    },
    remarks: {
      type: String,
      trim: true,
      default: "",
    },
    schedule: [emiScheduleSchema],
    enteredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

loanSchema.index({ companyId: 1, status: 1 });
loanSchema.index({ companyId: 1, vehicleId: 1 });
loanSchema.index({ companyId: 1, emiDeductionDay: 1 });

module.exports = mongoose.model("Loan", loanSchema);
