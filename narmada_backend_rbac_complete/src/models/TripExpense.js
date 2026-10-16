const mongoose = require("mongoose");

const tripExpenseSchema = new mongoose.Schema(
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

    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      required: true,
    },

    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
    },

    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      default: null,
    },

    expenseDate: {
      type: Date,
      required: true,
    },

    expenseType: {
      type: String,
      enum: [
        "fuel",
        "toll",
        "driver_advance",
        "loading",
        "unloading",
        "weighbridge",
        "parking",
        "repair",
        "food",
        "other",
      ],
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
      default: "cash",
    },

    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      default: null,
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

tripExpenseSchema.index(
  {
    companyId: 1,
    expenseNumber: 1,
  },
  {
    unique: true,
  },
);

tripExpenseSchema.index({
  companyId: 1,
  tripId: 1,
  expenseDate: -1,
});

tripExpenseSchema.index({
  companyId: 1,
  expenseType: 1,
});

module.exports = mongoose.model("TripExpense", tripExpenseSchema);
