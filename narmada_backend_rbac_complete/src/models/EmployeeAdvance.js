const mongoose = require("mongoose");

const employeeAdvanceSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    advanceNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },

    advanceDate: {
      type: Date,
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },

    recoveredAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    outstandingAmount: {
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

    status: {
      type: String,
      enum: ["pending", "partial", "recovered", "cancelled"],
      default: "pending",
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

employeeAdvanceSchema.index(
  {
    companyId: 1,
    advanceNumber: 1,
  },
  {
    unique: true,
  },
);

employeeAdvanceSchema.index({
  companyId: 1,
  employeeId: 1,
  advanceDate: -1,
});

employeeAdvanceSchema.index({
  companyId: 1,
  status: 1,
});

module.exports = mongoose.model("EmployeeAdvance", employeeAdvanceSchema);
