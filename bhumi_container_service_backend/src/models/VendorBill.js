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

// Unique bill number per company
vendorBillSchema.index({ companyId: 1, billNumber: 1 }, { unique: true });

// One vendor bill per booking
vendorBillSchema.index({ companyId: 1, bookingId: 1 }, { unique: true });

// Vendor bill search
vendorBillSchema.index({
  companyId: 1,
  vendorId: 1,
  billDate: -1,
});

module.exports = mongoose.model("VendorBill", vendorBillSchema);
