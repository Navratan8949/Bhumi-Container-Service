"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import * as Icons from "lucide-react";
import { toast } from "sonner";
import { useActiveCompany } from "@/src/lib/auth";
import api from "@/src/services/api";
import { downloadElementAsPdf } from "@/src/lib/pdfDownload";
import WhatsAppShareModal from "@/src/components/WhatsAppShareModal";

const CATEGORIES = [
  { key: "salary", label: "Staff Salary / Wages", icon: "Users", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { key: "staff_advance", label: "Staff Advance / Daily Kharcha", icon: "HandCoins", color: "bg-amber-50 text-amber-700 border-amber-200" },
  { key: "tea_refreshment", label: "Tea, Coffee & Snacks", icon: "Coffee", color: "bg-orange-50 text-orange-700 border-orange-200" },
  { key: "pantry_kitchen", label: "Pantry & Groceries", icon: "ShoppingBag", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { key: "office_rent", label: "Office Rent", icon: "Building2", color: "bg-purple-50 text-purple-700 border-purple-200" },
  { key: "electricity", label: "Electricity Bill", icon: "Zap", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  { key: "internet", label: "Internet & Wi-Fi", icon: "Wifi", color: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  { key: "telephone", label: "Telephone & Mobile", icon: "PhoneCall", color: "bg-teal-50 text-teal-700 border-teal-200" },
  { key: "stationery", label: "Stationery & Printing", icon: "Printer", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  { key: "office_maintenance", label: "Cleaning & Maintenance", icon: "Wrench", color: "bg-stone-50 text-stone-700 border-stone-200" },
  { key: "courier_postage", label: "Courier & Speed Post", icon: "Send", color: "bg-sky-50 text-sky-700 border-sky-200" },
  { key: "software_subscription", label: "Software & IT Services", icon: "Laptop", color: "bg-violet-50 text-violet-700 border-violet-200" },
  { key: "audit_accounting", label: "CA & Accounting Fees", icon: "FileSpreadsheet", color: "bg-rose-50 text-rose-700 border-rose-200" },
  { key: "travel", label: "Travel & Local Conveyance", icon: "Car", color: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200" },
  { key: "bank_charges", label: "Bank Charges & POS", icon: "Landmark", color: "bg-slate-50 text-slate-700 border-slate-200" },
  { key: "legal", label: "Legal & Professional", icon: "Scale", color: "bg-amber-50 text-amber-700 border-amber-200" },
  { key: "tax", label: "Taxes & Govt Fees", icon: "FileCheck", color: "bg-red-50 text-red-700 border-red-200" },
  { key: "miscellaneous", label: "Miscellaneous / Petty Cash", icon: "MoreHorizontal", color: "bg-gray-50 text-gray-700 border-gray-200" },
  { key: "other", label: "Other Office Expense", icon: "Receipt", color: "bg-slate-50 text-slate-700 border-slate-200" },
];

const DEPARTMENTS = [
  "Administration",
  "Accounts & Billing",
  "Fleet Operations",
  "Dispatch & Booking",
  "Pantry & Hospitality",
  "Field & Delivery",
  "Management",
];

const PAYMENT_MODES = [
  { key: "cash", label: "Cash (पेटी कैश)" },
  { key: "upi", label: "UPI / Google Pay / PhonePe" },
  { key: "bank_transfer", label: "Bank Transfer (NEFT/RTGS/IMPS)" },
  { key: "cheque", label: "Cheque" },
  { key: "other", label: "Other" },
];

export default function OfficeExpensePage() {
  const activeCompany = useActiveCompany();
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedPaymentMode, setSelectedPaymentMode] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Modals
  const [formOpen, setFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [voucherModalExpense, setVoucherModalExpense] = useState(null);
  const [whatsAppExpense, setWhatsAppExpense] = useState(null);

  // Load Data
  const loadExpenses = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedCategory) params.category = selectedCategory;
      if (selectedPaymentMode) params.paymentMode = selectedPaymentMode;
      if (statusFilter !== "all") params.status = statusFilter;
      if (search.trim()) params.search = search.trim();

      if (selectedMonth) {
        const [year, month] = selectedMonth.split("-");
        const startDate = new Date(year, parseInt(month, 10) - 1, 1);
        const endDate = new Date(year, parseInt(month, 10), 0);
        params.fromDate = startDate.toISOString().split("T")[0];
        params.toDate = endDate.toISOString().split("T")[0];
      }

      const res = await api.get("/office-expenses", { params });
      if (res.data?.success) {
        setExpenses(res.data.data || []);
        setSummary(res.data.summary || {});
      }
    } catch (err) {
      console.error("Failed to load office expenses:", err);
      toast.error(err.response?.data?.message || "Failed to load office expenses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, [selectedCategory, selectedPaymentMode, statusFilter, selectedMonth]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadExpenses();
  };

  const clearFilters = () => {
    setSearch("");
    setSelectedCategory("");
    setSelectedPaymentMode("");
    setSelectedMonth("");
    setStatusFilter("all");
  };

  const handleCancel = async (id, voucherNo) => {
    if (!confirm(`Are you sure you want to cancel office expense voucher ${voucherNo}?`)) {
      return;
    }
    try {
      const res = await api.delete(`/office-expenses/${id}`);
      if (res.data?.success) {
        toast.success("Office expense cancelled successfully");
        loadExpenses();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to cancel office expense");
    }
  };

  // Export CSV
  const exportToCSV = () => {
    if (!expenses.length) {
      toast.info("No expense records to export");
      return;
    }
    const headers = [
      "Voucher No",
      "Date",
      "Staff / Beneficiary",
      "Department",
      "Category",
      "Description",
      "Amount (INR)",
      "Payment Mode",
      "Reference No",
      "Receipt No",
      "Status",
    ];

    const rows = expenses.map((exp) => [
      `"${exp.expenseNumber || ""}"`,
      `"${exp.expenseDate ? new Date(exp.expenseDate).toLocaleDateString("en-IN") : ""}"`,
      `"${(exp.staffName || exp.paidTo || exp.vendorName || "").replace(/"/g, '""')}"`,
      `"${(exp.department || "").replace(/"/g, '""')}"`,
      `"${(CATEGORIES.find((c) => c.key === exp.category)?.label || exp.category || "").replace(/"/g, '""')}"`,
      `"${(exp.description || "").replace(/"/g, '""')}"`,
      Number(exp.amount || 0).toFixed(2),
      `"${exp.paymentMode || ""}"`,
      `"${exp.referenceNumber || ""}"`,
      `"${exp.receiptNumber || ""}"`,
      `"${exp.status || "active"}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Office_Expenses_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Office Expenses CSV exported successfully!");
  };

  const getCategoryObj = (catKey) => {
    return CATEGORIES.find((c) => c.key === catKey) || {
      key: catKey,
      label: catKey?.replace(/_/g, " ") || "Expense",
      icon: "Receipt",
      color: "bg-slate-50 text-slate-700 border-slate-200",
    };
  };

  const formatWhatsAppMessage = (exp) => {
    if (!exp) return "";
    const cat = getCategoryObj(exp.category);
    const dateStr = exp.expenseDate
      ? new Date(exp.expenseDate).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "—";
    const beneficiary = exp.staffName || exp.paidTo || exp.vendorName || "Staff Member";

    return `*BHUMI CONTAINER SERVICE*
_Fleet Logistics & Office Administration_
Vadodara, Gujarat | Ph: +91 98849 58698

*OFFICE PAYMENT VOUCHER*
----------------------------------------
📄 *Voucher No:* ${exp.expenseNumber || "OFF-VOUCHER"}
📅 *Date:* ${dateStr}
👤 *Paid To:* ${beneficiary}
🏢 *Department:* ${exp.department || "General Administration"}
🏷️ *Expense Category:* ${cat.label}
📝 *Description:* ${exp.description || "Office Expense"}
----------------------------------------
💰 *Amount Paid:* ₹${Number(exp.amount || 0).toLocaleString("en-IN")}
💳 *Payment Mode:* ${(exp.paymentMode || "Cash").toUpperCase()}
${exp.referenceNumber ? `🔢 *Ref/Txn No:* ${exp.referenceNumber}\n` : ""}${exp.receiptNumber ? `🧾 *Receipt No:* ${exp.receiptNumber}\n` : ""}----------------------------------------
_Payment approved by Bhumi Container Service Administration_`;
  };

  const activeCount = summary.activeCount || expenses.filter((e) => e.status === "active").length;
  const cancelledCount = expenses.filter((e) => e.status === "cancelled").length;

  const totalPages = Math.max(1, Math.ceil(expenses.length / pageSize));
  const pageRows = expenses.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-6">
      {/* 1. Page Header matching ResourcePage standard */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-700">
            <Icons.Building2 className="h-4 w-4" />
            <span>OFFICE EXPENSES • STAFF SALARY, KHARCHA, TEA, RENT & UTILITIES</span>
          </div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            Office Expenses
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 font-medium">
            {expenses.length} total operational records in registry • Operations Hub
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              setEditingExpense(null);
              setFormOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2.5 text-xs font-black text-slate-950 shadow-md hover:from-amber-400 hover:to-amber-500 transition cursor-pointer active:scale-98"
          >
            <Icons.Plus className="h-4 w-4 stroke-[3]" />
            Add Office Expense
          </button>

          <button
            onClick={exportToCSV}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 hover:text-slate-900 transition cursor-pointer"
            title="Download CSV report"
          >
            <Icons.Download className="h-4 w-4 text-slate-500" />
            Export Excel
          </button>

          <button
            onClick={loadExpenses}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 hover:text-slate-900 transition cursor-pointer"
            title="Refresh Data"
          >
            <Icons.RotateCcw className="h-4 w-4 text-slate-500" />
            Refresh
          </button>
        </div>
      </div>

      {/* 2. Top 4 KPI Cards matching standard ResourcePage design */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Registry */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              TOTAL REGISTRY
            </span>
            <Icons.Layers className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">
            {expenses.length}
          </div>
          <div className="mt-1 text-xs text-slate-400 font-medium">
            System records in depot
          </div>
        </div>

        {/* Filtered Active */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              FILTERED ACTIVE
            </span>
            <Icons.CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-600">
            {activeCount}
          </div>
          <div className="mt-1 text-xs text-slate-400 font-medium">
            Matching active criteria
          </div>
        </div>

        {/* Operations Desk */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              OPERATIONS DESK
            </span>
            <Icons.Lock className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 text-xl font-black text-amber-700 tracking-tight">
            Office Expense
          </div>
          <div className="mt-1 text-xs text-slate-400 font-medium">
            Operations Hub
          </div>
        </div>

        {/* Total Registry Value */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              TOTAL REGISTRY VALUE
            </span>
            <Icons.IndianRupee className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-indigo-600">
            ₹ {Number(summary.totalAmount || 0).toLocaleString("en-IN")}
          </div>
          <div className="mt-1 text-xs text-slate-400 font-medium">
            Aggregated filtered sum
          </div>
        </div>
      </div>

      {/* 3. Filter Tabs (All Records, Active, Cancelled) */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setStatusFilter("all")}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
            statusFilter === "all"
              ? "bg-slate-900 text-white"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          All Records ({expenses.length})
        </button>
        <button
          onClick={() => setStatusFilter("active")}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
            statusFilter === "active"
              ? "bg-slate-900 text-white"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          Active ({activeCount})
        </button>
        <button
          onClick={() => setStatusFilter("cancelled")}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
            statusFilter === "cancelled"
              ? "bg-slate-900 text-white"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          Cancelled ({cancelledCount})
        </button>
      </div>

      {/* 4. Search and Quick Filters Toolbar */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Icons.Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search office expenses..."
              className="w-full pl-10 pr-4 py-2.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-amber-500 focus:outline-hidden transition"
            />
          </div>

          {(search || selectedCategory || selectedPaymentMode || selectedMonth || statusFilter !== "all") && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition cursor-pointer"
            >
              <Icons.X className="h-3.5 w-3.5" />
              Clear
            </button>
          )}

          <button
            type="submit"
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Search
          </button>
        </form>

        {/* Directly visible Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-amber-500 focus:outline-hidden cursor-pointer"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat.key} value={cat.key}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Payment Mode
            </label>
            <select
              value={selectedPaymentMode}
              onChange={(e) => setSelectedPaymentMode(e.target.value)}
              className="w-full px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-amber-500 focus:outline-hidden cursor-pointer"
            >
              <option value="">All Payment Modes</option>
              {PAYMENT_MODES.map((pm) => (
                <option key={pm.key} value={pm.key}>
                  {pm.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Month
            </label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-amber-500 focus:outline-hidden cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* 5. Main Table with Light Header, Zebra Striping, and Light Footer */}
      <div className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            {/* Light Pink Header */}
            <thead className="bg-rose-50/90 text-slate-800 border-b-2 border-rose-200/80">
              <tr>
                <th className="py-3 px-4 text-[11px] font-black uppercase tracking-wider text-slate-700">Status</th>
                <th className="py-3 px-4 text-[11px] font-black uppercase tracking-wider text-slate-700 text-right">Expense Amount (₹)</th>
                <th className="py-3 px-4 text-[11px] font-black uppercase tracking-wider text-slate-700">Staff / Beneficiary</th>
                <th className="py-3 px-4 text-[11px] font-black uppercase tracking-wider text-slate-700">Expense Category</th>
                <th className="py-3 px-4 text-[11px] font-black uppercase tracking-wider text-slate-700">Description / Purpose</th>
                <th className="py-3 px-4 text-[11px] font-black uppercase tracking-wider text-slate-700">Paid Via</th>
                <th className="py-3 px-4 text-[11px] font-black uppercase tracking-wider text-slate-700">Voucher Number</th>
                <th className="py-3 px-4 text-[11px] font-black uppercase tracking-wider text-slate-700">Expense Date</th>
                <th className="py-3 px-4 text-[11px] font-black uppercase tracking-wider text-slate-700 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400">
                    <Icons.Loader2 className="h-6 w-6 animate-spin mx-auto text-amber-500 mb-2" />
                    Loading office expenses...
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center">
                    <div className="max-w-xs mx-auto text-slate-400">
                      <Icons.Building2 className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                      <p className="font-bold text-slate-700 text-sm">No records found</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Try changing the search or filters.
                      </p>
                      <button
                        onClick={() => {
                          setEditingExpense(null);
                          setFormOpen(true);
                        }}
                        className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-slate-950 rounded-xl text-xs font-bold hover:bg-amber-400 transition"
                      >
                        <Icons.Plus className="h-3.5 w-3.5" /> Add Office Expense
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                pageRows.map((exp, idx) => {
                  const cat = getCategoryObj(exp.category);
                  const IconComp = Icons[cat.icon] || Icons.Receipt;
                  const isCancelled = exp.status === "cancelled";

                  // Zebra striping: 1, 3, 5, 7 white (hover #f8f8f8); 2, 4, 6, 8 light gold (hover amber-100)
                  const rowBg = idx % 2 === 0 ? "bg-white hover:bg-[#f8f8f8]" : "bg-amber-50/80 hover:bg-amber-100/70";

                  return (
                    <tr
                      key={exp._id}
                      className={`${rowBg} transition-colors border-b border-slate-100 ${
                        isCancelled ? "opacity-60" : ""
                      }`}
                    >
                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isCancelled
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {!isCancelled && <Icons.Check className="h-3 w-3" />}
                          {isCancelled ? "cancelled" : "active"}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span
                          className={`font-black text-sm tracking-tight ${
                            isCancelled ? "text-slate-400 line-through" : "text-slate-900"
                          }`}
                        >
                          ₹ {Number(exp.amount || 0).toLocaleString("en-IN")}
                        </span>
                      </td>

                      {/* Staff / Beneficiary */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">
                          {exp.staffName || exp.paidTo || exp.vendorName || "—"}
                        </div>
                        {exp.department && (
                          <div className="text-[10px] text-slate-400 font-medium">
                            {exp.department}
                          </div>
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${cat.color}`}
                        >
                          <IconComp className="h-3 w-3" />
                          {cat.label}
                        </span>
                      </td>

                      {/* Description */}
                      <td className="py-3 px-4 max-w-[220px]">
                        <p className="truncate text-slate-600 font-medium" title={exp.description}>
                          {exp.description || "—"}
                        </p>
                        {exp.vendorName && exp.staffName && (
                          <p className="text-[10px] text-slate-400 truncate">Vendor: {exp.vendorName}</p>
                        )}
                      </td>

                      {/* Paid Via */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-700 capitalize">
                          {exp.paymentMode?.replace(/_/g, " ")}
                        </div>
                        {exp.referenceNumber && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            Ref: {exp.referenceNumber}
                          </div>
                        )}
                      </td>

                      {/* Voucher No */}
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-600 font-semibold">
                        {exp.expenseNumber || "—"}
                      </td>

                      {/* Date */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-600 font-medium">
                        {exp.expenseDate
                          ? new Date(exp.expenseDate).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {/* Payment Voucher Slip */}
                          <button
                            onClick={() => setVoucherModalExpense(exp)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                            title="View / Print / Download Voucher Slip"
                          >
                            <Icons.Eye className="h-4 w-4" />
                          </button>

                          {/* WhatsApp Share */}
                          <button
                            onClick={() => setWhatsAppExpense(exp)}
                            className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                            title="Share on WhatsApp"
                          >
                            <Icons.MessageCircle className="h-4 w-4" />
                          </button>

                          {/* Edit */}
                          {!isCancelled && (
                            <button
                              onClick={() => {
                                setEditingExpense(exp);
                                setFormOpen(true);
                              }}
                              className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                              title="Edit Expense"
                            >
                              <Icons.Pencil className="h-4 w-4" />
                            </button>
                          )}

                          {/* Delete/Cancel */}
                          {!isCancelled && (
                            <button
                              onClick={() => handleCancel(exp._id, exp.expenseNumber)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              title="Cancel Voucher"
                            >
                              <Icons.Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 6. Light Table Tally & Totals Footer (NO BLACK FOOTER) */}
        {expenses.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t-2 border-amber-300 bg-amber-50/70 px-5 py-3.5 text-xs text-slate-700">
            <div className="flex items-center gap-1.5 text-amber-800 font-black uppercase tracking-wider text-[11px]">
              <Icons.Calculator className="h-4 w-4 text-amber-600" />
              <span>Table Tally & Totals:</span>
            </div>
            <div className="flex items-center gap-1.5 font-medium">
              <span className="text-slate-600 font-semibold">Office Expense Slips:</span>
              <span className="font-mono font-black text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                {expenses.length} Vouchers
              </span>
            </div>
            <div className="flex items-center gap-1.5 font-medium">
              <span className="text-slate-600 font-semibold">Total Office Expenses:</span>
              <span className="font-mono font-black text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded border border-amber-300 shadow-2xs">
                ₹ {Number(summary.totalAmount || 0).toLocaleString("en-IN")}
              </span>
            </div>
            {summary.salaryTotal > 0 && (
              <div className="flex items-center gap-1.5 font-medium">
                <span className="text-slate-600 font-semibold">Salaries:</span>
                <span className="font-mono font-black text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 shadow-2xs">
                  ₹ {Number(summary.salaryTotal).toLocaleString("en-IN")}
                </span>
              </div>
            )}
            {summary.staffAdvanceTotal > 0 && (
              <div className="flex items-center gap-1.5 font-medium">
                <span className="text-slate-600 font-semibold">Staff Advances:</span>
                <span className="font-mono font-black text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 shadow-2xs">
                  ₹ {Number(summary.staffAdvanceTotal).toLocaleString("en-IN")}
                </span>
              </div>
            )}
          </div>
        )}

        {/* 7. Pagination Bar */}
        <div className="flex flex-col gap-4 border-t border-slate-100 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Showing{" "}
            <span className="font-semibold text-slate-900">
              {expenses.length ? (page - 1) * pageSize + 1 : 0}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-slate-900">
              {Math.min(page * pageSize, expenses.length)}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-slate-900">{expenses.length}</span>{" "}
            records
          </p>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 font-medium">
              Rows per page: <span className="font-bold text-slate-700">10</span>
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg disabled:opacity-40 transition cursor-pointer"
              >
                <Icons.ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs font-bold text-slate-700 px-2">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg disabled:opacity-40 transition cursor-pointer"
              >
                <Icons.ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Record / Edit Modal */}
      {formOpen && (
        <OfficeExpenseFormModal
          isOpen={formOpen}
          initialData={editingExpense}
          onClose={() => {
            setFormOpen(false);
            setEditingExpense(null);
          }}
          onSuccess={() => {
            setFormOpen(false);
            setEditingExpense(null);
            loadExpenses();
          }}
        />
      )}

      {/* Printable Payment Voucher Modal */}
      {voucherModalExpense && (
        <OfficePaymentVoucherModal
          expense={voucherModalExpense}
          activeCompany={activeCompany}
          onClose={() => setVoucherModalExpense(null)}
          onWhatsApp={() => {
            const exp = voucherModalExpense;
            setVoucherModalExpense(null);
            setWhatsAppExpense(exp);
          }}
        />
      )}

      {/* WhatsApp Share Modal */}
      {whatsAppExpense && (
        <WhatsAppShareModal
          isOpen={!!whatsAppExpense}
          onClose={() => setWhatsAppExpense(null)}
          title="Share Office Payment Voucher"
          subtitle={`Voucher #${whatsAppExpense.expenseNumber} • ${
            whatsAppExpense.staffName || whatsAppExpense.paidTo || "Staff"
          }`}
          defaultPhone=""
          defaultMessage={formatWhatsAppMessage(whatsAppExpense)}
          contactOptions={[]}
          onDownloadPdf={() => {
            const exp = whatsAppExpense;
            setWhatsAppExpense(null);
            setVoucherModalExpense(exp);
          }}
          downloadButtonLabel="Open Voucher to Download PDF"
        />
      )}
    </div>
  );
}

// =====================================================
// FORM MODAL FOR CREATE / EDIT
// =====================================================
function OfficeExpenseFormModal({ isOpen, initialData, onClose, onSuccess }) {
  const isEdit = !!initialData?._id;
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    expenseNumber: initialData?.expenseNumber || "",
    expenseDate: initialData?.expenseDate
      ? new Date(initialData.expenseDate).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0],
    category: initialData?.category || "tea_refreshment",
    staffName: initialData?.staffName || "",
    department: initialData?.department || "Administration",
    paidTo: initialData?.paidTo || "",
    amount: initialData?.amount || "",
    paymentMode: initialData?.paymentMode || "cash",
    referenceNumber: initialData?.referenceNumber || "",
    vendorName: initialData?.vendorName || "",
    receiptNumber: initialData?.receiptNumber || "",
    description: initialData?.description || "",
    remarks: initialData?.remarks || "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.amount || Number(formData.amount) <= 0) {
      toast.error("Please enter a valid expense amount greater than 0");
      return;
    }

    try {
      setLoading(true);
      if (isEdit) {
        const res = await api.put(`/office-expenses/${initialData._id}`, formData);
        if (res.data?.success) {
          toast.success("Office expense updated successfully!");
          onSuccess();
        }
      } else {
        const res = await api.post("/office-expenses", formData);
        if (res.data?.success) {
          toast.success("Office expense recorded successfully!");
          onSuccess();
        }
      }
    } catch (err) {
      console.error("Save expense error:", err);
      toast.error(err.response?.data?.message || "Failed to save office expense");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
      <div className="max-h-[92vh] w-full max-w-2xl flex flex-col rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-600">
              {isEdit ? "Update Record" : "New Voucher"}
            </span>
            <h2 className="text-lg font-black text-slate-900">
              {isEdit ? "Edit Office Expense" : "Record Office Expense"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            <Icons.X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Voucher No */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Voucher Number
              </label>
              <input
                type="text"
                value={formData.expenseNumber}
                onChange={(e) => setFormData({ ...formData, expenseNumber: e.target.value })}
                placeholder="Auto-generated (e.g. OFF-2026-001)"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-amber-500 focus:outline-hidden font-mono uppercase"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">Leave blank for automatic sequence</p>
            </div>

            {/* Date */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Expense Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.expenseDate}
                onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-amber-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Expense Category <span className="text-rose-500">*</span>
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-amber-500 focus:outline-hidden font-semibold cursor-pointer"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.key} value={cat.key}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Staff / Person Name */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Staff / Person Name (स्टाफ का नाम)
              </label>
              <input
                type="text"
                value={formData.staffName}
                onChange={(e) => setFormData({ ...formData, staffName: e.target.value })}
                placeholder="e.g. Ramesh Bhai, Peon, Tea Vendor"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-amber-500 focus:outline-hidden font-medium"
              />
            </div>

            {/* Department */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Department / Role
              </label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-amber-500 focus:outline-hidden cursor-pointer"
              >
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Amount */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Amount (₹) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-slate-400">
                  ₹
                </span>
                <input
                  type="number"
                  step="any"
                  required
                  min="1"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-amber-500 focus:outline-hidden text-base font-black text-slate-900"
                />
              </div>
            </div>

            {/* Payment Mode */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Payment Mode <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.paymentMode}
                onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-amber-500 focus:outline-hidden cursor-pointer"
              >
                {PAYMENT_MODES.map((pm) => (
                  <option key={pm.key} value={pm.key}>
                    {pm.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Ref Number */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                UPI Ref / Cheque No / Txn ID
              </label>
              <input
                type="text"
                value={formData.referenceNumber}
                onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                placeholder="e.g. UPI UTR, Cheque #004521"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-amber-500 focus:outline-hidden font-mono"
              />
            </div>

            {/* Bill / Receipt No */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Shop / Receipt / Bill No.
              </label>
              <input
                type="text"
                value={formData.receiptNumber}
                onChange={(e) => setFormData({ ...formData, receiptNumber: e.target.value })}
                placeholder="e.g. Bill #5821"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-amber-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Description / Purpose of Expense
            </label>
            <textarea
              rows="2"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g. Monthly tea & refreshment kharcha for staff, printer cartridge replacement, office internet bill payment"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-amber-500 focus:outline-hidden"
            />
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-bold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl shadow-md transition cursor-pointer disabled:opacity-50"
            >
              {loading && <Icons.Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Update Voucher" : "Save Office Expense"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// =====================================================
// PAYMENT VOUCHER PRINT & PDF MODAL
// =====================================================
function OfficePaymentVoucherModal({ expense, activeCompany, onClose, onWhatsApp }) {
  const printRef = useRef(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    try {
      setDownloading(true);
      const filename = `Office_Voucher_${expense.expenseNumber || "Slip"}_${new Date().toISOString().split("T")[0]}.pdf`;
      await downloadElementAsPdf(printRef.current, filename);
      toast.success("Payment Voucher PDF downloaded successfully!");
    } catch (err) {
      toast.error("Failed to generate PDF. Falling back to print.");
      window.print();
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const catObj = CATEGORIES.find((c) => c.key === expense.category) || {
    label: expense.category,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
      <div className="max-h-[95vh] w-full max-w-3xl flex flex-col rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        {/* Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between border-b border-slate-200 px-6 py-3.5 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-400 text-slate-950 font-black">
              <Icons.FileText className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-amber-400">
                Commercial Payment Voucher
              </p>
              <p className="text-[11px] text-slate-300">
                {expense.expenseNumber} • {expense.staffName || expense.paidTo || "Staff Member"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 px-3 py-1.5 text-xs font-black shadow-sm transition cursor-pointer"
            >
              {downloading ? (
                <Icons.Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Icons.Download className="h-3.5 w-3.5" />
              )}
              Download PDF
            </button>

            <button
              onClick={onWhatsApp}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white px-3 py-1.5 text-xs font-black shadow-sm transition cursor-pointer"
            >
              <Icons.MessageCircle className="h-3.5 w-3.5" />
              WhatsApp
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 text-xs font-bold transition cursor-pointer"
            >
              <Icons.Printer className="h-3.5 w-3.5" />
              Print
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition cursor-pointer ml-1"
            >
              <Icons.X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Preview Container */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-slate-100/70 flex justify-center">
          {/* Printable Voucher Paper */}
          <div
            ref={printRef}
            className="w-full max-w-2xl bg-white rounded-2xl shadow-lg border border-slate-300 p-8 text-slate-900 print:shadow-none print:border-none print:m-0"
            style={{ minHeight: "500px" }}
          >
            {/* Header */}
            <div className="border-b-2 border-slate-900 pb-4 text-center relative">
              <h2 className="text-2xl font-black tracking-tight text-slate-950 uppercase">
                {activeCompany?.name || "BHUMI CONTAINER SERVICE"}
              </h2>
              <p className="text-[11px] font-bold text-slate-600 mt-0.5 tracking-wide">
                FLEET OWNERS & HEAVY CARGO LOGISTICS CONTRACTORS
              </p>
              <p className="text-[10px] text-slate-500">
                Vadodara, Gujarat • Phone: +91 98849 58698 • GSTIN: 24AAAFB8949Q1ZP
              </p>

              <div className="mt-3 inline-block bg-slate-900 text-white px-4 py-1 rounded-md text-xs font-black tracking-wider uppercase">
                Office Cash / Bank Payment Voucher
              </div>
            </div>

            {/* Voucher Meta Details */}
            <div className="grid grid-cols-2 gap-4 py-4 border-b border-slate-200 text-xs">
              <div>
                <p className="text-slate-500 font-bold uppercase text-[10px]">Voucher Number</p>
                <p className="font-mono font-black text-slate-900 text-sm">{expense.expenseNumber}</p>
              </div>
              <div className="text-right">
                <p className="text-slate-500 font-bold uppercase text-[10px]">Voucher Date</p>
                <p className="font-black text-slate-900 text-sm">
                  {expense.expenseDate
                    ? new Date(expense.expenseDate).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })
                    : "—"}
                </p>
              </div>
            </div>

            {/* Beneficiary & Expense Body */}
            <div className="py-5 space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-2 py-2 border-b border-slate-100">
                <span className="font-bold text-slate-500">Paid To / Beneficiary:</span>
                <span className="col-span-2 font-black text-slate-900 text-sm">
                  {expense.staffName || expense.paidTo || expense.vendorName || "Office Staff"}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 py-2 border-b border-slate-100">
                <span className="font-bold text-slate-500">Department / Role:</span>
                <span className="col-span-2 font-bold text-slate-800">
                  {expense.department || "General Administration"}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 py-2 border-b border-slate-100">
                <span className="font-bold text-slate-500">Expense Category:</span>
                <span className="col-span-2 font-bold text-slate-900">
                  {catObj.label}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 py-2 border-b border-slate-100">
                <span className="font-bold text-slate-500">Purpose / Details:</span>
                <span className="col-span-2 text-slate-700 font-medium">
                  {expense.description || "Official office operational expense"}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 py-2 border-b border-slate-100">
                <span className="font-bold text-slate-500">Payment Mode:</span>
                <span className="col-span-2 font-bold text-slate-800 uppercase">
                  {expense.paymentMode} {expense.referenceNumber && `(Ref: ${expense.referenceNumber})`}
                </span>
              </div>

              {expense.receiptNumber && (
                <div className="grid grid-cols-3 gap-2 py-2 border-b border-slate-100">
                  <span className="font-bold text-slate-500">Receipt / Bill No:</span>
                  <span className="col-span-2 font-mono text-slate-700">
                    {expense.receiptNumber}
                  </span>
                </div>
              )}
            </div>

            {/* Amount Box */}
            <div className="my-6 p-4 rounded-xl bg-amber-50 border-2 border-amber-300 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                  Total Amount Paid (INR)
                </p>
                <p className="text-2xl font-black text-slate-950">
                  ₹{Number(expense.amount || 0).toLocaleString("en-IN")}
                </p>
              </div>
              <div className="text-right">
                <span className="px-3 py-1 rounded-md bg-amber-200 text-amber-900 text-xs font-black uppercase">
                  Cash / Bank Passed
                </span>
              </div>
            </div>

            {/* Signature Blocks */}
            <div className="pt-12 grid grid-cols-3 gap-6 text-center text-xs font-bold text-slate-600">
              <div>
                <div className="border-t border-slate-400 pt-1">
                  Receiver's Signature
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">Staff / Payee</p>
              </div>
              <div>
                <div className="border-t border-slate-400 pt-1">
                  Prepared By
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {expense.enteredBy?.name || "Accounts Clerk"}
                </p>
              </div>
              <div>
                <div className="border-t border-slate-400 pt-1">
                  Authorized Signatory
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">Manager / Director</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
