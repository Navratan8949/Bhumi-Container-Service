"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Printer,
  Receipt,
  Building2,
  CheckCircle2,
  MapPin,
  Phone,
  ShieldCheck,
  CreditCard,
  Banknote,
  FileText,
} from "lucide-react";
import api from "@/src/services/api";
import { useActiveCompany } from "@/src/lib/auth";

function formatCurrency(val) {
  const num = Number(val || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(num);
}

function formatDate(val) {
  if (!val) return "—";
  const d = new Date(val);
  if (isNaN(d.getTime())) return String(val);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function numberToWordsINR(num) {
  const n = Math.round(Number(num || 0));
  if (n === 0) return "Zero Rupees Only";

  const a = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
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

  function inWords(val) {
    if (val === 0) return "";
    let str = "";
    if (val >= 10000000) {
      str += inWords(Math.floor(val / 10000000)) + " Crore ";
      val %= 10000000;
    }
    if (val >= 100000) {
      str += inWords(Math.floor(val / 100000)) + " Lakh ";
      val %= 100000;
    }
    if (val >= 1000) {
      str += inWords(Math.floor(val / 1000)) + " Thousand ";
      val %= 1000;
    }
    if (val >= 100) {
      str += inWords(Math.floor(val / 100)) + " Hundred ";
      val %= 100;
    }
    if (val > 0) {
      if (val < 20) {
        str += a[val] + " ";
      } else {
        str +=
          b[Math.floor(val / 10)] + (val % 10 ? " " + a[val % 10] : "") + " ";
      }
    }
    return str.trim();
  }

  return "INR " + inWords(n) + " Rupees Only";
}

export default function PaymentReceiptModal({
  paymentId,
  paymentData,
  onClose,
}) {
  const activeCompany = useActiveCompany();
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState(paymentData || null);
  const [loading, setLoading] = useState(!paymentData && !!paymentId);
  const [copyType, setCopyType] = useState("ORIGINAL FOR CUSTOMER");
  const printRef = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (paymentData) {
      setData(paymentData);
      return;
    }
    if (paymentId) {
      setLoading(true);
      api
        .get(`/customer-payments/${paymentId}`)
        .then((res) => {
          if (res.data?.success && res.data.data) {
            setData(res.data.data);
          }
        })
        .catch((err) => {
          console.error("Failed to load payment receipt:", err);
        })
        .finally(() => setLoading(false));
    }
  }, [paymentId, paymentData]);

  const handlePrint = () => {
    window.print();
  };

  if (!paymentId && !paymentData) return null;
  if (!mounted) return null;

  const receiptNo = data?.paymentNumber || "MR-PENDING";
  const paymentDate = formatDate(
    data?.paymentDate || data?.createdAt || new Date(),
  );
  const amount = Number(data?.amount || 0);
  const mode = String(data?.paymentMode || "cash")
    .toUpperCase()
    .replace("_", " ");
  const refNo = data?.referenceNumber || "—";
  const remarks =
    data?.remarks || "Payment received with thanks against freight invoice.";

  const party = data?.partyId || {};
  const partyName = party?.name || party?.partyName || "—";
  const partyPhone = party?.phone || "—";
  const partyGst = party?.gstNumber || party?.gstin || "URP (Unregistered)";
  const partyAddress = party?.address || "—";

  const invoice = data?.invoiceId || {};
  const invoiceNo =
    invoice?.invoiceNumber ||
    (typeof data?.invoiceId === "string" ? data.invoiceId : "—");
  const invoiceTotal = Number(invoice?.grandTotal || amount);
  const remainingDue = Number(
    invoice?.outstandingAmount !== undefined ? invoice.outstandingAmount : 0,
  );
  const isSettled = remainingDue <= 0;

  return createPortal(
    <div
      id="nrl-print-portal"
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/80 p-2 sm:p-4 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white print:fixed print:inset-0"
    >
      <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[96vh] print:max-h-none print:shadow-none print:border-none print:rounded-none">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-6 py-3.5 text-white print:hidden shrink-0">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/30">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-emerald-400">
                Official Money Receipt (MR)
              </h2>
              <p className="text-xs text-slate-400">
                Receipt Reference:{" "}
                <span className="font-mono font-bold text-white">
                  {receiptNo}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <select
              value={copyType}
              onChange={(e) => setCopyType(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 outline-none focus:border-emerald-400 cursor-pointer"
            >
              <option value="ORIGINAL FOR CUSTOMER">
                Original for Customer
              </option>
              <option value="DUPLICATE FOR ACCOUNTS">
                Duplicate for Accounts
              </option>
              <option value="TRIPLICATE FOR RECORDS">
                Triplicate for Records
              </option>
            </select>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-1.5 text-xs font-black text-slate-950 shadow-md hover:bg-emerald-400 transition cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Print / Save PDF</span>
            </button>

            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable Money Receipt Document Body */}
        <div
          ref={printRef}
          className="flex-1 overflow-y-auto p-6 sm:p-8 font-sans text-slate-900 print:p-4 print:overflow-visible print:m-0"
        >
          <div className="border-2 border-slate-900 rounded-lg p-6 print:border-2 print:border-black bg-white">
            {/* Header: Company & Transporter Branding */}
            <div className="flex flex-col sm:flex-row items-start justify-between border-b-2 border-slate-900 pb-4 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded bg-emerald-600 font-black text-white text-sm print:border print:border-black">
                    {data?.companyId?.code || activeCompany?.code || "TMS"}
                  </span>
                  <h1 className="text-2xl font-black tracking-tight text-slate-950 uppercase">
                    {(
                      data?.companyId?.name ||
                      activeCompany?.name ||
                      "FLEET OPERATIONS TMS"
                    ).toUpperCase()}
                  </h1>
                </div>
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                  Fleet Operators & Commercial Cargo Transport Contractors
                </p>
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <MapPin className="h-3 w-3 shrink-0" />
                  {data?.companyId?.address ||
                    activeCompany?.address ||
                    (activeCompany?.city
                      ? `${activeCompany.city} Depot`
                      : "Central Transport Nagar Depot")}
                </p>
                <p className="text-xs text-slate-500 flex items-center gap-2">
                  <span>
                    GSTIN:{" "}
                    <strong className="font-mono text-slate-800">
                      {data?.companyId?.gstNumber ||
                        activeCompany?.gstNumber ||
                        "—"}
                    </strong>
                  </span>
                  <span>
                    • Phone:{" "}
                    <strong className="font-mono text-slate-800">
                      {data?.companyId?.phone || activeCompany?.phone || "—"}
                    </strong>
                  </span>
                </p>
              </div>

              {/* Receipt Meta Box */}
              <div className="text-right sm:min-w-[240px] bg-slate-50 p-3 rounded-lg border border-slate-300 print:bg-white print:border-black">
                <div className="border-b border-slate-300 pb-1 mb-1.5 flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-slate-500">
                    Document
                  </span>
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-800">
                    MONEY RECEIPT (MR)
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  {copyType}
                </p>
                <div className="mt-2 space-y-1 text-xs">
                  <p className="flex justify-between">
                    <span className="text-slate-500">Receipt No:</span>
                    <strong className="font-mono text-sm text-slate-950 font-black">
                      {receiptNo}
                    </strong>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-slate-500">Receipt Date:</span>
                    <strong className="text-slate-900">{paymentDate}</strong>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-slate-500">Against Bill No:</span>
                    <strong className="font-mono text-slate-900 font-bold">
                      {invoiceNo}
                    </strong>
                  </p>
                </div>
              </div>
            </div>

            {/* Received From Box */}
            <div className="border-b-2 border-slate-900 p-4 bg-slate-50/50 print:bg-white text-xs space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                Received With Thanks From:
              </span>
              <h3 className="text-base font-black text-slate-950">
                {partyName}
              </h3>
              <p className="text-slate-600">{partyAddress}</p>
              <div className="flex flex-wrap gap-4 pt-1 text-slate-700">
                <span>
                  GSTIN:{" "}
                  <strong className="font-mono text-slate-900">
                    {partyGst}
                  </strong>
                </span>
                <span>
                  Phone:{" "}
                  <strong className="font-mono text-slate-900">
                    {partyPhone}
                  </strong>
                </span>
              </div>
            </div>

            {/* Amount & Payment Mode Callout Box */}
            <div className="grid grid-cols-1 sm:grid-cols-2 border-b-2 border-slate-900 text-xs">
              <div className="p-4 border-b sm:border-b-0 sm:border-r border-slate-300 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                  Amount Received (In Words):
                </span>
                <p className="text-sm font-bold text-slate-950 italic leading-snug">
                  {numberToWordsINR(amount)}
                </p>
                <div className="pt-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                    Mode of Payment:
                  </span>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="rounded bg-emerald-100 border border-emerald-300 px-2.5 py-1 text-xs font-black text-emerald-900 uppercase">
                      ✓ {mode}
                    </span>
                    {refNo && refNo !== "—" && (
                      <span className="text-slate-700 text-xs">
                        Ref / UTR:{" "}
                        <strong className="font-mono">{refNo}</strong>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Big Amount Figure */}
              <div className="p-4 flex flex-col justify-center items-center sm:items-end bg-emerald-50/50 print:bg-white">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Total Amount Received
                </span>
                <div className="text-3xl font-black text-emerald-900 font-mono mt-1">
                  {formatCurrency(amount)}
                </div>
                <div className="mt-2">
                  {isSettled ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 text-[10px] font-black text-emerald-800 uppercase">
                      <CheckCircle2 className="h-3 w-3" /> Invoice Fully Settled
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 text-[10px] font-black text-amber-900 uppercase">
                      Part Payment • Remaining: {formatCurrency(remainingDue)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Bill Settlement Ledger Table */}
            <div className="border-b-2 border-slate-900 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-900 text-slate-900 font-black print:bg-slate-200">
                    <th className="py-2.5 px-3 border-r border-slate-300">
                      Invoice / Bill Reference
                    </th>
                    <th className="py-2.5 px-3 text-right border-r border-slate-300">
                      Total Bill Value
                    </th>
                    <th className="py-2.5 px-3 text-right border-r border-slate-300">
                      Amount Received (This Receipt)
                    </th>
                    <th className="py-2.5 px-3 text-right">
                      Balance Due After Payment
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium">
                  <tr>
                    <td className="py-3 px-3 border-r border-slate-300">
                      <span className="font-mono font-bold text-slate-950">
                        {invoiceNo}
                      </span>
                      <p className="text-[11px] text-slate-500">{remarks}</p>
                    </td>
                    <td className="py-3 px-3 text-right font-mono border-r border-slate-300">
                      {formatCurrency(invoiceTotal)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-800 border-r border-slate-300">
                      {formatCurrency(amount)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-black text-rose-950">
                      {formatCurrency(remainingDue)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Terms & Signatures */}
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-[10px] text-slate-600">
              <div className="space-y-1">
                <p className="font-black uppercase text-slate-900">
                  Notes & Acknowledgement:
                </p>
                <ol className="list-decimal pl-3 space-y-0.5 leading-relaxed">
                  <li>
                    Payments via Cheque / Demand Draft are subject to
                    realization.
                  </li>
                  <li>
                    This receipt is an official acknowledgment of money received
                    against freight services.
                  </li>
                  <li>
                    Please retain this voucher for reconciliation with
                    commercial freight tax invoice.
                  </li>
                </ol>
              </div>

              <div className="flex flex-col justify-between items-end text-right pt-2 sm:pt-0">
                <p className="text-xs font-black uppercase text-slate-950">
                  For{" "}
                  {(
                    data?.companyId?.name ||
                    activeCompany?.name ||
                    "FLEET OPERATIONS TMS"
                  ).toUpperCase()}
                </p>
                <div className="mt-8 border-t border-slate-900 pt-1 w-48 text-center">
                  <p className="font-bold text-slate-900 text-xs">
                    Cashier / Authorized Signatory
                  </p>
                  <p className="text-[9px] text-slate-500">
                    Accounts & Billing Desk
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer print note */}
        <div className="border-t border-slate-200 bg-white px-6 py-2.5 text-center text-xs text-slate-500 print:hidden shrink-0 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
            <ShieldCheck className="h-4 w-4" /> Official Transporter Money
            Receipt Voucher
          </span>
          <span className="text-[11px] text-slate-400">
            Click <b>Print / Save PDF</b> or press{" "}
            <kbd className="rounded bg-slate-100 px-1.5 py-0.5 border text-slate-600">
              Ctrl + P
            </kbd>
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
