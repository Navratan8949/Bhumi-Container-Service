const Expense = require("../models/Expense");
const { getNextSequence } = require("../utils/sequenceService");

const OFFICE_CATEGORIES = [
  "office_rent",
  "electricity",
  "internet",
  "telephone",
  "stationery",
  "tea_refreshment",
  "pantry_kitchen",
  "salary",
  "staff_advance",
  "office_maintenance",
  "courier_postage",
  "software_subscription",
  "audit_accounting",
  "travel",
  "advertisement",
  "bank_charges",
  "legal",
  "tax",
  "miscellaneous",
  "other",
];

// =====================================================
// GET ALL OFFICE EXPENSES
// =====================================================
const getOfficeExpenses = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company is required",
      });
    }

    const {
      category,
      paymentMode,
      status,
      fromDate,
      toDate,
      search,
      department,
      staffName,
    } = req.query;

    const baseFilter = {
      companyId,
      $or: [
        { expenseType: "office" },
        {
          $and: [
            { category: { $in: OFFICE_CATEGORIES } },
            { driverId: null },
            { vehicleId: null },
            { tripId: null },
          ],
        },
      ],
    };

    if (category) {
      baseFilter.category = category;
    }

    if (paymentMode) {
      baseFilter.paymentMode = paymentMode;
    }

    if (status) {
      baseFilter.status = status;
    }

    if (department) {
      baseFilter.department = new RegExp(department, "i");
    }

    if (staffName) {
      baseFilter.staffName = new RegExp(staffName, "i");
    }

    if (fromDate || toDate) {
      baseFilter.expenseDate = {};
      if (fromDate) {
        const startDate = new Date(fromDate);
        startDate.setHours(0, 0, 0, 0);
        baseFilter.expenseDate.$gte = startDate;
      }
      if (toDate) {
        const endDate = new Date(toDate);
        endDate.setHours(23, 59, 59, 999);
        baseFilter.expenseDate.$lte = endDate;
      }
    }

    if (search && search.trim()) {
      const q = search.trim();
      const sRegex = new RegExp(q, "i");
      baseFilter.$and = [
        {
          $or: [
            { expenseNumber: sRegex },
            { staffName: sRegex },
            { paidTo: sRegex },
            { vendorName: sRegex },
            { description: sRegex },
            { receiptNumber: sRegex },
            { referenceNumber: sRegex },
            { category: sRegex },
          ],
        },
      ];
    }

    const expenses = await Expense.find(baseFilter)
      .populate("enteredBy", "name email role")
      .sort({ expenseDate: -1, createdAt: -1 });

    // Compute Summary Stats
    let totalAmount = 0;
    let salaryTotal = 0;
    let staffAdvanceTotal = 0;
    let officeRentTotal = 0;
    let utilitiesTotal = 0;
    let pantryTotal = 0;
    let stationeryTotal = 0;
    let maintenanceTotal = 0;
    let otherTotal = 0;

    for (const exp of expenses) {
      if (exp.status !== "cancelled") {
        const amt = Number(exp.amount) || 0;
        totalAmount += amt;

        if (exp.category === "salary") salaryTotal += amt;
        else if (exp.category === "staff_advance") staffAdvanceTotal += amt;
        else if (exp.category === "office_rent") officeRentTotal += amt;
        else if (["electricity", "internet", "telephone"].includes(exp.category)) utilitiesTotal += amt;
        else if (["tea_refreshment", "pantry_kitchen"].includes(exp.category)) pantryTotal += amt;
        else if (exp.category === "stationery") stationeryTotal += amt;
        else if (exp.category === "office_maintenance") maintenanceTotal += amt;
        else otherTotal += amt;
      }
    }

    return res.status(200).json({
      success: true,
      count: expenses.length,
      summary: {
        totalAmount,
        salaryTotal,
        staffAdvanceTotal,
        officeRentTotal,
        utilitiesTotal,
        pantryTotal,
        stationeryTotal,
        maintenanceTotal,
        otherTotal,
        activeCount: expenses.filter((e) => e.status !== "cancelled").length,
      },
      data: expenses,
    });
  } catch (error) {
    console.error("Get office expenses error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch office expenses",
      error: error.message,
    });
  }
};

// =====================================================
// CREATE OFFICE EXPENSE
// =====================================================
const createOfficeExpense = async (req, res) => {
  try {
    let {
      expenseNumber,
      expenseDate,
      category,
      description,
      amount,
      paymentMode,
      referenceNumber,
      vendorName,
      receiptNumber,
      attachment,
      remarks,
      staffName,
      department,
      paidTo,
    } = req.body;

    const companyId = req.user.companyId;
    const enteredBy = req.user.userId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company is required",
      });
    }

    if (!expenseNumber || !expenseNumber.toString().trim()) {
      expenseNumber = await getNextSequence(companyId, "office-expenses");
    }

    if (!expenseDate || !category || amount === undefined || !paymentMode) {
      return res.status(400).json({
        success: false,
        message: "Expense Date, Category, Amount and Payment Mode are required",
      });
    }

    const expenseAmount = Number(amount);
    if (!Number.isFinite(expenseAmount) || expenseAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Expense amount must be greater than 0",
      });
    }

    // Check duplicate
    const existing = await Expense.findOne({
      companyId,
      expenseNumber: expenseNumber.toUpperCase(),
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Expense Number ${expenseNumber} already exists`,
      });
    }

    const expense = await Expense.create({
      companyId,
      expenseNumber: expenseNumber.toUpperCase(),
      expenseDate,
      expenseType: "office",
      staffName: staffName || "",
      department: department || "",
      paidTo: paidTo || staffName || vendorName || "",
      category,
      description: description || "",
      amount: expenseAmount,
      paymentMode,
      referenceNumber: referenceNumber || "",
      vendorName: vendorName || "",
      receiptNumber: receiptNumber || "",
      attachment: attachment || null,
      status: "active",
      remarks: remarks || "",
      enteredBy,
    });

    const populated = await Expense.findById(expense._id).populate(
      "enteredBy",
      "name email role",
    );

    return res.status(201).json({
      success: true,
      message: "Office expense recorded successfully",
      data: populated,
    });
  } catch (error) {
    console.error("Create office expense error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to record office expense",
      error: error.message,
    });
  }
};

// =====================================================
// GET OFFICE EXPENSE BY ID
// =====================================================
const getOfficeExpenseById = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    const expense = await Expense.findOne({
      _id: id,
      companyId,
    }).populate("enteredBy", "name email role");

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Office expense not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: expense,
    });
  } catch (error) {
    console.error("Get office expense by ID error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch office expense",
      error: error.message,
    });
  }
};

// =====================================================
// UPDATE OFFICE EXPENSE
// =====================================================
const updateOfficeExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    const expense = await Expense.findOne({
      _id: id,
      companyId,
    });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Office expense not found",
      });
    }

    if (expense.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cancelled office expense cannot be updated",
      });
    }

    const {
      expenseDate,
      category,
      description,
      amount,
      paymentMode,
      referenceNumber,
      vendorName,
      receiptNumber,
      attachment,
      remarks,
      staffName,
      department,
      paidTo,
      status,
    } = req.body;

    if (expenseDate !== undefined) expense.expenseDate = expenseDate;
    if (category !== undefined) expense.category = category;
    if (description !== undefined) expense.description = description;
    if (staffName !== undefined) expense.staffName = staffName;
    if (department !== undefined) expense.department = department;
    if (paidTo !== undefined) expense.paidTo = paidTo;

    if (amount !== undefined) {
      const expenseAmount = Number(amount);
      if (!Number.isFinite(expenseAmount) || expenseAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Expense amount must be greater than 0",
        });
      }
      expense.amount = expenseAmount;
    }

    if (paymentMode !== undefined) expense.paymentMode = paymentMode;
    if (referenceNumber !== undefined) expense.referenceNumber = referenceNumber;
    if (vendorName !== undefined) expense.vendorName = vendorName;
    if (receiptNumber !== undefined) expense.receiptNumber = receiptNumber;
    if (attachment !== undefined) expense.attachment = attachment;
    if (remarks !== undefined) expense.remarks = remarks;
    if (status !== undefined) expense.status = status;

    expense.expenseType = "office";

    await expense.save();

    const updated = await Expense.findById(expense._id).populate(
      "enteredBy",
      "name email role",
    );

    return res.status(200).json({
      success: true,
      message: "Office expense updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Update office expense error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update office expense",
      error: error.message,
    });
  }
};

// =====================================================
// CANCEL OFFICE EXPENSE
// =====================================================
const cancelOfficeExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    const expense = await Expense.findOne({
      _id: id,
      companyId,
    });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Office expense not found",
      });
    }

    expense.status = "cancelled";
    await expense.save();

    return res.status(200).json({
      success: true,
      message: "Office expense cancelled successfully",
    });
  } catch (error) {
    console.error("Cancel office expense error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to cancel office expense",
      error: error.message,
    });
  }
};

module.exports = {
  getOfficeExpenses,
  createOfficeExpense,
  getOfficeExpenseById,
  updateOfficeExpense,
  cancelOfficeExpense,
};
