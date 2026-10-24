"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Landmark,
  Plus,
  Search,
  MoreVertical,
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle2,
  X,
  CreditCard,
  Edit2,
  Trash2,
  ChevronRight,
  TrendingDown,
  Info,
  DollarSign,
  Truck,
  Save,
  Check,
  RefreshCw,
  Mail,
  Send,
  ShieldAlert,
  BellRing,
  IndianRupee,
  Lock,
  SlidersHorizontal,
  FileSpreadsheet,
} from "lucide-react";
import api from "@/src/services/api";
import { toast } from "sonner";
import { exportToExcelProfessional } from "@/src/lib/excelExport";

export default function LoansPage() {
  const [loans, setLoans] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // all, active, due_soon, closed

  // Add / Edit Modal State
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingLoan, setEditingLoan] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Manage EMIs Modal State
  const [showEmiModal, setShowEmiModal] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [payingInstallment, setPayingInstallment] = useState(null); // installment being paid
  const [payPaymentMode, setPayPaymentMode] = useState("auto_debit");
  const [payRefNo, setPayRefNo] = useState("");
  const [paySubmitting, setPaySubmitting] = useState(false);

  // Email Alert Trigger State
  const [emailSending, setEmailSending] = useState(false);

  // Active Dropdown Menu
  const [openMenuId, setOpenMenuId] = useState(null);

  // Form State
  const initialForm = {
    vehicleId: "",
    bankName: "",
    accountNumber: "",
    loanAmount: "",
    downPayment: "0",
    interestRate: "0",
    interestType: "reducing_balance",
    installments: "12",
    emiAmount: "",
    loanStartDate: new Date().toISOString().split("T")[0],
    loanEndDate: "",
    emiDeductionDay: 5,
    status: "active",
    remarks: "",
  };
  const [formData, setFormData] = useState(initialForm);

  // Load loans & vehicles
  const fetchData = async () => {
    try {
      setLoading(true);
      const [loansRes, vehRes] = await Promise.all([
        api.get("/loans"),
        api.get("/vehicles"),
      ]);
      setLoans(loansRes?.data?.data || []);
      setVehicles(vehRes?.data?.data || []);
    } catch (err) {
      console.error("Failed to load loans data:", err);
      toast.error("Failed to load loans data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Close card menu on click outside
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  // Auto calculate EMI and End Date when Loan Amount, Rate, Installments, or Start Date change
  const handleFormInputChange = (field, value) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };

      const principal = parseFloat(field === "loanAmount" ? value : next.loanAmount) || 0;
      const rate = parseFloat(field === "interestRate" ? value : next.interestRate) || 0;
      const months = parseInt(field === "installments" ? value : next.installments, 10) || 1;
      const startDateStr = field === "loanStartDate" ? value : next.loanStartDate;

      // Auto compute end date
      if (startDateStr && months > 0) {
        const start = new Date(startDateStr);
        if (!isNaN(start.getTime())) {
          const end = new Date(start.getFullYear(), start.getMonth() + months, parseInt(next.emiDeductionDay, 10) || 5);
          next.loanEndDate = end.toISOString().split("T")[0];
        }
      }

      // Compute standard EMI
      if (field === "loanAmount" || field === "interestRate" || field === "installments" || field === "interestType") {
        if (principal > 0 && months > 0) {
          if (next.interestType === "flat_rate") {
            const totalInt = principal * (rate / 100) * (months / 12);
            const totalPayable = principal + totalInt;
            next.emiAmount = Math.round(totalPayable / months).toString();
          } else {
            // Reducing Balance
            if (rate > 0) {
              const r = rate / 12 / 100;
              const emi = (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
              next.emiAmount = Math.round(emi).toString();
            } else {
              next.emiAmount = Math.round(principal / months).toString();
            }
          }
        }
      }

      return next;
    });
  };

  // Form Summary calculations
  const formPrincipal = parseFloat(formData.loanAmount) || 0;
  const formMonths = parseInt(formData.installments, 10) || 1;
  const formEmi = parseFloat(formData.emiAmount) || 0;
  const formTotalPayable = formEmi * formMonths;
  const formTotalInterest = Math.max(0, formTotalPayable - formPrincipal);

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingLoan(null);
    setFormData(initialForm);
    setShowFormModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (loan) => {
    setEditingLoan(loan);
    setFormData({
      vehicleId: loan.vehicleId?._id || loan.vehicleId || "",
      bankName: loan.bankName || "",
      accountNumber: loan.accountNumber || "",
      loanAmount: loan.loanAmount ? String(loan.loanAmount) : "",
      downPayment: loan.downPayment !== undefined ? String(loan.downPayment) : "0",
      interestRate: loan.interestRate !== undefined ? String(loan.interestRate) : "0",
      interestType: loan.interestType || "reducing_balance",
      installments: loan.installments ? String(loan.installments) : "12",
      emiAmount: loan.emiAmount ? String(loan.emiAmount) : "",
      loanStartDate: loan.loanStartDate ? new Date(loan.loanStartDate).toISOString().split("T")[0] : "",
      loanEndDate: loan.loanEndDate ? new Date(loan.loanEndDate).toISOString().split("T")[0] : "",
      emiDeductionDay: loan.emiDeductionDay || 5,
      status: loan.status || "active",
      remarks: loan.remarks || "",
    });
    setShowFormModal(true);
  };

  // Submit Form (Create or Update)
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formData.vehicleId) {
      toast.error("Please select a vehicle");
      return;
    }
    if (!formData.bankName.trim()) {
      toast.error("Please enter bank name");
      return;
    }
    if (!formData.loanAmount || parseFloat(formData.loanAmount) <= 0) {
      toast.error("Please enter a valid loan amount");
      return;
    }
    if (!formData.emiAmount || parseFloat(formData.emiAmount) <= 0) {
      toast.error("Please enter monthly EMI amount");
      return;
    }

    try {
      setFormSubmitting(true);
      if (editingLoan) {
        await api.put(`/loans/${editingLoan._id}`, formData);
        toast.success("Loan updated successfully");
      } else {
        await api.post("/loans", formData);
        toast.success("Vehicle loan registered successfully");
      }
      setShowFormModal(false);
      fetchData();
    } catch (err) {
      console.error("Save loan error:", err);
      toast.error(err?.response?.data?.message || "Failed to save loan");
    } finally {
      setFormSubmitting(false);
    }
  };

  // Delete Loan
  const handleDeleteLoan = async (loanId) => {
    if (!window.confirm("Are you sure you want to delete this loan record?")) return;
    try {
      await api.delete(`/loans/${loanId}`);
      toast.success("Loan record deleted");
      fetchData();
      if (selectedLoan?._id === loanId) {
        setShowEmiModal(false);
      }
    } catch (err) {
      console.error("Delete loan error:", err);
      toast.error("Failed to delete loan");
    }
  };

  // Open Manage EMIs Modal
  const handleOpenManageEmis = (loan) => {
    setSelectedLoan(loan);
    setPayingInstallment(null);
    setShowEmiModal(true);
  };

  // Record EMI Payment
  const handleRecordPayment = async (installmentNumber) => {
    try {
      setPaySubmitting(true);
      const res = await api.post(`/loans/${selectedLoan._id}/pay-emi`, {
        installmentNumber,
        paidDate: new Date(),
        paymentMode: payPaymentMode,
        referenceNumber: payRefNo,
      });

      toast.success(`Installment #${installmentNumber} marked as paid`);
      setPayingInstallment(null);
      setPayRefNo("");

      if (res.data?.data) {
        setSelectedLoan(res.data.data);
      }
      fetchData();
    } catch (err) {
      console.error("Record EMI payment error:", err);
      toast.error(err?.response?.data?.message || "Failed to record payment");
    } finally {
      setPaySubmitting(false);
    }
  };

  // Send Daily Alert Email Manually / Test
  const handleTriggerEmailAlert = async () => {
    try {
      setEmailSending(true);
      const res = await api.post("/loans/send-daily-alerts");
      toast.success(res?.data?.message || "Daily audit alert email sent successfully to Admin!");
    } catch (err) {
      console.error("Trigger email alert error:", err);
      toast.error(err?.response?.data?.message || "Failed to trigger email alert");
    } finally {
      setEmailSending(false);
    }
  };

  // Filtered Loans
  const filteredLoans = useMemo(() => {
    return loans.filter((loan) => {
      const vehNo = loan.vehicleId?.vehicleNumber || "";
      const bank = loan.bankName || "";
      const acc = loan.accountNumber || "";
      const term = search.toLowerCase();

      const matchesSearch =
        vehNo.toLowerCase().includes(term) ||
        bank.toLowerCase().includes(term) ||
        acc.toLowerCase().includes(term);

      if (!matchesSearch) return false;

      if (activeTab === "active") return loan.status === "active";
      if (activeTab === "closed") return loan.status === "closed";
      if (activeTab === "due_soon") return loan.status === "active" && (loan.isDueSoon || loan.isOverdue);

      return true;
    });
  }, [loans, search, activeTab]);

  // Outstanding alerts (EMIs due soon <= 7 days or overdue)
  const dueAlerts = useMemo(() => {
    return loans
      .filter((l) => l.status === "active" && (l.isDueSoon || l.isOverdue) && l.nextEmi)
      .map((l) => ({
        loan: l,
        nextEmi: l.nextEmi,
        days: l.nextEmiDays,
        isOverdue: l.isOverdue,
      }));
  }, [loans]);

  // Overall Statistics
  const stats = useMemo(() => {
    const totalLoansCount = loans.length;
    const activeLoansCount = loans.filter((l) => l.status === "active").length;
    const totalPendingBal = loans
      .filter((l) => l.status === "active")
      .reduce((acc, l) => acc + (l.pendingBalance || 0), 0);
    const monthlyOutflow = loans
      .filter((l) => l.status === "active")
      .reduce((acc, l) => acc + (l.emiAmount || 0), 0);
    const overdueCount = dueAlerts.filter((a) => a.isOverdue).length;

    return { totalLoansCount, activeLoansCount, totalPendingBal, monthlyOutflow, overdueCount };
  }, [loans, dueAlerts]);

  // Export to Excel
  const handleExportExcel = () => {
    if (!loans.length) {
      toast.error("No loans data to export");
      return;
    }
    const exportData = filteredLoans.map((l) => ({
      "Bank Name": l.bankName,
      "Account No": l.accountNumber || "-",
      "Vehicle Number": l.vehicleId?.vehicleNumber || "N/A",
      "Loan Amount (₹)": l.loanAmount,
      "EMI Amount (₹)": l.emiAmount,
      "Installments Paid": `${l.paidInstallments || 0} / ${l.installments || 0}`,
      "Pending Balance (₹)": l.pendingBalance,
      "Deduction Day": l.emiDeductionDay,
      Status: l.status,
    }));
    exportToExcelProfessional(exportData, "Bhumi_Vehicle_Loans_Register");
    toast.success("Vehicle loans exported to Excel");
  };

  return (
    <div className="space-y-5">
      {/* Top Breadcrumb & Actions Bar (Matches Expense/Trip header in screenshot) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-amber-600 mb-1">
            <Landmark className="h-4 w-4" />
            <span>VEHICLE FINANCING • BANK LOANS & MONTHLY EMI INSTALLMENTS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Loans & EMIs
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {loans.length} total operational loan records in registry · Chennai Central Dispatch Hub
          </p>
        </div>

        {/* Action Buttons: Golden + White outline buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 px-4 py-2 text-xs font-black shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            <span>Add New Loan</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-3.5 py-2 text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={handleTriggerEmailAlert}
            disabled={emailSending}
            title="Triggers daily compliance audit email to Admin inbox immediately"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-3.5 py-2 text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {emailSending ? (
              <RefreshCw className="h-4 w-4 animate-spin text-amber-600" />
            ) : (
              <Mail className="h-4 w-4 text-amber-600" />
            )}
            <span>Send Alert Email</span>
          </button>

          <button
            onClick={fetchData}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-3.5 py-2 text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <RefreshCw className="h-4 w-4 text-slate-500" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Summary Cards (Exactly matching the screenshot layout) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1: TOTAL REGISTRY */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs relative">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            <span>TOTAL REGISTRY</span>
            <SlidersHorizontal className="h-4 w-4 text-slate-300" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {stats.totalLoansCount}
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-0.5">
            System records in depot
          </div>
        </div>

        {/* Card 2: FILTERED ACTIVE */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs relative">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            <span>FILTERED ACTIVE</span>
            <CheckCircle2 className="h-4 w-4 text-slate-300" />
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-2">
            {stats.activeLoansCount}
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-0.5">
            Matching active criteria
          </div>
        </div>

        {/* Card 3: OPERATIONS DESK */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs relative">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            <span>OPERATIONS DESK</span>
            <Lock className="h-4 w-4 text-slate-300" />
          </div>
          <div className="text-xl font-black text-amber-600 mt-2 truncate">
            Loans & EMIs
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-0.5">
            Chennai Hub Finance
          </div>
        </div>

        {/* Card 4: TOTAL REGISTRY VALUE */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs relative">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            <span>PENDING BALANCE</span>
            <IndianRupee className="h-4 w-4 text-slate-300" />
          </div>
          <div className="text-2xl font-black text-slate-950 mt-2">
            ₹ {stats.totalPendingBal.toLocaleString("en-IN")}
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-0.5">
            Monthly Outflow: ₹{stats.monthlyOutflow.toLocaleString("en-IN")}
          </div>
        </div>
      </div>

      {/* Due Date Alert Banners (Whenever EMI is approaching <= 7 days or Overdue) */}
      {dueAlerts.length > 0 && (
        <div className="space-y-2.5">
          {dueAlerts.map(({ loan, nextEmi, days, isOverdue }) => (
            <div
              key={`${loan._id}-${nextEmi.installmentNumber}`}
              className={`p-4 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-xs transition-all ${
                isOverdue
                  ? "bg-rose-50 border-rose-300 text-rose-950"
                  : "bg-amber-500/10 border-amber-500/30 text-amber-950"
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl font-black text-xs shadow-xs ${
                    isOverdue
                      ? "bg-rose-600 text-white"
                      : "bg-amber-500 text-slate-950"
                  }`}
                >
                  <AlertTriangle className="h-5 w-5 stroke-[2.5]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-xs uppercase tracking-wide">
                      {isOverdue ? "⚠️ EMI Payment Overdue" : "🔔 EMI Due Date Approaching (Within 7 Days)"}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-wider ${
                        isOverdue
                          ? "bg-rose-600 text-white"
                          : "bg-amber-500 text-slate-950"
                      }`}
                    >
                      {isOverdue
                        ? `${Math.abs(days)} Day(s) Overdue!`
                        : days === 0
                        ? "Due Today!"
                        : `${days} Day(s) Left`}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 mt-1 font-medium">
                    Vehicle: <span className="font-black text-slate-950">{loan.vehicleId?.vehicleNumber || "N/A"}</span> • Bank:{" "}
                    <span className="font-black text-slate-950">{loan.bankName}</span> • Installment #{nextEmi.installmentNumber} of{" "}
                    <span className="font-black text-rose-600">₹{nextEmi.amount?.toLocaleString("en-IN")}</span> due on{" "}
                    <span className="font-bold">{new Date(nextEmi.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleOpenManageEmis(loan)}
                className={`text-xs font-black px-4 py-2 rounded-xl transition-all cursor-pointer shrink-0 shadow-xs ${
                  isOverdue
                    ? "bg-rose-600 hover:bg-rose-700 text-white"
                    : "bg-slate-950 hover:bg-slate-800 text-white"
                }`}
              >
                Manage & Mark Paid
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Tabs & Search Filter (Matching Screenshot: All Records (2), Active, Cancelled) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 w-full sm:w-auto flex-wrap">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all cursor-pointer ${
              activeTab === "all"
                ? "bg-slate-950 text-white shadow-xs"
                : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200"
            }`}
          >
            All Records ({loans.length})
          </button>
          <button
            onClick={() => setActiveTab("active")}
            className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all cursor-pointer ${
              activeTab === "active"
                ? "bg-slate-950 text-white shadow-xs"
                : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200"
            }`}
          >
            Active ({loans.filter((l) => l.status === "active").length})
          </button>
          <button
            onClick={() => setActiveTab("due_soon")}
            className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all cursor-pointer ${
              activeTab === "due_soon"
                ? "bg-amber-500 text-slate-950 shadow-xs font-black"
                : "bg-white text-amber-700 hover:text-amber-900 border border-amber-300"
            }`}
          >
            Due Soon ({dueAlerts.length})
          </button>
          <button
            onClick={() => setActiveTab("closed")}
            className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all cursor-pointer ${
              activeTab === "closed"
                ? "bg-slate-950 text-white shadow-xs"
                : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200"
            }`}
          >
            Closed ({loans.filter((l) => l.status === "closed").length})
          </button>
        </div>

        {/* Search bar matching screenshot */}
        <div className="relative w-full sm:w-80">
          <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search loans, bank, vehicle, account..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs font-medium border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white shadow-xs"
          />
        </div>
      </div>

      {/* Loans Grid (Black, White & Golden/Amber Transport Theme) */}
      {loading ? (
        <div className="flex items-center justify-center p-16">
          <RefreshCw className="h-8 w-8 animate-spin text-amber-500" />
        </div>
      ) : filteredLoans.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Landmark className="h-12 w-12 mx-auto text-slate-300 mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Vehicle Loans Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {search ? "No loans match your search criteria." : "Start by registering your vehicle financing & EMI details."}
          </p>
          <button
            onClick={handleOpenAdd}
            className="mt-4 inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black px-4 py-2 rounded-xl cursor-pointer shadow-xs"
          >
            <Plus className="h-3.5 w-3.5 stroke-[3]" />
            Add Loan
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredLoans.map((loan) => {
            const paid = loan.paidInstallments || 0;
            const total = loan.installments || 1;
            const progressPercent = Math.min(100, Math.round((paid / total) * 100));
            const vehNumber = loan.vehicleId?.vehicleNumber || "N/A";
            const isMenuOpen = openMenuId === loan._id;

            return (
              <div
                key={loan._id}
                className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:shadow-md transition-shadow relative flex flex-col justify-between"
              >
                <div>
                  {/* Top Row: Status Badge & 3-dots Menu */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[11px] font-black px-2.5 py-0.5 rounded-full capitalize ${
                          loan.status === "active"
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : loan.status === "closed"
                            ? "bg-slate-100 text-slate-600 border border-slate-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {loan.status}
                      </span>

                      {/* Due Soon / Overdue Badge */}
                      {loan.status === "active" && loan.isOverdue && (
                        <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-rose-600 text-white animate-pulse">
                          Overdue ({Math.abs(loan.nextEmiDays)}d)
                        </span>
                      )}
                      {loan.status === "active" && !loan.isOverdue && loan.isDueSoon && (
                        <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-950 border border-amber-500/40">
                          Due in {loan.nextEmiDays}d
                        </span>
                      )}
                    </div>

                    {/* 3-dots dropdown */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(isMenuOpen ? null : loan._id);
                        }}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>

                      {isMenuOpen && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 top-7 w-40 bg-white border border-slate-200 rounded-xl shadow-lg z-20 py-1 text-xs"
                        >
                          <button
                            onClick={() => {
                              setOpenMenuId(null);
                              handleOpenManageEmis(loan);
                            }}
                            className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-bold"
                          >
                            <Calendar className="h-3.5 w-3.5 text-amber-600" />
                            Manage EMIs
                          </button>
                          <button
                            onClick={() => {
                              setOpenMenuId(null);
                              handleOpenEdit(loan);
                            }}
                            className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-bold"
                          >
                            <Edit2 className="h-3.5 w-3.5 text-slate-600" />
                            Edit Loan
                          </button>
                          <button
                            onClick={() => {
                              setOpenMenuId(null);
                              handleDeleteLoan(loan._id);
                            }}
                            className="w-full text-left px-3 py-2 text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer border-t border-slate-100 font-bold"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                            Delete Loan
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bank Header (Golden Bank Badge + Name + Account) */}
                  <div className="flex items-center gap-3 mb-5">
                    <div className="grid h-11 w-11 place-items-center rounded-xl bg-amber-500/15 text-amber-700 font-black border border-amber-500/20 shrink-0">
                      <Landmark className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-black text-sm text-slate-950 uppercase truncate">
                        {loan.bankName}
                      </h3>
                      <p className="text-xs text-slate-500 truncate font-semibold">
                        Account: {loan.accountNumber || "-"}
                      </p>
                    </div>
                  </div>

                  {/* Key Metrics */}
                  <div className="space-y-2.5 text-xs border-t border-slate-100 pt-3.5 font-medium">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-bold">Vehicle</span>
                      <span className="font-black text-slate-950 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                        {vehNumber}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-bold">Loan Amount</span>
                      <span className="font-black text-slate-950 text-sm">
                        ₹{(loan.loanAmount || 0).toLocaleString("en-IN")}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-bold">EMI Amount</span>
                      <span className="font-black text-slate-950 text-sm">
                        ₹{(loan.emiAmount || 0).toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>

                  {/* Installments Paid Progress Bar */}
                  <div className="mt-4 pt-3.5 border-t border-slate-100">
                    <div className="flex items-center justify-between text-xs mb-1.5 font-semibold">
                      <span className="text-slate-500">Installments Paid</span>
                      <span className="font-black text-slate-900">
                        {paid} / {total}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-slate-950 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Footer: Pending Balance + Manage EMIs button */}
                <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-end justify-between">
                  <div>
                    <div className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Pending Balance</div>
                    <div className="text-base font-black text-slate-950">
                      ₹{(loan.pendingBalance || 0).toLocaleString("en-IN")}
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenManageEmis(loan)}
                    className="bg-slate-950 hover:bg-slate-800 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                  >
                    Manage EMIs
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table Tally & Totals Banner (Signature Bhumi Transport Bar) */}
      {/* Bottom Tally Bar */}
      <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/70 p-4 text-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-xs font-semibold">
        <div className="flex items-center gap-2">
          <span className="rounded bg-amber-500 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-950">
            TABLE TALLY & TOTALS
          </span>
          <span className="text-slate-600 font-semibold">
            Total Vehicle Financing Records: <strong className="text-slate-950 font-black">{filteredLoans.length} Loans</strong>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-slate-600 font-semibold">
            Total Pending Debt: <strong className="text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-300 font-black">₹{stats.totalPendingBal.toLocaleString("en-IN")}</strong>
          </span>
          <span className="text-slate-600 font-semibold">
            Monthly Outflow: <strong className="text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300 font-black">₹{stats.monthlyOutflow.toLocaleString("en-IN")}</strong>
          </span>
        </div>
      </div>

      {/* ===================================================== */}
      {/* ADD / EDIT LOAN MODAL                                 */}
      {/* ===================================================== */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4.5 bg-slate-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-amber-500 text-slate-950 font-black">
                  <Landmark className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-black">
                    {editingLoan ? "Update Vehicle Loan" : "Register New Vehicle Loan"}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5 font-medium">
                    Commercial financing, bank tenure, and monthly installment parameters
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowFormModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitForm} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Row 1: Vehicle & Bank Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1 uppercase tracking-wider">
                    Vehicle <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.vehicleId}
                    onChange={(e) => handleFormInputChange("vehicleId", e.target.value)}
                    required
                    className="w-full text-xs font-bold border border-slate-200 rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
                  >
                    <option value="">-- Select Vehicle --</option>
                    {vehicles.map((v) => (
                      <option key={v._id} value={v._id}>
                        {v.vehicleNumber} {v.vehicleType ? `(${v.vehicleType})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1 uppercase tracking-wider">
                    Bank Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HDFC Bank, Kotak Mahindra Bank, SBI"
                    value={formData.bankName}
                    onChange={(e) => handleFormInputChange("bankName", e.target.value)}
                    className="w-full text-xs font-semibold border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
                  />
                </div>
              </div>

              {/* Row 2: Account Number, Loan Amount, Down Payment */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1 uppercase tracking-wider">
                    Account / Loan Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. LN-84729184"
                    value={formData.accountNumber}
                    onChange={(e) => handleFormInputChange("accountNumber", e.target.value)}
                    className="w-full text-xs font-semibold border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1 uppercase tracking-wider">
                    Loan Amount (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="0.00"
                    value={formData.loanAmount}
                    onChange={(e) => handleFormInputChange("loanAmount", e.target.value)}
                    className="w-full text-xs font-black border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1 uppercase tracking-wider">
                    Down Payment (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.downPayment}
                    onChange={(e) => handleFormInputChange("downPayment", e.target.value)}
                    className="w-full text-xs font-semibold border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
                  />
                </div>
              </div>

              {/* Row 3: Interest Rate, Interest Type, Installments, EMI Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1 uppercase tracking-wider">
                    Interest Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0"
                    value={formData.interestRate}
                    onChange={(e) => handleFormInputChange("interestRate", e.target.value)}
                    className="w-full text-xs font-semibold border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1 uppercase tracking-wider">
                    Interest Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.interestType}
                    onChange={(e) => handleFormInputChange("interestType", e.target.value)}
                    className="w-full text-xs font-bold border border-slate-200 rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
                  >
                    <option value="reducing_balance">Reducing Balance</option>
                    <option value="flat_rate">Flat Rate</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1 uppercase tracking-wider">
                    Installments (Months) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="12"
                    value={formData.installments}
                    onChange={(e) => handleFormInputChange("installments", e.target.value)}
                    className="w-full text-xs font-black border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1 uppercase tracking-wider">
                    EMI Amount (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="0"
                    value={formData.emiAmount}
                    onChange={(e) => handleFormInputChange("emiAmount", e.target.value)}
                    className="w-full text-xs font-black text-slate-950 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
                  />
                </div>
              </div>

              {/* Row 4: Loan Start Date, Loan End Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1 uppercase tracking-wider">
                    Loan Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.loanStartDate}
                    onChange={(e) => handleFormInputChange("loanStartDate", e.target.value)}
                    className="w-full text-xs font-bold border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1 uppercase tracking-wider">
                    Loan End Date
                  </label>
                  <input
                    type="date"
                    value={formData.loanEndDate}
                    onChange={(e) => handleFormInputChange("loanEndDate", e.target.value)}
                    className="w-full text-xs font-bold border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
                  />
                </div>
              </div>

              {/* Row 5: EMI Deduction Day, Loan Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1 uppercase tracking-wider">
                    EMI Deduction Day <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    placeholder="5"
                    value={formData.emiDeductionDay}
                    onChange={(e) => handleFormInputChange("emiDeductionDay", e.target.value)}
                    className="w-full text-xs font-black border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
                  />
                  <span className="text-[11px] text-slate-400 mt-0.5 block font-medium">
                    Day of month on which EMI will be debited (1 to 31)
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1 uppercase tracking-wider">
                    Loan Status <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleFormInputChange("status", e.target.value)}
                    className="w-full text-xs font-black border border-slate-200 rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 capitalize shadow-2xs"
                  >
                    <option value="active">Active</option>
                    <option value="closed">Closed</option>
                    <option value="defaulted">Defaulted</option>
                  </select>
                </div>
              </div>

              {/* Info banner */}
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-2.5 text-xs text-amber-950 font-medium">
                <Info className="h-4 w-4 text-amber-700 shrink-0" />
                <span>EMI payments will be automatically scheduled based on the total installments.</span>
              </div>

              {/* Loan Summary Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <div className="text-[11px] font-black text-slate-700 uppercase tracking-wider mb-3">
                  Loan Financing Summary
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="border-r border-slate-200 pr-2">
                    <div className="text-xs font-semibold text-slate-500">Principal Amount</div>
                    <div className="text-base font-black text-slate-950 mt-1">
                      ₹{formPrincipal.toLocaleString("en-IN")}
                    </div>
                  </div>

                  <div className="border-r border-slate-200 pr-2">
                    <div className="text-xs font-semibold text-slate-500">Total Interest</div>
                    <div className="text-base font-black text-amber-600 mt-1">
                      ₹{formTotalInterest.toLocaleString("en-IN")}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-slate-500">Total Payable</div>
                    <div className="text-base font-black text-emerald-700 mt-1">
                      ₹{formTotalPayable.toLocaleString("en-IN")}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black px-6 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  <Save className="h-4 w-4 stroke-[2.5]" />
                  <span>{editingLoan ? "Update Loan" : "Register Loan"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================== */}
      {/* MANAGE EMIs MODAL (Schedule & Mark Paid)              */}
      {/* ===================================================== */}
      {showEmiModal && selectedLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4.5 bg-slate-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500 text-slate-950 font-black">
                  <Landmark className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-black">
                    EMI Schedule: {selectedLoan.bankName}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5 font-medium">
                    Vehicle: <span className="font-bold text-white">{selectedLoan.vehicleId?.vehicleNumber || "N/A"}</span> • Account:{" "}
                    {selectedLoan.accountNumber || "-"}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowEmiModal(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Quick summary stats in modal */}
            <div className="p-6 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                <div className="text-slate-400 font-bold uppercase text-[10px]">Monthly EMI</div>
                <div className="text-sm font-black text-slate-950 mt-0.5">
                  ₹{(selectedLoan.emiAmount || 0).toLocaleString("en-IN")}
                </div>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                <div className="text-slate-400 font-bold uppercase text-[10px]">Total Installments</div>
                <div className="text-sm font-black text-slate-800 mt-0.5">
                  {selectedLoan.paidInstallments || 0} / {selectedLoan.installments || 0} Paid
                </div>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                <div className="text-slate-400 font-bold uppercase text-[10px]">Pending Balance</div>
                <div className="text-sm font-black text-amber-600 mt-0.5">
                  ₹{(selectedLoan.pendingBalance || 0).toLocaleString("en-IN")}
                </div>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                <div className="text-slate-400 font-bold uppercase text-[10px]">Deduction Day</div>
                <div className="text-sm font-black text-slate-800 mt-0.5">
                  {selectedLoan.emiDeductionDay}th of each month
                </div>
              </div>
            </div>

            {/* Pay Installment inline form if selected */}
            {payingInstallment && (
              <div className="p-4 bg-emerald-50 border-b border-emerald-200 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-bold text-emerald-950">
                    Mark Installment #{payingInstallment.installmentNumber} as Paid
                  </span>
                  <p className="text-emerald-800">
                    Amount: ₹{(payingInstallment.amount || selectedLoan.emiAmount).toLocaleString("en-IN")} • Due:{" "}
                    {new Date(payingInstallment.dueDate).toLocaleDateString("en-IN")}
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                  <select
                    value={payPaymentMode}
                    onChange={(e) => setPayPaymentMode(e.target.value)}
                    className="border border-emerald-300 rounded-xl p-2 bg-white text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="auto_debit">Auto Debit</option>
                    <option value="bank_transfer">Bank Transfer / NEFT</option>
                    <option value="cheque">Cheque</option>
                    <option value="upi">UPI</option>
                    <option value="cash">Cash</option>
                  </select>

                  <input
                    type="text"
                    placeholder="Ref / Transaction No."
                    value={payRefNo}
                    onChange={(e) => setPayRefNo(e.target.value)}
                    className="border border-emerald-300 rounded-xl p-2 bg-white text-xs font-medium focus:ring-2 focus:ring-emerald-500"
                  />

                  <button
                    onClick={() => handleRecordPayment(payingInstallment.installmentNumber)}
                    disabled={paySubmitting}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-2 rounded-xl cursor-pointer shrink-0 disabled:opacity-50 shadow-xs"
                  >
                    Confirm Paid
                  </button>

                  <button
                    onClick={() => setPayingInstallment(null)}
                    className="text-slate-500 hover:text-slate-700 px-2 py-1 font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Installments Table */}
            <div className="p-6 max-h-[55vh] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-rose-50/90 text-slate-800 border-b-2 border-rose-200/80">
                  <tr className="uppercase tracking-wider font-bold text-slate-800">
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Due Date</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Paid Date</th>
                    <th className="py-2.5 px-3">Mode</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {(selectedLoan.schedule || []).map((inst, idx) => {
                    const due = new Date(inst.dueDate);
                    const now = new Date();
                    const isDuePast = due < now && inst.status === "pending";

                    return (
                      <tr key={inst.installmentNumber} className={`${idx % 2 === 0 ? "bg-white hover:bg-[#f8f8f8]" : "bg-amber-50/80 hover:bg-amber-100/70"} transition-colors`}>
                        <td className="py-3 font-black text-slate-800">
                          #{inst.installmentNumber}
                        </td>
                        <td className="py-3 text-slate-700 font-semibold">
                          {due.toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="py-3 font-bold text-slate-900">
                          ₹{(inst.amount || selectedLoan.emiAmount || 0).toLocaleString("en-IN")}
                        </td>
                        <td className="py-3">
                          {inst.status === "paid" ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="h-3 w-3" />
                              Paid
                            </span>
                          ) : isDuePast ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                              <AlertTriangle className="h-3 w-3" />
                              Overdue
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-950 border border-amber-500/40">
                              <Clock className="h-3 w-3" />
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-slate-500">
                          {inst.paidDate
                            ? new Date(inst.paidDate).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "-"}
                        </td>
                        <td className="py-3 text-slate-500 capitalize">
                          {(inst.paymentMode || "").replace("_", " ") || "-"}
                        </td>
                        <td className="py-3 text-right">
                          {inst.status === "pending" ? (
                            <button
                              onClick={() => setPayingInstallment(inst)}
                              className="inline-flex items-center gap-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-3 py-1 rounded-lg border border-amber-500/30 transition-colors cursor-pointer text-[11px] shadow-2xs"
                            >
                              <Check className="h-3 w-3 stroke-[3]" />
                              Mark Paid
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-medium">Completed</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 border-t border-slate-100 flex items-center justify-between bg-slate-50">
              <span className="text-xs text-slate-500 font-medium">
                Total {selectedLoan.schedule?.length || 0} scheduled installments
              </span>
              <button
                onClick={() => setShowEmiModal(false)}
                className="text-xs font-bold px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
