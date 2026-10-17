const mongoose = require("mongoose");

const inventoryItemSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    itemCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    itemName: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      enum: [
        "tyre",
        "lubricant",
        "electrical",
        "spare",
        "filter",
        "liquid",
        "other",
      ],
      default: "other",
    },

    unit: {
      type: String,
      enum: [
        "pcs",
        "piece",
        "set",
        "liter",
        "kg",
        "meter",
        "box",
        "pair",
        "other",
      ],
      required: true,
    },

    openingStock: {
      type: Number,
      default: 0,
      min: 0,
    },

    currentStock: {
      type: Number,
      default: 0,
      min: 0,
    },

    minimumStock: {
      type: Number,
      default: 0,
      min: 0,
    },

    purchasePrice: {
      type: Number,
      default: 0,
      min: 0,
    },

    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      default: null,
    },

    description: {
      type: String,
      trim: true,
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

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

inventoryItemSchema.index(
  {
    companyId: 1,
    itemCode: 1,
  },
  {
    unique: true,
  },
);

inventoryItemSchema.index({
  companyId: 1,
  itemName: 1,
});

inventoryItemSchema.index({
  companyId: 1,
  category: 1,
});

module.exports = mongoose.model("InventoryItem", inventoryItemSchema);
