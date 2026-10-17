const mongoose = require("mongoose");

const systemSettingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: "global_settings",
      unique: true,
    },

    // Global SMTP Configuration
    smtpHost: {
      type: String,
      trim: true,
      default: null,
    },

    smtpPort: {
      type: Number,
      default: 587,
    },

    smtpUser: {
      type: String,
      trim: true,
      default: null,
    },

    smtpPass: {
      type: String,
      trim: true,
      default: null,
    },

    smtpFromEmail: {
      type: String,
      trim: true,
      default: null,
    },

    // Global Default Remittance & Bank Details
    defaultBankName: {
      type: String,
      trim: true,
      default: null,
    },

    defaultAccountNumber: {
      type: String,
      trim: true,
      default: null,
    },

    defaultIfscCode: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
    },

    defaultBranchName: {
      type: String,
      trim: true,
      default: null,
    },

    defaultUpiId: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("SystemSetting", systemSettingSchema);
