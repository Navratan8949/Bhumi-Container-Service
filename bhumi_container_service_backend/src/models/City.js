const mongoose = require("mongoose");

const citySchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    state: {
      type: String,
      required: true,
      trim: true,
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
  },
  {
    timestamps: true,
  },
);

citySchema.index({ companyId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("City", citySchema);
