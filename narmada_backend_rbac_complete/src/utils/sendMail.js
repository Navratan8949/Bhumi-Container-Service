const nodemailer = require("nodemailer");

const getMailSettings = () => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const fromName = process.env.SMTP_FROM_NAME || "Narmada Road Lines";
  const fromEmail = process.env.SMTP_FROM_EMAIL || user;

  if (!host || !user || !pass) {
    throw new Error(
      "SMTP is not configured. Set SMTP_HOST, SMTP_USER and SMTP_PASS in .env",
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

const getTransporter = () => {
  const settings = getMailSettings();

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

exports.SendVerificationCode = async (email, html, subject, text) => {
  try {
    const { transporter, settings } = getTransporter();

    return await transporter.sendMail({
      from: `"${settings.fromName}" <${settings.fromEmail}>`,
      to: email,
      subject: String(subject || "Narmada Road Lines"),
      text: String(text || ""),
      html: String(html || ""),
    });
  } catch (error) {
    console.error("Error sending email:", error.message);
    throw error;
  }
};

exports.SendMassEmail = async (bccEmails, subject, html) => {
  try {
    const { transporter, settings } = getTransporter();

    return await transporter.sendMail({
      from: `"${settings.fromName}" <${settings.fromEmail}>`,
      bcc: bccEmails,
      subject: String(subject || "Narmada Road Lines"),
      html: String(html || ""),
    });
  } catch (error) {
    console.error("Error sending mass email:", error.message);
    throw error;
  }
};
