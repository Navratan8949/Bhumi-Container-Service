const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    customerCode: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },

    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    // Alias / secondary compatibility field
    customerName: {
      type: String,
      trim: true,
      default: function () {
        return this.name || "";
      },
    },

    contactPerson: {
      type: String,
      trim: true,
      default: "",
    },

    phone: {
      type: String,
      trim: true,
      default: "",
    },

    alternatePhone: {
      type: String,
      trim: true,
      default: "",
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },

    address: {
      type: String,
      trim: true,
      default: "",
    },

    city: {
      type: String,
      trim: true,
      default: "",
    },

    state: {
      type: String,
      trim: true,
      default: "",
    },

    pincode: {
      type: String,
      trim: true,
      default: "",
    },

    gstNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },

    panNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },

    creditDays: {
      type: Number,
      default: 30,
      min: 0,
    },

    creditLimit: {
      type: Number,
      default: 0,
      min: 0,
    },

    paymentTerms: {
      type: String,
      enum: [
        "immediate",
        "credit_15",
        "credit_30",
        "credit_45",
        "credit_60",
        "against_pod",
        "advance",
        "other",
      ],
      default: "credit_30",
      set: (v) =>
        !v || (typeof v === "string" && (!v.trim() || v.trim().toLowerCase().startsWith("select")))
          ? "credit_30"
          : typeof v === "string"
            ? v.trim().toLowerCase()
            : v,
    },

    openingBalance: {
      type: Number,
      default: 0,
    },

    balanceType: {
      type: String,
      enum: ["debit", "credit"],
      default: "debit", // debit: customer owes us, credit: advance balance
      set: (v) =>
        !v || (typeof v === "string" && (!v.trim() || v.trim().toLowerCase().startsWith("select")))
          ? "debit"
          : typeof v === "string"
            ? v.trim().toLowerCase()
            : v,
    },

    bankName: {
      type: String,
      trim: true,
      default: "",
    },

    accountNumber: {
      type: String,
      trim: true,
      default: "",
    },

    ifscCode: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      set: (v) =>
        !v || (typeof v === "string" && (!v.trim() || v.trim().toLowerCase().startsWith("select")))
          ? "active"
          : typeof v === "string"
            ? v.trim().toLowerCase()
            : v,
    },

    notes: {
      type: String,
      trim: true,
      default: "",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for partyName
customerSchema.virtual("partyName").get(function () {
  return this.name;
});

// Sync customerName on pre-save
customerSchema.pre("save", function () {
  if (this.name && !this.customerName) {
    this.customerName = this.name;
  }
});

// Compound indexes
customerSchema.index({ companyId: 1, name: 1 });
customerSchema.index({ companyId: 1, customerCode: 1 });
customerSchema.index({ companyId: 1, phone: 1 });
customerSchema.index({ companyId: 1, status: 1 });
customerSchema.index({ companyId: 1, city: 1 });

const Customer =
  mongoose.models.Customer || mongoose.model("Customer", customerSchema, "parties");

// Also register Party model pointing to same collection for backward compatibility with existing populate
if (!mongoose.models.Party) {
  mongoose.model("Party", customerSchema, "parties");
}

module.exports = Customer;
