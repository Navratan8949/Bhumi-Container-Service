const nodemailer = require("nodemailer");
const SystemSetting = require("../models/SystemSetting");
const Company = require("../models/Company");

const getMailSettings = async (companyContext = null) => {
  // 1. Resolve Company Name for Display
  let compName = null;
  if (companyContext && typeof companyContext === "object" && companyContext.name) {
    compName = companyContext.name;
  } else if (companyContext) {
    try {
      const c = await Company.findById(companyContext).select("name");
      if (c) compName = c.name;
    } catch {
      // fallback
    }
  }

  // 2. Fetch Centralized System Settings
  let sysSettings = null;
  try {
    sysSettings = await SystemSetting.findOne({ key: "global_settings" }).lean();
  } catch {
    // fallback
  }

  if (sysSettings && sysSettings.smtpHost && sysSettings.smtpUser && sysSettings.smtpPass) {
    return {
      host: sysSettings.smtpHost,
      port: Number(sysSettings.smtpPort || 587),
      user: sysSettings.smtpUser,
      pass: sysSettings.smtpPass,
      fromName: compName || "Bhumi Container Service",
      fromEmail: sysSettings.smtpFromEmail || sysSettings.smtpUser,
    };
  }

  // 3. Fallback to .env variables
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const fromName = compName || process.env.SMTP_FROM_NAME || "Bhumi Container Service";
  const fromEmail = process.env.SMTP_FROM_EMAIL || user;

  if (!host || !user || !pass || user.includes("your-email@example.com")) {
    throw new Error(
      "SMTP is not configured. Please configure SMTP in Settings -> Email & Notifications or set SMTP in .env",
    );
  }

  return {
    host,
    port,
    user,
    pass,
    fromName,
    fromEmail,
  };
};

const getTransporter = async (companyContext = null) => {
  const settings = await getMailSettings(companyContext);

  const transporter = nodemailer.createTransport({
    host: settings.host,
    port: settings.port,
    secure: settings.port === 465,
    auth: {
      user: settings.user,
      pass: settings.pass,
    },
  });

  return { transporter, settings };
};

exports.SendVerificationCode = async (email, html, subject, text, companyContext = null) => {
  try {
    const { transporter, settings } = await getTransporter(companyContext);

    return await transporter.sendMail({
      from: `"${settings.fromName}" <${settings.fromEmail}>`,
      to: email,
      subject: String(subject || "Bhumi Container Service"),
      text: String(text || ""),
      html: String(html || ""),
    });
  } catch (error) {
    console.error("Error sending email:", error.message);
    throw error;
  }
};

exports.SendMassEmail = async (bccEmails, subject, html, companyContext = null) => {
  try {
    const { transporter, settings } = await getTransporter(companyContext);

    return await transporter.sendMail({
      from: `"${settings.fromName}" <${settings.fromEmail}>`,
      bcc: bccEmails,
      subject: String(subject || "Bhumi Container Service"),
      html: String(html || ""),
    });
  } catch (error) {
    console.error("Error sending mass email:", error.message);
    throw error;
  }
};

