"use client";
import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Printer,
  Truck,
  FileText,
  CheckCircle,
  Phone,
  MapPin,
  Building,
  ShieldCheck,
} from "lucide-react";
import api from "@/src/services/api";
import { useActiveCompany } from "@/src/lib/auth";

function formatCurrency(val) {
  const num = Number(val || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
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

export default function BiltyPrintModal({ lrId, biltyData, onClose }) {
  const activeCompany = useActiveCompany();
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState(biltyData || null);
  const [loading, setLoading] = useState(!biltyData && !!lrId);
  const [copyType, setCopyType] = useState("CONSIGNEE COPY");
  const printRef = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (biltyData) {
      setData(biltyData);
      return;
    }
    if (lrId) {
      setLoading(true);
      api
        .get(`/lr-bilties/${lrId}`)
        .then((res) => {
          if (res.data?.success && res.data.data) {
            setData(res.data.data);
          }
        })
        .catch((err) => {
          console.error("Failed to fetch Bilty details:", err);
        })
        .finally(() => setLoading(false));
    }
  }, [lrId, biltyData]);

  const handlePrint = () => {
    window.print();
  };

  if (!lrId && !biltyData) return null;
  if (!mounted) return null;

  // Extract populated data safely
  const lrNumber =
    data?.lrNumber ||
    `${activeCompany?.code || "LR"}-${data?._id?.slice(-6)?.toUpperCase() || "PENDING"}`;
  const lrDate = formatDate(data?.lrDate || data?.dispatchDate || data?.createdAt || new Date());
  const vehicle =
    data?.vehicleId?.vehicleNumber || data?.vehicleNumber || data?.vehicle || "—";
  const vehicleType = data?.vehicleId?.vehicleType || data?.vehicleType || "—";
  const driverName = data?.driverId?.name || data?.driverName || data?.driver || "—";
  const driverPhone = data?.driverId?.phone || data?.driverPhone || "—";
  const driverLic =
    data?.driverId?.licenseNumber || data?.driverId?.license || data?.driverLicense || "—";

  const fromCity =
    data?.fromCityId?.name ||
    data?.fromCity ||
    data?.from ||
    activeCompany?.city ||
    "—";
  const fromState = data?.fromCityId?.state || data?.fromState || "";
  const toCity = data?.toCityId?.name || data?.toCity || data?.to || "—";
  const toState = data?.toCityId?.state || data?.toState || "";

  const consignor =
    data?.consignorId ||
    data?.supplyOrderId?.consignorId ||
    data?.bookingId?.supplyOrderId?.consignorId ||
    data?.billingPartyId ||
    data?.partyId ||
    {};
  const consignee =
    data?.consigneeId ||
    data?.supplyOrderId?.consigneeId ||
    data?.bookingId?.supplyOrderId?.consigneeId ||
    {};
  const booking = data?.bookingId || data || {};
  const product = data?.productId || booking?.productId || {};

  const currentData = data || biltyData || {};
  const quantity = Number(currentData?.quantity || booking?.quantity || 0);
  const unit = currentData?.unit || booking?.unit || "MT";
  const article =
    currentData?.article ||
    booking?.article ||
    product?.name ||
    "Goods as per Invoice";
  const invoiceNo =
    currentData?.invoiceNumber ||
    booking?.invoiceNumber ||
    currentData?.invoiceNo ||
    "—";
  const invoiceDate =
    currentData?.invoiceDate || booking?.invoiceDate
      ? formatDate(currentData?.invoiceDate || booking?.invoiceDate)
      : "—";

  const loadingWeight = Number(currentData?.loadingWeight || quantity || 0);
  const rate = Number(
    currentData?.freightRate ||
      currentData?.billingRate ||
      booking?.billingRate ||
      currentData?.rate ||
      0,
  );
  const hammali = Number(currentData?.billingHammali || booking?.billingHammali || 0);
  const detention = Number(currentData?.billingDetention || booking?.billingDetention || 0);

  const freightAmount =
    Number(currentData?.freightAmount) ||
    (rate > 0 ? (loadingWeight > 0 ? rate * loadingWeight : rate * quantity) : 0);
  const grossTotal = freightAmount + hammali + detention;
  const advance = Number(currentData?.advanceAmount || booking?.advanceAmount || 0);
  const balanceDue = grossTotal - advance;

  const center = data?.center || booking?.center || "PLANT";
  const rawFreightBy = data?.freightBy || booking?.freightBy || (grossTotal > 0 ? "TBB" : "PAID");
  const freightBy =
    rawFreightBy === "TBB"
      ? "T.B.B. (TO BE BILLED)"
      : rawFreightBy === "PAID"
        ? "PAID"
        : "TO PAY";
  const commission = Number(data?.commission || booking?.commission || 0);
  const shortageAllowed = data?.shortageAllowed || booking?.shortageAllowed || 0;
  const shortageRate = data?.shortageRate || booking?.shortageRate || 0;
  const shortageAmount = Number(data?.shortageAmount || booking?.shortageAmount || 0);

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
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-amber-400">
                Official Consignment Note • Lorry Receipt (LR)
              </h2>
              <p className="text-xs text-slate-400">
                LR Reference:{" "}
                <span className="font-mono font-bold text-white">
                  {lrNumber}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={copyType}
              onChange={(e) => setCopyType(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 outline-none focus:border-amber-400"
            >
              <option value="CONSIGNEE COPY">Consignee Copy</option>
              <option value="CONSIGNOR COPY">Consignor Copy</option>
              <option value="DRIVER / VEHICLE COPY">
                Driver / Vehicle Copy
              </option>
              <option value="OFFICE / ACCOUNTS RECORD">
                Office / Record Copy
              </option>
            </select>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-1.5 text-xs font-bold text-slate-950 shadow-md hover:bg-amber-400 transition"
            >
              <Printer className="h-4 w-4" />
              Print LR
            </button>

            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Bilty Document Printable Body */}
        <div
          className="flex-1 overflow-y-auto p-4 sm:p-8 print:p-2 bg-slate-50 print:bg-white"
          id="printable-bilty"
          ref={printRef}
        >
          {loading ? (
            <div className="py-20 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
              <p className="mt-4 text-sm font-bold text-slate-600">
                Generating Official Lorry Receipt…
              </p>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl rounded-xl border-2 border-slate-900 bg-white p-5 sm:p-7 shadow-sm text-slate-900 text-xs font-sans print:border-2 print:border-black print:p-4 print:shadow-none">
              {/* Header: Company Details */}
              <div className="border-b-2 border-slate-900 pb-3 text-center">
                <div className="flex items-center justify-between pb-1">
                  <span className="text-[10px] font-bold tracking-wider text-slate-600 uppercase border border-slate-300 rounded px-1.5 py-0.5">
                    AT OWNER&apos;S RISK
                  </span>
                  <span className="font-mono text-[11px] font-extrabold uppercase bg-slate-900 text-white px-2.5 py-0.5 rounded">
                    {copyType}
                  </span>
                  <span className="text-[10px] font-bold text-slate-600 uppercase border border-slate-300 rounded px-1.5 py-0.5">
                    GSTIN:{" "}
                    {data?.companyId?.gstNumber ||
                      activeCompany?.gstNumber ||
                      "—"}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-slate-950 mt-1">
                  {(
                    data?.companyId?.name ||
                    activeCompany?.name ||
                    "FLEET OPERATIONS TMS"
                  ).toUpperCase()}
                </h1>
                <p className="text-xs font-extrabold uppercase tracking-widest text-slate-800 mt-0.5">
                  FLEET OWNERS & LEADING TRANSPORT CONTRACTORS
                </p>
                <p className="text-[10px] text-slate-600 mt-1">
                  Head Office:{" "}
                  {data?.companyId?.address ||
                    activeCompany?.address ||
                    (activeCompany?.city
                      ? `${activeCompany.city} Depot`
                      : "Head Office Dispatch Depot")}{" "}
                  • Phone:{" "}
                  {data?.companyId?.phone || activeCompany?.phone || "—"} •
                  Email:{" "}
                  {data?.companyId?.email ||
                    activeCompany?.email ||
                    "—"}
                </p>
                <p className="text-[10px] font-semibold text-slate-700">
                  Direct Highway Routes:{" "}
                  {data?.companyId?.city ||
                    activeCompany?.city ||
                    "Interstate Freight Routes"}{" "}
                  • Regional Hubs • Major Highway Terminals
                </p>
              </div>

              {/* Bilty Info Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-6 border-b-2 border-slate-900 divide-x-2 divide-slate-900 bg-amber-50/60 font-semibold text-slate-900">
                <div className="p-2 sm:p-2.5">
                  <span className="block text-[9px] uppercase tracking-wider text-slate-500 font-bold">
                    LORRY RECEIPT NO.
                  </span>
                  <span className="font-mono text-sm font-black text-indigo-950">
                    {lrNumber}
                  </span>
                </div>
                <div className="p-2 sm:p-2.5">
                  <span className="block text-[9px] uppercase tracking-wider text-slate-500 font-bold">
                    DATE OF DISPATCH
                  </span>
                  <span className="font-bold">{lrDate}</span>
                </div>
                <div className="p-2 sm:p-2.5">
                  <span className="block text-[9px] uppercase tracking-wider text-slate-500 font-bold">
                    TRUCK / VEHICLE NO.
                  </span>
                  <span className="font-mono text-sm font-black text-slate-950">
                    {vehicle}
                  </span>
                </div>
                <div className="p-2 sm:p-2.5">
                  <span className="block text-[9px] uppercase tracking-wider text-slate-500 font-bold">
                    VEHICLE TYPE
                  </span>
                  <span className="font-bold truncate">{vehicleType}</span>
                </div>
                <div className="p-2 sm:p-2.5 bg-indigo-50/50">
                  <span className="block text-[9px] uppercase tracking-wider text-slate-500 font-bold">
                    CENTER
                  </span>
                  <span className="font-mono text-xs font-black text-indigo-950">
                    {center}
                  </span>
                </div>
                <div className="p-2 sm:p-2.5 bg-amber-100/60">
                  <span className="block text-[9px] uppercase tracking-wider text-slate-500 font-bold">
                    FREIGHT BY
                  </span>
                  <span className="font-mono text-xs font-black text-amber-950">
                    {rawFreightBy}
                  </span>
                </div>
              </div>

              {/* Route & Driver Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 border-b-2 border-slate-900 divide-y-2 sm:divide-y-0 sm:divide-x-2 divide-slate-900">
                <div className="p-2.5 bg-slate-50">
                  <span className="block text-[9px] uppercase tracking-wider text-slate-500 font-bold">
                    TRANSIT ROUTE
                  </span>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="rounded bg-white px-2 py-0.5 font-black text-slate-950 border border-slate-300">
                      FROM: {fromCity} ({fromState})
                    </span>
                    <span className="font-black text-amber-600">➔</span>
                    <span className="rounded bg-white px-2 py-0.5 font-black text-slate-950 border border-slate-300">
                      TO: {toCity} {toState ? `(${toState})` : ""}
                    </span>
                  </div>
                </div>
                <div className="p-2.5 bg-slate-50">
                  <span className="block text-[9px] uppercase tracking-wider text-slate-500 font-bold">
                    ASSIGNED DRIVER & PERMIT
                  </span>
                  <p className="mt-1 font-bold text-slate-900">
                    {driverName} • Phone:{" "}
                    <span className="font-mono">{driverPhone}</span>
                  </p>
                  <p className="text-[10px] text-slate-500">
                    License No: <span className="font-mono">{driverLic}</span>
                  </p>
                </div>
              </div>

              {/* Consignor & Consignee Columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 border-b-2 border-slate-900 divide-y-2 sm:divide-y-0 sm:divide-x-2 divide-slate-900">
                {/* Consignor */}
                <div className="p-2.5 sm:p-3">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-[10px] font-black uppercase text-slate-900">
                      CONSIGNOR (SENDER)
                    </span>
                    <span className="text-[9px] text-slate-500 font-bold">
                      ORIGIN
                    </span>
                  </div>
                  <p className="text-xs font-black text-slate-950">
                    {consignor.name || "—"}
                  </p>
                  <p className="text-[10px] text-slate-600 mt-0.5">
                    {consignor.address || (fromCity !== "—" ? `${fromCity}${fromState ? `, ${fromState}` : ""}` : "—")}
                  </p>
                  <p className="text-[10px] font-mono text-slate-800 mt-1">
                    <b>GSTIN:</b> {consignor.gstNumber || "Unregistered"} •{" "}
                    <b>Ph:</b> {consignor.phone || "—"}
                  </p>
                </div>

                {/* Consignee */}
                <div className="p-2.5 sm:p-3">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-[10px] font-black uppercase text-slate-900">
                      CONSIGNEE (RECIPIENT)
                    </span>
                    <span className="text-[9px] text-slate-500 font-bold">
                      DESTINATION
                    </span>
                  </div>
                  <p className="text-xs font-black text-slate-950">
                    {consignee.name || "—"}
                  </p>
                  <p className="text-[10px] text-slate-600 mt-0.5">
                    {consignee.address || (toCity !== "—" ? `${toCity}${toState ? `, ${toState}` : ""}` : "—")}
                  </p>
                  <p className="text-[10px] font-mono text-slate-800 mt-1">
                    <b>GSTIN:</b> {consignee.gstNumber || "Unregistered"} •{" "}
                    <b>Ph:</b> {consignee.phone || "—"}
                  </p>
                </div>
              </div>

              {/* Invoice & Challan Info */}
              <div className="grid grid-cols-2 sm:grid-cols-4 border-b-2 border-slate-900 divide-x-2 divide-slate-900 bg-slate-50/70 p-2 text-[10px]">
                <div>
                  <span className="text-slate-500 font-bold">
                    Sender Inv / Challan No:
                  </span>
                  <p className="font-mono font-bold text-slate-900">
                    {invoiceNo}
                  </p>
                </div>
                <div className="pl-2">
                  <span className="text-slate-500 font-bold">
                    Invoice Date:
                  </span>
                  <p className="font-bold text-slate-900">{invoiceDate}</p>
                </div>
                <div className="pl-2">
                  <span className="text-slate-500 font-bold">
                    Booking Order:
                  </span>
                  <p className="font-mono font-bold text-slate-900">
                    {booking?.bookingNumber || "—"}
                  </p>
                </div>
                <div className="pl-2">
                  <span className="text-slate-500 font-bold">
                    Freight Terms:
                  </span>
                  <p className="font-bold text-amber-700 uppercase">
                    {freightBy}
                  </p>
                </div>
              </div>

              {/* Cargo / Article Particulars Table */}
              <div className="border-b-2 border-slate-900">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-900 bg-slate-100 text-[10px] font-black uppercase text-slate-900">
                      <th className="p-2 w-16 text-center border-r border-slate-300">
                        Packages
                      </th>
                      <th className="p-2 border-r border-slate-300">
                        Description of Goods / Commodity
                      </th>
                      <th className="p-2 w-28 text-right border-r border-slate-300">
                        Actual Weight
                      </th>
                      <th className="p-2 w-28 text-right border-r border-slate-300">
                        Charged Weight
                      </th>
                      <th className="p-2 w-24 text-right">Freight Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="align-top font-medium divide-x divide-slate-300">
                      <td className="p-2.5 text-center font-bold font-mono">
                        {quantity} {unit}
                      </td>
                      <td className="p-2.5">
                        <p className="font-bold text-slate-950 text-xs">
                          {article}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Commercial Grade Goods in sound packaging. Loaded
                          securely under driver supervision.
                        </p>
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold">
                        {loadingWeight > 0
                          ? `${loadingWeight} ${unit}`
                          : "As per Challan"}
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold">
                        {loadingWeight > 0
                          ? `${loadingWeight} ${unit}`
                          : "As per Challan"}
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold">
                        {rate > 0 ? `₹${rate}/${unit}` : "Fixed"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Charges and Freight Summary Box */}
              <div className="grid grid-cols-1 sm:grid-cols-2 border-b-2 border-slate-900 divide-y-2 sm:divide-y-0 sm:divide-x-2 divide-slate-900">
                {/* Terms and Conditions */}
                <div className="p-3 text-[9px] text-slate-600 leading-relaxed bg-slate-50/40">
                  <p className="font-bold uppercase text-slate-900 text-[10px] mb-1">
                    Terms & Conditions:
                  </p>
                  <ol className="list-decimal list-inside space-y-0.5">
                    <li>
                      Company is not responsible for loss/damage caused by
                      accidents, fire, strikes, or acts of God.
                    </li>
                    <li>
                      Delivery strictly against surrender of original Consignee
                      Lorry Receipt copy.
                    </li>
                    <li>
                      Demurrage charges applicable after 24 hrs of vehicle
                      arrival at destination.
                    </li>
                    <li>
                      Subject to{" "}
                      {(
                        data?.companyId?.city ||
                        activeCompany?.city ||
                        "Operating Depot"
                      ).toUpperCase()}{" "}
                      Jurisdiction only.
                    </li>
                    {shortageAllowed > 0 && (
                      <li>
                        Permissible Shortage limit: {shortageAllowed} (rate: ₹{shortageRate || 0}/unit).
                      </li>
                    )}
                  </ol>
                </div>

                {/* Freight Breakup */}
                <div className="divide-y divide-slate-200 text-xs">
                  <div className="flex justify-between p-2">
                    <span className="font-medium text-slate-700">
                      Basic Freight:
                    </span>
                    <span className="font-mono font-bold">
                      {formatCurrency(freightAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between p-2 bg-slate-50">
                    <span className="font-medium text-slate-700">
                      Loading / Hammali Charges:
                    </span>
                    <span className="font-mono font-bold">
                      {formatCurrency(hammali)}
                    </span>
                  </div>
                  <div className="flex justify-between p-2">
                    <span className="font-medium text-slate-700">
                      Detention / Toll / Surcharge:
                    </span>
                    <span className="font-mono font-bold">
                      {formatCurrency(detention)}
                    </span>
                  </div>
                  <div className="flex justify-between p-2 bg-amber-50/50 font-bold">
                    <span className="text-slate-900">Gross Freight Total:</span>
                    <span className="font-mono text-indigo-950 font-black">
                      {formatCurrency(grossTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between p-2 text-slate-600">
                    <span>Less: Driver Advance Paid:</span>
                    <span className="font-mono font-semibold">
                      (-) {formatCurrency(advance)}
                    </span>
                  </div>
                  {shortageAmount > 0 && (
                    <div className="flex justify-between p-2 text-rose-700 bg-rose-50/60 font-semibold">
                      <span>Less: Shortage Deduction:</span>
                      <span className="font-mono font-bold">
                        (-) {formatCurrency(shortageAmount)}
                      </span>
                    </div>
                  )}
                  {commission > 0 && (
                    <div className="flex justify-between p-2 text-slate-600">
                      <span>Transporter Commission:</span>
                      <span className="font-mono font-semibold">
                        {formatCurrency(commission)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between p-2.5 bg-slate-900 text-white font-black text-sm">
                    <span className="uppercase tracking-wider">
                      BALANCE PAYABLE:
                    </span>
                    <span className="font-mono text-amber-400">
                      {formatCurrency(balanceDue)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Signatures Footer */}
              <div className="grid grid-cols-3 pt-6 pb-2 text-center text-[10px]">
                <div className="border-t border-slate-400 mx-3 pt-1">
                  <p className="font-bold text-slate-900">
                    Consignor / Booking Agent
                  </p>
                  <p className="text-[9px] text-slate-500">
                    Authorized Signature
                  </p>
                </div>
                <div className="border-t border-slate-400 mx-3 pt-1">
                  <p className="font-bold text-slate-900">Driver Signature</p>
                  <p className="text-[9px] text-slate-500">
                    Received Goods in Sound Condition
                  </p>
                </div>
                <div className="border-t border-slate-900 mx-3 pt-1">
                  <p className="font-bold text-slate-950 uppercase">
                    For{" "}
                    {(
                      data?.companyId?.name ||
                      activeCompany?.name ||
                      "FLEET OPERATIONS TMS"
                    ).toUpperCase()}
                  </p>
                  <p className="text-[9px] text-slate-500 font-semibold">
                    Authorized Signatory
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer print note */}
        <div className="border-t border-slate-200 bg-white px-6 py-2.5 text-center text-xs text-slate-500 print:hidden shrink-0 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
            <ShieldCheck className="h-4 w-4" /> Legal Motor Vehicles Act Goods
            Consignment Note
          </span>
          <span className="text-[11px] text-slate-400">
            Press <b>Print LR</b> or{" "}
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
