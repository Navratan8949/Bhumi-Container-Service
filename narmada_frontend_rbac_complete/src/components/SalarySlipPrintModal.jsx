"use client";

import React, { useRef, useState, useEffect } from "react";
import { useReactToPrint } from "react-to-print";
import {
  Printer,
  X,
  Building2,
  Calendar,
  CheckCircle2,
  Download,
  Phone,
  Mail,
  User,
  ShieldCheck,
  Receipt,
  FileText,
  Truck,
  IndianRupee,
} from "lucide-react";

import { useActiveCompany } from "@/src/lib/auth";
import api from "@/src/services/api";

const num = (v) => Number(v || 0).toLocaleString("en-IN");

const money = (v) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(v || 0));

function inWords(numVal) {
  const a = [
    "",
    "One ",
    "Two ",
    "Three ",
    "Four ",
    "Five ",
    "Six ",
    "Seven ",
    "Eight ",
    "Nine ",
    "Ten ",
    "Eleven ",
    "Twelve ",
    "Thirteen ",
    "Fourteen ",
    "Fifteen ",
    "Sixteen ",
    "Seventeen ",
    "Eighteen ",
    "Nineteen ",
  ];
  const b = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  const n = ("000000000" + Math.floor(Number(numVal) || 0))
    .substr(-9)
    .match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return "Zero Rupees Only";
  let str = "";
  str +=
    Number(n[1]) !== 0
      ? (a[Number(n[1])] || b[n[1][0]] + " " + a[n[1][1]]) + "Crore "
      : "";
  str +=
    Number(n[2]) !== 0
      ? (a[Number(n[2])] || b[n[2][0]] + " " + a[n[2][1]]) + "Lakh "
      : "";
  str +=
    Number(n[3]) !== 0
      ? (a[Number(n[3])] || b[n[3][0]] + " " + a[n[3][1]]) + "Thousand "
      : "";
  str +=
    Number(n[4]) !== 0
      ? (a[Number(n[4])] || b[n[4][0]] + " " + a[n[4][1]]) + "Hundred "
      : "";
  str +=
    Number(n[5]) !== 0
      ? (str !== "" ? "and " : "") +
        (a[Number(n[5])] || b[n[5][0]] + " " + a[n[5][1]])
      : "";
  return (str.trim() ? str.trim() : "Zero") + " Rupees Only";
}

export default function SalarySlipPrintModal({
  record,
  type = "payroll",
  onClose,
}) {
  const activeCompany = useActiveCompany();
  const printRef = useRef(null);
  const [fetchedEmp, setFetchedEmp] = useState(null);
  const [fetchedPayroll, setFetchedPayroll] = useState(null);

  useEffect(() => {
    const rawEmp = record?.employeeId;
    const empId = typeof rawEmp === "object" ? rawEmp?._id : rawEmp;
    if (empId) {
      if (typeof rawEmp === "object" && rawEmp?.bankName && rawEmp?.accountNumber) {
        setFetchedEmp(rawEmp);
        return;
      }
      api
        .get(`/employees/${empId}`)
        .then((res) => {
          if (res?.data?.data) {
            setFetchedEmp(res.data.data);
          }
        })
        .catch((err) => {
          console.warn("Failed to fetch full employee for slip:", err);
        });
    }
  }, [record?.employeeId]);

  useEffect(() => {
    const rawPay = record?.payrollId;
    const pId = typeof rawPay === "object" ? rawPay?._id : rawPay;
    if (pId) {
      if (typeof rawPay === "object" && rawPay?.payrollMonth) {
        setFetchedPayroll(rawPay);
        return;
      }
      api
        .get(`/payrolls/${pId}`)
        .then((res) => {
          if (res?.data?.data) {
            setFetchedPayroll(res.data.data);
          }
        })
        .catch((err) => {
          console.warn("Failed to fetch payroll for slip:", err);
        });
    }
  }, [record?.payrollId]);

  const isAdvance = type === "advance";
  const isPayment = type === "salary-payment" || Boolean(record?.paymentNumber);
  const payrollInfo =
    fetchedPayroll ||
    (typeof record?.payrollId === "object" ? record.payrollId : null);

  const emp =
    fetchedEmp ||
    (typeof record?.employeeId === "object" ? record.employeeId : {}) ||
    {};
  const empName =
    typeof emp === "object" ? emp.name || "Crew Member" : "Crew Member";
  const empCode =
    typeof emp === "object"
      ? emp.employeeCode ||
        `${record?.companyId?.code || activeCompany?.code || "STAFF"}-MEMBER`
      : `${record?.companyId?.code || activeCompany?.code || "STAFF"}-MEMBER`;
  const empDesignation =
    typeof emp === "object"
      ? emp.designation ||
        (emp.employeeType === "driver"
          ? "Heavy Commercial Driver"
          : "Fleet Operations Staff")
      : "Fleet Staff";
  const empDept =
    typeof emp === "object"
      ? emp.department || "Operations & Highway Transport"
      : "Operations";
  const empBank =
    typeof emp === "object" ? emp.bankName || "—" : "—";
  const empAccount = typeof emp === "object" ? emp.accountNumber || "—" : "—";
  const empIfsc = typeof emp === "object" ? emp.ifscCode || "—" : "—";

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: isAdvance
      ? `${record?.companyId?.code || activeCompany?.code || "TMS"}_Trip_Advance_${record?.advanceNumber || "Slip"}`
      : isPayment
      ? `${record?.companyId?.code || activeCompany?.code || "TMS"}_Salary_Payment_${record?.paymentNumber || "Voucher"}_${empName}`
      : `${record?.companyId?.code || activeCompany?.code || "TMS"}_Pay_Slip_${record?.payrollMonth || "Month"}_${empName}`,
  });

  if (!record) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative flex max-h-[95vh] w-full max-w-4xl flex-col rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500 text-slate-950 shadow-md">
              <Printer className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                {isAdvance
                  ? "Employee Advance Voucher"
                  : isPayment
                  ? "Salary Payment Disbursement Voucher"
                  : "Transport Staff & Driver Monthly Pay Slip"}
                <span className="rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider">
                  Official Document
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {isAdvance
                  ? `Voucher No: ${record.advanceNumber || "—"}`
                  : isPayment
                  ? `Payment No: ${record.paymentNumber || "—"} • ${empName}`
                  : `Month: ${record.payrollMonth || "—"} • ${empName}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-xs font-black text-slate-950 shadow-md hover:from-amber-400 hover:to-amber-500 transition cursor-pointer"
            >
              <Printer className="h-4 w-4" /> Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Document Preview */}
        <div className="flex-1 overflow-y-auto bg-slate-100 p-4 sm:p-8">
          <div
            ref={printRef}
            className="mx-auto max-w-[800px] rounded-xl border border-slate-300 bg-white p-6 sm:p-8 shadow-sm text-slate-900 print:border-none print:shadow-none print:p-0 print:max-w-none"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            {/* Header / Brand */}
            <div className="border-b-2 border-slate-900 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-950 text-amber-400 font-black text-base shadow-xs">
                      {record?.companyId?.code || activeCompany?.code || "TMS"}
                    </span>
                    <div>
                      <h1 className="text-2xl font-black tracking-tight text-slate-950 uppercase">
                        {(
                          record?.companyId?.name ||
                          activeCompany?.name ||
                          "OPERATING TRANSPORT COMPANY"
                        ).toUpperCase()}
                      </h1>
                      <p className="text-[11px] font-bold tracking-wider uppercase text-amber-700">
                        Fleet Operators & Heavy Commercial Transport Contractors
                      </p>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-slate-600 leading-relaxed max-w-md">
                    Central Fleet Depot:{" "}
                    {record?.companyId?.address ||
                      activeCompany?.address ||
                      (activeCompany?.city
                        ? `${activeCompany.city} Depot`
                        : "Central Transport Nagar Depot")}
                    <br />
                    Phone:{" "}
                    {record?.companyId?.phone || activeCompany?.phone || "—"} •
                    Email:{" "}
                    {record?.companyId?.email ||
                      activeCompany?.email ||
                      "—"}
                  </p>
                </div>

                <div className="text-right">
                  <div className="inline-block rounded-lg border-2 border-slate-900 bg-slate-900 px-3 py-1 text-center text-white">
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                      {isAdvance
                        ? "EMPLOYEE ADVANCE VOUCHER"
                        : isPayment
                        ? "SALARY DISBURSEMENT VOUCHER"
                        : "STAFF PAY SLIP"}
                    </p>
                    <p className="font-mono text-sm font-black">
                      {isAdvance
                        ? record.advanceNumber ||
                          (record._id
                            ? `${record?.companyId?.code || activeCompany?.code || "ADV"}-${String(record._id).slice(-6).toUpperCase()}`
                            : "—")
                        : isPayment
                        ? record.paymentNumber ||
                          (record._id
                            ? `${record?.companyId?.code || activeCompany?.code || "SPAY"}-${String(record._id).slice(-6).toUpperCase()}`
                            : "—")
                        : record.payrollMonth || "—"}
                    </p>
                  </div>
                  <p className="mt-2 text-xs font-semibold text-slate-600">
                    Date:{" "}
                    <b>
                      {record.paymentDate || record.advanceDate || record.createdAt
                        ? new Date(
                            record.paymentDate || record.advanceDate || record.createdAt,
                          ).toLocaleDateString("en-IN")
                        : new Date().toLocaleDateString("en-IN")}
                    </b>
                  </p>
                </div>
              </div>
            </div>

            {/* Employee Particulars Grid */}
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-xs">
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    Crew Member Name
                  </span>
                  <span className="font-black text-slate-950 text-sm">
                    {empName}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    Staff / Driver Code
                  </span>
                  <span className="font-mono font-bold text-slate-900">
                    {empCode}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    Designation
                  </span>
                  <span className="font-bold text-slate-800">
                    {empDesignation}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    Department / Yard
                  </span>
                  <span className="font-bold text-slate-800">{empDept}</span>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    Bank Name
                  </span>
                  <span className="font-medium text-slate-700">{empBank}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    Bank A/C Number
                  </span>
                  <span className="font-mono font-bold text-slate-700">
                    {empAccount}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    IFSC Code
                  </span>
                  <span className="font-mono font-bold text-slate-700">
                    {empIfsc}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    Payment Mode
                  </span>
                  <span className="font-bold uppercase text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block mt-0.5">
                    {record.paymentMode ||
                      (isAdvance ? "Cash at Yard" : "Bank Transfer")}
                  </span>
                </div>
              </div>
            </div>

            {/* Document Content based on Type */}
            {isAdvance ? (
              /* Trip / Employee Advance Voucher Layout */
              <div className="mt-5 space-y-4">
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-900 text-white font-bold uppercase">
                      <tr>
                        <th className="p-3">Advance Description / Purpose</th>
                        <th className="p-3">Reference No.</th>
                        <th className="p-3 text-right">Sanctioned Amount</th>
                        <th className="p-3 text-right">Recovered to Date</th>
                        <th className="p-3 text-right">Outstanding Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      <tr>
                        <td className="p-3.5 font-semibold text-slate-900">
                          <p className="font-bold text-slate-950">
                            Driver Highway Trip & Route Advance
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {record.remarks ||
                              "Diesel, highway toll, en-route vehicle loading, driver daily batta & emergency contingency"}
                          </p>
                        </td>
                        <td className="p-3.5 font-mono text-slate-700">
                          {record.referenceNumber || "—"}
                        </td>
                        <td className="p-3.5 text-right font-mono font-bold text-slate-950 text-sm">
                          {money(record.amount)}
                        </td>
                        <td className="p-3.5 text-right font-mono font-semibold text-emerald-700">
                          {money(record.recoveredAmount || 0)}
                        </td>
                        <td className="p-3.5 text-right font-mono font-black text-amber-700 text-sm">
                          {money(
                            record.outstandingAmount != null
                              ? record.outstandingAmount
                              : Number(record.amount || 0) -
                                  Number(record.recoveredAmount || 0),
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-xs">
                  <p className="font-black text-amber-950">Amount in Words:</p>
                  <p className="mt-0.5 font-semibold italic text-amber-900">
                    {inWords(record.amount)}
                  </p>
                </div>
              </div>
            ) : isPayment ? (
              /* Salary Payment Disbursement Voucher Layout */
              <div className="mt-5 space-y-4">
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-900 text-white font-bold uppercase">
                      <tr>
                        <th className="p-3">Payment Particulars / Description</th>
                        <th className="p-3">Payment Mode</th>
                        <th className="p-3">Ref / Cheque / UTR</th>
                        <th className="p-3 text-right">Net Salary Due</th>
                        <th className="p-3 text-right">Disbursed Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      <tr>
                        <td className="p-3.5 font-semibold text-slate-900">
                          <p className="font-bold text-slate-950">
                            Monthly Salary Wage Disbursement
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {payrollInfo?.payrollMonth || record.payrollId?.payrollMonth
                              ? `Settlement against Payroll Month: ${payrollInfo?.payrollMonth || record.payrollId?.payrollMonth}`
                              : "Official driver & staff salary wage disbursement voucher"}
                            {record.remarks ? ` • Note: ${record.remarks}` : ""}
                          </p>
                        </td>
                        <td className="p-3.5 font-bold uppercase text-slate-800">
                          <span className="inline-block bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200 font-mono text-[11px]">
                            {record.paymentMode || "Cash"}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono text-slate-700">
                          {record.referenceNumber || "—"}
                        </td>
                        <td className="p-3.5 text-right font-mono font-bold text-slate-900 text-sm">
                          {money(
                            payrollInfo?.netSalary !== undefined
                              ? payrollInfo.netSalary
                              : record.payrollId?.netSalary !== undefined
                              ? record.payrollId.netSalary
                              : record.amount,
                          )}
                        </td>
                        <td className="p-3.5 text-right font-mono font-black text-emerald-700 text-base">
                          {money(record.amount)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="rounded-xl border border-emerald-300 bg-emerald-50/70 p-4 text-xs flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-black text-emerald-950 uppercase tracking-wider text-[11px]">
                      Disbursed Amount in Words:
                    </p>
                    <p className="mt-0.5 font-bold italic text-emerald-900 text-sm">
                      {inWords(record.amount)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="rounded bg-emerald-600 text-white px-2.5 py-1 text-[11px] font-black uppercase tracking-wider shadow-xs">
                      Paid & Disbursed
                    </span>
                  </div>
                </div>

                {/* Additional Payroll Details if available */}
                {(payrollInfo || (typeof record.payrollId === "object" && record.payrollId)) && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 text-xs">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-2">
                      Linked Wage Slip Breakdown
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-700">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Wage Month:</span>
                        <span className="font-bold text-slate-900">
                          {payrollInfo?.payrollMonth || record.payrollId?.payrollMonth || "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Gross Salary:</span>
                        <span className="font-bold text-slate-900">
                          {money(payrollInfo?.grossSalary || record.payrollId?.grossSalary || record.amount)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Total Deductions:</span>
                        <span className="font-bold text-rose-700">
                          {money(payrollInfo?.totalDeduction || record.payrollId?.totalDeduction || 0)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Take-Home Net:</span>
                        <span className="font-bold text-emerald-800">
                          {money(payrollInfo?.netSalary || record.payrollId?.netSalary || record.amount)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Monthly Pay Slip Layout */
              <div className="mt-5 space-y-4">
                {/* Attendance Summary Strip */}
                <div className="grid grid-cols-4 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-center text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500">
                      Working Days
                    </span>
                    <p className="text-base font-black text-slate-900">
                      {record.workingDays != null ? record.workingDays : "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-700">
                      Present Days
                    </span>
                    <p className="text-base font-black text-emerald-700">
                      {record.presentDays != null ? record.presentDays : (record.workingDays != null ? record.workingDays : "—")}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-rose-700">
                      Leave / Absent
                    </span>
                    <p className="text-base font-black text-rose-700">
                      {record.leaveDays != null ? record.leaveDays : 0}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-indigo-700">
                      Overtime / Trips
                    </span>
                    <p className="text-base font-black text-indigo-700">
                      {record.overtimeHours
                        ? `${record.overtimeHours} Hrs`
                        : "Standard"}
                    </p>
                  </div>
                </div>

                {/* Earnings & Deductions Comparison Table */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* Earnings Column */}
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="bg-emerald-800 text-white font-black px-4 py-2 uppercase tracking-wider text-[11px] flex justify-between">
                      <span>A. Earnings & Allowances</span>
                      <span>Amount (₹)</span>
                    </div>
                    <div className="p-3 space-y-2.5 divide-y divide-slate-100">
                      <div className="flex justify-between pt-1">
                        <span className="text-slate-600">
                          Basic Monthly Wage:
                        </span>
                        <span className="font-mono font-bold">
                          {money(
                            record.earnedBasicSalary || record.basicSalary,
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between pt-2">
                        <span className="text-slate-600">
                          Driver Trip Batta / Kilometrage:
                        </span>
                        <span className="font-mono font-bold text-indigo-700">
                          {money(record.allowances || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between pt-2">
                        <span className="text-slate-600">
                          Overtime & Sunday Duty:
                        </span>
                        <span className="font-mono font-bold text-emerald-700">
                          {money(record.overtimeAmount || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between pt-2 border-t-2 border-slate-300 font-black text-slate-950">
                        <span>Total Gross Earnings (A):</span>
                        <span className="font-mono text-sm">
                          {money(record.grossSalary)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Deductions Column */}
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="bg-rose-900 text-white font-black px-4 py-2 uppercase tracking-wider text-[11px] flex justify-between">
                      <span>B. Deductions & Recoveries</span>
                      <span>Amount (₹)</span>
                    </div>
                    <div className="p-3 space-y-2.5 divide-y divide-slate-100">
                      <div className="flex justify-between pt-1">
                        <span className="text-slate-600">
                          Trip Advance Recovery:
                        </span>
                        <span className="font-mono font-bold text-rose-700">
                          {money(record.advanceDeduction || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between pt-2">
                        <span className="text-slate-600">
                          PF / Statutory / Other Deductions:
                        </span>
                        <span className="font-mono font-bold">
                          {money(record.otherDeduction || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between pt-2">
                        <span className="text-slate-600">
                          Fuel Excess / Penalty (if any):
                        </span>
                        <span className="font-mono font-bold">₹ 0</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t-2 border-slate-300 font-black text-rose-900">
                        <span>Total Deductions (B):</span>
                        <span className="font-mono text-sm">
                          {money(record.totalDeduction)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Net Take-Home Highlight Box */}
                <div className="flex items-center justify-between rounded-xl border-2 border-slate-900 bg-slate-900 p-4 text-white">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-amber-400">
                      Net Take-Home Salary (A - B)
                    </p>
                    <p className="text-xs text-slate-300 italic">
                      {inWords(record.netSalary)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-2xl font-black text-amber-400">
                      {money(record.netSalary)}
                    </p>
                    <span className="rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-black uppercase">
                      {record.paymentStatus || "Processed"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Terms and Declarations */}
            <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-3 text-[10px] text-slate-500 leading-normal">
              <p className="font-bold text-slate-700 uppercase">
                Declaration & Undertaking:
              </p>
              <p>
                1. This is an official computer-generated{" "}
                {isAdvance
                  ? "trip cash advance receipt"
                  : isPayment
                  ? "salary payment disbursement voucher"
                  : "wage disbursement slip"}{" "}
                issued by{" "}
                {record?.companyId?.name ||
                  activeCompany?.name ||
                  "Operating Transport Company"}
                .
                <br />
                2. Disbursed amounts are settled in accordance with verified vehicle duty logs, depot attendance, and authorized advance deductions.
                <br />
                3. Any discrepancy must be reported to the Depot Accounts Officer within 3 working days of receipt.
              </p>
            </div>

            {/* Signature Block */}
            <div className="mt-10 grid grid-cols-3 gap-6 pt-6 border-t border-slate-300 text-center text-xs">
              <div>
                <div className="h-12 flex items-end justify-center">
                  <span className="font-mono text-slate-400 text-[10px]">
                    Accounts & Cash Desk
                  </span>
                </div>
                <div className="border-t border-slate-400 pt-1 font-bold text-slate-800">
                  {isPayment ? "Disbursed By (Cashier / Accounts)" : "Prepared By (Accountant)"}
                </div>
              </div>

              <div>
                <div className="h-12 flex items-end justify-center">
                  <span className="font-mono text-slate-400 text-[10px]">
                    {record?.companyId?.city
                      ? `${record.companyId.city} Central Depot`
                      : activeCompany?.city
                        ? `${activeCompany.city} Central Depot`
                        : "Central Fleet Depot"}
                  </span>
                </div>
                <div className="border-t border-slate-400 pt-1 font-bold text-slate-800">
                  Approved By (Fleet Manager)
                </div>
              </div>

              <div>
                <div className="h-12 flex items-end justify-center">
                  <span className="font-mono text-slate-400 text-[10px]">
                    {empName}
                  </span>
                </div>
                <div className="border-t border-slate-400 pt-1 font-bold text-slate-800">
                  Receiver's Signature (Employee / Driver)
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
