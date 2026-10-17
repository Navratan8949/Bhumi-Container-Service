const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    expenseNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    expenseDate: {
      type: Date,
      required: true,
    },

    category: {
      type: String,
      enum: [
        "office_rent",
        "electricity",
        "internet",
        "telephone",
        "stationery",
        "tea_refreshment",
        "travel",
        "advertisement",
        "bank_charges",
        "legal",
        "insurance",
        "permit",
        "tax",
        "salary",
        "miscellaneous",
        "other",
      ],
      required: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
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

    vendorName: {
      type: String,
      trim: true,
      default: "",
    },

    receiptNumber: {
      type: String,
      trim: true,
      default: "",
    },

    attachment: {
      type: String,
      default: null,
    },

    status: {
      type: String,
      enum: ["active", "cancelled"],
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

// Unique expense number per company
expenseSchema.index({ companyId: 1, expenseNumber: 1 }, { unique: true });

// Expense reports
expenseSchema.index({
  companyId: 1,
  category: 1,
  expenseDate: -1,
});

expenseSchema.index({
  companyId: 1,
  expenseDate: -1,
});

module.exports = mongoose.model("Expense", expenseSchema);
