"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Printer,
  FileText,
  Truck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building2,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  Download,
  QrCode,
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

export default function InvoicePrintModal({ invoiceId, invoiceData, onClose }) {
  const activeCompany = useActiveCompany();
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState(invoiceData || null);
  const [loading, setLoading] = useState(!invoiceData && !!invoiceId);
  const [copyType, setCopyType] = useState("ORIGINAL FOR RECIPIENT");
  const printRef = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (invoiceData) {
      setData(invoiceData);
      return;
    }
    if (invoiceId) {
      setLoading(true);
      api
        .get(`/customer-invoices/${invoiceId}`)
        .then((res) => {
          if (res.data?.success && res.data.data) {
            setData(res.data.data);
          }
        })
        .catch((err) => {
          console.error("Failed to fetch customer invoice details:", err);
        })
        .finally(() => setLoading(false));
    }
  }, [invoiceId, invoiceData]);

  const handlePrint = () => {
    window.print();
  };

  if (!invoiceId && !invoiceData) return null;
  if (!mounted) return null;

  // Invoice calculations and details
  const invoiceNo = data?.invoiceNumber || "INV-PENDING";
  const invoiceDate = formatDate(
    data?.invoiceDate || data?.createdAt || new Date(),
  );
  const paymentStatus = String(data?.paymentStatus || "unpaid").toLowerCase();
  const status = String(data?.status || "issued").toUpperCase();

  const party = data?.partyId || {};
  const partyName = party?.name || party?.partyName || "—";
  const partyPhone = party?.phone || "—";
  const partyGst = party?.gstNumber || party?.gstin || "URP (Unregistered)";
  const partyAddress = party?.address || "—";

  const booking = data?.bookingId || {};
  const bookingNo = booking?.bookingNumber || "—";
  const lrBilty = data?.lrBiltyId || {};
  const lrNumber = lrBilty?.lrNumber || booking?.lrNumber || "—";
  const lrDate = formatDate(
    lrBilty?.lrDate || booking?.bookingDate || data?.invoiceDate,
  );

  const vehicleNo =
    lrBilty?.vehicleId?.vehicleNumber ||
    booking?.vehicleId?.vehicleNumber ||
    booking?.vehicleNumber ||
    "—";

  const vehicleType =
    lrBilty?.vehicleId?.vehicleType ||
    booking?.vehicleId?.vehicleType ||
    "—";

  const fromCity =
    lrBilty?.fromCityId?.cityName ||
    booking?.fromCityId?.cityName ||
    activeCompany?.city ||
    "—";

  const toCity =
    lrBilty?.toCityId?.cityName ||
    booking?.toCityId?.cityName ||
    "—";

  const productName =
    lrBilty?.productId?.name ||
    booking?.productId?.name ||
    "—";

  const consignor = lrBilty?.consignorId || {};
  const consignee = lrBilty?.consigneeId || {};

  const quantity = Number(data?.quantity || booking?.quantity || 0);
  const unit = data?.unit || booking?.unit || "MT";
  const freightRate = Number(data?.freightRate || 0);

  const freightAmount = Number(
    data?.freightAmount || freightRate * quantity || 0,
  );
  const hammali = Number(data?.hammali || 0);
  const detention = Number(data?.detention || 0);
  const otherCharges = Number(data?.otherCharges || 0);
  const taxableAmount = Number(
    data?.taxableAmount || freightAmount + hammali + detention + otherCharges,
  );
  const taxPercent = Number(data?.taxPercent || 0);
  const taxAmount = Number(data?.taxAmount || 0);
  const grandTotal = Number(data?.grandTotal || taxableAmount + taxAmount);
  const paidAmount = Number(data?.paidAmount || 0);
  const outstanding = Number(
    data?.outstandingAmount !== undefined
      ? data.outstandingAmount
      : Math.max(0, grandTotal - paidAmount),
  );

  return createPortal(
    <div
      id="nrl-print-portal"
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/80 p-2 sm:p-4 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white print:fixed print:inset-0"
    >
      <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[96vh] print:max-h-none print:shadow-none print:border-none print:rounded-none">
        {/* Top Control Bar (Hidden when printing) */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-6 py-3.5 text-white print:hidden shrink-0">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/30">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-amber-400">
                Commercial Freight Tax Invoice
              </h2>
              <p className="text-xs text-slate-400">
                Invoice Reference:{" "}
                <span className="font-mono font-bold text-white">
                  {invoiceNo}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <select
              value={copyType}
              onChange={(e) => setCopyType(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 outline-none focus:border-amber-400 cursor-pointer"
            >
              <option value="ORIGINAL FOR RECIPIENT">
                Original for Recipient
              </option>
              <option value="DUPLICATE FOR TRANSPORTER">
                Duplicate for Transporter
              </option>
              <option value="TRIPLICATE FOR CONSIGNOR">
                Triplicate for Consignor
              </option>
            </select>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-1.5 text-xs font-black text-slate-950 shadow-md hover:bg-amber-400 transition cursor-pointer"
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

        {/* Printable Invoice Document Body */}
        <div
          ref={printRef}
          className="flex-1 overflow-y-auto p-6 sm:p-8 font-sans text-slate-900 print:p-4 print:overflow-visible print:m-0"
        >
          <div className="border-2 border-slate-900 rounded-lg p-6 print:border-2 print:border-black bg-white">
            {/* Header: Company & Transporter Branding */}
            <div className="flex flex-col sm:flex-row items-start justify-between border-b-2 border-slate-900 pb-4 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded bg-amber-500 font-black text-slate-950 text-sm print:border print:border-black">
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
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Fleet Owners, Heavy Cargo Transporters & Logistics Contractors
                </p>
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <MapPin className="h-3 w-3 shrink-0" />
                  {data?.companyId?.address ||
                    activeCompany?.address ||
                    (activeCompany?.city
                      ? `${activeCompany.city} Depot`
                      : "Central Transport Yard")}
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
                    • PAN:{" "}
                    <strong className="font-mono text-slate-800">
                      {data?.companyId?.panNumber ||
                        activeCompany?.panNumber ||
                        (activeCompany?.gstNumber && activeCompany.gstNumber.length >= 12
                          ? activeCompany.gstNumber.slice(2, 12)
                          : data?.companyId?.gstNumber && data.companyId.gstNumber.length >= 12
                            ? data.companyId.gstNumber.slice(2, 12)
                            : "—")}
                    </strong>
                  </span>
                  <span>
                    • State:{" "}
                    <strong className="font-mono text-slate-800">
                      {data?.companyId?.city ||
                        activeCompany?.city ||
                        "Central"}{" "}
                      Hub
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

              {/* Invoice Meta Box */}
              <div className="text-right sm:min-w-[260px] bg-slate-50 p-3 rounded-lg border border-slate-300 print:bg-white print:border-black">
                <div className="border-b border-slate-300 pb-1.5 mb-1.5 flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-slate-500">
                    Document Type
                  </span>
                  <span className="text-xs font-black uppercase tracking-wider text-slate-900">
                    TAX INVOICE
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                  {copyType}
                </p>
                <div className="mt-2 space-y-1 text-xs">
                  <p className="flex justify-between">
                    <span className="text-slate-500">Invoice No:</span>
                    <strong className="font-mono text-sm text-slate-950 font-black">
                      {invoiceNo}
                    </strong>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-slate-500">Invoice Date:</span>
                    <strong className="text-slate-900">{invoiceDate}</strong>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-slate-500">Place of Supply:</span>
                    <strong className="text-slate-900">
                      Madhya Pradesh (23)
                    </strong>
                  </p>
                  <p className="flex justify-between items-center pt-0.5">
                    <span className="text-slate-500">Payment Status:</span>
                    {paymentStatus === "paid" ? (
                      <span className="rounded bg-emerald-100 border border-emerald-300 px-2 py-0.5 text-[10px] font-black text-emerald-800 uppercase">
                        ✓ Fully Paid
                      </span>
                    ) : paymentStatus === "partial" ? (
                      <span className="rounded bg-amber-100 border border-amber-300 px-2 py-0.5 text-[10px] font-black text-amber-900 uppercase">
                        ⚠ Partially Paid
                      </span>
                    ) : (
                      <span className="rounded bg-rose-100 border border-rose-300 px-2 py-0.5 text-[10px] font-black text-rose-800 uppercase">
                        ✕ Unpaid
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Billed To & Consignment Reference Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 border-b-2 border-slate-900 text-xs">
              {/* Left: Client / Consignor Details */}
              <div className="p-4 border-b sm:border-b-0 sm:border-r border-slate-300 space-y-1">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Billed To (Client / Consignor):
                </p>
                <h3 className="text-base font-black text-slate-950">
                  {partyName}
                </h3>
                <p className="text-slate-600">{partyAddress}</p>
                <div className="pt-1 space-y-0.5">
                  <p className="text-slate-700">
                    GSTIN:{" "}
                    <strong className="font-mono text-slate-900">
                      {partyGst}
                    </strong>
                  </p>
                  <p className="text-slate-700">
                    Contact:{" "}
                    <strong className="font-mono text-slate-900">
                      {partyPhone}
                    </strong>
                  </p>
                </div>
              </div>

              {/* Right: Transport & Vehicle Dispatch Metadata */}
              <div className="p-4 space-y-2 bg-slate-50/50 print:bg-white">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Shipment & Transit References:
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px]">
                      Booking Ref:
                    </span>
                    <strong className="font-mono text-slate-900">
                      {bookingNo}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">
                      Lorry Receipt (LR) No:
                    </span>
                    <strong className="font-mono text-slate-900">
                      {lrNumber}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">
                      Commercial Vehicle:
                    </span>
                    <strong className="font-mono text-slate-900 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">
                      {vehicleNo}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">
                      Vehicle Type:
                    </span>
                    <strong className="text-slate-800">{vehicleType}</strong>
                  </div>
                </div>

                <div className="pt-1 border-t border-slate-200 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px]">
                      Transit Route:
                    </span>
                    <strong className="text-slate-950 font-bold">
                      {fromCity} ➔ {toCity}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">
                      Material / Cargo:
                    </span>
                    <strong className="text-slate-900 truncate block">
                      {productName}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Billing Items Table */}
            <div className="border-b-2 border-slate-900 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-900 text-slate-900 font-black print:bg-slate-200">
                    <th className="py-2.5 px-3 w-12 text-center border-r border-slate-300">
                      #
                    </th>
                    <th className="py-2.5 px-3 border-r border-slate-300">
                      Description of Service & Particulars
                    </th>
                    <th className="py-2.5 px-3 w-24 text-center border-r border-slate-300">
                      SAC Code
                    </th>
                    <th className="py-2.5 px-3 w-28 text-center border-r border-slate-300">
                      Quantity / Unit
                    </th>
                    <th className="py-2.5 px-3 w-28 text-right border-r border-slate-300">
                      Rate (₹)
                    </th>
                    <th className="py-2.5 px-3 w-32 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium">
                  <tr>
                    <td className="py-3 px-3 text-center border-r border-slate-300">
                      1
                    </td>
                    <td className="py-3 px-3 border-r border-slate-300">
                      <p className="font-bold text-slate-950">
                        Freight Transportation Services
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Highway transit from {fromCity} to {toCity} via Vehicle{" "}
                        {vehicleNo}
                      </p>
                    </td>
                    <td className="py-3 px-3 text-center font-mono border-r border-slate-300">
                      996511
                    </td>
                    <td className="py-3 px-3 text-center font-mono border-r border-slate-300">
                      {quantity} {unit}
                    </td>
                    <td className="py-3 px-3 text-right font-mono border-r border-slate-300">
                      {formatCurrency(freightRate)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold">
                      {formatCurrency(freightAmount)}
                    </td>
                  </tr>

                  {hammali > 0 && (
                    <tr>
                      <td className="py-2.5 px-3 text-center border-r border-slate-300">
                        2
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-300">
                        <p className="font-bold text-slate-950">
                          Loading & Hammali Charges
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Labour handling at warehouse depot
                        </p>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono border-r border-slate-300">
                        996519
                      </td>
                      <td className="py-2.5 px-3 text-center border-r border-slate-300">
                        —
                      </td>
                      <td className="py-2.5 px-3 text-right border-r border-slate-300">
                        —
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">
                        {formatCurrency(hammali)}
                      </td>
                    </tr>
                  )}

                  {detention > 0 && (
                    <tr>
                      <td className="py-2.5 px-3 text-center border-r border-slate-300">
                        3
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-300">
                        <p className="font-bold text-slate-950">
                          Vehicle Detention / Halting Charges
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Unloading delay charges at destination
                        </p>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono border-r border-slate-300">
                        996511
                      </td>
                      <td className="py-2.5 px-3 text-center border-r border-slate-300">
                        —
                      </td>
                      <td className="py-2.5 px-3 text-right border-r border-slate-300">
                        —
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">
                        {formatCurrency(detention)}
                      </td>
                    </tr>
                  )}

                  {otherCharges > 0 && (
                    <tr>
                      <td className="py-2.5 px-3 text-center border-r border-slate-300">
                        4
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-300">
                        <p className="font-bold text-slate-950">
                          Toll / Transit Border Handling Charges
                        </p>
                        <p className="text-[11px] text-slate-500">
                          National highway tolls and entry clearances
                        </p>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono border-r border-slate-300">
                        996511
                      </td>
                      <td className="py-2.5 px-3 text-center border-r border-slate-300">
                        —
                      </td>
                      <td className="py-2.5 px-3 text-right border-r border-slate-300">
                        —
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">
                        {formatCurrency(otherCharges)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Total Calculation & Settlement Box */}
            <div className="grid grid-cols-1 sm:grid-cols-2 border-b-2 border-slate-900 text-xs">
              {/* Left: Amount in Words & Bank Remittance */}
              <div className="p-4 border-b sm:border-b-0 sm:border-r border-slate-300 space-y-3">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Amount Chargeable (in words):
                  </span>
                  <p className="font-bold text-slate-900 mt-0.5 leading-snug italic">
                    {numberToWordsINR(grandTotal)}
                  </p>
                </div>

                <div className="bg-slate-50 p-2.5 rounded border border-slate-200 text-[11px] space-y-1 print:bg-white">
                  <p className="font-black text-slate-900 uppercase tracking-wide flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5 text-amber-600" />
                    Bank Remittance Details (For NEFT / RTGS / IMPS):
                  </p>
                  <p>
                    Bank: <strong>{data?.companyId?.bankName || activeCompany?.bankName || "—"}</strong>
                    {(data?.companyId?.branchName || activeCompany?.branchName) ? ` (${data?.companyId?.branchName || activeCompany?.branchName} Branch)` : ""}
                  </p>
                  <p>
                    Account Name:{" "}
                    <strong>
                      {(
                        data?.companyId?.name ||
                        activeCompany?.name ||
                        "—"
                      ).toUpperCase()}
                    </strong>
                  </p>
                  <p>
                    Account No:{" "}
                    <strong className="font-mono">{data?.companyId?.accountNumber || activeCompany?.accountNumber || "—"}</strong> • IFSC:{" "}
                    <strong className="font-mono">{data?.companyId?.ifscCode || activeCompany?.ifscCode || "—"}</strong>
                  </p>
                  {(data?.companyId?.upiId || activeCompany?.upiId) ? (
                    <p>
                      UPI ID:{" "}
                      <strong className="font-mono">
                        {data?.companyId?.upiId || activeCompany?.upiId}
                      </strong>
                    </p>
                  ) : null}
                </div>
              </div>

              {/* Right: Tax and Net Amount Tally */}
              <div className="p-4 space-y-2 bg-slate-50/30 print:bg-white text-xs">
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-600">Taxable Freight Value:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatCurrency(taxableAmount)}
                  </span>
                </div>

                {taxAmount > 0 ? (
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-600">GST ({taxPercent}%):</span>
                    <span className="font-mono font-bold text-slate-900">
                      {formatCurrency(taxAmount)}
                    </span>
                  </div>
                ) : (
                  <div className="flex justify-between py-1 border-b border-slate-200 text-[11px] text-slate-600 italic">
                    <span>GST (GTA Services):</span>
                    <span className="font-bold text-slate-700">
                      Paid by Consignee under RCM
                    </span>
                  </div>
                )}

                <div className="flex justify-between py-1.5 border-b-2 border-slate-900 text-sm font-black">
                  <span className="uppercase text-slate-950">
                    Grand Total Invoice Value:
                  </span>
                  <span className="font-mono text-base text-slate-950">
                    {formatCurrency(grandTotal)}
                  </span>
                </div>

                <div className="flex justify-between py-1 text-emerald-800 font-bold border-b border-slate-200">
                  <span>Less: Payment Received:</span>
                  <span className="font-mono">
                    {formatCurrency(paidAmount)}
                  </span>
                </div>

                <div className="flex justify-between py-1.5 bg-rose-50 px-2 rounded border border-rose-200 font-black text-rose-950 text-sm print:bg-white">
                  <span>Balance Due / Outstanding:</span>
                  <span className="font-mono">
                    {formatCurrency(outstanding)}
                  </span>
                </div>
              </div>
            </div>

            {/* Terms, Conditions & Signatures */}
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-[10px] text-slate-600">
              <div className="space-y-1">
                <p className="font-black uppercase text-slate-900">
                  Terms & Conditions:
                </p>
                <ol className="list-decimal pl-3 space-y-0.5 leading-relaxed">
                  <li>Payment is due within 15 days of invoice submission.</li>
                  <li>
                    Interest @ 18% per annum will be charged on overdue payments
                    after due date.
                  </li>
                  <li>
                    All transportation subject to Conditions of Carriage by Road
                    Act 2007.
                  </li>
                  <li>
                    Under Reverse Charge Mechanism (RCM), recipient/consignee is
                    liable for GST discharge.
                  </li>
                  <li>
                    All disputes are subject to{" "}
                    {(
                      data?.companyId?.city ||
                      activeCompany?.city ||
                      "Local"
                    ).toUpperCase()}{" "}
                    Jurisdiction only.
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
                    Authorized Signatory
                  </p>
                  <p className="text-[9px] text-slate-500">
                    {data?.companyId?.city || activeCompany?.city || "Central"}{" "}
                    Central Billing Desk
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer print note */}
        <div className="border-t border-slate-200 bg-white px-6 py-2.5 text-center text-xs text-slate-500 print:hidden shrink-0 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
            <ShieldCheck className="h-4 w-4" /> Legal Motor Vehicles Act
            Commercial Freight Bill
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
