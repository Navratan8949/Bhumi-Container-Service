const Loan = require("../models/Loan");

// Helper function to build EMI schedule
function generateSchedule(startDate, installments, emiDeductionDay, emiAmount, paidCount = 0) {
  const schedule = [];
  const start = new Date(startDate || Date.now());

  for (let i = 1; i <= installments; i++) {
    const dueDate = new Date(start.getFullYear(), start.getMonth() + i, emiDeductionDay || 5);
    // Adjust for months with fewer days
    if (dueDate.getDate() !== emiDeductionDay) {
      dueDate.setDate(0); // last day of month
    }
    const isPaid = i <= paidCount;
    schedule.push({
      installmentNumber: i,
      dueDate,
      amount: emiAmount,
      status: isPaid ? "paid" : "pending",
      paidDate: isPaid ? new Date() : null,
      paymentMode: "auto_debit",
      referenceNumber: "",
      notes: "",
    });
  }
  return schedule;
}

// =====================================================
// CREATE LOAN
// =====================================================
exports.createLoan = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const {
      vehicleId,
      bankName,
      accountNumber,
      loanAmount,
      downPayment,
      interestRate,
      interestType,
      installments,
      emiAmount,
      loanStartDate,
      loanEndDate,
      emiDeductionDay,
      status,
      remarks,
      paidInstallments = 0,
    } = req.body;

    if (!vehicleId || !bankName || !loanAmount || !installments || !emiAmount) {
      return res.status(400).json({
        success: false,
        message: "Vehicle, Bank Name, Loan Amount, Installments and EMI Amount are required",
      });
    }

    const principal = Number(loanAmount) || 0;
    const totalInst = Number(installments) || 1;
    const monthlyEmi = Number(emiAmount) || 0;
    const paidCount = Number(paidInstallments) || 0;

    const totalPayable = monthlyEmi * totalInst;
    const totalInterest = Math.max(0, totalPayable - principal);
    const pendingBalance = Math.max(0, totalPayable - (paidCount * monthlyEmi));

    const schedule = generateSchedule(
      loanStartDate,
      totalInst,
      Number(emiDeductionDay) || 5,
      monthlyEmi,
      paidCount
    );

    // Auto-calculate end date if not provided
    const calculatedEndDate =
      loanEndDate || (schedule.length ? schedule[schedule.length - 1].dueDate : null);

    const loan = await Loan.create({
      companyId,
      vehicleId,
      bankName,
      accountNumber: accountNumber || "",
      loanAmount: principal,
      downPayment: Number(downPayment) || 0,
      interestRate: Number(interestRate) || 0,
      interestType: interestType || "reducing_balance",
      installments: totalInst,
      paidInstallments: paidCount,
      emiAmount: monthlyEmi,
      loanStartDate: loanStartDate || new Date(),
      loanEndDate: calculatedEndDate,
      emiDeductionDay: Number(emiDeductionDay) || 5,
      status: status || "active",
      totalInterest,
      totalPayable,
      pendingBalance,
      remarks: remarks || "",
      schedule,
      enteredBy: req.user.userId,
    });

    const populated = await Loan.findById(loan._id).populate("vehicleId", "vehicleNumber vehicleType ownerType ownerName");

    return res.status(201).json({
      success: true,
      message: "Loan registered successfully",
      data: populated,
    });
  } catch (error) {
    console.error("Create loan error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to register loan",
      error: error.message,
    });
  }
};

// =====================================================
// GET ALL LOANS
// =====================================================
exports.getLoans = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { status, vehicleId } = req.query;

    const filter = { companyId };
    if (status) filter.status = status;
    if (vehicleId) filter.vehicleId = vehicleId;

    const loans = await Loan.find(filter)
      .populate("vehicleId", "vehicleNumber vehicleType ownerType ownerName")
      .sort({ createdAt: -1 });

    const now = new Date();
    // Augment with next EMI metadata
    const enriched = loans.map((l) => {
      const obj = l.toObject();
      const pendingEmis = (obj.schedule || []).filter((s) => s.status === "pending");
      const nextEmi = pendingEmis[0] || null;

      let nextEmiDays = null;
      let isDueSoon = false;
      let isOverdue = false;

      if (nextEmi && nextEmi.dueDate) {
        const due = new Date(nextEmi.dueDate);
        const diffMs = due - now;
        nextEmiDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        if (nextEmiDays < 0) {
          isOverdue = true;
        } else if (nextEmiDays <= 7) {
          isDueSoon = true;
        }
      }

      obj.nextEmi = nextEmi;
      obj.nextEmiDays = nextEmiDays;
      obj.isDueSoon = isDueSoon;
      obj.isOverdue = isOverdue;
      return obj;
    });

    return res.status(200).json({
      success: true,
      count: enriched.length,
      data: enriched,
    });
  } catch (error) {
    console.error("Get loans error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch loans",
      error: error.message,
    });
  }
};

// =====================================================
// GET LOAN BY ID
// =====================================================
exports.getLoanById = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    const loan = await Loan.findOne({ _id: id, companyId }).populate(
      "vehicleId",
      "vehicleNumber vehicleType ownerType ownerName"
    );

    if (!loan) {
      return res.status(404).json({
        success: false,
        message: "Loan not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: loan,
    });
  } catch (error) {
    console.error("Get loan error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch loan details",
      error: error.message,
    });
  }
};

// =====================================================
// UPDATE LOAN
// =====================================================
exports.updateLoan = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    const loan = await Loan.findOne({ _id: id, companyId });
    if (!loan) {
      return res.status(404).json({
        success: false,
        message: "Loan not found",
      });
    }

    const {
      vehicleId,
      bankName,
      accountNumber,
      loanAmount,
      downPayment,
      interestRate,
      interestType,
      installments,
      emiAmount,
      loanStartDate,
      loanEndDate,
      emiDeductionDay,
      status,
      remarks,
      paidInstallments,
    } = req.body;

    if (vehicleId !== undefined) loan.vehicleId = vehicleId;
    if (bankName !== undefined) loan.bankName = bankName;
    if (accountNumber !== undefined) loan.accountNumber = accountNumber;
    if (downPayment !== undefined) loan.downPayment = Number(downPayment);
    if (interestRate !== undefined) loan.interestRate = Number(interestRate);
    if (interestType !== undefined) loan.interestType = interestType;
    if (remarks !== undefined) loan.remarks = remarks;
    if (status !== undefined) loan.status = status;
    if (loanStartDate !== undefined) loan.loanStartDate = loanStartDate;
    if (loanEndDate !== undefined) loan.loanEndDate = loanEndDate;
    if (emiDeductionDay !== undefined) loan.emiDeductionDay = Number(emiDeductionDay);

    if (loanAmount !== undefined) loan.loanAmount = Number(loanAmount);
    if (installments !== undefined) loan.installments = Number(installments);
    if (emiAmount !== undefined) loan.emiAmount = Number(emiAmount);
    if (paidInstallments !== undefined) loan.paidInstallments = Number(paidInstallments);

    loan.totalPayable = loan.emiAmount * loan.installments;
    loan.totalInterest = Math.max(0, loan.totalPayable - loan.loanAmount);
    loan.pendingBalance = Math.max(0, loan.totalPayable - (loan.paidInstallments * loan.emiAmount));

    if (loan.paidInstallments >= loan.installments) {
      loan.status = "closed";
    }

    await loan.save();

    const populated = await Loan.findById(loan._id).populate(
      "vehicleId",
      "vehicleNumber vehicleType ownerType ownerName"
    );

    return res.status(200).json({
      success: true,
      message: "Loan updated successfully",
      data: populated,
    });
  } catch (error) {
    console.error("Update loan error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update loan",
      error: error.message,
    });
  }
};

// =====================================================
// RECORD / MARK EMI PAYMENT
// =====================================================
exports.recordEmiPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;
    const { installmentNumber, paidDate, paymentMode, referenceNumber, notes } = req.body;

    const loan = await Loan.findOne({ _id: id, companyId });
    if (!loan) {
      return res.status(404).json({
        success: false,
        message: "Loan not found",
      });
    }

    let instItem;
    if (installmentNumber) {
      instItem = loan.schedule.find((s) => s.installmentNumber === Number(installmentNumber));
    } else {
      // Find the first pending installment
      instItem = loan.schedule.find((s) => s.status === "pending");
    }

    if (!instItem) {
      return res.status(400).json({
        success: false,
        message: "No pending installment found to mark paid",
      });
    }

    instItem.status = "paid";
    instItem.paidDate = paidDate || new Date();
    instItem.paymentMode = paymentMode || "bank_transfer";
    instItem.referenceNumber = referenceNumber || "";
    instItem.notes = notes || "";

    // Recompute paid count
    loan.paidInstallments = loan.schedule.filter((s) => s.status === "paid").length;
    loan.pendingBalance = Math.max(0, loan.totalPayable - (loan.paidInstallments * loan.emiAmount));

    if (loan.paidInstallments >= loan.installments) {
      loan.status = "closed";
    }

    await loan.save();

    const populated = await Loan.findById(loan._id).populate(
      "vehicleId",
      "vehicleNumber vehicleType ownerType ownerName"
    );

    return res.status(200).json({
      success: true,
      message: `Installment #${instItem.installmentNumber} marked as paid`,
      data: populated,
    });
  } catch (error) {
    console.error("Record EMI payment error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to record EMI payment",
      error: error.message,
    });
  }
};

// =====================================================
// DELETE LOAN
// =====================================================
exports.deleteLoan = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    const loan = await Loan.findOneAndDelete({ _id: id, companyId });
    if (!loan) {
      return res.status(404).json({
        success: false,
        message: "Loan not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Loan deleted successfully",
    });
  } catch (error) {
    console.error("Delete loan error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete loan",
      error: error.message,
    });
  }
};

// =====================================================
// TRIGGER DAILY ALERTS EMAIL (MANUAL / TEST DISPATCH)
// =====================================================
exports.sendDailyAlertsEmail = async (req, res) => {
  try {
    const { triggerManualAlertEmail } = require("../utils/alertScheduler");
    const companyId = req.user.companyId;
    const result = await triggerManualAlertEmail(companyId);

    return res.status(200).json({
      success: true,
      message: "Daily alert email triggered successfully to Admin",
      data: result,
    });
  } catch (error) {
    console.error("Trigger daily alerts email error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to trigger daily alert email",
      error: error.message,
    });
  }
};
