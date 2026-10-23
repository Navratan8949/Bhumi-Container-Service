const mongoose = require("mongoose");

const vendorBillSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: false,
    },

    billNumber: {
      type: String,
      required: false,
      trim: true,
      uppercase: true,
    },

    billDate: {
      type: Date,
      required: false,
    },

    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: false,
    },

    vendorName: {
      type: String,
      trim: true,
      default: "",
    },

    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      default: null,
    },

    vehicleNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },

    partyId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    partyName: {
      type: String,
      trim: true,
      default: "",
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

    deliveryDate: {
      type: Date,
      default: null,
    },

    podDate: {
      type: String,
      trim: true,
      default: "",
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

    hireRate: {
      type: Number,
      default: 0,
      min: 0,
    },

    hireAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    advanceDate: {
      type: Date,
      default: null,
    },

    loadingCharges: {
      type: Number,
      default: 0,
      min: 0,
    },

    unloadingCharges: {
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

    advanceDiesel: {
      type: Number,
      default: 0,
      min: 0,
    },

    advanceCash: {
      type: Number,
      default: 0,
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
      default: 0,
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

// Unique bill number per company
vendorBillSchema.index({ companyId: 1, billNumber: 1 }, { unique: true });

// One vendor bill per booking (only when bookingId is an ObjectId)
vendorBillSchema.index(
  { companyId: 1, bookingId: 1 },
  { unique: true, partialFilterExpression: { bookingId: { $type: "objectId" } } },
);

// Vendor bill search
vendorBillSchema.index({
  companyId: 1,
  vendorId: 1,
  billDate: -1,
});

module.exports = mongoose.model("VendorBill", vendorBillSchema);
