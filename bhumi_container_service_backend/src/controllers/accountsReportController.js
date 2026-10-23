const CustomerInvoice = require("../models/CustomerInvoice");
const VendorBill = require("../models/VendorBill");
const Expense = require("../models/Expense");
const Fuel = require("../models/Fuel");
const Maintenance = require("../models/Maintenance");
const Tyre = require("../models/Tyre");
const Trip = require("../models/Trip");
const Loan = require("../models/Loan");
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
      paidAmount: { $gt: 0 },
      ...getDateFilter(fromDate, toDate, "paymentDate"),
    };

    const customerPaymentSummary = await CustomerInvoice.aggregate([
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
            $sum: "$paidAmount",
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
    // Vendor Payment (from VendorBill)
    // -------------------------------------------------

    const vendorPaymentFilter = {
      companyId,
      paidAmount: { $gt: 0 },
      ...getDateFilter(fromDate, toDate, "advanceDate"),
    };

    const vendorPaymentSummary = await VendorBill.aggregate([
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
            $sum: "$paidAmount",
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

// =====================================================
// PROFIT & LOSS REPORT
// =====================================================

const getProfitAndLossReport = async (req, res) => {
  try {
    const companyId = new mongoose.Types.ObjectId(req.user.companyId);
    const { fromDate, toDate } = req.query;

    const dateFilter = (fieldName) => {
      const f = {};
      if (fromDate || toDate) {
        f[fieldName] = {};
        if (fromDate) {
          const s = new Date(fromDate);
          s.setHours(0, 0, 0, 0);
          f[fieldName].$gte = s;
        }
        if (toDate) {
          const e = new Date(toDate);
          e.setHours(23, 59, 59, 999);
          f[fieldName].$lte = e;
        }
      }
      return f;
    };

    // Helper to get Month Key (YYYY-MM) and Label ("October 2026")
    const getMonthInfo = (dateVal) => {
      if (!dateVal) return { key: "Unknown", label: "Unknown", timestamp: 0 };
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return { key: "Unknown", label: "Unknown", timestamp: 0 };
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
      return { key, label, timestamp: new Date(d.getFullYear(), d.getMonth(), 1).getTime() };
    };

    // 1. Fetch Income Sources:
    const invoices = await CustomerInvoice.find({
      companyId,
      status: { $ne: "cancelled" },
      ...dateFilter("invoiceDate"),
    }).lean();

    const billedTripIds = new Set(
      invoices.map((inv) => String(inv.tripId)).filter((x) => x && x !== "undefined")
    );

    const trips = await Trip.find({
      companyId,
      status: { $ne: "cancelled" },
      ...dateFilter("dispatchDate"),
    }).lean();

    // 2. Fetch Operating Expenses:
    const expenses = await Expense.find({
      companyId,
      status: "active",
      ...dateFilter("expenseDate"),
    }).lean();

    const fuels = await Fuel.find({
      companyId,
      ...dateFilter("fuelDate"),
    }).lean();

    const maintenances = await Maintenance.find({
      companyId,
      status: { $ne: "cancelled" },
      ...dateFilter("maintenanceDate"),
    }).lean();

    const tyres = await Tyre.find({
      companyId,
      purchasePrice: { $gt: 0 },
      ...dateFilter("purchaseDate"),
    }).lean();

    const vendorBills = await VendorBill.find({
      companyId,
      status: { $ne: "cancelled" },
      ...dateFilter("billDate"),
    }).lean();

    const loans = await Loan.find({
      companyId,
      status: "active",
    }).lean();

    // Accumulators by Month Map
    const monthMap = {};

    const getOrCreateMonth = (key, label, ts) => {
      if (!monthMap[key]) {
        monthMap[key] = {
          monthKey: key,
          month: label,
          timestamp: ts,
          income: 0,
          expense: 0,
          profit: 0,
          incomeBreakdown: {
            customerInvoices: 0,
            directTrips: 0,
          },
          expenseBreakdown: {
            diesel: 0,
            driverExpenses: 0,
            maintenance: 0,
            tyres: 0,
            marketLorry: 0,
            loanEmi: 0,
          },
        };
      }
      return monthMap[key];
    };

    // Process Invoices
    for (const inv of invoices) {
      const { key, label, timestamp } = getMonthInfo(inv.invoiceDate || inv.createdAt);
      if (key !== "Unknown") {
        const m = getOrCreateMonth(key, label, timestamp);
        const amt = Number(inv.grandTotal || inv.freightRate || inv.totalAmount || 0);
        m.income += amt;
        m.incomeBreakdown.customerInvoices += amt;
      }
    }

    // Process Direct Trips (where trip rate is not already billed in Customer Invoices)
    for (const tr of trips) {
      if (!billedTripIds.has(String(tr._id))) {
        const { key, label, timestamp } = getMonthInfo(tr.dispatchDate || tr.createdAt);
        if (key !== "Unknown") {
          const m = getOrCreateMonth(key, label, timestamp);
          const amt = Number(tr.rate || 0);
          if (amt > 0) {
            m.income += amt;
            m.incomeBreakdown.directTrips += amt;
          }
        }
      }
    }

    // Process Driver Expenses
    for (const exp of expenses) {
      const { key, label, timestamp } = getMonthInfo(exp.expenseDate || exp.createdAt);
      if (key !== "Unknown") {
        const m = getOrCreateMonth(key, label, timestamp);
        const amt = Number(exp.amount || 0);
        m.expense += amt;
        m.expenseBreakdown.driverExpenses += amt;
      }
    }

    // Process Fuel
    for (const f of fuels) {
      const { key, label, timestamp } = getMonthInfo(f.fuelDate || f.createdAt);
      if (key !== "Unknown") {
        const m = getOrCreateMonth(key, label, timestamp);
        const amt = Number(f.totalCost || (Number(f.quantity || 0) * Number(f.ratePerLiter || 0)) || 0);
        m.expense += amt;
        m.expenseBreakdown.diesel += amt;
      }
    }

    // Process Maintenance
    for (const maint of maintenances) {
      const { key, label, timestamp } = getMonthInfo(maint.maintenanceDate || maint.createdAt);
      if (key !== "Unknown") {
        const m = getOrCreateMonth(key, label, timestamp);
        const amt = Number(maint.totalCost || (Number(maint.partsCost || 0) + Number(maint.labourCost || 0)) || 0);
        m.expense += amt;
        m.expenseBreakdown.maintenance += amt;
      }
    }

    // Process Tyres
    for (const t of tyres) {
      const { key, label, timestamp } = getMonthInfo(t.purchaseDate || t.createdAt);
      if (key !== "Unknown") {
        const m = getOrCreateMonth(key, label, timestamp);
        const amt = Number(t.purchasePrice || 0);
        m.expense += amt;
        m.expenseBreakdown.tyres += amt;
      }
    }

    // Process Market Lorry / Vendor Bills
    for (const vb of vendorBills) {
      const { key, label, timestamp } = getMonthInfo(vb.billDate || vb.createdAt);
      if (key !== "Unknown") {
        const m = getOrCreateMonth(key, label, timestamp);
        const amt = Number(vb.hireRate || vb.grandTotal || 0);
        m.expense += amt;
        m.expenseBreakdown.marketLorry += amt;
      }
    }

    // Ensure at least the current month exists
    const currentMonthInfo = getMonthInfo(new Date());
    getOrCreateMonth(currentMonthInfo.key, currentMonthInfo.label, currentMonthInfo.timestamp);

    // Calculate profit for each month and include loans EMI
    const months = Object.values(monthMap)
      .filter((m) => m.monthKey !== "Unknown")
      .map((m) => {
        let monthEmiTotal = 0;
        for (const l of loans) {
          const emi = Number(l.emiAmount || 0);
          if (emi > 0) {
            monthEmiTotal += emi;
          }
        }
        m.expense += monthEmiTotal;
        m.expenseBreakdown.loanEmi += monthEmiTotal;
        m.profit = m.income - m.expense;
        return m;
      })
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    // Overall summary totals
    const totalIncome = months.reduce((s, m) => s + m.income, 0);
    const totalExpense = months.reduce((s, m) => s + m.expense, 0);
    const netProfit = totalIncome - totalExpense;
    const profitMargin = totalIncome > 0 ? Number(((netProfit / totalIncome) * 100).toFixed(2)) : 0;

    return res.status(200).json({
      success: true,
      summary: {
        totalIncome,
        totalExpense,
        netProfit,
        profitMargin,
        status: netProfit >= 0 ? "profit" : "loss",
      },
      months,
    });
  } catch (error) {
    console.error("Profit and Loss report error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate Profit & Loss report",
      error: error.message,
    });
  }
};

module.exports = {
  getAccountsDashboard,
  getCustomerOutstandingReport,
  getVendorOutstandingReport,
  getExpenseReport,
  getProfitAndLossReport,
};
