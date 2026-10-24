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
      default: null,
    },

    lrBiltyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LRBilty",
      default: null,
    },

    partyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
    },

    customerName: {
      type: String,
      trim: true,
      default: "",
    },

    partyName: {
      type: String,
      trim: true,
      default: "",
    },

    customerAddress: {
      type: String,
      trim: true,
      default: "",
    },

    customerPhone: {
      type: String,
      trim: true,
      default: "",
    },

    customerGst: {
      type: String,
      trim: true,
      default: "",
    },

    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      default: null,
    },

    containerSize: {
      type: String,
      trim: true,
      default: "",
    },

    fromLocation: {
      type: String,
      trim: true,
      default: "",
    },

    toLocation: {
      type: String,
      trim: true,
      default: "",
    },

    quantity: {
      type: Number,
      required: false,
      min: 0,
      default: 1,
    },

    unit: {
      type: String,
      required: false,
      trim: true,
      default: "TRIP",
    },

    freightRate: {
      type: Number,
      required: false,
      min: 0,
      default: 0,
    },

    freightAmount: {
      type: Number,
      required: false,
      min: 0,
      default: 0,
    },

    advanceReceived: {
      type: Number,
      default: 0,
      min: 0,
    },

    advanceDate: {
      type: Date,
      default: null,
    },

    bankAccountName: {
      type: String,
      trim: true,
      default: "",
    },

    munshiyanaML: {
      type: Number,
      default: 0,
      min: 0,
    },

    tdsAmount: {
      type: Number,
      default: 0,
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

    debitAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    kundi: {
      type: Number,
      default: 0,
      min: 0,
    },

    taxableAmount: {
      type: Number,
      required: false,
      min: 0,
      default: 0,
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
      default: 0,
    },

    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    paymentDate: {
      type: Date,
      default: null,
    },

    paymentMode: {
      type: String,
      trim: true,
      default: "",
    },

    referenceNumber: {
      type: String,
      trim: true,
      default: "",
    },

    outstandingAmount: {
      type: Number,
      required: false,
      min: 0,
      default: 0,
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

// One invoice per booking (only for actual ObjectId bookings)
customerInvoiceSchema.index(
  {
    companyId: 1,
    bookingId: 1,
  },
  {
    unique: true,
    partialFilterExpression: { bookingId: { $type: "objectId" } },
  },
);

// Party invoice listing
customerInvoiceSchema.index({
  companyId: 1,
  partyId: 1,
  invoiceDate: -1,
});

module.exports = mongoose.model("CustomerInvoice", customerInvoiceSchema);
