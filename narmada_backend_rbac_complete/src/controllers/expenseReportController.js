const mongoose = require("mongoose");

const Expense = require("../models/Expense");

// =====================================================
// HELPERS
// =====================================================

const round2 = (value) => {
  return Number(Number(value || 0).toFixed(2));
};

const buildDateRange = (fromDate, toDate) => {
  let startDate = null;
  let endDate = null;

  if (fromDate) {
    startDate = new Date(fromDate);

    if (isNaN(startDate.getTime())) {
      return {
        error: "Invalid fromDate",
      };
    }

    startDate.setHours(0, 0, 0, 0);
  }

  if (toDate) {
    endDate = new Date(toDate);

    if (isNaN(endDate.getTime())) {
      return {
        error: "Invalid toDate",
      };
    }

    endDate.setHours(23, 59, 59, 999);
  }

  if (startDate && endDate && startDate > endDate) {
    return {
      error: "fromDate cannot be greater than toDate",
    };
  }

  return {
    startDate,
    endDate,
  };
};

// =====================================================
// GET EXPENSE REPORT
// =====================================================

const getExpenseReport = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const { category, paymentMode, status, fromDate, toDate } = req.query;

    // =================================================
    // VALIDATE COMPANY
    // =================================================

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid company ID",
      });
    }

    // =================================================
    // DATE VALIDATION
    // =================================================

    const dateRange = buildDateRange(fromDate, toDate);

    if (dateRange.error) {
      return res.status(400).json({
        success: false,
        message: dateRange.error,
      });
    }

    const { startDate, endDate } = dateRange;

    // =================================================
    // BUILD QUERY
    // =================================================

    const query = {
      companyId,
    };

    if (category) {
      query.category = category;
    }

    if (paymentMode) {
      query.paymentMode = paymentMode;
    }

    // -------------------------------------------------
    // Status
    // -------------------------------------------------
    // If status is specifically requested, use it.
    // Otherwise exclude cancelled expenses from the
    // normal financial report.

    if (status) {
      query.status = status;
    } else {
      query.status = {
        $ne: "cancelled",
      };
    }

    // -------------------------------------------------
    // Date Filter
    // -------------------------------------------------

    if (startDate || endDate) {
      query.expenseDate = {};

      if (startDate) {
        query.expenseDate.$gte = startDate;
      }

      if (endDate) {
        query.expenseDate.$lte = endDate;
      }
    }

    // =================================================
    // GET EXPENSES
    // =================================================

    const expenses = await Expense.find(query)
      .populate("enteredBy", "name email role")
      .sort({
        expenseDate: -1,
      })
      .lean();

    // =================================================
    // SUMMARY
    // =================================================

    let totalAmount = 0;

    const categorySummary = {};
    const paymentModeSummary = {};
    const statusSummary = {};

    expenses.forEach((expense) => {
      const amount = Number(expense.amount || 0);

      totalAmount += amount;

      // ---------------------------------------------
      // Category Summary
      // ---------------------------------------------

      const expenseCategory = expense.category || "other";

      if (!categorySummary[expenseCategory]) {
        categorySummary[expenseCategory] = {
          category: expenseCategory,
          records: 0,
          amount: 0,
        };
      }

      categorySummary[expenseCategory].records += 1;

      categorySummary[expenseCategory].amount += amount;

      // ---------------------------------------------
      // Payment Mode Summary
      // ---------------------------------------------

      const mode = expense.paymentMode || "other";

      if (!paymentModeSummary[mode]) {
        paymentModeSummary[mode] = {
          paymentMode: mode,
          records: 0,
          amount: 0,
        };
      }

      paymentModeSummary[mode].records += 1;

      paymentModeSummary[mode].amount += amount;

      // ---------------------------------------------
      // Status Summary
      // ---------------------------------------------

      const expenseStatus = expense.status || "active";

      if (!statusSummary[expenseStatus]) {
        statusSummary[expenseStatus] = {
          status: expenseStatus,
          records: 0,
          amount: 0,
        };
      }

      statusSummary[expenseStatus].records += 1;

      statusSummary[expenseStatus].amount += amount;
    });

    // =================================================
    // ROUND VALUES
    // =================================================

    totalAmount = round2(totalAmount);

    Object.values(categorySummary).forEach((item) => {
      item.amount = round2(item.amount);
    });

    Object.values(paymentModeSummary).forEach((item) => {
      item.amount = round2(item.amount);
    });

    Object.values(statusSummary).forEach((item) => {
      item.amount = round2(item.amount);
    });

    // =================================================
    // RESPONSE
    // =================================================

    return res.status(200).json({
      success: true,

      count: expenses.length,

      summary: {
        totalRecords: expenses.length,
        totalAmount,
      },

      categorySummary: Object.values(categorySummary),

      paymentModeSummary: Object.values(paymentModeSummary),

      statusSummary: Object.values(statusSummary),

      data: expenses,
    });
  } catch (error) {
    console.error("Get expense report error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate expense report",
      error: error.message,
    });
  }
};

// =====================================================
// GET EXPENSE CATEGORY REPORT
// =====================================================

const getExpenseCategoryReport = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const { fromDate, toDate } = req.query;

    // =================================================
    // VALIDATE COMPANY
    // =================================================

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid company ID",
      });
    }

    // =================================================
    // DATE VALIDATION
    // =================================================

    const dateRange = buildDateRange(fromDate, toDate);

    if (dateRange.error) {
      return res.status(400).json({
        success: false,
        message: dateRange.error,
      });
    }

    const { startDate, endDate } = dateRange;

    // =================================================
    // BUILD QUERY
    // =================================================

    const query = {
      companyId,

      // Cancelled expenses should not contribute
      // to normal category financial reporting.
      status: {
        $ne: "cancelled",
      },
    };

    // -------------------------------------------------
    // Date Filter
    // -------------------------------------------------

    if (startDate || endDate) {
      query.expenseDate = {};

      if (startDate) {
        query.expenseDate.$gte = startDate;
      }

      if (endDate) {
        query.expenseDate.$lte = endDate;
      }
    }

    // =================================================
    // AGGREGATE
    // =================================================

    const report = await Expense.aggregate([
      {
        $match: query,
      },

      {
        $group: {
          _id: "$category",

          recordCount: {
            $sum: 1,
          },

          totalAmount: {
            $sum: "$amount",
          },
        },
      },

      {
        $sort: {
          totalAmount: -1,
        },
      },
    ]);

    // =================================================
    // FORMAT DATA
    // =================================================

    const data = report.map((item) => ({
      category: item._id || "other",

      recordCount: item.recordCount,

      totalAmount: round2(item.totalAmount),
    }));

    // =================================================
    // TOTAL
    // =================================================

    const totalAmount = data.reduce(
      (sum, item) => sum + Number(item.totalAmount || 0),
      0,
    );

    // =================================================
    // RESPONSE
    // =================================================

    return res.status(200).json({
      success: true,

      count: data.length,

      totalAmount: round2(totalAmount),

      data,
    });
  } catch (error) {
    console.error("Get expense category report error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate expense category report",
      error: error.message,
    });
  }
};

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  getExpenseReport,
  getExpenseCategoryReport,
};
