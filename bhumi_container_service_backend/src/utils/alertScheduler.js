const cron = require("node-cron");
const mongoose = require("mongoose");
const Company = require("../models/Company");
const VehicleDocument = require("../models/VehicleDocument");
const Driver = require("../models/Driver");
const Maintenance = require("../models/Maintenance");
const CustomerInvoice = require("../models/CustomerInvoice");
const Trip = require("../models/Trip");
const { SendVerificationCode } = require("./sendMail");

/**
 * Executes a full operational compliance audit for a company
 * and sends an executive alert summary email to operations.
 */
const runAuditForCompany = async (company) => {
  try {
    const companyId = company._id;
    const companyName = company.name || "Bhumi Container Service";
    const recipient = company.email || "bhumicontainerservice@gmail.com";
    const now = new Date();
    const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const in15Days = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);

    // 1. Vehicle Documents
    const expiredDocs = await VehicleDocument.find({
      companyId,
      status: "expired",
    }).populate("vehicleId", "vehicleNumber");

    const expiringDocs = await VehicleDocument.find({
      companyId,
      status: "active",
      expiryDate: { $gte: now, $lte: in30Days },
    }).populate("vehicleId", "vehicleNumber");

    // 2. Driver Licenses
    const activeDrivers = await Driver.find({
      companyId,
      status: "active",
      licenseExpiryDate: { $ne: null },
    });
    const expiredDrivers = activeDrivers.filter(
      (d) => new Date(d.licenseExpiryDate) < now,
    );
    const expiringDrivers = activeDrivers.filter((d) => {
      const exp = new Date(d.licenseExpiryDate);
      return exp >= now && exp <= in30Days;
    });

    // 3. Vehicle Maintenance (Date & Odometer checks)
    const allMaintenances = await Maintenance.find({
      companyId,
      $or: [
        { nextServiceDate: { $ne: null } },
        { nextServiceOdometer: { $ne: null } }
      ],
      status: { $ne: "cancelled" },
    }).populate("vehicleId", "vehicleNumber currentOdometer");

    const overdueMaint = [];
    const dueMaint = [];
    const seenMaintVehs = new Set();

    allMaintenances.forEach(m => {
      const vId = m.vehicleId?._id?.toString() || m.vehicleId?.toString();
      if (!vId || seenMaintVehs.has(vId)) return;
      seenMaintVehs.add(vId);

      const vehNo = m.vehicleId?.vehicleNumber || "Vehicle";
      const currentOdo = Number(m.vehicleId?.currentOdometer || m.odometerReading || 0);

      let isOverdue = false;
      let isDueSoon = false;

      if (m.nextServiceDate) {
        const sDate = new Date(m.nextServiceDate);
        if (sDate < now) isOverdue = true;
        else if (sDate <= in15Days) isDueSoon = true;
      }

      if (m.nextServiceOdometer && Number(m.nextServiceOdometer) > 0) {
        const targetOdo = Number(m.nextServiceOdometer);
        if (currentOdo >= targetOdo) isOverdue = true;
        else if ((targetOdo - currentOdo) <= 500) isDueSoon = true;
      }

      if (isOverdue) overdueMaint.push({ ...m.toObject(), vehicleNumber: vehNo });
      else if (isDueSoon) dueMaint.push({ ...m.toObject(), vehicleNumber: vehNo });
    });

    // 4. Overdue Invoices
    const overdueInvoices = await CustomerInvoice.find({
      companyId,
      paymentStatus: { $in: ["unpaid", "partial"] },
      dueDate: { $ne: null, $lt: now },
    })
      .populate("partyId", "name")
      .limit(10);

    // 5. Active Fleet
    const activeTrips = await Trip.find({
      companyId,
      status: { $in: ["dispatched", "in_transit"] },
    });

    const totalCritical =
      expiredDocs.length +
      expiredDrivers.length +
      overdueMaint.length +
      overdueInvoices.length;
    const totalWarnings =
      expiringDocs.length + expiringDrivers.length + dueMaint.length;

    console.log(
      `[Cron Audit] ${companyName} -> Critical: ${totalCritical}, Warnings: ${totalWarnings}, Active Trips: ${activeTrips.length}`,
    );

    // If there are critical items or warnings, format and attempt email
    if (totalCritical > 0 || totalWarnings > 0) {
      const todayStr = now.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 650px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <div style="background: #0b1220; padding: 20px; border-radius: 8px; text-align: center;">
            <h2 style="color: #f59e0b; margin: 0; font-size: 20px; text-transform: uppercase;">${companyName}</h2>
            <p style="color: #94a3b8; margin: 5px 0 0; font-size: 13px;">Daily Automated Fleet & Operational Compliance Report — ${todayStr}</p>
          </div>

          <div style="margin-top: 20px; display: flex; gap: 10px;">
            <div style="flex: 1; background: #fef2f2; border: 1px solid #fecaca; padding: 12px; border-radius: 8px; text-align: center;">
              <p style="color: #991b1b; font-size: 24px; font-weight: bold; margin: 0;">${totalCritical}</p>
              <p style="color: #7f1d1d; font-size: 11px; margin: 2px 0 0; font-weight: bold; text-transform: uppercase;">Critical Overdue</p>
            </div>
            <div style="flex: 1; background: #fffbeb; border: 1px solid #fde68a; padding: 12px; border-radius: 8px; text-align: center;">
              <p style="color: #92400e; font-size: 24px; font-weight: bold; margin: 0;">${totalWarnings}</p>
              <p style="color: #78350f; font-size: 11px; margin: 2px 0 0; font-weight: bold; text-transform: uppercase;">Expiring in 30 Days</p>
            </div>
            <div style="flex: 1; background: #f0fdf4; border: 1px solid #bbf7d0; padding: 12px; border-radius: 8px; text-align: center;">
              <p style="color: #166534; font-size: 24px; font-weight: bold; margin: 0;">${activeTrips.length}</p>
              <p style="color: #14532d; font-size: 11px; margin: 2px 0 0; font-weight: bold; text-transform: uppercase;">Active Trips</p>
            </div>
          </div>

          <h3 style="color: #0f172a; margin-top: 25px; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px; font-size: 14px; text-transform: uppercase;">Compliance Checklist</h3>
          <ul style="font-size: 13px; color: #334155; line-height: 1.8; padding-left: 20px;">
            <li><strong>Expired Vehicle Documents:</strong> ${expiredDocs.length}</li>
            <li><strong>Documents Expiring Soon (30 Days):</strong> ${expiringDocs.length}</li>
            <li><strong>Driver License Issues:</strong> ${expiredDrivers.length} expired, ${expiringDrivers.length} expiring soon</li>
            <li><strong>Maintenance Due:</strong> ${overdueMaint.length} overdue, ${dueMaint.length} due within 15 days</li>
            <li><strong>Overdue Customer Invoices:</strong> ${overdueInvoices.length}</li>
          </ul>

          <div style="margin-top: 30px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 15px;">
            <p style="font-size: 11px; color: #64748b; margin: 0;">Automated System Notification | Bhumi Container Service TMS</p>
          </div>
        </div>
      `;

      try {
        await SendVerificationCode(
          recipient,
          html,
          `[Daily Alert] ${companyName} Compliance Audit - ${todayStr}`,
          null,
          company,
        );
        console.log(`[Cron Audit] Email sent successfully to ${recipient}`);
      } catch (err) {
        console.log(
          `[Cron Audit] Email delivery skipped: ${err.message || "SMTP pending"}`,
        );
      }
    }
  } catch (error) {
    console.error(
      `[Cron Audit Error] Company ${company?.name}:`,
      error.message,
    );
  }
};

/**
 * Initializes the automated daily cron scheduler
 * Runs every day at 08:00 AM IST (or configured cron)
 */
const initAlertScheduler = () => {
  // Cron schedule: Every day at 08:00 AM
  // "0 8 * * *" -> at minute 0, hour 8
  const cronExpression = process.env.ALERT_CRON_SCHEDULE || "0 8 * * *";

  console.log(`[Scheduler] Initializing Daily Alert Cron: "${cronExpression}"`);

  cron.schedule(cronExpression, async () => {
    console.log("[Scheduler] Running daily fleet compliance audit...");
    try {
      const companies = await Company.find({ status: "active" });
      for (const comp of companies) {
        await runAuditForCompany(comp);
      }
    } catch (err) {
      console.error("[Scheduler Error]:", err.message);
    }
  });
};

module.exports = {
  initAlertScheduler,
  runAuditForCompany,
};
