const Expense = require("../models/Expense");
const { getNextSequence } = require("../utils/sequenceService");

// =====================================================
// CREATE EXPENSE
// =====================================================

const createExpense = async (req, res) => {
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
      expenseNumber = await getNextSequence(companyId, "expenses");
    }

    if (
      !expenseDate ||
      !category ||
      !description ||
      amount === undefined ||
      !paymentMode
    ) {
      return res.status(400).json({
        success: false,
        message:
          "expenseDate, category, description, amount and paymentMode are required",
      });
    }

    const expenseAmount = Number(amount);

    if (!Number.isFinite(expenseAmount) || expenseAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Expense amount must be greater than 0",
      });
    }

    // Duplicate expense number

    const existingExpense = await Expense.findOne({
      companyId,
      expenseNumber: expenseNumber.toUpperCase(),
    });

    if (existingExpense) {
      return res.status(409).json({
        success: false,
        message: "Expense number already exists",
      });
    }

    const expense = await Expense.create({
      companyId,

      expenseNumber,

      expenseDate,

      category,

      description,

      amount: expenseAmount,

      paymentMode,

      referenceNumber: referenceNumber || "",

      vendorName: vendorName || "",

      receiptNumber: receiptNumber || "",

      attachment: attachment || null,

      status:
        req.body.status && req.body.status.trim() && !req.body.status.toLowerCase().startsWith("select")
          ? req.body.status.trim().toLowerCase()
          : "active",

      remarks: remarks || "",

      enteredBy,
    });

    const populatedExpense = await Expense.findById(expense._id).populate(
      "enteredBy",
      "name email",
    );

    return res.status(201).json({
      success: true,
      message: "Expense created successfully",
      data: populatedExpense,
    });
  } catch (error) {
    console.error("Create expense error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create expense",
      error: error.message,
    });
  }
};

// =====================================================
// GET ALL EXPENSES
// =====================================================

const getExpenses = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const { category, paymentMode, status, fromDate, toDate } = req.query;

    const filter = {
      companyId,
    };

    if (category) {
      filter.category = category;
    }

    if (paymentMode) {
      filter.paymentMode = paymentMode;
    }

    if (status) {
      filter.status = status;
    }

    if (fromDate || toDate) {
      filter.expenseDate = {};

      if (fromDate) {
        filter.expenseDate.$gte = new Date(fromDate);
      }

      if (toDate) {
        const endDate = new Date(toDate);

        endDate.setHours(23, 59, 59, 999);

        filter.expenseDate.$lte = endDate;
      }
    }

    const expenses = await Expense.find(filter)
      .populate("enteredBy", "name email")
      .sort({
        expenseDate: -1,
        createdAt: -1,
      });

    return res.status(200).json({
      success: true,
      count: expenses.length,
      data: expenses,
    });
  } catch (error) {
    console.error("Get expenses error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch expenses",
      error: error.message,
    });
  }
};

// =====================================================
// GET EXPENSE BY ID
// =====================================================

const getExpenseById = async (req, res) => {
  try {
    const { id } = req.params;

    const companyId = req.user.companyId;

    const expense = await Expense.findOne({
      _id: id,
      companyId,
    }).populate("enteredBy", "name email");

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: expense,
    });
  } catch (error) {
    console.error("Get expense error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch expense",
      error: error.message,
    });
  }
};

// =====================================================
// UPDATE EXPENSE
// =====================================================

const updateExpense = async (req, res) => {
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
        message: "Expense not found",
      });
    }

    if (expense.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cancelled expense cannot be updated",
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
    } = req.body;

    if (expenseDate !== undefined) {
      expense.expenseDate = expenseDate;
    }

    if (category !== undefined) {
      expense.category = category;
    }

    if (description !== undefined) {
      expense.description = description;
    }

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

    if (paymentMode !== undefined) {
      expense.paymentMode = paymentMode;
    }

    if (referenceNumber !== undefined) {
      expense.referenceNumber = referenceNumber;
    }

    if (vendorName !== undefined) {
      expense.vendorName = vendorName;
    }

    if (receiptNumber !== undefined) {
      expense.receiptNumber = receiptNumber;
    }

    if (attachment !== undefined) {
      expense.attachment = attachment;
    }

    if (remarks !== undefined) {
      expense.remarks = remarks;
    }

    await expense.save();

    const updatedExpense = await Expense.findById(expense._id).populate(
      "enteredBy",
      "name email",
    );

    return res.status(200).json({
      success: true,
      message: "Expense updated successfully",
      data: updatedExpense,
    });
  } catch (error) {
    console.error("Update expense error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update expense",
      error: error.message,
    });
  }
};

// =====================================================
// CANCEL EXPENSE
// =====================================================

const cancelExpense = async (req, res) => {
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
        message: "Expense not found",
      });
    }

    if (expense.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Expense is already cancelled",
      });
    }

    expense.status = "cancelled";

    await expense.save();

    return res.status(200).json({
      success: true,
      message: "Expense cancelled successfully",
    });
  } catch (error) {
    console.error("Cancel expense error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to cancel expense",
      error: error.message,
    });
  }
};

module.exports = {
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  cancelExpense,
};
