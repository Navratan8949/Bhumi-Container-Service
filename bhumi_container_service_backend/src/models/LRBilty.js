const mongoose = require("mongoose");

const lrBiltySchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: false,
    },

    // Original Booking
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    // LR Information
    lrNumber: {
      type: String,
      required: false,
      trim: true,
      uppercase: true,
    },

    lrDate: {
      type: Date,
      required: false,
    },

    center: {
      type: String,
      enum: ["PLANT", "GODOWN", "MARKET"],
      default: "PLANT",
      trim: true,
      uppercase: true,
    },

    freightBy: {
      type: String,
      enum: ["TBB", "PAID", "TO_PAY"],
      default: "TBB",
      trim: true,
      uppercase: true,
    },

    // Snapshot from Booking / Supply Order
    partyId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    consignorId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    consigneeId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    productId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    fromCityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    toCityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: false,
    },

    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      required: false,
    },

    // Cargo
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

    article: {
      type: String,
      trim: true,
    },

    // Invoice
    invoiceNumber: {
      type: String,
      trim: true,
    },

    invoiceDate: {
      type: Date,
      default: null,
    },

    partyName: {
      type: String,
      trim: true,
      default: "",
    },

    consignorName: {
      type: String,
      trim: true,
      default: "",
    },

    consignorAddress: {
      type: String,
      trim: true,
      default: "",
    },

    consigneeName: {
      type: String,
      trim: true,
      default: "",
    },

    consigneeAddress: {
      type: String,
      trim: true,
      default: "",
    },

    fromCity: {
      type: String,
      trim: true,
      default: "",
    },

    toCity: {
      type: String,
      trim: true,
      default: "",
    },

    podUrl: {
      type: String,
      trim: true,
      default: "",
    },

    // Container & Customs Specifications (Bhumi Container Freight)
    containerNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },

    containerSize: {
      type: String,
      enum: ["20_ft", "40_ft", "40_ft_hc", "45_ft", "open_top", "flat_rack", "other", ""],
      default: "40_ft_hc",
    },

    containerType: {
      type: String,
      enum: ["standard", "reefer", "open_top", "flat_rack", "tank", "dry", ""],
      default: "standard",
    },

    customsSealNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },

    shippingLine: {
      type: String,
      trim: true,
      default: "",
    },

    // Loading / Unloading
    loadingWeight: {
      type: Number,
      default: 0,
      min: 0,
    },

    unloadingWeight: {
      type: Number,
      default: 0,
      min: 0,
    },

    unloadingDate: {
      type: Date,
      default: null,
    },

    // LR Status
    status: {
      type: String,
      enum: ["generated", "in_transit", "delivered", "cancelled"],
      default: "generated",
    },

    remarks: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

// One LR number per company
lrBiltySchema.index(
  {
    companyId: 1,
    lrNumber: 1,
  },
  {
    unique: true,
  },
);

// Optional Booking index
lrBiltySchema.index(
  {
    companyId: 1,
    bookingId: 1,
  },
  {
    sparse: true,
    partialFilterExpression: { bookingId: { $type: "objectId" } },
  },
);

lrBiltySchema.index({
  companyId: 1,
  containerNumber: 1,
});

module.exports = mongoose.model("LRBilty", lrBiltySchema);
