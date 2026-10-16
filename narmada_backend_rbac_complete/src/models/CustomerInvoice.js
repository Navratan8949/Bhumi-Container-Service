const mongoose = require("mongoose");

const customerInvoiceSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: false,
    },

    invoiceNumber: {
      type: String,
      required: false,
      trim: true,
      uppercase: true,
    },

    invoiceDate: {
      type: Date,
      required: false,
    },

    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: false,
    },

    lrBiltyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LRBilty",
      default: null,
    },

    partyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Party",
      required: false,
    },

    quantity: {
      type: Number,
      required: false,
      min: 0,
    },

    unit: {
      type: String,
      required: false,
      trim: true,
    },

    freightRate: {
      type: Number,
      required: false,
      min: 0,
    },

    freightAmount: {
      type: Number,
      required: false,
      min: 0,
    },

    hammali: {
      type: Number,
      default: 0,
      min: 0,
    },

    detention: {
      type: Number,
      default: 0,
      min: 0,
    },

    otherCharges: {
      type: Number,
      default: 0,
      min: 0,
    },

    taxableAmount: {
      type: Number,
      required: false,
      min: 0,
    },

    taxPercent: {
      type: Number,
      default: 0,
      min: 0,
    },

    taxAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    grandTotal: {
      type: Number,
      required: false,
      min: 0,
    },

    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    outstandingAmount: {
      type: Number,
      required: false,
      min: 0,
    },

    paymentStatus: {
      type: String,
      enum: ["unpaid", "partial", "paid"],
      default: "unpaid",
    },

    status: {
      type: String,
      enum: ["draft", "issued", "cancelled"],
      default: "issued",
    },

    remarks: {
      type: String,
      trim: true,
      default: "",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
  },
  {
    timestamps: true,
  },
);

// Invoice number unique per company
customerInvoiceSchema.index(
  {
    companyId: 1,
    invoiceNumber: 1,
  },
  {
    unique: true,
  },
);

// One invoice per booking for V1
customerInvoiceSchema.index(
  {
    companyId: 1,
    bookingId: 1,
  },
  {
    unique: true,
  },
);

// Party invoice listing
customerInvoiceSchema.index({
  companyId: 1,
  partyId: 1,
  invoiceDate: -1,
});

module.exports = mongoose.model("CustomerInvoice", customerInvoiceSchema);
