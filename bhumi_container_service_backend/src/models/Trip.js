const mongoose = require("mongoose");

const tripSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: false,
    },

    tripNumber: {
      type: String,
      required: false,
      trim: true,
      uppercase: true,
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

    // Container & Customs Specifications
    containerNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },

    containerSize: {
      type: String,
      trim: true,
      default: "20 Feet",
    },

    containerType: {
      type: String,
      trim: true,
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

    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: false,
    },

    truckNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },

    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      required: false,
    },

    driverName: {
      type: String,
      trim: true,
      default: "",
    },

    driverPhone: {
      type: String,
      trim: true,
      default: "",
    },

    advanceMemoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdvanceMemo",
      default: null,
    },

    advanceMemoNumber: {
      type: String,
      trim: true,
      default: "",
    },

    brokerName: {
      type: String,
      trim: true,
      default: "",
    },

    dispatchDate: {
      type: Date,
      required: false,
    },

    tripStartDate: {
      type: Date,
      default: null,
    },

    deliveryDate: {
      type: Date,
      default: null,
    },

    transitDays: {
      type: Number,
      default: 0,
      min: 0,
    },

    expectedDeliveryDate: {
      type: Date,
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

    startingOdometer: {
      type: Number,
      default: null,
      min: 0,
    },

    endingOdometer: {
      type: Number,
      default: null,
      min: 0,
    },

    status: {
      type: String,
      enum: [
        "planned",
        "dispatched",
        "in_transit",
        "delivered",
        "completed",
        "cancelled",
      ],
      default: "planned",
    },

    // Total Lorry & Sheet Specifications
    partyName: {
      type: String,
      trim: true,
      default: "",
    },

    ownerName: {
      type: String,
      trim: true,
      default: "",
    },

    ownerType: {
      type: String,
      enum: ["company", "market", ""],
      default: "company",
    },

    rate: {
      type: Number,
      default: 0,
      min: 0,
    },

    advanceAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    advanceDate: {
      type: Date,
      default: null,
    },

    balanceAmount: {
      type: Number,
      default: 0,
    },

    podDate: {
      type: String,
      trim: true,
      default: "",
    },

    podStatus: {
      type: String,
      trim: true,
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
      required: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

tripSchema.virtual("isDelayed").get(function () {
  if (["delivered", "completed", "cancelled"].includes(this.status)) return false;
  if (!this.expectedDeliveryDate) return false;
  const exp = new Date(this.expectedDeliveryDate);
  const now = new Date();
  exp.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return now > exp;
});

tripSchema.virtual("daysLate").get(function () {
  if (["delivered", "completed", "cancelled"].includes(this.status)) return 0;
  if (!this.expectedDeliveryDate) return 0;
  const exp = new Date(this.expectedDeliveryDate);
  const now = new Date();
  exp.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  if (now <= exp) return 0;
  return Math.max(1, Math.round((now - exp) / (1000 * 60 * 60 * 24)));
});

// Unique trip number per company
tripSchema.index(
  {
    companyId: 1,
    tripNumber: 1,
  },
  {
    unique: true,
  },
);

// One booking should have only one active trip
tripSchema.index({
  companyId: 1,
  bookingId: 1,
  status: 1,
});

tripSchema.index({
  companyId: 1,
  vehicleId: 1,
  status: 1,
});

tripSchema.index({
  companyId: 1,
  driverId: 1,
  status: 1,
});

tripSchema.index({
  companyId: 1,
  dispatchDate: -1,
});

tripSchema.index({
  companyId: 1,
  containerNumber: 1,
});

module.exports = mongoose.model("Trip", tripSchema);
