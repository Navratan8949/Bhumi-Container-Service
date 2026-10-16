const mongoose = require("mongoose");

const vendorPaymentSchema = new mongoose.Schema(
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

    vendorBillId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VendorBill",
      required: true,
    },

    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
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

vendorPaymentSchema.index({ companyId: 1, paymentNumber: 1 }, { unique: true });

vendorPaymentSchema.index({
  companyId: 1,
  vendorBillId: 1,
  paymentDate: -1,
});

vendorPaymentSchema.index({
  companyId: 1,
  vendorId: 1,
  paymentDate: -1,
});

module.exports = mongoose.model("VendorPayment", vendorPaymentSchema);
