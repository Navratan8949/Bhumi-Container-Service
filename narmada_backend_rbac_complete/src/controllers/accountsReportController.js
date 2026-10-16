const CustomerInvoice = require("../models/CustomerInvoice");
const CustomerPayment = require("../models/CustomerPayment");
const VendorBill = require("../models/VendorBill");
const VendorPayment = require("../models/VendorPayment");
const Expense = require("../models/Expense");
const Fuel = require("../models/Fuel");
const Maintenance = require("../models/Maintenance");
const Tyre = require("../models/Tyre");
const mongoose = require("mongoose");

// =====================================================
// DATE FILTER HELPER
// =====================================================

const getDateFilter = (fromDate, toDate, fieldName) => {
  const filter = {};

  if (fromDate || toDate) {
    filter[fieldName] = {};

    if (fromDate) {
      const startDate = new Date(fromDate);
      startDate.setHours(0, 0, 0, 0);

      filter[fieldName].$gte = startDate;
    }

    if (toDate) {
      const endDate = new Date(toDate);
      endDate.setHours(23, 59, 59, 999);

      filter[fieldName].$lte = endDate;
    }
  }

  return filter;
};

// =====================================================
// ACCOUNTS DASHBOARD
// =====================================================

const getAccountsDashboard = async (req, res) => {
  try {
    const companyId = new mongoose.Types.ObjectId(req.user.companyId);

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company is required",
      });
    }

    const { fromDate, toDate } = req.query;

    // -------------------------------------------------
    // Customer Invoice
    // -------------------------------------------------

    const customerInvoiceFilter = {
      companyId,
      status: {
        $ne: "cancelled",
      },
      ...getDateFilter(fromDate, toDate, "invoiceDate"),
    };

    const customerInvoiceSummary = await CustomerInvoice.aggregate([
      {
        $match: customerInvoiceFilter,
      },
      {
        $group: {
          _id: null,

          totalInvoices: {
            $sum: 1,
          },

          totalInvoiceAmount: {
            $sum: "$grandTotal",
          },

          totalPaidAmount: {
            $sum: "$paidAmount",
          },

          totalOutstandingAmount: {
            $sum: "$outstandingAmount",
          },
        },
      },
    ]);

    // -------------------------------------------------
    // Customer Payment
    // -------------------------------------------------

    const customerPaymentFilter = {
      companyId,
      ...getDateFilter(fromDate, toDate, "paymentDate"),
    };

    const customerPaymentSummary = await CustomerPayment.aggregate([
      {
        $match: customerPaymentFilter,
      },
      {
        $group: {
          _id: null,

          totalPayments: {
            $sum: 1,
          },

          totalReceived: {
            $sum: "$amount",
          },
        },
      },
    ]);

    // -------------------------------------------------
    // Vendor Bill
    // -------------------------------------------------

    const vendorBillFilter = {
      companyId,
      status: {
        $ne: "cancelled",
      },
      ...getDateFilter(fromDate, toDate, "billDate"),
    };

    const vendorBillSummary = await VendorBill.aggregate([
      {
        $match: vendorBillFilter,
      },
      {
        $group: {
          _id: null,

          totalBills: {
            $sum: 1,
          },

          totalBillAmount: {
            $sum: "$grandTotal",
          },

          totalPaidAmount: {
            $sum: "$paidAmount",
          },

          totalOutstandingAmount: {
            $sum: "$outstandingAmount",
          },
        },
      },
    ]);

    // -------------------------------------------------
    // Vendor Payment
    // -------------------------------------------------

    const vendorPaymentFilter = {
      companyId,
      ...getDateFilter(fromDate, toDate, "paymentDate"),
    };

    const vendorPaymentSummary = await VendorPayment.aggregate([
      {
        $match: vendorPaymentFilter,
      },
      {
        $group: {
          _id: null,

          totalPayments: {
            $sum: 1,
          },

          totalPaid: {
            $sum: "$amount",
          },
        },
      },
    ]);

    // -------------------------------------------------
    // General Expense
    // -------------------------------------------------

    const expenseFilter = {
      companyId,
      status: "active",
      ...getDateFilter(fromDate, toDate, "expenseDate"),
    };

    const expenseSummary = await Expense.aggregate([
      {
        $match: expenseFilter,
      },
      {
        $group: {
          _id: null,

          totalExpenses: {
            $sum: "$amount",
          },

          expenseCount: {
            $sum: 1,
          },
        },
      },
    ]);

    // -------------------------------------------------
    // Fuel
    // -------------------------------------------------

    const fuelFilter = {
      companyId,
      ...getDateFilter(fromDate, toDate, "fuelDate"),
    };

    const fuelSummary = await Fuel.aggregate([
      {
        $match: fuelFilter,
      },
      {
        $group: {
          _id: null,

          totalFuelExpense: {
            $sum: "$totalAmount",
          },

          totalFuelQuantity: {
            $sum: "$quantity",
          },

          fuelCount: {
            $sum: 1,
          },
        },
      },
    ]);

    // -------------------------------------------------
    // Maintenance
    // -------------------------------------------------

    const maintenanceFilter = {
      companyId,
      status: "completed",
      ...getDateFilter(fromDate, toDate, "maintenanceDate"),
    };

    const maintenanceSummary = await Maintenance.aggregate([
      {
        $match: maintenanceFilter,
      },
      {
        $group: {
          _id: null,

          totalMaintenanceExpense: {
            $sum: "$totalCost",
          },

          maintenanceCount: {
            $sum: 1,
          },
        },
      },
    ]);

    // -------------------------------------------------
    // Tyre
    // -------------------------------------------------

    const tyreFilter = {
      companyId,
      ...getDateFilter(fromDate, toDate, "purchaseDate"),
    };

    const tyreSummary = await Tyre.aggregate([
      {
        $match: tyreFilter,
      },
      {
        $group: {
          _id: null,

          totalTyrePurchase: {
            $sum: "$purchasePrice",
          },

          tyreCount: {
            $sum: 1,
          },
        },
      },
    ]);

    // -------------------------------------------------
    // Extract values
    // -------------------------------------------------

    const customerInvoice = customerInvoiceSummary[0] || {};

    const customerPayment = customerPaymentSummary[0] || {};

    const vendorBill = vendorBillSummary[0] || {};

    const vendorPayment = vendorPaymentSummary[0] || {};

    const expense = expenseSummary[0] || {};

    const fuel = fuelSummary[0] || {};

    const maintenance = maintenanceSummary[0] || {};

    const tyre = tyreSummary[0] || {};

    // -------------------------------------------------
    // Total Expenses
    // -------------------------------------------------

    const generalExpense = Number(expense.totalExpenses || 0);

    const fuelExpense = Number(fuel.totalFuelExpense || 0);

    const maintenanceExpense = Number(maintenance.totalMaintenanceExpense || 0);

    const tyreExpense = Number(tyre.totalTyrePurchase || 0);

    const totalExpenses =
      generalExpense + fuelExpense + maintenanceExpense + tyreExpense;

    // -------------------------------------------------
    // Revenue
    // -------------------------------------------------

    const totalRevenue = Number(customerInvoice.totalInvoiceAmount || 0);

    // -------------------------------------------------
    // Net
    // -------------------------------------------------

    const netAmount = totalRevenue - totalExpenses;

    return res.status(200).json({
      success: true,

      filters: {
        fromDate: fromDate || null,
        toDate: toDate || null,
      },

      data: {
        receivable: {
          invoiceCount: customerInvoice.totalInvoices || 0,

          invoiceAmount: customerInvoice.totalInvoiceAmount || 0,

          received: customerInvoice.totalPaidAmount || 0,

          outstanding: customerInvoice.totalOutstandingAmount || 0,
        },

        customerPayments: {
          paymentCount: customerPayment.totalPayments || 0,

          totalReceived: customerPayment.totalReceived || 0,
        },

        payable: {
          billCount: vendorBill.totalBills || 0,

          billAmount: vendorBill.totalBillAmount || 0,

          paid: vendorBill.totalPaidAmount || 0,

          outstanding: vendorBill.totalOutstandingAmount || 0,
        },

        vendorPayments: {
          paymentCount: vendorPayment.totalPayments || 0,

          totalPaid: vendorPayment.totalPaid || 0,
        },

        expenses: {
          general: generalExpense,

          fuel: fuelExpense,

          maintenance: maintenanceExpense,

          tyre: tyreExpense,

          total: totalExpenses,
        },

        revenueExpense: {
          totalRevenue,

          totalExpenses,

          netAmount,
        },

        fuel: {
          quantity: fuel.totalFuelQuantity || 0,

          expense: fuelExpense,

          count: fuel.fuelCount || 0,
        },

        maintenance: {
          expense: maintenanceExpense,

          count: maintenance.maintenanceCount || 0,
        },

        tyres: {
          purchaseAmount: tyreExpense,

          count: tyre.tyreCount || 0,
        },
      },
    });
  } catch (error) {
    console.error("Accounts dashboard error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate accounts dashboard",
      error: error.message,
    });
  }
};

// =====================================================
// CUSTOMER OUTSTANDING REPORT
// =====================================================

const getCustomerOutstandingReport = async (req, res) => {
  try {
    const companyId = new mongoose.Types.ObjectId(req.user.companyId);

    const report = await CustomerInvoice.aggregate([
      {
        $match: {
          companyId: companyId,

          status: {
            $ne: "cancelled",
          },

          outstandingAmount: {
            $gt: 0,
          },
        },
      },

      {
        $lookup: {
          from: "parties",

          localField: "partyId",

          foreignField: "_id",

          as: "party",
        },
      },

      {
        $unwind: {
          path: "$party",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $project: {
          invoiceNumber: 1,
          invoiceDate: 1,
          grandTotal: 1,
          paidAmount: 1,
          outstandingAmount: 1,
          paymentStatus: 1,

          party: {
            _id: "$party._id",

            name: "$party.name",

            phone: "$party.phone",
          },
        },
      },

      {
        $sort: {
          invoiceDate: -1,
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      count: report.length,
      data: report,
    });
  } catch (error) {
    console.error("Customer outstanding report error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate customer outstanding report",
      error: error.message,
    });
  }
};

// =====================================================
// VENDOR OUTSTANDING REPORT
// =====================================================

const getVendorOutstandingReport = async (req, res) => {
  try {
    const companyId = new mongoose.Types.ObjectId(req.user.companyId);

    const report = await VendorBill.aggregate([
      {
        $match: {
          companyId,

          status: {
            $ne: "cancelled",
          },

          outstandingAmount: {
            $gt: 0,
          },
        },
      },

      {
        $lookup: {
          from: "vendors",

          localField: "vendorId",

          foreignField: "_id",

          as: "vendor",
        },
      },

      {
        $unwind: {
          path: "$vendor",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $project: {
          billNumber: 1,
          billDate: 1,
          grandTotal: 1,
          paidAmount: 1,
          outstandingAmount: 1,
          paymentStatus: 1,

          vendor: {
            _id: "$vendor._id",

            vendorCode: "$vendor.vendorCode",

            vendorName: "$vendor.vendorName",

            vendorType: "$vendor.vendorType",
          },
        },
      },

      {
        $sort: {
          billDate: -1,
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      count: report.length,
      data: report,
    });
  } catch (error) {
    console.error("Vendor outstanding report error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate vendor outstanding report",
      error: error.message,
    });
  }
};

// =====================================================
// EXPENSE REPORT
// =====================================================

const getExpenseReport = async (req, res) => {
  try {
    const companyId = new mongoose.Types.ObjectId(req.user.companyId);

    const { fromDate, toDate } = req.query;

    const filter = {
      companyId,

      status: "active",

      ...getDateFilter(fromDate, toDate, "expenseDate"),
    };

    const report = await Expense.aggregate([
      {
        $match: filter,
      },

      {
        $group: {
          _id: "$category",

          totalAmount: {
            $sum: "$amount",
          },

          count: {
            $sum: 1,
          },
        },
      },

      {
        $sort: {
          totalAmount: -1,
        },
      },
    ]);

    const total = report.reduce((sum, item) => sum + item.totalAmount, 0);

    return res.status(200).json({
      success: true,

      total,

      count: report.reduce((sum, item) => sum + item.count, 0),

      data: report,
    });
  } catch (error) {
    console.error("Expense report error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate expense report",
      error: error.message,
    });
  }
};

module.exports = {
  getAccountsDashboard,
  getCustomerOutstandingReport,
  getVendorOutstandingReport,
  getExpenseReport,
};
