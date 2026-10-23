const cron = require("node-cron");
const mongoose = require("mongoose");
const Company = require("../models/Company");
const VehicleDocument = require("../models/VehicleDocument");
const Driver = require("../models/Driver");
const Maintenance = require("../models/Maintenance");
const CustomerInvoice = require("../models/CustomerInvoice");
const Trip = require("../models/Trip");
const Loan = require("../models/Loan");
const User = require("../models/User");
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

    // 6. Vehicle Loans & EMIs (Due within 7 days or Overdue)
    const activeLoans = await Loan.find({
      companyId,
      status: "active",
    }).populate("vehicleId", "vehicleNumber vehicleType");

    const overdueEmis = [];
    const upcomingEmis = [];

    activeLoans.forEach((loan) => {
      const pendingEmis = (loan.schedule || []).filter((s) => s.status === "pending");
      if (pendingEmis.length === 0) return;
      const nextEmi = pendingEmis[0];
      if (!nextEmi || !nextEmi.dueDate) return;

      const due = new Date(nextEmi.dueDate);
      const days = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
      const vehNo = loan.vehicleId?.vehicleNumber || "Vehicle";
      const bank = loan.bankName || "Bank";
      const emiAmt = nextEmi.amount || loan.emiAmount || 0;

      if (days < 0) {
        overdueEmis.push({
          loanId: loan._id,
          vehicleNumber: vehNo,
          bankName: bank,
          accountNumber: loan.accountNumber,
          installmentNumber: nextEmi.installmentNumber,
          amount: emiAmt,
          dueDate: due,
          daysOverdue: Math.abs(days),
        });
      } else if (days <= 7) {
        upcomingEmis.push({
          loanId: loan._id,
          vehicleNumber: vehNo,
          bankName: bank,
          accountNumber: loan.accountNumber,
          installmentNumber: nextEmi.installmentNumber,
          amount: emiAmt,
          dueDate: due,
          daysRemaining: days,
        });
      }
    });

    const totalCritical =
      expiredDocs.length +
      expiredDrivers.length +
      overdueMaint.length +
      overdueInvoices.length +
      overdueEmis.length;
    const totalWarnings =
      expiringDocs.length + expiringDrivers.length + dueMaint.length + upcomingEmis.length;

    console.log(
      `[Cron Audit] ${companyName} -> Critical: ${totalCritical} (Overdue EMIs: ${overdueEmis.length}), Warnings: ${totalWarnings} (Due EMIs: ${upcomingEmis.length}), Active Trips: ${activeTrips.length}`,
    );

    // If there are critical items or warnings, format and attempt email
    if (totalCritical > 0 || totalWarnings > 0) {
      const todayStr = now.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

      // Construct EMI Section HTML if any
      let emiHtmlSection = "";
      if (overdueEmis.length > 0 || upcomingEmis.length > 0) {
        emiHtmlSection = `
          <div style="margin-top: 25px; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden;">
            <div style="background: #1e293b; color: #ffffff; padding: 10px 15px; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">
              ⚠️ Vehicle Loan & EMI Payment Alerts (${overdueEmis.length + upcomingEmis.length})
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
              <thead>
                <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0; color: #475569;">
                  <th style="padding: 8px 12px;">Vehicle</th>
                  <th style="padding: 8px 12px;">Bank / Account</th>
                  <th style="padding: 8px 12px;">EMI #</th>
                  <th style="padding: 8px 12px;">Amount</th>
                  <th style="padding: 8px 12px;">Due Date</th>
                  <th style="padding: 8px 12px;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${overdueEmis
                  .map(
                    (e) => `
                  <tr style="border-bottom: 1px solid #fee2e2; background: #fff5f5;">
                    <td style="padding: 8px 12px; font-weight: bold; color: #991b1b;">${e.vehicleNumber}</td>
                    <td style="padding: 8px 12px; color: #334155;">${e.bankName} (${e.accountNumber || "-"})</td>
                    <td style="padding: 8px 12px; font-weight: bold;">#${e.installmentNumber}</td>
                    <td style="padding: 8px 12px; font-weight: bold; color: #dc2626;">₹${e.amount.toLocaleString("en-IN")}</td>
                    <td style="padding: 8px 12px;">${e.dueDate.toLocaleDateString("en-IN")}</td>
                    <td style="padding: 8px 12px;"><span style="background: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 4px; font-weight: bold; font-size: 11px;">OVERDUE (${e.daysOverdue}d)</span></td>
                  </tr>
                `
                  )
                  .join("")}
                ${upcomingEmis
                  .map(
                    (e) => `
                  <tr style="border-bottom: 1px solid #fef3c7; background: #fffbeb;">
                    <td style="padding: 8px 12px; font-weight: bold; color: #92400e;">${e.vehicleNumber}</td>
                    <td style="padding: 8px 12px; color: #334155;">${e.bankName} (${e.accountNumber || "-"})</td>
                    <td style="padding: 8px 12px; font-weight: bold;">#${e.installmentNumber}</td>
                    <td style="padding: 8px 12px; font-weight: bold; color: #b45309;">₹${e.amount.toLocaleString("en-IN")}</td>
                    <td style="padding: 8px 12px;">${e.dueDate.toLocaleDateString("en-IN")}</td>
                    <td style="padding: 8px 12px;"><span style="background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 4px; font-weight: bold; font-size: 11px;">DUE IN ${e.daysRemaining === 0 ? "TODAY" : `${e.daysRemaining}d`}</span></td>
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        `;
      }

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 650px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <div style="background: #0f172a; padding: 20px; border-radius: 8px; text-align: center;">
            <h2 style="color: #38bdf8; margin: 0; font-size: 20px; text-transform: uppercase; letter-spacing: 0.5px;">${companyName}</h2>
            <p style="color: #94a3b8; margin: 5px 0 0; font-size: 13px;">Daily Automated Fleet, EMI & Operational Audit — ${todayStr}</p>
          </div>

          <div style="margin-top: 20px; display: flex; gap: 10px;">
            <div style="flex: 1; background: #fef2f2; border: 1px solid #fecaca; padding: 12px; border-radius: 8px; text-align: center;">
              <p style="color: #991b1b; font-size: 24px; font-weight: bold; margin: 0;">${totalCritical}</p>
              <p style="color: #7f1d1d; font-size: 11px; margin: 2px 0 0; font-weight: bold; text-transform: uppercase;">Critical Overdue</p>
            </div>
            <div style="flex: 1; background: #fffbeb; border: 1px solid #fde68a; padding: 12px; border-radius: 8px; text-align: center;">
              <p style="color: #92400e; font-size: 24px; font-weight: bold; margin: 0;">${totalWarnings}</p>
              <p style="color: #78350f; font-size: 11px; margin: 2px 0 0; font-weight: bold; text-transform: uppercase;">Due / Expiring Soon</p>
            </div>
            <div style="flex: 1; background: #f0fdf4; border: 1px solid #bbf7d0; padding: 12px; border-radius: 8px; text-align: center;">
              <p style="color: #166534; font-size: 24px; font-weight: bold; margin: 0;">${activeTrips.length}</p>
              <p style="color: #14532d; font-size: 11px; margin: 2px 0 0; font-weight: bold; text-transform: uppercase;">Active Trips</p>
            </div>
          </div>

          ${emiHtmlSection}

          <h3 style="color: #0f172a; margin-top: 25px; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px; font-size: 14px; text-transform: uppercase;">Operational Checklist</h3>
          <ul style="font-size: 13px; color: #334155; line-height: 1.8; padding-left: 20px;">
            <li><strong>Vehicle Loans with EMIs Due Soon (≤ 7 Days):</strong> ${upcomingEmis.length}</li>
            <li><strong>Vehicle Loans with Overdue EMIs:</strong> ${overdueEmis.length}</li>
            <li><strong>Expired Vehicle Documents:</strong> ${expiredDocs.length}</li>
            <li><strong>Documents Expiring Soon (30 Days):</strong> ${expiringDocs.length}</li>
            <li><strong>Driver License Issues:</strong> ${expiredDrivers.length} expired, ${expiringDrivers.length} expiring soon</li>
            <li><strong>Maintenance Due:</strong> ${overdueMaint.length} overdue, ${dueMaint.length} due within 15 days</li>
            <li><strong>Overdue Customer Invoices:</strong> ${overdueInvoices.length}</li>
          </ul>

          <div style="margin-top: 30px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 15px;">
            <p style="font-size: 11px; color: #64748b; margin: 0;">Bhumi Container Service TMS — Daily Automated Control Tower Alert</p>
          </div>
        </div>
      `;

      // Find company admins
      const adminUsers = await User.find({
        $or: [
          { companyId, role: { $in: ["admin", "super_admin"] }, status: "active" },
          { role: "super_admin", status: "active" },
        ],
      }).select("email");

      const allRecipients = Array.from(
        new Set([
          company.email,
          ...adminUsers.map((u) => u.email),
        ].filter(Boolean))
      );

      const subjectPrefix = overdueEmis.length > 0
        ? `[URGENT: ${overdueEmis.length} EMI OVERDUE]`
        : upcomingEmis.length > 0
        ? `[ALERT: ${upcomingEmis.length} EMI DUE SOON]`
        : `[Daily Alert]`;

      for (const email of allRecipients) {
        try {
          await SendVerificationCode(
            email,
            html,
            `${subjectPrefix} ${companyName} Daily Fleet & EMI Audit - ${todayStr}`,
            null,
            company,
          );
          console.log(`[Cron Audit] Email sent successfully to ${email}`);
        } catch (err) {
          console.log(
            `[Cron Audit] Email delivery to ${email} skipped: ${err.message || "SMTP pending"}`,
          );
        }
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

const triggerManualAlertEmail = async (companyId) => {
  const company = await Company.findById(companyId);
  if (!company) throw new Error("Company not found");
  await runAuditForCompany(company);
  return { success: true, message: `Daily audit email triggered for ${company.name}` };
};

module.exports = {
  initAlertScheduler,
  runAuditForCompany,
  triggerManualAlertEmail,
};
