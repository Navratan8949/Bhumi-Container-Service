const mongoose = require("mongoose");

const customerPaymentSchema = new mongoose.Schema(
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

    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CustomerInvoice",
      required: true,
    },

    partyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Party",
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

    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

customerPaymentSchema.index(
  { companyId: 1, paymentNumber: 1 },
  { unique: true },
);

customerPaymentSchema.index({
  companyId: 1,
  invoiceId: 1,
  paymentDate: -1,
});

customerPaymentSchema.index({
  companyId: 1,
  partyId: 1,
  paymentDate: -1,
});

module.exports = mongoose.model("CustomerPayment", customerPaymentSchema);
