const SystemSetting = require("../models/SystemSetting");
const nodemailer = require("nodemailer");

/**
 * Get Global System Settings
 */
const getSettings = async (req, res) => {
  try {
    let settings = await SystemSetting.findOne({ key: "global_settings" }).lean();

    if (!settings) {
      settings = await SystemSetting.create({
        key: "global_settings",
        smtpHost: process.env.SMTP_HOST || "smtp.gmail.com",
        smtpPort: Number(process.env.SMTP_PORT || 587),
        smtpUser: process.env.SMTP_USER && !process.env.SMTP_USER.includes("example.com") ? process.env.SMTP_USER : "",
        smtpPass: process.env.SMTP_PASS && !process.env.SMTP_PASS.includes("your-") ? process.env.SMTP_PASS : "",
        smtpFromEmail: process.env.SMTP_FROM_EMAIL || "",
      });
      settings = settings.toObject ? settings.toObject() : settings;
    }

    // Return with indicator whether password is set
    return res.status(200).json({
      success: true,
      data: {
        ...settings,
        hasSmtpPass: Boolean(settings.smtpPass),
        smtpPass: settings.smtpPass ? "••••••••••••" : "",
      },
    });
  } catch (error) {
    console.error("Get settings error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load system settings",
      error: error.message,
    });
  }
};

/**
 * Update Global System Settings
 */
const updateSettings = async (req, res) => {
  try {
    const {
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPass,
      smtpFromEmail,
      defaultBankName,
      defaultAccountNumber,
      defaultIfscCode,
      defaultBranchName,
      defaultUpiId,
    } = req.body;

    let settings = await SystemSetting.findOne({ key: "global_settings" });

    if (!settings) {
      settings = new SystemSetting({ key: "global_settings" });
    }

    if (smtpHost !== undefined) settings.smtpHost = smtpHost?.trim() || null;
    if (smtpPort !== undefined) settings.smtpPort = Number(smtpPort) || 587;
    if (smtpUser !== undefined) settings.smtpUser = smtpUser?.trim() || null;
    if (smtpFromEmail !== undefined) settings.smtpFromEmail = smtpFromEmail?.trim() || null;

    // Only update password if a new non-masked password is provided
    if (smtpPass && smtpPass.trim() && !smtpPass.includes("••••")) {
      settings.smtpPass = smtpPass.trim();
    }

    // Bank Details
    if (defaultBankName !== undefined) settings.defaultBankName = defaultBankName?.trim() || null;
    if (defaultAccountNumber !== undefined) settings.defaultAccountNumber = defaultAccountNumber?.trim() || null;
    if (defaultIfscCode !== undefined) settings.defaultIfscCode = defaultIfscCode?.trim()?.toUpperCase() || null;
    if (defaultBranchName !== undefined) settings.defaultBranchName = defaultBranchName?.trim() || null;
    if (defaultUpiId !== undefined) settings.defaultUpiId = defaultUpiId?.trim() || null;

    await settings.save();

    return res.status(200).json({
      success: true,
      message: "Global system settings updated successfully",
      data: {
        ...settings.toObject(),
        hasSmtpPass: Boolean(settings.smtpPass),
        smtpPass: settings.smtpPass ? "••••••••••••" : "",
      },
    });
  } catch (error) {
    console.error("Update settings error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update system settings",
      error: error.message,
    });
  }
};

/**
 * Test SMTP Connection
 */
const testSmtpConnection = async (req, res) => {
  try {
    const recipient = req.body.email || req.user?.email;
    if (!recipient) {
      return res.status(400).json({
        success: false,
        message: "Recipient email is required for test",
      });
    }

    const { SendVerificationCode } = require("../utils/sendMail");
    const testHtml = `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #16a34a; margin-top: 0;">SMTP Test Successful!</h2>
        <p>This is a verification test email from your Bhumi Container Service TMS portal.</p>
        <p>Your centralized SMTP configuration is working correctly and ready to dispatch alerts and notifications.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <small style="color: #64748b;">Dispatched at ${new Date().toLocaleString("en-IN")}</small>
      </div>
    `;

    await SendVerificationCode(
      recipient,
      testHtml,
      "Bhumi TMS: SMTP Test Connection Successful",
      "SMTP Test Connection Successful"
    );

    return res.status(200).json({
      success: true,
      message: `Test email sent successfully to ${recipient}!`,
    });
  } catch (error) {
    console.error("SMTP test error:", error);
    return res.status(400).json({
      success: false,
      message: `SMTP connection failed: ${error.message}`,
    });
  }
};

module.exports = {
  getSettings,
  updateSettings,
  testSmtpConnection,
};
