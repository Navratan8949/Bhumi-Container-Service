"use client";
import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  Plus,
  Search,
  RefreshCcw,
  Pencil,
  Trash2,
  X,
  Eye,
  SlidersHorizontal,
  Download,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  FilterX,
  Printer,
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import api from "@/src/services/api";
import { Button, Input, Select, Textarea, Badge, Spinner } from "./ui";
import { toast } from "sonner";
import { getStoredUser, useActiveCompany } from "@/src/lib/auth";
import { resources } from "@/src/lib/resources";
import BiltyPrintModal from "./BiltyPrintModal";
import InvoicePrintModal from "./InvoicePrintModal";
import PaymentReceiptModal from "./PaymentReceiptModal";
import SalarySlipPrintModal from "./SalarySlipPrintModal";
import { exportToExcelProfessional } from "@/src/lib/excelExport";

function unwrap(x) {
  return x?.data?.data ?? x?.data ?? x ?? [];
}
function idOf(x) {
  return x?._id || x?.id || "";
}
function labelOf(value, fieldDef = null, options = null) {
  if (value == null || value === "") return "—";
  if (typeof value === "object")
    return (
      (value.payrollMonth
        ? `Payroll: ${value.payrollMonth}${value.netSalary !== undefined ? ` (₹${Number(value.netSalary).toLocaleString("en-IN")})` : ""}`
        : null) ||
      value.name ||
      value.cityName ||
      value.partyName ||
      value.vendorName ||
      value.vehicleNumber ||
      value.employeeCode ||
      value.employeeName ||
      value.soNumber ||
      value.doNumber ||
      value.bookingNumber ||
      value.lrNumber ||
      value.invoiceNumber ||
      value.billNumber ||
      value.paymentNumber ||
      value.tripNumber ||
      value.expenseNumber ||
      value.advanceNumber ||
      value.receiptNumber ||
      value.serialNumber ||
      value.itemName ||
      value.itemCode ||
      value.tyreNumber ||
      value._id ||
      "—"
    );
  if (fieldDef?.ref && options?.[fieldDef.ref] && typeof value === "string") {
    const found = options[fieldDef.ref].find(
      (x) => x._id === value || x.id === value,
    );
    if (found) return labelOf(found);
  }
  return String(value).replaceAll("_", " ");
}

function formatValue(
  value,
  type,
  name = "",
  fieldDef = null,
  options = null,
  row = null,
) {
  if (value == null || value === "") {
    if (type === "file") {
      const isPerson =
        name &&
        (name.toLowerCase().includes("photo") ||
          name.toLowerCase().includes("profile") ||
          name.toLowerCase().includes("user"));
      const isLogo =
        name &&
        (name.toLowerCase().includes("logo") ||
          name.toLowerCase().includes("brand"));

      let Icon = LucideIcons.FileText;
      if (isPerson) Icon = LucideIcons.User;
      else if (isLogo) Icon = LucideIcons.Image;

      return (
        <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 text-slate-400 shadow-2xs">
          <Icon className="h-4 w-4" />
        </div>
      );
    }
    const lowerName = String(name || "").toLowerCase();
    if (
      lowerName === "email" &&
      row &&
      (String(row.employeeType).toLowerCase() === "driver" ||
        String(row.designation || "")
          .toLowerCase()
          .includes("driver"))
    ) {
      return (
        <span
          className="inline-flex items-center gap-1 rounded bg-slate-100/90 px-2 py-0.5 text-[11px] font-medium text-slate-500 border border-slate-200/90 shadow-2xs"
          title="Heavy vehicle drivers operate via Mobile / WhatsApp. Email is not required."
        >
          <LucideIcons.Smartphone className="h-2.5 w-2.5 text-emerald-600 shrink-0" />
          Mobile Only
        </span>
      );
    }
    return "—";
  }

  const strLabel = labelOf(value, fieldDef, options);
  const lowerName = String(name || "").toLowerCase();

  // Payroll Reference Display
  if (
    lowerName === "payrollid" ||
    lowerName === "payroll" ||
    fieldDef?.ref === "payrolls"
  ) {
    const rawPayroll =
      typeof value === "object" && value !== null
        ? value
        : options?.payrolls?.find((p) => (p._id || p.id) === value);

    if (rawPayroll) {
      const month = rawPayroll.payrollMonth || "Month";
      const emp =
        typeof rawPayroll.employeeId === "object"
          ? rawPayroll.employeeId
          : options?.employees?.find(
              (e) => (e._id || e.id) === rawPayroll.employeeId,
            ) || row?.employeeId;
      const empName = typeof emp === "object" ? emp?.name : "";
      const netVal =
        rawPayroll.netSalary !== undefined ? rawPayroll.netSalary : null;

      return (
        <span className="inline-flex items-center gap-1.5 font-bold text-indigo-900 bg-indigo-50 border border-indigo-200/90 px-2.5 py-1 rounded-lg text-xs shadow-2xs">
          <LucideIcons.Calendar className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
          <span>
            {month}
            {empName ? ` • ${empName}` : ""}
            {netVal !== null
              ? ` (₹${Number(netVal).toLocaleString("en-IN")})`
              : ""}
          </span>
        </span>
      );
    }
  }

  // Highway Origin & Destination Route Pins
  if (lowerName.includes("fromcity") || lowerName.includes("origin")) {
    return (
      <span className="inline-flex items-center gap-1 font-bold text-emerald-800">
        <LucideIcons.MapPin className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
        {strLabel}
      </span>
    );
  }
  if (lowerName.includes("tocity") || lowerName.includes("destination")) {
    return (
      <span className="inline-flex items-center gap-1 font-bold text-indigo-800">
        <LucideIcons.Navigation className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
        {strLabel}
      </span>
    );
  }
  if (
    lowerName.includes("city") ||
    lowerName.includes("station") ||
    lowerName.includes("hub")
  ) {
    return (
      <span className="inline-flex items-center gap-1 font-semibold text-slate-800">
        <LucideIcons.MapPin className="h-3.5 w-3.5 text-amber-600 shrink-0" />
        {strLabel}
      </span>
    );
  }

  // Driver Assignment Display
  if (
    lowerName === "driverid" ||
    lowerName === "driver" ||
    lowerName === "drivername"
  ) {
    const rawObj =
      typeof value === "object" && value !== null
        ? value
        : options?.drivers?.find((d) => (d._id || d.id) === value);
    const photo = rawObj?.photo;
    const baseUrl =
      process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") ||
      "https://narmada-road-lines.onrender.com";

    return (
      <span className="inline-flex items-center gap-1.5 font-bold text-slate-900">
        {photo ? (
          <img
            src={`${baseUrl}${photo}`}
            alt={strLabel}
            className="h-6 w-6 rounded-full object-cover border border-slate-200 shadow-2xs shrink-0"
          />
        ) : (
          <span className="grid h-5 w-5 place-items-center rounded-full bg-slate-100 text-slate-600 shrink-0">
            <LucideIcons.User className="h-3 w-3" />
          </span>
        )}
        {strLabel}
      </span>
    );
  }

  // Commercial Party / Consignor / Consignee Display
  if (
    lowerName === "partyid" ||
    lowerName === "vendorid" ||
    lowerName === "consignorid" ||
    lowerName === "consigneeid" ||
    lowerName === "partyname" ||
    lowerName === "vendorname"
  ) {
    return (
      <span className="inline-flex items-center gap-1 font-semibold text-slate-900">
        <LucideIcons.Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
        {strLabel}
      </span>
    );
  }

  // 1. Commercial Goods Vehicle License Plate (IND Yellow/Amber Plate Badge)
  if (
    lowerName === "vehiclenumber" ||
    lowerName === "vehicleid" ||
    (lowerName.includes("vehicle") &&
      !lowerName.includes("type") &&
      !lowerName.includes("doc"))
  ) {
    return (
      <span className="inline-flex items-center rounded border border-amber-400/90 bg-amber-100/90 px-2 py-0.5 font-mono text-xs font-black tracking-wider text-slate-900 shadow-2xs">
        <span className="mr-1.5 rounded-xs bg-blue-700 px-1 py-0.2 text-[8px] font-black text-white uppercase tracking-tighter">
          IND
        </span>
        {strLabel}
      </span>
    );
  }

  // 2. Official LR / Bilty Number Badge
  if (
    lowerName === "lrnumber" ||
    lowerName === "lrbiltyid" ||
    lowerName.includes("lrnumber")
  ) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50/90 px-2 py-0.5 font-mono text-xs font-black text-indigo-700 shadow-2xs">
        <LucideIcons.FileText className="h-3 w-3 text-indigo-500 shrink-0" />
        {strLabel}
      </span>
    );
  }

  // 3. Transport Booking Number Badge
  if (lowerName === "bookingnumber" || lowerName === "bookingid") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50/90 px-2 py-0.5 font-mono text-xs font-bold text-blue-700 shadow-2xs">
        <LucideIcons.BookOpen className="h-3 w-3 text-blue-500 shrink-0" />
        {strLabel}
      </span>
    );
  }

  // 4. Trip Dispatch Number Badge
  if (lowerName === "tripnumber" || lowerName === "tripid") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50/90 px-2 py-0.5 font-mono text-xs font-bold text-emerald-800 shadow-2xs">
        <LucideIcons.Route className="h-3 w-3 text-emerald-600 shrink-0" />
        {strLabel}
      </span>
    );
  }

  // Crew Employee Code Badge
  if (lowerName === "employeecode") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-slate-100 px-2 py-0.5 font-mono text-xs font-black text-slate-900 shadow-2xs">
        <LucideIcons.ShieldCheck className="h-3 w-3 text-indigo-600 shrink-0" />
        {strLabel}
      </span>
    );
  }

  // Commercial Driver & Fleet Crew Role Badges
  if (lowerName === "employeetype" || lowerName === "rolecategory") {
    const raw = String(strLabel).toLowerCase();
    if (raw === "driver") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-black text-amber-950 shadow-2xs">
          <LucideIcons.Truck className="h-3.5 w-3.5 text-amber-600 shrink-0" />
          Heavy Commercial Driver (HMV)
        </span>
      );
    }
    if (raw === "mechanic" || raw.includes("mechanic")) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-cyan-300 bg-cyan-50 px-2.5 py-0.5 text-xs font-black text-cyan-950 shadow-2xs">
          <LucideIcons.Wrench className="h-3.5 w-3.5 text-cyan-600 shrink-0" />
          Workshop Mechanic
        </span>
      );
    }
    if (raw === "manager" || raw.includes("manager")) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-indigo-300 bg-indigo-50 px-2.5 py-0.5 text-xs font-black text-indigo-950 shadow-2xs">
          <LucideIcons.Building2 className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
          Branch / Depot Incharge
        </span>
      );
    }
    if (raw === "accountant" || raw.includes("accountant")) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-xs font-black text-emerald-950 shadow-2xs">
          <LucideIcons.Calculator className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          Freight Accounts & Billing
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-bold text-slate-800">
        <LucideIcons.UsersRound className="h-3 w-3 text-slate-500 shrink-0" />
        {strLabel.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
      </span>
    );
  }

  // Transport Department Badges
  if (lowerName === "department") {
    const raw = String(strLabel).toLowerCase();
    if (raw.includes("fleet") || raw.includes("operation")) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-950 shadow-2xs">
          <LucideIcons.Truck className="h-3.5 w-3.5 text-amber-600 shrink-0" />
          {strLabel}
        </span>
      );
    }
    if (raw.includes("workshop") || raw.includes("maintenance")) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-sky-300 bg-sky-50 px-2.5 py-0.5 text-xs font-bold text-sky-950 shadow-2xs">
          <LucideIcons.Wrench className="h-3.5 w-3.5 text-sky-600 shrink-0" />
          {strLabel}
        </span>
      );
    }
    if (raw.includes("dispatch") || raw.includes("logistics")) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-indigo-300 bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-950 shadow-2xs">
          <LucideIcons.Boxes className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
          {strLabel}
        </span>
      );
    }
    if (raw.includes("account") || raw.includes("finance")) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-950 shadow-2xs">
          <LucideIcons.Banknote className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          {strLabel}
        </span>
      );
    }
    if (
      raw.includes("admin") ||
      raw.includes("hr") ||
      raw.includes("management")
    ) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-purple-300 bg-purple-50 px-2.5 py-0.5 text-xs font-bold text-purple-950 shadow-2xs">
          <LucideIcons.Building2 className="h-3.5 w-3.5 text-purple-600 shrink-0" />
          {strLabel}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-800 shadow-2xs">
        <LucideIcons.Building className="h-3 w-3 text-slate-500 shrink-0" />
        {strLabel}
      </span>
    );
  }

  // Employee / Driver Advance Voucher Number
  if (lowerName === "advancenumber") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 font-mono text-xs font-black text-rose-800 shadow-2xs">
        <LucideIcons.HandCoins className="h-3 w-3 text-rose-600 shrink-0" />
        {strLabel}
      </span>
    );
  }

  // Monthly Payroll Month Badge
  if (lowerName === "payrollmonth") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 font-mono text-xs font-black text-indigo-800 shadow-2xs">
        <LucideIcons.Calendar className="h-3 w-3 text-indigo-600 shrink-0" />
        {strLabel}
      </span>
    );
  }

  // Salary Payment Voucher Number
  if (lowerName === "paymentnumber" && !lowerName.includes("ref")) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-mono text-xs font-black text-emerald-800 shadow-2xs">
        <LucideIcons.Receipt className="h-3 w-3 text-emerald-600 shrink-0" />
        {strLabel}
      </span>
    );
  }

  // Driver Commercial Heavy License (HMV Plate)
  if (lowerName === "licensenumber" || lowerName === "drivinglicense") {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-slate-400 bg-slate-100 px-2 py-0.5 font-mono text-xs font-black text-slate-900 shadow-2xs">
        <span className="rounded-xs bg-amber-500 px-1 py-0.2 text-[8px] font-black text-slate-950 uppercase tracking-tighter">
          HMV
        </span>
        {strLabel}
      </span>
    );
  }

  // 5. Driver & Crew Phone Numbers
  if (
    lowerName.includes("phone") ||
    lowerName.includes("mobile") ||
    lowerName.includes("contact")
  ) {
    return (
      <a
        href={`tel:${strLabel}`}
        onClick={(e) => e.stopPropagation()}
        className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-slate-700 hover:text-amber-600 transition"
      >
        <LucideIcons.Phone className="h-3 w-3 text-emerald-600" />
        {strLabel}
      </a>
    );
  }

  // Statutory GSTIN Number Badge
  if (
    lowerName === "gstnumber" ||
    lowerName === "gstin" ||
    lowerName === "gst"
  ) {
    if (!strLabel || strLabel === "—") return "—";
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2 py-0.5 font-mono text-xs font-black text-emerald-900 shadow-2xs">
        <LucideIcons.ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
        {strLabel}
      </span>
    );
  }

  // TMS Operator System Role Badges
  if (lowerName === "role") {
    const r = String(strLabel).toLowerCase();
    if (r === "super_admin" || r === "super admin") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-400 bg-amber-100 px-2 py-0.5 text-xs font-black text-amber-950 shadow-2xs">
          <LucideIcons.ShieldCheck className="h-3.5 w-3.5 text-amber-700 shrink-0" />
          Super Admin • Fleet Command
        </span>
      );
    }
    if (r === "admin" || r === "fleet admin") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-indigo-300 bg-indigo-50 px-2 py-0.5 text-xs font-black text-indigo-950 shadow-2xs">
          <LucideIcons.Shield className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
          Fleet Admin
        </span>
      );
    }
    if (r === "manager" || r.includes("dispatcher")) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-blue-300 bg-blue-50 px-2 py-0.5 text-xs font-black text-blue-950 shadow-2xs">
          <LucideIcons.Route className="h-3.5 w-3.5 text-blue-600 shrink-0" />
          Highway Dispatcher
        </span>
      );
    }
    if (r === "accountant") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-xs font-black text-emerald-950 shadow-2xs">
          <LucideIcons.Receipt className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          Depot Accountant
        </span>
      );
    }
    if (r === "driver") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-black text-amber-950 shadow-2xs">
          <LucideIcons.Truck className="h-3.5 w-3.5 text-amber-600 shrink-0" />
          Commercial Driver
        </span>
      );
    }
    if (r === "vendor") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-purple-300 bg-purple-50 px-2 py-0.5 text-xs font-black text-purple-950 shadow-2xs">
          <LucideIcons.Building2 className="h-3.5 w-3.5 text-purple-600 shrink-0" />
          Transporter Partner
        </span>
      );
    }
  }

  // Transit Station / City Pin
  if (
    lowerName === "cityname" ||
    lowerName === "hubname" ||
    lowerName === "stationname"
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 font-bold text-slate-900">
        <LucideIcons.MapPin className="h-3.5 w-3.5 text-amber-600 shrink-0" />
        {strLabel}
      </span>
    );
  }

  // Freight Commodity Name & HSN
  if (
    lowerName === "productname" ||
    lowerName === "commodityname" ||
    lowerName === "commodity"
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 font-bold text-slate-900">
        <span className="grid h-5 w-5 place-items-center rounded bg-amber-100 text-amber-800 shrink-0">
          <LucideIcons.Package className="h-3 w-3" />
        </span>
        {strLabel}
      </span>
    );
  }
  if (lowerName === "hsncode" || lowerName === "hsn") {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 font-mono text-[11px] font-bold text-slate-800">
        HSN {strLabel}
      </span>
    );
  }

  // 6. Dates and Statutory Expiries
  if (
    type === "date" ||
    type === "datetime-local" ||
    (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value))
  ) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) {
      const formattedDate = d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

      if (
        lowerName.includes("expiry") ||
        lowerName.includes("validuntil") ||
        lowerName.includes("validtill")
      ) {
        const now = new Date();
        const diffDays = Math.ceil(
          (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );
        if (diffDays < 0) {
          return (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 border border-red-200 px-2 py-0.5 text-xs font-bold text-red-700">
              <LucideIcons.AlertTriangle className="h-3 w-3 text-red-600" />
              {formattedDate} (Expired)
            </span>
          );
        } else if (diffDays <= 30) {
          return (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-200 px-2 py-0.5 text-xs font-bold text-amber-800">
              <LucideIcons.Clock className="h-3 w-3 text-amber-600" />
              {formattedDate} ({diffDays}d left)
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-700">
            <LucideIcons.CheckCircle2 className="h-3 w-3 text-emerald-500" />
            {formattedDate}
          </span>
        );
      }

      return formattedDate;
    }
  }

  // 7. Currency & Numeric Quantities
  const isCurrency =
    lowerName.includes("amount") ||
    lowerName.includes("rate") ||
    lowerName.includes("freight") ||
    lowerName.includes("salary") ||
    lowerName.includes("balance") ||
    lowerName.includes("price") ||
    lowerName.includes("toll") ||
    lowerName.includes("dieselamount") ||
    lowerName.includes("total");

  if (typeof value === "number") {
    if (isCurrency) {
      return (
        <span className="font-bold text-slate-900 font-mono">
          ₹ {value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
        </span>
      );
    }
    if (
      lowerName.includes("weight") ||
      lowerName.includes("capacity") ||
      lowerName.includes("ton")
    ) {
      return (
        <span className="font-semibold text-slate-800 font-mono">
          {value.toLocaleString("en-IN", { maximumFractionDigits: 2 })} MT
        </span>
      );
    }
    if (
      lowerName.includes("liter") ||
      (lowerName.includes("fuel") && lowerName.includes("qty"))
    ) {
      return (
        <span className="font-semibold text-slate-800 font-mono">
          {value.toLocaleString("en-IN", { maximumFractionDigits: 2 })} Ltrs
        </span>
      );
    }
    if (lowerName.includes("qty") || lowerName.includes("quantity")) {
      return (
        <span className="font-semibold text-slate-800 font-mono">
          {value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
        </span>
      );
    }
    return value.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  }

  // 8. Files / Documents
  if (type === "file" && typeof value === "string") {
    const baseUrl =
      process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") ||
      "https://narmada-road-lines.onrender.com";

    const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(value);

    if (isImage) {
      return (
        <a
          href={`${baseUrl}${value}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
        >
          <img
            src={`${baseUrl}${value}`}
            alt="File"
            className="h-9 w-9 rounded-lg object-cover border border-slate-200 shadow-2xs hover:scale-105 transition"
          />
        </a>
      );
    }

    return (
      <a
        href={`${baseUrl}${value}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-bold hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        <LucideIcons.ExternalLink className="h-3 w-3" />
        View Document
      </a>
    );
  }

  return strLabel;
}

export default function ResourcePage({ resource }) {
  const user = getStoredUser();
  const activeCompany = useActiveCompany();
  const role = user?.role || "";
  const canCreate =
    resource.canCreate?.includes(role) ??
    resource.roles?.includes(role) ??
    false;
  const canEdit = resource.canEdit?.includes(role) ?? canCreate;
  const canDelete = resource.canDelete?.includes(role) ?? canCreate;
  const [rows, setRows] = useState([]),
    [loading, setLoading] = useState(true),
    [search, setSearch] = useState("");
  const [filters, setFilters] = useState({}),
    [showFilters, setShowFilters] = useState(false),
    [sort, setSort] = useState({ key: "", dir: "asc" }),
    [page, setPage] = useState(1),
    [pageSize, setPageSize] = useState(10);
  const [editing, setEditing] = useState(null),
    [viewing, setViewing] = useState(null),
    [printBiltyRow, setPrintBiltyRow] = useState(null),
    [printInvoiceRow, setPrintInvoiceRow] = useState(null),
    [printPaymentRow, setPrintPaymentRow] = useState(null),
    [printSlipRow, setPrintSlipRow] = useState(null),
    [printSlipType, setPrintSlipType] = useState("payroll"),
    [show, setShow] = useState(false),
    [saving, setSaving] = useState(false);
  const [options, setOptions] = useState({});
  const companyList = useMemo(() => {
    const list = [...(options.companies || [])];
    if (activeCompany?._id && !list.some((c) => c._id === activeCompany._id)) {
      list.push(activeCompany);
    }
    return list;
  }, [options.companies, activeCompany]);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Handle URL-based prefill
  useEffect(() => {
    const autoOpen = searchParams.get("autoOpenAdd");
    if (autoOpen === "true") {
      const prefillData = {};
      resource.fields.forEach((f) => {
        const val = searchParams.get(f.name);
        if (val) prefillData[f.name] = val;
      });
      // We set editing to a special object without _id so it acts as a POST,
      // but populates the form fields.
      setEditing(prefillData);
      setShow(true);

      // Clean up the URL to prevent reopening on reload
      router.replace(pathname);
    }
  }, [searchParams, resource.fields, pathname, router]);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      // Date range filters are passed to backend if resource defines dateKey
      if (resource.dateKey && filters.fromDate)
        params.fromDate = filters.fromDate;
      if (resource.dateKey && filters.toDate) params.toDate = filters.toDate;
      const r = await api.get(resource.endpoint, { params });
      setRows(unwrap(r.data) || []);
    } catch (e) {
      toast.error(
        e?.response?.data?.message || e?.message || "Failed to load records",
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    load();
  }, [resource.endpoint, filters.fromDate, filters.toDate]);
  useEffect(() => {
    const refs = [
      ...new Set(resource.fields.filter((f) => f.ref).map((f) => f.ref)),
    ];
    if (!refs.length) return;
    Promise.all(
      refs.map(async (key) => {
        const r = resources[key];
        if (!r) return [key, []];
        try {
          const res = await api.get(r.endpoint);
          return [key, unwrap(res.data) || []];
        } catch {
          return [key, []];
        }
      }),
    ).then((items) => setOptions(Object.fromEntries(items)));
  }, [resource.key]);

  const filtered = useMemo(() => {
    let data = rows.filter((row) => {
      const q = search.trim().toLowerCase();
      const searchHit =
        !q ||
        (resource.searchKeys || resource.fields.map((f) => f.name)).some(
          (k) => {
            const fieldDef = resource.fields.find((f) => f.name === k);
            return labelOf(row[k], fieldDef, options).toLowerCase().includes(q);
          },
        );
      const filterHit = Object.entries(filters).every(([k, v]) => {
        if (!v || k === "fromDate" || k === "toDate") return true;
        if (v === "all") return true;
        const fieldDef = resource.fields.find((f) => f.name === k);
        const resolvedVal = labelOf(row[k], fieldDef, options);
        const rawId =
          typeof row[k] === "object" && row[k]?._id ? String(row[k]._id) : "";

        if (k === "companyId") {
          if (v === "platform" || v === "none") {
            return !row[k] || !rawId;
          }
          if (rawId && rawId.toLowerCase() === String(v).toLowerCase()) {
            return true;
          }
        }

        return (
          resolvedVal.toLowerCase() === String(v).toLowerCase() ||
          (rawId && rawId.toLowerCase() === String(v).toLowerCase()) ||
          String(row[k] || "").toLowerCase() === String(v).toLowerCase()
        );
      });
      return searchHit && filterHit;
    });
    if (sort.key) {
      const fieldDef = resource.fields.find((f) => f.name === sort.key);
      data.sort(
        (a, b) =>
          String(labelOf(a[sort.key], fieldDef, options)).localeCompare(
            String(labelOf(b[sort.key], fieldDef, options)),
            undefined,
            { numeric: true },
          ) * (sort.dir === "asc" ? 1 : -1),
      );
    }
    return data;
  }, [rows, search, filters, sort, resource, options]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const visibleFields = useMemo(() => {
    const fields = resource.fields.filter(
      (f) => !f.hidden && f.type !== "password",
    );
    const priority = [
      "lrNumber",
      "bookingNumber",
      "tripNumber",
      "vehicleNumber",
      "employeeCode",
      "invoiceNumber",
      "billNumber",
      "paymentNumber",
      "itemCode",
      "status",
      "paymentStatus",
      "grandTotal",
      "outstandingAmount",
      "paidAmount",
      "totalFreight",
      "amount",
      "total",
      "netPay",
      "vehicleId",
      "driverId",
      "partyId",
      "vendorId",
      "fromCityId",
      "toCityId",
      "currentStock",
      "liters",
      "phone",
    ];
    const sorted = [...fields].sort((a, b) => {
      const aIdx = priority.indexOf(a.name);
      const bIdx = priority.indexOf(b.name);
      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
      if (aIdx !== -1) return -1;
      if (bIdx !== -1) return 1;
      return 0;
    });
    const chosen = sorted.slice(0, 8);
    const statusF = fields.find(
      (f) =>
        f.name.toLowerCase().includes("status") || f.name === "paymentStatus",
    );
    if (statusF && !chosen.some((f) => f.name === statusF.name)) {
      chosen[chosen.length - 1] = statusF;
    }
    return chosen;
  }, [resource]);
  const setFilter = (key, value) => {
    setFilters((v) => ({ ...v, [key]: value }));
    setPage(1);
  };
  const resetFilters = () => {
    setSearch("");
    setFilters({});
    setPage(1);
  };

  const openForm = (row) => {
    if (!row && resource.key === "users") {
      const defaultCompany =
        filters.companyId &&
        filters.companyId !== "platform" &&
        filters.companyId !== "all"
          ? filters.companyId
          : activeCompany?._id || "";
      setEditing(defaultCompany ? { companyId: defaultCompany } : {});
    } else {
      setEditing(row);
    }
    setShow(true);
  };
  const save = async (data) => {
    setSaving(true);
    try {
      const cleanedData = {};
      Object.entries(data).forEach(([key, value]) => {
        const fieldDef = resource.fields.find((f) => f.name === key);
        if (
          value === "" &&
          fieldDef &&
          (fieldDef.ref ||
            fieldDef.type === "number" ||
            fieldDef.type === "date")
        ) {
          return;
        }
        cleanedData[key] = value;
      });

      // Auto-fallback: if status is empty, null, undefined or "Select Status", default to active
      const statusField = resource.fields.find((f) => f.name === "status");
      if (statusField) {
        if (
          !cleanedData.status ||
          cleanedData.status === "" ||
          String(cleanedData.status).toLowerCase().startsWith("select")
        ) {
          const hasActive = statusField.options?.some(
            (o) => (typeof o === "object" ? o.value : o) === "active",
          );
          cleanedData.status =
            hasActive || !statusField.options
              ? "active"
              : statusField.defaultValue ||
                (typeof statusField.options[0] === "object"
                  ? statusField.options[0]?.value
                  : statusField.options[0]) ||
                "active";
        }
      }

      const hasFile = resource.fields.some((f) => f.type === "file");
      let payload = cleanedData;
      if (hasFile) {
        const fd = new FormData();
        Object.entries(cleanedData).forEach(([key, value]) => {
          if (value === undefined || value === null || value === "") return;
          if (value instanceof File) fd.append(key, value);
          else fd.append(key, value);
        });
        payload = fd;
      }
      if (editing && idOf(editing))
        await api.put(`${resource.endpoint}/${idOf(editing)}`, payload);
      else await api.post(resource.endpoint, payload);
      toast.success(
        `${resource.singular} ${editing && idOf(editing) ? "updated" : "created"} successfully`,
      );
      setShow(false);
      setEditing(null);
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };
  const remove = async (row) => {
    if (!window.confirm(`Delete this ${resource.singular}?`)) return;
    try {
      await api.delete(`${resource.endpoint}/${idOf(row)}`);
      toast.success("Record deleted");
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Delete failed");
    }
  };
  const exportToExcel = () => {
    const exportFields = resource.fields.filter((f) => !f.hidden);
    exportToExcelProfessional({
      title: `${resource.title} Register`,
      subtitle: `${activeCompany?.name || "Operating Company"} • Central Records Desk`,
      filename: `${activeCompany?.code || "TMS"}_${resource.key}`,
      sheetName: resource.title,
      columns: exportFields,
      rows: filtered,
      options: options,
    });
  };

  const totalSum = useMemo(() => {
    const moneyField = resource.fields.find(
      (f) =>
        f.type === "number" &&
        /amount|rate|freight|balance|price|salary|total|toll|billamount|paidamount|cost/i.test(
          f.name,
        ),
    );
    if (!moneyField) return null;
    return filtered.reduce(
      (acc, row) => acc + (Number(row[moneyField.name]) || 0),
      0,
    );
  }, [filtered, resource.fields]);

  const statusField = resource.fields.find(
    (f) =>
      f.name.toLowerCase().includes("status") || f.name === "paymentStatus",
  );
  const statusCounts = useMemo(() => {
    if (!statusField) return {};
    const counts = {};
    rows.forEach((r) => {
      const val = String(r[statusField.name] || "").toLowerCase();
      if (val) counts[val] = (counts[val] || 0) + 1;
    });
    return counts;
  }, [rows, statusField]);

  const kpiData = useMemo(() => {
    const key = resource.key;
    const total = rows.length;

    if (key === "vehicles") {
      const inTransit = rows.filter(
        (r) =>
          String(r.status).toLowerCase().includes("transit") ||
          String(r.status).toLowerCase().includes("trip"),
      ).length;
      const yard = rows.filter(
        (r) =>
          String(r.status).toLowerCase() === "active" ||
          String(r.status).toLowerCase() === "available",
      ).length;
      const workshop = rows.filter(
        (r) =>
          String(r.status).toLowerCase().includes("maintenance") ||
          String(r.status).toLowerCase().includes("repair") ||
          String(r.status).toLowerCase().includes("breakdown"),
      ).length;
      return [
        {
          label: "Total Fleet Trucks",
          value: total,
          sub: "Registered transport trucks",
          icon: LucideIcons.Truck,
          color: "text-slate-900",
        },
        {
          label: "On Highway / Transit",
          value: inTransit,
          sub: "Actively dispatched on road",
          icon: LucideIcons.Route,
          color: "text-amber-600",
        },
        {
          label: "Available in Yard",
          value: yard,
          sub: "Ready for cargo loading",
          icon: LucideIcons.CheckCircle2,
          color: "text-emerald-600",
        },
        {
          label: "In Workshop",
          value: workshop,
          sub: "Maintenance & tyre repairs",
          icon: LucideIcons.Wrench,
          color: "text-purple-600",
        },
      ];
    }

    if (key === "lr-bilties") {
      const inTransit = rows.filter(
        (r) =>
          String(r.status).toLowerCase().includes("transit") ||
          String(r.status).toLowerCase().includes("dispatch"),
      ).length;
      const delivered = rows.filter((r) =>
        String(r.status).toLowerCase().includes("deliver"),
      ).length;
      const totalFreight = rows.reduce(
        (acc, r) => acc + (Number(r.totalFreight) || 0),
        0,
      );
      return [
        {
          label: "Total LRs Issued",
          value: total,
          sub: "Official consignment bilties",
          icon: LucideIcons.FileText,
          color: "text-slate-900",
        },
        {
          label: "In Transit",
          value: inTransit,
          sub: "Consignments on highway",
          icon: LucideIcons.Truck,
          color: "text-amber-600",
        },
        {
          label: "Delivered",
          value: delivered,
          sub: "POD acknowledged",
          icon: LucideIcons.CheckCircle2,
          color: "text-emerald-600",
        },
        {
          label: "Total Freight Billed",
          value: `₹ ${totalFreight.toLocaleString("en-IN")}`,
          sub: "Consignment revenue value",
          icon: LucideIcons.IndianRupee,
          color: "text-indigo-600",
        },
      ];
    }

    if (key === "bookings") {
      const pending = rows.filter(
        (r) =>
          String(r.status).toLowerCase().includes("pending") ||
          String(r.status).toLowerCase().includes("confirm"),
      ).length;
      const delivered = rows.filter(
        (r) =>
          String(r.status).toLowerCase().includes("complete") ||
          String(r.status).toLowerCase().includes("deliver"),
      ).length;
      const totalFreight = rows.reduce(
        (acc, r) => acc + (Number(r.totalFreight) || 0),
        0,
      );
      return [
        {
          label: "Total Bookings",
          value: total,
          sub: "Cargo freight indents",
          icon: LucideIcons.BookOpen,
          color: "text-slate-900",
        },
        {
          label: "Pending Dispatch",
          value: pending,
          sub: "Awaiting truck assignment",
          icon: LucideIcons.Clock,
          color: "text-amber-600",
        },
        {
          label: "Fulfilled / Delivered",
          value: delivered,
          sub: "Completed orders",
          icon: LucideIcons.CheckCircle2,
          color: "text-emerald-600",
        },
        {
          label: "Total Freight Value",
          value: `₹ ${totalFreight.toLocaleString("en-IN")}`,
          sub: "Indented cargo revenue",
          icon: LucideIcons.IndianRupee,
          color: "text-indigo-600",
        },
      ];
    }

    if (key === "fuels") {
      const totalLiters = rows.reduce(
        (acc, r) => acc + (Number(r.liters) || 0),
        0,
      );
      const totalCost = rows.reduce(
        (acc, r) => acc + (Number(r.totalAmount) || 0),
        0,
      );
      const avgRate =
        totalLiters > 0 ? (totalCost / totalLiters).toFixed(2) : "0";
      return [
        {
          label: "Fuel Entries",
          value: total,
          sub: "Diesel issue slips",
          icon: LucideIcons.Fuel,
          color: "text-slate-900",
        },
        {
          label: "Total Diesel",
          value: `${totalLiters.toLocaleString("en-IN")} Ltrs`,
          sub: "Dispensed across fleet",
          icon: LucideIcons.Fuel,
          color: "text-blue-600",
        },
        {
          label: "Total Fuel Spend",
          value: `₹ ${totalCost.toLocaleString("en-IN")}`,
          sub: "Diesel expenditure",
          icon: LucideIcons.IndianRupee,
          color: "text-amber-600",
        },
        {
          label: "Average Rate",
          value: `₹ ${avgRate} / Ltr`,
          sub: "Mean fuel price",
          icon: LucideIcons.TrendingUp,
          color: "text-emerald-600",
        },
      ];
    }

    if (key === "drivers") {
      const onTrip = rows.filter(
        (r) =>
          String(r.status).toLowerCase().includes("trip") ||
          String(r.status).toLowerCase().includes("transit"),
      ).length;
      const active = rows.filter(
        (r) => String(r.status).toLowerCase() === "active",
      ).length;
      return [
        {
          label: "Commercial Drivers",
          value: total,
          sub: "Heavy vehicle licensed crew",
          icon: LucideIcons.Users,
          color: "text-slate-900",
        },
        {
          label: "Available in Yard",
          value: Math.max(0, active - onTrip),
          sub: "Ready for trip dispatch",
          icon: LucideIcons.CheckCircle2,
          color: "text-emerald-600",
        },
        {
          label: "On Road Trips",
          value: onTrip,
          sub: "Currently en-route",
          icon: LucideIcons.Truck,
          color: "text-amber-600",
        },
        {
          label: "License Status",
          value: "HMV Compliant",
          sub: "Heavy vehicle verified",
          icon: LucideIcons.ShieldCheck,
          color: "text-indigo-600",
        },
      ];
    }

    if (key === "employees") {
      const drivers = rows.filter(
        (r) =>
          String(r.employeeType).toLowerCase() === "driver" ||
          String(r.designation).toLowerCase().includes("driver"),
      ).length;
      const mechanics = rows.filter(
        (r) =>
          String(r.employeeType).toLowerCase().includes("mechanic") ||
          String(r.designation).toLowerCase().includes("mechanic"),
      ).length;
      const managers = rows.filter(
        (r) =>
          String(r.employeeType).toLowerCase().includes("manager") ||
          String(r.employeeType).toLowerCase().includes("admin") ||
          String(r.employeeType).toLowerCase().includes("accountant"),
      ).length;
      const active = rows.filter(
        (r) => String(r.status).toLowerCase() === "active",
      ).length;
      return [
        {
          label: "Fleet Crew & Personnel",
          value: total,
          sub: "Registered transport workforce",
          icon: LucideIcons.UsersRound,
          color: "text-slate-900",
        },
        {
          label: "Commercial Drivers (HMV)",
          value: drivers,
          sub: "Heavy vehicle long-haul crew",
          icon: LucideIcons.Truck,
          color: "text-amber-600",
        },
        {
          label: "Workshop & Mechanics",
          value: mechanics,
          sub: "Depot maintenance crew",
          icon: LucideIcons.Wrench,
          color: "text-cyan-600",
        },
        {
          label: "Depot & Office Incharge",
          value: managers,
          sub: "Dispatch & billing officers",
          icon: LucideIcons.Building2,
          color: "text-indigo-600",
        },
      ];
    }

    if (key === "employee-advances") {
      const totalAmount = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
      const recovered = rows.reduce(
        (s, r) => s + (Number(r.recoveredAmount) || 0),
        0,
      );
      const outstanding = rows.reduce(
        (s, r) =>
          s +
          (Number(
            r.outstandingAmount != null
              ? r.outstandingAmount
              : Number(r.amount || 0) - Number(r.recoveredAmount || 0),
          ) || 0),
        0,
      );
      const pendingCount = rows.filter(
        (r) =>
          String(r.status).toLowerCase() !== "recovered" &&
          String(r.status).toLowerCase() !== "cancelled",
      ).length;
      return [
        {
          label: "Driver & Crew Advances",
          value: `₹ ${totalAmount.toLocaleString("en-IN")}`,
          sub: "Total trip advances issued",
          icon: LucideIcons.HandCoins,
          color: "text-slate-900",
        },
        {
          label: "Recovered via Payroll",
          value: `₹ ${recovered.toLocaleString("en-IN")}`,
          sub: "Settled against driver wages",
          icon: LucideIcons.CheckCircle2,
          color: "text-emerald-600",
        },
        {
          label: "Pending Advance Dues",
          value: `₹ ${outstanding.toLocaleString("en-IN")}`,
          sub: `${pendingCount} active advance balances`,
          icon: LucideIcons.Clock,
          color: "text-amber-600",
        },
        {
          label: "Recovery Efficiency",
          value:
            totalAmount > 0
              ? `${((recovered / totalAmount) * 100).toFixed(1)}%`
              : "100%",
          sub: "Advance recovery rate",
          icon: LucideIcons.TrendingUp,
          color: "text-indigo-600",
        },
      ];
    }

    if (key === "payrolls") {
      const gross = rows.reduce((s, r) => s + (Number(r.grossSalary) || 0), 0);
      const ot = rows.reduce((s, r) => s + (Number(r.overtimeAmount) || 0), 0);
      const advances = rows.reduce(
        (s, r) => s + (Number(r.advanceDeduction) || 0),
        0,
      );
      const net = rows.reduce((s, r) => s + (Number(r.netSalary) || 0), 0);
      return [
        {
          label: "Gross Fleet Payroll",
          value: `₹ ${gross.toLocaleString("en-IN")}`,
          sub: "Total monthly wage liability",
          icon: LucideIcons.Calculator,
          color: "text-slate-900",
        },
        {
          label: "Driver Batta & OT",
          value: `₹ ${ot.toLocaleString("en-IN")}`,
          sub: "Highway allowances & extra duty",
          icon: LucideIcons.Truck,
          color: "text-indigo-600",
        },
        {
          label: "Advance Deductions",
          value: `₹ ${advances.toLocaleString("en-IN")}`,
          sub: "Recovered advance deductions",
          icon: LucideIcons.HandCoins,
          color: "text-amber-600",
        },
        {
          label: "Net Wages Disbursable",
          value: `₹ ${net.toLocaleString("en-IN")}`,
          sub: "Net take-home crew pay",
          icon: LucideIcons.IndianRupee,
          color: "text-emerald-600",
        },
      ];
    }

    if (key === "salary-payments") {
      const totalDisbursed = rows.reduce(
        (s, r) => s + (Number(r.amount) || 0),
        0,
      );
      const bankTransfers = rows
        .filter((r) =>
          ["bank_transfer", "neft", "rtgs", "imps", "upi"].includes(
            String(r.paymentMode).toLowerCase(),
          ),
        )
        .reduce((s, r) => s + (Number(r.amount) || 0), 0);
      const cashDisbursed = rows
        .filter((r) => String(r.paymentMode).toLowerCase() === "cash")
        .reduce((s, r) => s + (Number(r.amount) || 0), 0);
      return [
        {
          label: "Total Wages Disbursed",
          value: `₹ ${totalDisbursed.toLocaleString("en-IN")}`,
          sub: `${rows.length} payment vouchers issued`,
          icon: LucideIcons.Receipt,
          color: "text-slate-900",
        },
        {
          label: "Bank & NEFT Transfers",
          value: `₹ ${bankTransfers.toLocaleString("en-IN")}`,
          sub: "Direct crew account credit",
          icon: LucideIcons.Building2,
          color: "text-indigo-600",
        },
        {
          label: "Depot Cash Disbursal",
          value: `₹ ${cashDisbursed.toLocaleString("en-IN")}`,
          sub: "Yard cash salary payouts",
          icon: LucideIcons.HandCoins,
          color: "text-emerald-600",
        },
        {
          label: "Payout Compliance",
          value: "100%",
          sub: "Disbursement logged",
          icon: LucideIcons.ShieldCheck,
          color: "text-blue-600",
        },
      ];
    }

    if (key === "parties") {
      const active = rows.filter(
        (r) => String(r.status).toLowerCase() === "active",
      ).length;
      const gst = rows.filter((r) => Boolean(r.gstNumber)).length;
      return [
        {
          label: "Freight Clients & Parties",
          value: total,
          sub: "Registered billing accounts",
          icon: LucideIcons.Users,
          color: "text-slate-900",
        },
        {
          label: "GST Registered Clients",
          value: gst,
          sub: "Tax compliant billing",
          icon: LucideIcons.ShieldCheck,
          color: "text-emerald-600",
        },
        {
          label: "Active Consignor Accounts",
          value: active,
          sub: "Eligible for LR issuance",
          icon: LucideIcons.CheckCircle2,
          color: "text-indigo-600",
        },
        {
          label: "Credit & Ledger Desk",
          value: "Operational",
          sub: "Bilty & invoice billing active",
          icon: LucideIcons.Receipt,
          color: "text-amber-600",
        },
      ];
    }

    if (key === "vendors") {
      const active = rows.filter(
        (r) => String(r.status).toLowerCase() === "active",
      ).length;
      const gst = rows.filter((r) => Boolean(r.gstNumber)).length;
      return [
        {
          label: "Transporter & Hired Fleet",
          value: total,
          sub: "Registered transport vendors",
          icon: LucideIcons.Building2,
          color: "text-slate-900",
        },
        {
          label: "GST Verified Transporters",
          value: gst,
          sub: "Input tax credit compliant",
          icon: LucideIcons.ShieldCheck,
          color: "text-emerald-600",
        },
        {
          label: "Active Fleet Partners",
          value: active,
          sub: "Available for trip assignment",
          icon: LucideIcons.Truck,
          color: "text-amber-600",
        },
        {
          label: "Hire Payables Desk",
          value: "Verified",
          sub: "Brokerage & hired truck billing",
          icon: LucideIcons.WalletCards,
          color: "text-indigo-600",
        },
      ];
    }

    if (key === "cities") {
      const active = rows.filter(
        (r) => String(r.status).toLowerCase() === "active",
      ).length;
      return [
        {
          label: "Transit Stations & Hubs",
          value: total,
          sub: "Highway logistics nodes",
          icon: LucideIcons.MapPin,
          color: "text-slate-900",
        },
        {
          label: "Operational Hubs",
          value: active,
          sub: "Active loading & delivery points",
          icon: LucideIcons.CheckCircle2,
          color: "text-emerald-600",
        },
        {
          label: "Primary Fleet Depot",
          value: activeCompany?.city
            ? `${activeCompany.city} (HQ)`
            : "Central (HQ)",
          sub: `${activeCompany?.city || "Central"} yard`,
          icon: LucideIcons.Building2,
          color: "text-amber-600",
        },
        {
          label: "Highway Corridors",
          value: "Mumbai • Guj • Pune",
          sub: "Monitored transit routes",
          icon: LucideIcons.Route,
          color: "text-indigo-600",
        },
      ];
    }

    if (key === "products") {
      const active = rows.filter(
        (r) => String(r.status).toLowerCase() === "active",
      ).length;
      return [
        {
          label: "Cargo Commodities",
          value: total,
          sub: "Registered freight classes",
          icon: LucideIcons.Package,
          color: "text-slate-900",
        },
        {
          label: "Active Cargo Types",
          value: active,
          sub: "Permitted transit goods",
          icon: LucideIcons.CheckCircle2,
          color: "text-emerald-600",
        },
        {
          label: "Packaging Standards",
          value: "MT / Bags / Drums",
          sub: "Standardized cargo units",
          icon: LucideIcons.Boxes,
          color: "text-indigo-600",
        },
        {
          label: "e-Way Bill Compliance",
          value: "100%",
          sub: "HSN classification ready",
          icon: LucideIcons.ShieldCheck,
          color: "text-amber-600",
        },
      ];
    }

    if (key === "consignors") {
      const active = rows.filter(
        (r) => String(r.status).toLowerCase() === "active",
      ).length;
      const gst = rows.filter((r) => Boolean(r.gstNumber)).length;
      return [
        {
          label: "Shipping Consignors",
          value: total,
          sub: "Goods dispatch senders",
          icon: LucideIcons.Users,
          color: "text-slate-900",
        },
        {
          label: "GST Verified Consignors",
          value: gst,
          sub: "Factory & godown verified",
          icon: LucideIcons.ShieldCheck,
          color: "text-emerald-600",
        },
        {
          label: "Active Dispatch Accounts",
          value: active,
          sub: "Open consignment accounts",
          icon: LucideIcons.CheckCircle2,
          color: "text-indigo-600",
        },
        {
          label: "Dispatch Origin Hub",
          value: "Central Yard",
          sub: `${activeCompany?.city || "Regional"} & pickup hubs`,
          icon: LucideIcons.MapPin,
          color: "text-amber-600",
        },
      ];
    }

    if (key === "consignees") {
      const active = rows.filter(
        (r) => String(r.status).toLowerCase() === "active",
      ).length;
      const gst = rows.filter((r) => Boolean(r.gstNumber)).length;
      return [
        {
          label: "Destination Consignees",
          value: total,
          sub: "Goods delivery receivers",
          icon: LucideIcons.ShieldCheck,
          color: "text-slate-900",
        },
        {
          label: "GST Verified Receivers",
          value: gst,
          sub: "Delivery point tax registered",
          icon: LucideIcons.CheckCircle2,
          color: "text-emerald-600",
        },
        {
          label: "Active Delivery Points",
          value: active,
          sub: "Unloading terminals",
          icon: LucideIcons.MapPin,
          color: "text-indigo-600",
        },
        {
          label: "POD Verification Desk",
          value: "Automated",
          sub: "Proof of delivery clearance",
          icon: LucideIcons.FileCheck,
          color: "text-amber-600",
        },
      ];
    }

    if (key === "users") {
      const isFilteredComp = Boolean(filters.companyId);
      const scopedUsers = isFilteredComp
        ? rows.filter((r) => {
            const compId =
              typeof r.companyId === "object" ? r.companyId?._id : r.companyId;
            if (filters.companyId === "platform") return !compId;
            return String(compId || "") === String(filters.companyId);
          })
        : rows;

      const superAdmins = scopedUsers.filter(
        (r) => r.role === "super_admin" || r.role === "admin",
      ).length;
      const dispatchers = scopedUsers.filter(
        (r) => r.role === "manager",
      ).length;
      const accountants = scopedUsers.filter(
        (r) => r.role === "accountant",
      ).length;

      const selectedComp =
        filters.companyId &&
        filters.companyId !== "platform" &&
        filters.companyId !== "all"
          ? (companyList || []).find((c) => c._id === filters.companyId) ||
            (activeCompany?._id === filters.companyId ? activeCompany : null)
          : null;

      const crewSub = selectedComp
        ? `${selectedComp.name} (${scopedUsers.length}) • Total in Registry: ${rows.length}`
        : filters.companyId === "platform"
          ? `Platform Crew (${scopedUsers.length}) • Total in Registry: ${rows.length}`
          : `Authorized system operators • Total: ${rows.length}`;

      return [
        {
          label: "TMS Control Tower Crew",
          value: scopedUsers.length,
          sub: crewSub,
          icon: LucideIcons.ShieldCheck,
          color: "text-slate-900",
        },
        {
          label: "Fleet Command (Admins)",
          value: superAdmins,
          sub: selectedComp
            ? `Admins in ${selectedComp.name}`
            : "Central authorization access",
          icon: LucideIcons.Shield,
          color: "text-amber-600",
        },
        {
          label: "Highway Dispatch Officers",
          value: dispatchers,
          sub: selectedComp
            ? `Dispatchers in ${selectedComp.name}`
            : "Trip & LR dispatchers",
          icon: LucideIcons.Route,
          color: "text-indigo-600",
        },
        {
          label: "Freight Accounts & Billing",
          value: accountants,
          sub: selectedComp
            ? `Accounts in ${selectedComp.name}`
            : "Invoicing & payments",
          icon: LucideIcons.Receipt,
          color: "text-emerald-600",
        },
      ];
    }

    if (key === "companies") {
      const active = rows.filter(
        (r) => String(r.status).toLowerCase() === "active",
      ).length;
      return [
        {
          label: "Transport Companies & Depots",
          value: total,
          sub: "Operating transport entities",
          icon: LucideIcons.Building2,
          color: "text-slate-900",
        },
        {
          label: "Active Operating Branches",
          value: active,
          sub: "Regional depot hubs",
          icon: LucideIcons.CheckCircle2,
          color: "text-emerald-600",
        },
        {
          label: "Central Head Depot",
          value: `${activeCompany?.city || "Central"} Yard`,
          sub: `${activeCompany?.name || "Operating"} logistics`,
          icon: LucideIcons.Truck,
          color: "text-amber-600",
        },
        {
          label: "Multi-Depot Routing",
          value: "Enabled",
          sub: "Shared fleet coordination",
          icon: LucideIcons.Route,
          color: "text-indigo-600",
        },
      ];
    }

    return [
      {
        label: "Total Registry",
        value: total,
        sub: "System records in depot",
        icon: LucideIcons.Layers,
        color: "text-slate-900",
      },
      {
        label: "Filtered Active",
        value: filtered.length,
        sub: "Matching active criteria",
        icon: LucideIcons.CheckCircle2,
        color: "text-emerald-600",
      },
      {
        label: "Operations Desk",
        value: resource.singular,
        sub: `${activeCompany?.city || "Central"} Hub`,
        icon: LucideIcons.Building2,
        color: "text-amber-700",
      },
      {
        label: totalSum != null ? "Total Registry Value" : "Compliance Status",
        value:
          totalSum != null
            ? `₹ ${totalSum.toLocaleString("en-IN")}`
            : "Operational",
        sub:
          totalSum != null
            ? "Aggregated filtered sum"
            : "Fleet active & compliant",
        icon:
          totalSum != null ? LucideIcons.IndianRupee : LucideIcons.ShieldCheck,
        color: "text-indigo-600",
      },
    ];
  }, [rows, filtered, resource, totalSum]);

  const transportSubtitles = {
    vehicles: "Fleet Management • Commercial Goods Vehicles & Heavy Trucks",
    drivers:
      "Commercial Drivers • Heavy Goods Vehicle (HMV) Licensed Crew & Highway Transit Operators",
    "lr-bilties":
      "Consignment Documentation • Official Lorry Receipts (LR Desk)",
    bookings: "Transport Bookings • Freight Orders & Cargo Indents",
    "supply-orders": "Order Fulfillment • Vehicle Supply Indents",
    "do-received": "Client Orders • Client Delivery Orders (D.O. Register)",
    fuels: "Fleet Energy • Diesel Dispensation & Fuel Vouchers",
    "vehicle-documents": "Statutory Compliance • Permits, Fitness & Insurance",
    maintenances: "Fleet Maintenance • Workshop Job Cards & Repairs",
    tyres: "Tyre Management • Serial Tracking & Axle Fitment",
    "customer-invoices": "Freight Billing • Commercial Customer Invoices",
    "customer-payments": "Accounts Receivable • Freight Payments Received",
    "vendor-bills": "Fleet Hire Payables • Transporter & Hired Truck Bills",
    "vendor-payments": "Accounts Payable • Transporter & Vendor Payments",
    expenses: "Trip Accounts • Toll, Loading & Operational Expenses",
    payrolls:
      "Fleet Payroll & Wages • Monthly Driver Trip Allowances (Batta), Overtime, Advance Deductions & Net Pay",
    "employee-advances":
      "Crew Advances & Allowances • Driver Highway Trip Advances, Fuel/Toll Advances & Salary Recoveries",
    "salary-payments":
      "Salary Disbursements • Driver Wages & Staff Salary Payment Vouchers, NEFT & Cash Slips",
    employees:
      "Fleet Staff & Crew • Heavy Vehicle Drivers, Mechanics, Yard Supervisors & Depot Personnel",
    parties:
      "Freight Client Master • Commercial Consignors, Shippers & Billing Parties for Bilty / LR Desk",
    vendors:
      "Transporter & Hired Fleet Master • Market Truck Owners, Fleet Brokers & Logistics Partners",
    consignors:
      "Shipping Consignors • Industrial Goods Senders & Warehouse Dispatch Origins",
    consignees:
      "Receiving Consignees • Destination Delivery Godowns, Unloading Receivers & POD Points",
    cities:
      "Highway Transit Corridors • Loading Origins, Delivery Terminals, Toll Points & Border Checkposts",
    products:
      "Freight Commodity Master • Cargo Types, Packaging Standards (MT, Bags, Barrels) & HSN Compliance",
    users:
      "TMS Operator & Control Tower Access • Fleet Dispatchers, Accounts Officers & System RBAC",
    companies:
      "Transport Entity & Depot Master • Registered Operating Branches, Central Yards & GST Units",
  };

  const tableSummary = useMemo(() => {
    if (!filtered || filtered.length === 0) return null;
    const key = resource.key;

    if (key === "lr-bilties") {
      const totalFreight = filtered.reduce(
        (s, r) =>
          s +
          (Number(r.totalFreight) ||
            Number(r.freightAmount) ||
            Number(
              (r.bookingId?.billingRate || 0) *
                (r.loadingWeight || r.quantity || 1),
            ) ||
            0),
        0,
      );
      const advance = filtered.reduce(
        (s, r) =>
          s + (Number(r.advanceAmount || r.bookingId?.advanceAmount) || 0),
        0,
      );
      const balance = totalFreight - advance;
      const weight = filtered.reduce(
        (s, r) =>
          s +
          (Number(
            r.actualWeight ||
              r.chargedWeight ||
              r.loadingWeight ||
              r.quantity ||
              0,
          ) || 0),
        0,
      );
      return [
        { label: "Total Bilties", value: `${filtered.length} LRs` },
        {
          label: "Total Cargo Weight",
          value: `${weight.toLocaleString("en-IN", { maximumFractionDigits: 2 })} MT`,
        },
        {
          label: "Total Freight Billed",
          value: `₹ ${totalFreight.toLocaleString("en-IN")}`,
          highlight: true,
        },
        {
          label: "Advance Collected",
          value: `₹ ${advance.toLocaleString("en-IN")}`,
        },
        {
          label: "Balance to Collect",
          value: `₹ ${balance.toLocaleString("en-IN")}`,
          textClass: "text-amber-400",
        },
      ];
    }

    if (key === "bookings") {
      const totalFreight = filtered.reduce(
        (s, r) =>
          s +
          (Number(r.totalFreight) ||
            Number(
              (r.billingRate || 0) * (r.loadingWeight || r.quantity || 1),
            ) ||
            0),
        0,
      );
      const advance = filtered.reduce(
        (s, r) => s + (Number(r.advanceAmount) || 0),
        0,
      );
      const weight = filtered.reduce(
        (s, r) => s + (Number(r.loadingWeight || r.quantity || r.weight) || 0),
        0,
      );
      return [
        { label: "Total Indents", value: `${filtered.length} Bookings` },
        {
          label: "Cargo Weight",
          value: `${weight.toLocaleString("en-IN", { maximumFractionDigits: 2 })} MT`,
        },
        {
          label: "Total Freight Value",
          value: `₹ ${totalFreight.toLocaleString("en-IN")}`,
          highlight: true,
        },
        {
          label: "Advance Booked",
          value: `₹ ${advance.toLocaleString("en-IN")}`,
        },
      ];
    }

    if (key === "fuels") {
      const totalLiters = filtered.reduce(
        (s, r) => s + (Number(r.liters) || 0),
        0,
      );
      const totalCost = filtered.reduce(
        (s, r) => s + (Number(r.totalAmount) || 0),
        0,
      );
      const avgRate =
        totalLiters > 0 ? (totalCost / totalLiters).toFixed(2) : "0";
      return [
        { label: "Diesel Slips", value: `${filtered.length} Slips` },
        {
          label: "Total Diesel Dispensed",
          value: `${totalLiters.toLocaleString("en-IN")} Ltrs`,
          highlight: true,
        },
        {
          label: "Total Diesel Expenditure",
          value: `₹ ${totalCost.toLocaleString("en-IN")}`,
        },
        { label: "Average Diesel Price", value: `₹ ${avgRate} / Ltr` },
      ];
    }

    if (key === "customer-invoices") {
      const totalInv = filtered.reduce(
        (s, r) => s + (Number(r.totalAmount) || 0),
        0,
      );
      const paid = filtered.reduce(
        (s, r) => s + (Number(r.paidAmount) || 0),
        0,
      );
      const balance = filtered.reduce(
        (s, r) => s + (Number(r.balanceAmount) || 0),
        0,
      );
      return [
        { label: "Total Invoices", value: `${filtered.length} Invoices` },
        {
          label: "Gross Billed Amount",
          value: `₹ ${totalInv.toLocaleString("en-IN")}`,
          highlight: true,
        },
        {
          label: "Received to Date",
          value: `₹ ${paid.toLocaleString("en-IN")}`,
          textClass: "text-emerald-400",
        },
        {
          label: "Outstanding Freight Due",
          value: `₹ ${balance.toLocaleString("en-IN")}`,
          textClass: "text-amber-400",
        },
      ];
    }

    if (key === "customer-payments" || key === "vendor-payments") {
      const totalPaid = filtered.reduce(
        (s, r) => s + (Number(r.amount) || Number(r.paidAmount) || 0),
        0,
      );
      return [
        { label: "Payment Vouchers", value: `${filtered.length} Vouchers` },
        {
          label: "Total Amount Settled",
          value: `₹ ${totalPaid.toLocaleString("en-IN")}`,
          highlight: true,
        },
      ];
    }

    if (key === "vendor-bills") {
      const totalBill = filtered.reduce(
        (s, r) => s + (Number(r.totalAmount) || 0),
        0,
      );
      const paid = filtered.reduce(
        (s, r) => s + (Number(r.paidAmount) || 0),
        0,
      );
      const balance = filtered.reduce(
        (s, r) => s + (Number(r.balanceAmount) || 0),
        0,
      );
      return [
        { label: "Hired Truck Bills", value: `${filtered.length} Bills` },
        {
          label: "Total Transporter Billed",
          value: `₹ ${totalBill.toLocaleString("en-IN")}`,
          highlight: true,
        },
        {
          label: "Paid to Transporter",
          value: `₹ ${paid.toLocaleString("en-IN")}`,
        },
        {
          label: "Payable Freight Due",
          value: `₹ ${balance.toLocaleString("en-IN")}`,
          textClass: "text-red-400",
        },
      ];
    }

    if (key === "expenses") {
      const totalExp = filtered.reduce(
        (s, r) => s + (Number(r.amount) || 0),
        0,
      );
      return [
        { label: "Expense Slips", value: `${filtered.length} Vouchers` },
        {
          label: "Total Operational Expense",
          value: `₹ ${totalExp.toLocaleString("en-IN")}`,
          highlight: true,
        },
      ];
    }

    if (key === "employees") {
      const drivers = filtered.filter(
        (r) => String(r.employeeType).toLowerCase() === "driver",
      ).length;
      const staff = filtered.length - drivers;
      const basicTotal = filtered.reduce(
        (s, r) => s + (Number(r.basicSalary) || 0),
        0,
      );
      return [
        { label: "Filtered Crew", value: `${filtered.length} Personnel` },
        {
          label: "Commercial Drivers (HMV)",
          value: `${drivers} Drivers`,
          highlight: true,
        },
        { label: "Depot & Workshop Crew", value: `${staff} Members` },
        {
          label: "Base Monthly Liability",
          value: `₹ ${basicTotal.toLocaleString("en-IN")}`,
          textClass: "text-emerald-400",
        },
      ];
    }

    if (key === "employee-advances") {
      const totalAmount = filtered.reduce(
        (s, r) => s + (Number(r.amount) || 0),
        0,
      );
      const recovered = filtered.reduce(
        (s, r) => s + (Number(r.recoveredAmount) || 0),
        0,
      );
      const outstanding = filtered.reduce(
        (s, r) =>
          s +
          (Number(
            r.outstandingAmount != null
              ? r.outstandingAmount
              : Number(r.amount || 0) - Number(r.recoveredAmount || 0),
          ) || 0),
        0,
      );
      return [
        { label: "Advance Slips", value: `${filtered.length} Vouchers` },
        {
          label: "Total Disbursed Advances",
          value: `₹ ${totalAmount.toLocaleString("en-IN")}`,
          highlight: true,
        },
        {
          label: "Recovered via Payroll",
          value: `₹ ${recovered.toLocaleString("en-IN")}`,
          textClass: "text-emerald-400",
        },
        {
          label: "Pending Dues to Recover",
          value: `₹ ${outstanding.toLocaleString("en-IN")}`,
          textClass: "text-amber-400 font-bold",
        },
      ];
    }

    if (key === "payrolls") {
      const gross = filtered.reduce(
        (s, r) => s + (Number(r.grossSalary) || 0),
        0,
      );
      const ot = filtered.reduce(
        (s, r) => s + (Number(r.overtimeAmount) || 0),
        0,
      );
      const advances = filtered.reduce(
        (s, r) => s + (Number(r.advanceDeduction) || 0),
        0,
      );
      const net = filtered.reduce((s, r) => s + (Number(r.netSalary) || 0), 0);
      return [
        { label: "Total Pay Slips", value: `${filtered.length} Slips` },
        {
          label: "Gross Wage Bill",
          value: `₹ ${gross.toLocaleString("en-IN")}`,
        },
        {
          label: "Driver Batta / OT Total",
          value: `₹ ${ot.toLocaleString("en-IN")}`,
        },
        {
          label: "Advance Deductions",
          value: `₹ ${advances.toLocaleString("en-IN")}`,
          textClass: "text-rose-400",
        },
        {
          label: "Net Payable to Crew",
          value: `₹ ${net.toLocaleString("en-IN")}`,
          highlight: true,
        },
      ];
    }

    if (key === "salary-payments") {
      const totalDisbursed = filtered.reduce(
        (s, r) => s + (Number(r.amount) || 0),
        0,
      );
      return [
        {
          label: "Total Payment Vouchers",
          value: `${filtered.length} Vouchers`,
        },
        {
          label: "Total Disbursed Amount",
          value: `₹ ${totalDisbursed.toLocaleString("en-IN")}`,
          highlight: true,
        },
      ];
    }

    if (key === "vehicles") {
      const active = filtered.filter(
        (r) => String(r.status).toLowerCase() === "active",
      ).length;
      const maintenance = filtered.filter(
        (r) =>
          String(r.status).toLowerCase().includes("maintenance") ||
          String(r.status).toLowerCase().includes("workshop"),
      ).length;
      return [
        {
          label: "Filtered Fleet",
          value: `${filtered.length} Commercial Trucks`,
        },
        {
          label: "Active On Highway",
          value: `${active} Vehicles`,
          textClass: "text-emerald-400",
        },
        {
          label: "In Workshop / Repairs",
          value: `${maintenance} Vehicles`,
          textClass: "text-amber-400",
        },
      ];
    }

    if (key === "parties") {
      const gstCount = filtered.filter((r) => Boolean(r.gstNumber)).length;
      const activeCount = filtered.filter(
        (r) => String(r.status).toLowerCase() === "active",
      ).length;
      return [
        { label: "Filtered Clients", value: `${filtered.length} Parties` },
        {
          label: "GST Registered",
          value: `${gstCount} Verified Accounts`,
          highlight: true,
        },
        {
          label: "Active for LR Issuance",
          value: `${activeCount} Accounts`,
          textClass: "text-emerald-400",
        },
      ];
    }

    if (key === "vendors") {
      const gstCount = filtered.filter((r) => Boolean(r.gstNumber)).length;
      const activeCount = filtered.filter(
        (r) => String(r.status).toLowerCase() === "active",
      ).length;
      return [
        {
          label: "Filtered Transporters",
          value: `${filtered.length} Partners`,
        },
        {
          label: "GST Registered",
          value: `${gstCount} Vendors`,
          highlight: true,
        },
        {
          label: "Active for Fleet Hire",
          value: `${activeCount} Transporters`,
          textClass: "text-emerald-400",
        },
      ];
    }

    if (key === "cities") {
      const activeCount = filtered.filter(
        (r) => String(r.status).toLowerCase() === "active",
      ).length;
      return [
        { label: "Transit Stations", value: `${filtered.length} Stations` },
        {
          label: "Operational Hubs",
          value: `${activeCount} Hubs`,
          highlight: true,
        },
      ];
    }

    if (key === "products") {
      const activeCount = filtered.filter(
        (r) => String(r.status).toLowerCase() === "active",
      ).length;
      return [
        { label: "Cargo Classes", value: `${filtered.length} Commodities` },
        {
          label: "Active Commodities",
          value: `${activeCount} Permitted`,
          highlight: true,
        },
      ];
    }

    if (key === "consignors") {
      const gstCount = filtered.filter((r) => Boolean(r.gstNumber)).length;
      return [
        { label: "Filtered Shippers", value: `${filtered.length} Consignors` },
        {
          label: "GST Verified",
          value: `${gstCount} Shippers`,
          highlight: true,
        },
      ];
    }

    if (key === "consignees") {
      const gstCount = filtered.filter((r) => Boolean(r.gstNumber)).length;
      return [
        { label: "Delivery Points", value: `${filtered.length} Consignees` },
        {
          label: "GST Verified",
          value: `${gstCount} Receivers`,
          highlight: true,
        },
      ];
    }

    if (key === "users") {
      const adminCount = filtered.filter(
        (r) => r.role === "super_admin" || r.role === "admin",
      ).length;
      const dispatchCount = filtered.filter((r) => r.role === "manager").length;
      return [
        { label: "Filtered Crew", value: `${filtered.length} Operators` },
        {
          label: "Central Fleet Command",
          value: `${adminCount} Admins`,
          highlight: true,
        },
        {
          label: "Highway Dispatchers",
          value: `${dispatchCount} Officers`,
          textClass: "text-indigo-400",
        },
      ];
    }

    if (key === "companies") {
      const activeCount = filtered.filter(
        (r) => String(r.status).toLowerCase() === "active",
      ).length;
      return [
        { label: "Transport Entities", value: `${filtered.length} Companies` },
        {
          label: "Operational Depots",
          value: `${activeCount} Units`,
          highlight: true,
        },
      ];
    }

    return null;
  }, [filtered, resource.key]);

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-lg bg-amber-500/10 text-amber-600">
              <LucideIcons.Truck className="h-3.5 w-3.5" />
            </span>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">
              {transportSubtitles[resource.key] ||
                `Transport Operations • ${activeCompany?.name || "Operating Company"}`}
            </p>
          </div>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">
            {resource.title}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {filtered.length} total operational records in registry ·{" "}
            {activeCompany?.city
              ? `${activeCompany.city} Central Dispatch Hub`
              : "Central Dispatch Hub"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {resource.key === "payrolls" && canCreate && (
            <Button
              onClick={() => openForm()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-xs flex items-center gap-1.5"
            >
              <LucideIcons.Zap className="h-4 w-4" />
              Quick Auto-Payroll
            </Button>
          )}
          {canCreate && (
            <Button
              onClick={() => openForm()}
              className="bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black hover:from-amber-400 hover:to-amber-500 shadow-sm shadow-amber-500/20"
            >
              <Plus className="h-4 w-4 stroke-[3]" />
              Add {resource.singular}
            </Button>
          )}
          <Button variant="secondary" onClick={exportToExcel}>
            <Download className="h-4 w-4" />
            Export Excel
          </Button>
          <Button variant="secondary" onClick={load}>
            <RefreshCcw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>
      {/* Dynamic Operational KPI Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kpiData.map((item, idx) => {
          const Icon = item.icon || LucideIcons.Layers;
          return (
            <div
              key={idx}
              className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  {item.label}
                </span>
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-slate-100 text-slate-700">
                  <Icon className="h-3.5 w-3.5" />
                </span>
              </div>
              <p
                className={`mt-1 font-mono text-xl sm:text-2xl font-black truncate ${item.color || "text-slate-900"}`}
              >
                {item.value}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500 truncate">
                {item.sub}
              </p>
            </div>
          );
        })}
      </div>
      {/* Setup & Admin Transport Logistics Master Notice Banner */}
      {[
        "parties",
        "vendors",
        "products",
        "cities",
        "consignors",
        "consignees",
        "users",
        "companies",
      ].includes(resource.key) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-4 text-xs text-slate-800">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-500 text-slate-950 font-black shadow-xs">
              <LucideIcons.ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="font-black text-slate-950 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <span>
                  {activeCompany?.name || "Operating Company"} • Master
                  Configuration
                </span>
                <span className="rounded bg-amber-200/90 px-1.5 py-0.2 text-[9px] font-bold text-amber-900">
                  VERIFIED MASTER
                </span>
              </p>
              <p className="mt-0.5 text-slate-600 text-[11px] leading-relaxed">
                {resource.key === "parties" &&
                  "Commercial Client Master is integrated with Bilty (LR), e-Way Bill pickup, GST Invoicing, and Ledger receivables."}
                {resource.key === "vendors" &&
                  "Transporter & Hired Fleet Master records attached trucks, market brokerage vendors, and freight hire payables."}
                {resource.key === "products" &&
                  "Commodity Master standardizes industrial freight items, HSN tax classifications, and packaging units (MT, Bags, Barrels)."}
                {resource.key === "cities" &&
                  "Highway Transit Stations & Corridors govern dispatch routes, toll points, checkposts, and origin-to-destination delivery hubs."}
                {resource.key === "consignors" &&
                  "Consignor Master manages verified goods loading points and shipping consignor entities with GST compliance."}
                {resource.key === "consignees" &&
                  "Consignee Master tracks delivery unloading points, destination godowns, and Proof of Delivery (POD) clearance."}
                {resource.key === "users" &&
                  "TMS Operator Directory manages Role-Based Access Control (RBAC) for Central Command, Dispatchers, and Accounts officers."}
                {resource.key === "companies" &&
                  "Multi-tenant Company & Branch Master defines legal operating transport entities, GSTIN registrations, and central depot hubs."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href="/settings"
              className="inline-flex items-center gap-1 rounded-xl border border-amber-300 bg-white px-3 py-1.5 font-bold text-amber-900 hover:bg-amber-50 transition shadow-2xs"
            >
              <LucideIcons.SlidersHorizontal className="h-3.5 w-3.5 text-amber-600" />
              <span>Depot Settings</span>
            </a>
          </div>
        </div>
      )}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        {/* Special Company-Wise Tabs for Super Admin in Users Resource */}
        {resource.key === "users" && role === "super_admin" && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200/90 mb-3 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-amber-500/15 text-amber-800">
                <LucideIcons.Building2 className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-800">
                  Company View
                </p>
                <p className="text-[10px] text-slate-500">
                  Filter operators by transport company or overall master
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none]">
              {/* All Companies Button */}
              <button
                type="button"
                onClick={() => setFilter("companyId", "")}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all border cursor-pointer ${
                  !filters.companyId || filters.companyId === "all"
                    ? "bg-slate-900 border-slate-900 text-white shadow-xs"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:border-slate-300"
                }`}
              >
                <LucideIcons.Layers className="h-3.5 w-3.5" />
                <span>All Companies (Overall)</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                    !filters.companyId || filters.companyId === "all"
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {rows.length}
                </span>
              </button>

              {/* Dynamic Company Buttons */}
              {(companyList || []).map((comp) => {
                const count = rows.filter((r) => {
                  const compId =
                    typeof r.companyId === "object"
                      ? r.companyId?._id
                      : r.companyId;
                  return String(compId || "") === String(comp._id);
                }).length;
                const active = filters.companyId === comp._id;
                const isCurrentActive = activeCompany?._id === comp._id;
                return (
                  <button
                    key={comp._id}
                    type="button"
                    onClick={() =>
                      setFilter("companyId", active ? "" : comp._id)
                    }
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all border cursor-pointer ${
                      active
                        ? "bg-amber-600 border-amber-700 text-white shadow-xs ring-2 ring-amber-500/20"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-amber-50/60 hover:border-amber-300"
                    }`}
                  >
                    <LucideIcons.Building className="h-3.5 w-3.5" />
                    <span>{comp.name}</span>
                    {comp.code && (
                      <span
                        className={`text-[10px] uppercase font-black px-1 rounded ${
                          active
                            ? "bg-amber-800 text-amber-100"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {comp.code}
                      </span>
                    )}
                    {isCurrentActive && (
                      <span
                        className={`text-[9px] px-1 py-0.2 rounded font-black uppercase tracking-wider ${
                          active
                            ? "bg-amber-800 text-amber-100"
                            : "bg-emerald-100 text-emerald-800 border border-emerald-300/60"
                        }`}
                      >
                        Active Context
                      </span>
                    )}
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                        active
                          ? "bg-white text-amber-900"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}

              {/* Platform Super Admins Button */}
              <button
                type="button"
                onClick={() =>
                  setFilter(
                    "companyId",
                    filters.companyId === "platform" ? "" : "platform",
                  )
                }
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all border cursor-pointer ${
                  filters.companyId === "platform"
                    ? "bg-indigo-600 border-indigo-700 text-white shadow-xs"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:border-slate-300"
                }`}
              >
                <LucideIcons.ShieldCheck className="h-3.5 w-3.5 text-indigo-500" />
                <span>Platform Fleet Command</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                    filters.companyId === "platform"
                      ? "bg-white text-indigo-900"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {
                    rows.filter((r) => {
                      const compId =
                        typeof r.companyId === "object"
                          ? r.companyId?._id
                          : r.companyId;
                      return !compId;
                    }).length
                  }
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Special Role Category Filters for Users */}
        {resource.key === "users" && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
            {[
              { label: "All TMS Operators", value: "" },
              {
                label: "Fleet Command (Admins)",
                value: "super_admin",
                icon: LucideIcons.ShieldCheck,
              },
              {
                label: "Fleet Admins",
                value: "admin",
                icon: LucideIcons.Shield,
              },
              {
                label: "Highway Dispatchers",
                value: "manager",
                icon: LucideIcons.Route,
              },
              {
                label: "Freight Accounts",
                value: "accountant",
                icon: LucideIcons.Calculator,
              },
              {
                label: "Commercial Drivers",
                value: "driver",
                icon: LucideIcons.Truck,
              },
            ].map((cat) => {
              const active = (filters.role || "") === cat.value;
              const Icon = cat.icon;
              const baseRows = rows.filter((r) => {
                if (!filters.companyId || filters.companyId === "all")
                  return true;
                const rCompId =
                  typeof r.companyId === "object"
                    ? r.companyId?._id
                    : r.companyId;
                if (filters.companyId === "platform") return !rCompId;
                return String(rCompId || "") === String(filters.companyId);
              });
              const count = cat.value
                ? baseRows.filter(
                    (r) => String(r.role).toLowerCase() === cat.value,
                  ).length
                : baseRows.length;
              return (
                <button
                  key={cat.value}
                  onClick={() => setFilter("role", active ? "" : cat.value)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-all whitespace-nowrap border cursor-pointer ${
                    active
                      ? "bg-indigo-600 border-indigo-700 text-white shadow-xs"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {Icon && <Icon className="h-3.5 w-3.5" />}
                  <span>{cat.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                      active
                        ? "bg-white text-indigo-900"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Special Transport Role Category Filters for Employees */}
        {resource.key === "employees" && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
            {[
              { label: "All Fleet Personnel", value: "" },
              {
                label: "Commercial Drivers (HMV)",
                value: "driver",
                icon: LucideIcons.Truck,
              },
              {
                label: "Workshop Mechanics",
                value: "mechanic",
                icon: LucideIcons.Wrench,
              },
              {
                label: "Depot & Office Staff",
                value: "office_staff",
                icon: LucideIcons.Building2,
              },
              {
                label: "Branch Managers",
                value: "manager",
                icon: LucideIcons.ShieldCheck,
              },
              {
                label: "Freight Accounts",
                value: "accountant",
                icon: LucideIcons.Calculator,
              },
            ].map((cat) => {
              const active = (filters.employeeType || "") === cat.value;
              const Icon = cat.icon;
              const count = cat.value
                ? rows.filter(
                    (r) =>
                      String(r.employeeType).toLowerCase() === cat.value ||
                      (cat.value === "mechanic" &&
                        String(r.designation || "")
                          .toLowerCase()
                          .includes("mechanic")),
                  ).length
                : rows.length;
              return (
                <button
                  key={cat.value}
                  onClick={() =>
                    setFilter("employeeType", active ? "" : cat.value)
                  }
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-all whitespace-nowrap border ${
                    active
                      ? "bg-indigo-600 border-indigo-700 text-white shadow-xs"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {Icon && <Icon className="h-3.5 w-3.5" />}
                  <span>{cat.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                      active
                        ? "bg-white text-indigo-900"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Quick Status Filter Pills */}
        {statusField &&
          (statusField.options?.length > 0 ||
            Object.keys(statusCounts).length > 0) && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
              <button
                onClick={() => setFilter(statusField.name, "")}
                className={`rounded-full px-3 py-1 text-xs font-bold transition-all whitespace-nowrap ${
                  !filters[statusField.name]
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                All Records ({rows.length})
              </button>
              {(
                statusField.options ||
                Object.keys(statusCounts).map((k) => ({
                  label: k.replaceAll("_", " "),
                  value: k,
                }))
              ).map((opt) => {
                const active =
                  String(filters[statusField.name] || "").toLowerCase() ===
                  String(opt.value).toLowerCase();
                const count =
                  statusCounts[String(opt.value).toLowerCase()] || 0;
                return (
                  <button
                    key={opt.value}
                    onClick={() =>
                      setFilter(statusField.name, active ? "" : opt.value)
                    }
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-all whitespace-nowrap border ${
                      active
                        ? "bg-amber-500 border-amber-600 text-slate-950 shadow-xs"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <span className="capitalize">{opt.label}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                        active
                          ? "bg-slate-950 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder={`Search ${resource.title.toLowerCase()}...`}
              className="pl-10"
            />
          </div>
          <Button variant="secondary" onClick={() => setShowFilters((v) => !v)}>
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {Object.values(filters).filter(Boolean).length > 0 && (
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-indigo-100 px-1.5 text-[10px] font-black text-indigo-700">
                {Object.values(filters).filter(Boolean).length}
              </span>
            )}
          </Button>
          <Button variant="secondary" onClick={resetFilters}>
            <FilterX className="h-4 w-4" />
            Clear
          </Button>
        </div>

        {showFilters && (
          <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-black text-slate-800">
                  Filter this list
                </p>
                <p className="text-xs text-slate-500">
                  Use as many filters as you need. Search still works above.
                </p>
              </div>
              <button
                onClick={() => setShowFilters(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {(resource.filterKeys || []).map((key) => {
                const field = resource.fields.find((f) => f.name === key);
                return field?.options ? (
                  <div key={key}>
                    <label className="mb-1.5 block text-xs font-bold text-slate-500">
                      {field.label}
                    </label>
                    <Select
                      value={filters[key] || ""}
                      onChange={(e) => setFilter(key, e.target.value)}
                    >
                      <option value="">All {field.label}</option>
                      {field.options.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                ) : null;
              })}

              {resource.dateKey && (
                <>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-500">
                      From date
                    </label>
                    <Input
                      type="date"
                      value={filters.fromDate || ""}
                      onChange={(e) => setFilter("fromDate", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-500">
                      To date
                    </label>
                    <Input
                      type="date"
                      value={filters.toDate || ""}
                      onChange={(e) => setFilter("toDate", e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="grid place-items-center py-28">
            <Spinner />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-24 text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-400">
              <Search />
            </div>
            <h3 className="font-bold text-slate-800">No records found</h3>
            <p className="mt-1 text-sm text-slate-500">
              Try changing the search or filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="bg-[#0b1220] text-slate-200">
                <tr>
                  {visibleFields.map((f) => (
                    <th
                      key={f.name}
                      className="whitespace-nowrap px-4 py-3.5 text-[11px] font-black uppercase tracking-wider text-slate-300"
                    >
                      <button
                        className="inline-flex items-center gap-1.5 hover:text-amber-400 transition"
                        onClick={() =>
                          setSort((s) => ({
                            key: f.name,
                            dir:
                              s.key === f.name && s.dir === "asc"
                                ? "desc"
                                : "asc",
                          }))
                        }
                      >
                        {f.label}
                        <ArrowUpDown className="h-3 w-3 text-slate-500" />
                      </button>
                    </th>
                  ))}
                  <th className="px-4 py-3.5 text-right text-[11px] font-black uppercase tracking-wider text-slate-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pageRows.map((row) => (
                  <tr
                    key={idOf(row)}
                    className="hover:bg-amber-50/30 transition-colors"
                  >
                    {visibleFields.map((f) => (
                      <td
                        key={f.name}
                        className="max-w-[260px] truncate whitespace-nowrap px-4 py-3 text-sm text-slate-700"
                      >
                        {f.name.toLowerCase().includes("status") ||
                        f.name === "paymentStatus" ? (
                          <Badge value={row[f.name]} />
                        ) : (
                          formatValue(
                            row[f.name],
                            f.type,
                            f.name,
                            f,
                            options,
                            row,
                          )
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1 items-center">
                        {resource.rowActions &&
                          resource.rowActions.map((action, idx) => {
                            // Smart completion check: hide active button and show completed badge
                            if (
                              resource.key === "supply-orders" &&
                              action.label === "Create Booking"
                            ) {
                              if (row.status === "cancelled") {
                                return (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 border border-rose-200 mr-2"
                                    title="Supply Order is cancelled"
                                  >
                                    <LucideIcons.Ban className="h-3.5 w-3.5 text-rose-500" />
                                    Cancelled
                                  </span>
                                );
                              }
                              if (
                                row.status === "completed" ||
                                (row.pendingQuantity !== undefined &&
                                  Number(row.pendingQuantity) <= 0)
                              ) {
                                return (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200/80 mr-2"
                                    title="Booking already created for this supply order"
                                  >
                                    <LucideIcons.CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                    Booked
                                  </span>
                                );
                              }
                            }

                            if (
                              resource.key === "do-received" &&
                              action.label === "Create Supply Order"
                            ) {
                              if (row.status === "cancelled") {
                                return (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 border border-rose-200 mr-2"
                                    title="D.O. is cancelled"
                                  >
                                    <LucideIcons.Ban className="h-3.5 w-3.5 text-rose-500" />
                                    Cancelled
                                  </span>
                                );
                              }
                              if (row.status === "converted") {
                                return (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200/80 mr-2"
                                    title="All quantity fulfilled for this D.O."
                                  >
                                    <LucideIcons.CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                    Fulfilled
                                  </span>
                                );
                              }
                            }

                            if (
                              resource.key === "bookings" &&
                              action.label === "Dispatch Trip"
                            ) {
                              if (row.status === "cancelled") {
                                return (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 border border-rose-200 mr-2"
                                    title="Booking is cancelled"
                                  >
                                    <LucideIcons.Ban className="h-3.5 w-3.5 text-rose-500" />
                                    Cancelled
                                  </span>
                                );
                              }
                              if (
                                row.tripId ||
                                row.tripNumber ||
                                row.status === "in_transit" ||
                                row.status === "delivered" ||
                                row.status === "completed"
                              ) {
                                return (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 border border-blue-200/80 mr-2"
                                    title={
                                      row.tripNumber
                                        ? `Assigned to trip ${row.tripNumber}`
                                        : "Trip is already scheduled/dispatched"
                                    }
                                  >
                                    <LucideIcons.Truck className="h-3.5 w-3.5 text-blue-600" />
                                    {row.tripNumber
                                      ? `Trip: ${row.tripNumber}`
                                      : "On Trip"}
                                  </span>
                                );
                              }
                            }

                            if (
                              resource.key === "bookings" &&
                              action.label === "Generate LR"
                            ) {
                              if (
                                row.status === "cancelled" ||
                                row.lrNumber ||
                                row.lrBiltyId
                              ) {
                                return null;
                              }
                            }

                            if (resource.key === "lr-bilties") {
                              if (row.status === "cancelled") {
                                return (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 border border-rose-200 mr-2"
                                    title="LR is cancelled"
                                  >
                                    <LucideIcons.Ban className="h-3.5 w-3.5 text-rose-500" />
                                    Cancelled
                                  </span>
                                );
                              }

                              if (action.label === "Assign to Trip") {
                                if (
                                  row.tripId ||
                                  row.tripNumber ||
                                  row.status === "in_transit" ||
                                  row.status === "delivered" ||
                                  row.status === "completed"
                                ) {
                                  return (
                                    <span
                                      key={idx}
                                      className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 border border-blue-200/80 mr-2"
                                      title={
                                        row.tripNumber
                                          ? `Assigned to trip ${row.tripNumber}`
                                          : "This LR is already assigned to a highway trip"
                                      }
                                    >
                                      <LucideIcons.Truck className="h-3.5 w-3.5 text-blue-600" />
                                      {row.tripNumber
                                        ? `Trip: ${row.tripNumber}`
                                        : "On Trip"}
                                    </span>
                                  );
                                }
                              }

                              if (action.label === "Create Customer Invoice") {
                                // 1. Already invoiced
                                if (
                                  row.invoiceStatus === "invoiced" ||
                                  row.isBilled ||
                                  row.invoiceId
                                ) {
                                  return (
                                    <span
                                      key={idx}
                                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200/80 mr-2"
                                      title={`Customer invoice already issued: ${row.customerInvoiceNumber || ""}`}
                                    >
                                      <LucideIcons.CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                      {row.customerInvoiceNumber
                                        ? `Billed (${row.customerInvoiceNumber})`
                                        : "Invoiced"}
                                    </span>
                                  );
                                }

                                // 2. Check if trip is completed before invoice creation
                                const isCompleted =
                                  row.status === "completed" ||
                                  row.tripStatus === "completed";

                                if (!isCompleted) {
                                  if (
                                    row.status === "delivered" ||
                                    row.tripStatus === "delivered"
                                  ) {
                                    return (
                                      <span
                                        key={idx}
                                        className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800 border border-amber-300 mr-2 shadow-2xs"
                                        title="Cargo delivered. Trip completion / closure required before generating customer invoice."
                                      >
                                        <LucideIcons.Clock className="h-3.5 w-3.5 text-amber-600" />
                                        Awaiting Trip Completion
                                      </span>
                                    );
                                  }

                                  if (
                                    row.status === "in_transit" ||
                                    row.tripStatus === "in_transit" ||
                                    row.tripStatus === "dispatched"
                                  ) {
                                    return (
                                      <span
                                        key={idx}
                                        className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-800 border border-amber-200/80 mr-2"
                                        title="Vehicle is on highway. Unload / Delivery and Trip completion required before billing."
                                      >
                                        <LucideIcons.Clock className="h-3.5 w-3.5 text-amber-600" />
                                        In Transit (Unloading Due)
                                      </span>
                                    );
                                  }

                                  return (
                                    <span
                                      key={idx}
                                      className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-500 border border-slate-200 mr-2"
                                      title="Invoice can only be issued after cargo is delivered & trip is completed."
                                    >
                                      <LucideIcons.Lock className="h-3 w-3 text-slate-400" />
                                      Invoice Locked (Pre-Delivery)
                                    </span>
                                  );
                                }
                              }
                            }

                            const IconComponent =
                              LucideIcons[action.icon] || LucideIcons.Zap;
                            const url = action.hrefTemplate
                              ? action.hrefTemplate.replace(
                                  /\{(\w+)\}/g,
                                  (_, key) => {
                                    let val = row[key];
                                    if (
                                      val &&
                                      typeof val === "object" &&
                                      val._id
                                    )
                                      val = val._id;
                                    return val || "";
                                  },
                                )
                              : "#";

                            const isInvoiceAction =
                              action.label === "Create Customer Invoice";

                            return (
                              <button
                                key={idx}
                                onClick={() => router.push(url)}
                                className={
                                  isInvoiceAction
                                    ? "rounded-lg p-1.5 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 flex items-center gap-1.5 px-3 text-xs font-bold mr-2 shadow-xs transition cursor-pointer"
                                    : "rounded-lg p-2 text-indigo-600 hover:bg-indigo-50 border border-indigo-100 flex items-center gap-1.5 px-3 bg-indigo-50/30 text-xs font-semibold mr-2 transition cursor-pointer"
                                }
                                title={action.label}
                              >
                                <IconComponent className="h-3.5 w-3.5" />
                                {action.label}
                              </button>
                            );
                          })}
                        {resource.key === "lr-bilties" && (
                          <button
                            onClick={() => setPrintBiltyRow(row)}
                            className="rounded-lg p-1.5 text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 flex items-center gap-1.5 px-2.5 text-xs font-bold mr-2 shadow-xs transition cursor-pointer"
                            title="Print Official Lorry Receipt (LR / Bilty)"
                          >
                            <Printer className="h-3.5 w-3.5 text-amber-600" />
                            Print LR
                          </button>
                        )}
                        {resource.key === "bookings" &&
                          (row.lrNumber || row.lrBiltyId) && (
                            <button
                              onClick={() =>
                                setPrintBiltyRow(row.lrBiltyId || row)
                              }
                              className="rounded-lg p-1.5 text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 flex items-center gap-1.5 px-2.5 text-xs font-bold mr-2 shadow-xs transition cursor-pointer"
                              title="Print Associated Lorry Receipt (LR / Bilty)"
                            >
                              <Printer className="h-3.5 w-3.5 text-amber-600" />
                              Print LR
                            </button>
                          )}
                        {resource.key === "bookings" &&
                          row.status === "booked" && (
                            <button
                              onClick={async () => {
                                if (
                                  !window.confirm(
                                    `Cancel booking ${row.bookingNumber}? Allocated quantity will be returned to Supply Order.`,
                                  )
                                )
                                  return;
                                try {
                                  await api.post(
                                    `/bookings/${idOf(row)}/cancel`,
                                  );
                                  toast.success("Booking cancelled");
                                  await load();
                                } catch (e) {
                                  toast.error(
                                    e?.response?.data?.message ||
                                      "Failed to cancel booking",
                                  );
                                }
                              }}
                              className="rounded-lg p-1.5 text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 flex items-center gap-1.5 px-2.5 text-xs font-bold mr-2 shadow-xs transition cursor-pointer"
                              title="Cancel this booking without deleting records"
                            >
                              <LucideIcons.Ban className="h-3.5 w-3.5 text-rose-500" />
                              Cancel
                            </button>
                          )}
                        {resource.key === "customer-invoices" && (
                          <>
                            <button
                              onClick={() => setPrintInvoiceRow(row)}
                              className="rounded-lg p-1.5 text-slate-950 bg-amber-400 hover:bg-amber-300 border border-amber-500 flex items-center gap-1.5 px-2.5 text-xs font-black mr-2 shadow-xs transition cursor-pointer"
                              title="Print or Download Commercial Freight Tax Invoice (Bill)"
                            >
                              <Printer className="h-3.5 w-3.5 text-slate-950" />
                              Print Bill
                            </button>
                            {row.paymentStatus !== "paid" &&
                              row.status !== "cancelled" && (
                                <button
                                  onClick={() => {
                                    const pId =
                                      typeof row.partyId === "object"
                                        ? row.partyId?._id
                                        : row.partyId;
                                    const due = Number(
                                      row.outstandingAmount !== undefined
                                        ? row.outstandingAmount
                                        : row.grandTotal || 0,
                                    );
                                    router.push(
                                      `/customer-payments?autoOpenAdd=true&invoiceId=${idOf(row)}&partyId=${pId || ""}&amount=${due}`,
                                    );
                                  }}
                                  className="rounded-lg p-1.5 text-emerald-950 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 flex items-center gap-1.5 px-2.5 text-xs font-bold mr-2 shadow-xs transition cursor-pointer"
                                  title="Receive and record payment for this invoice in Customer Payments"
                                >
                                  <LucideIcons.CreditCard className="h-3.5 w-3.5 text-emerald-700" />
                                  Receive Payment
                                </button>
                              )}
                          </>
                        )}
                        {resource.key === "customer-payments" && (
                          <button
                            onClick={() => setPrintPaymentRow(row)}
                            className="rounded-lg p-1.5 text-emerald-950 bg-emerald-400 hover:bg-emerald-300 border border-emerald-500 flex items-center gap-1.5 px-2.5 text-xs font-black mr-2 shadow-xs transition cursor-pointer"
                            title="Print Official Money Receipt (Payment Receipt / MR)"
                          >
                            <Printer className="h-3.5 w-3.5 text-emerald-950" />
                            Print Receipt
                          </button>
                        )}
                        {resource.key === "payrolls" && (
                          <button
                            onClick={() => {
                              setPrintSlipRow(row);
                              setPrintSlipType("payroll");
                            }}
                            className="rounded-lg p-1.5 text-indigo-950 bg-indigo-300 hover:bg-indigo-200 border border-indigo-400 flex items-center gap-1.5 px-2.5 text-xs font-black mr-2 shadow-xs transition cursor-pointer"
                            title="Print Driver & Staff Monthly Wage Slip"
                          >
                            <Printer className="h-3.5 w-3.5 text-indigo-950" />
                            Pay Slip
                          </button>
                        )}
                        {resource.key === "payrolls" &&
                          (row.paymentStatus === "unpaid" ||
                            row.paymentStatus === "partial") && (
                            <button
                              onClick={() => {
                                const empId =
                                  typeof row.employeeId === "object"
                                    ? row.employeeId?._id
                                    : row.employeeId;
                                router.push(
                                  `/salary-payments?autoOpenAdd=true&payrollId=${row._id}&employeeId=${empId || ""}&amount=${row.netSalary || ""}`,
                                );
                              }}
                              className="rounded-lg p-1.5 text-emerald-950 bg-emerald-400 hover:bg-emerald-300 border border-emerald-500 flex items-center gap-1.5 px-2.5 text-xs font-black mr-2 shadow-xs transition cursor-pointer"
                              title="Disburse / Record Salary Payment Voucher"
                            >
                              <LucideIcons.CreditCard className="h-3.5 w-3.5 text-emerald-950" />
                              Record Payment
                            </button>
                          )}
                        {resource.key === "employee-advances" && (
                          <button
                            onClick={() => {
                              setPrintSlipRow(row);
                              setPrintSlipType("advance");
                            }}
                            className="rounded-lg p-1.5 text-amber-950 bg-amber-400 hover:bg-amber-300 border border-amber-500 flex items-center gap-1.5 px-2.5 text-xs font-black mr-2 shadow-xs transition cursor-pointer"
                            title="Print Employee Advance Voucher"
                          >
                            <Printer className="h-3.5 w-3.5 text-amber-950" />
                            Advance Voucher
                          </button>
                        )}
                        {resource.key === "employee-advances" &&
                          (row.status === "pending" ||
                            row.status === "partial") && (
                            <button
                              onClick={() => {
                                const empId =
                                  typeof row.employeeId === "object"
                                    ? row.employeeId?._id
                                    : row.employeeId;
                                const advAmt =
                                  row.outstandingAmount !== undefined
                                    ? row.outstandingAmount
                                    : row.amount;
                                router.push(
                                  `/payrolls?autoOpenAdd=true&employeeId=${empId || ""}&advanceDeduction=${advAmt || ""}`,
                                );
                              }}
                              className="rounded-lg p-1.5 text-emerald-950 bg-emerald-400 hover:bg-emerald-300 border border-emerald-500 flex items-center gap-1.5 px-2.5 text-xs font-black mr-2 shadow-xs transition cursor-pointer"
                              title="Auto-create payroll & recover this advance"
                            >
                              <LucideIcons.Zap className="h-3.5 w-3.5 text-emerald-950" />
                              Process in Payroll
                            </button>
                          )}
                        {resource.key === "salary-payments" && (
                          <button
                            onClick={() => {
                              setPrintSlipRow(row);
                              setPrintSlipType("salary-payment");
                            }}
                            className="rounded-lg p-1.5 text-emerald-950 bg-emerald-400 hover:bg-emerald-300 border border-emerald-500 flex items-center gap-1.5 px-2.5 text-xs font-black mr-2 shadow-xs transition cursor-pointer"
                            title="Print Official Salary Payment Disbursement Voucher"
                          >
                            <Printer className="h-3.5 w-3.5 text-emerald-950" />
                            Payment Slip
                          </button>
                        )}

                        {/* ONE-CLICK ACTION: Container Detentions - Mark Returned & Extend Free Days */}
                        {resource.key === "container-detentions" && !row.emptyReturnDate && (
                          <div className="flex items-center gap-1.5 mr-2">
                            <button
                              onClick={async () => {
                                try {
                                  const res = await api.put(`/container-detentions/${row._id}`, {
                                    emptyReturnDate: new Date().toISOString(),
                                  });
                                  if (res.data?.success) {
                                    toast.success(`Container ${row.containerNumber} marked returned! Free days & detention calculated.`);
                                    load();
                                  }
                                } catch (err) {
                                  toast.error(err.response?.data?.message || "Failed to update return date");
                                }
                              }}
                              className="rounded-lg p-1.5 text-emerald-950 bg-emerald-400 hover:bg-emerald-300 border border-emerald-500 flex items-center gap-1 px-2 text-xs font-black shadow-xs transition cursor-pointer"
                              title="1-Click: Mark Container returned to depot today"
                            >
                              <LucideIcons.CheckCheck className="h-3.5 w-3.5" />
                              Mark Returned
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  const nextDays = Number(row.freeDays || 14) + 7;
                                  const res = await api.put(`/container-detentions/${row._id}`, {
                                    freeDays: nextDays,
                                  });
                                  if (res.data?.success) {
                                    toast.success(`Free time extended to ${nextDays} days!`);
                                    load();
                                  }
                                } catch (err) {
                                  toast.error(err.response?.data?.message || "Failed to extend free time");
                                }
                              }}
                              className="rounded-lg p-1.5 text-blue-950 bg-blue-100 hover:bg-blue-200 border border-blue-300 flex items-center gap-1 px-2 text-xs font-bold shadow-xs transition cursor-pointer"
                              title="1-Click: Extend Shipping Line Free Days by +7 Days"
                            >
                              <LucideIcons.CalendarPlus className="h-3.5 w-3.5 text-blue-700" />
                              +7 Days
                            </button>
                          </div>
                        )}

                        {/* ONE-CLICK ACTION: Workshop Job Cards - Issue Gate Pass & Release */}
                        {resource.key === "job-cards" && (
                          <div className="flex items-center gap-1.5 mr-2">
                            {row.workflowStage !== "ready_gate_pass" && row.workflowStage !== "delivered_closed" && (
                              <button
                                onClick={async () => {
                                  try {
                                    const res = await api.put(`/job-cards/${row._id}`, {
                                      workflowStage: "ready_gate_pass",
                                    });
                                    if (res.data?.success) {
                                      toast.success(`Gate Pass ${res.data.data?.gatePassNumber || ""} generated! Vehicle cleared for exit.`);
                                      load();
                                    }
                                  } catch (err) {
                                    toast.error(err.response?.data?.message || "Failed to generate gate pass");
                                  }
                                }}
                                className="rounded-lg p-1.5 text-amber-950 bg-amber-400 hover:bg-amber-300 border border-amber-500 flex items-center gap-1 px-2.5 text-xs font-black shadow-xs transition cursor-pointer"
                                title="1-Click: Complete repairs & generate outward Gate Pass"
                              >
                                <LucideIcons.TicketCheck className="h-3.5 w-3.5" />
                                Issue Gate Pass
                              </button>
                            )}
                            {row.workflowStage === "ready_gate_pass" && (
                              <button
                                onClick={async () => {
                                  try {
                                    const res = await api.put(`/job-cards/${row._id}`, {
                                      workflowStage: "delivered_closed",
                                    });
                                    if (res.data?.success) {
                                      toast.success("Job Card closed & vehicle released back to active highway service!");
                                      load();
                                    }
                                  } catch (err) {
                                    toast.error(err.response?.data?.message || "Failed to close job card");
                                  }
                                }}
                                className="rounded-lg p-1.5 text-emerald-950 bg-emerald-400 hover:bg-emerald-300 border border-emerald-500 flex items-center gap-1 px-2.5 text-xs font-black shadow-xs transition cursor-pointer"
                                title="1-Click: Mark vehicle delivered & close job card"
                              >
                                <LucideIcons.CheckCircle2 className="h-3.5 w-3.5" />
                                Release & Close
                              </button>
                            )}
                          </div>
                        )}

                        {/* ONE-CLICK ACTION: Preventive Maintenance - Direct Job Card Creation */}
                        {resource.key === "preventive-schedules" && (
                          <button
                            onClick={() => {
                              router.push(
                                `/job-cards?autoOpenAdd=true&jobCardType=routine_service&complaints=${encodeURIComponent(row.ruleName + " - Scheduled PM Service")}`
                              );
                            }}
                            className="rounded-lg p-1.5 text-indigo-950 bg-indigo-100 hover:bg-indigo-200 border border-indigo-300 flex items-center gap-1.5 px-2.5 text-xs font-black mr-2 shadow-xs transition cursor-pointer"
                            title="1-Click: Open new Workshop Job Card for this maintenance rule"
                          >
                            <LucideIcons.Wrench className="h-3.5 w-3.5 text-indigo-700" />
                            Create Job Card
                          </button>
                        )}

                        {/* ONE-CLICK ACTION: Driver Trip Settlements - Quick Approval */}
                        {resource.key === "driver-trip-settlements" && row.approvalStatus !== "approved" && (
                          <button
                            onClick={async () => {
                              try {
                                const res = await api.put(`/driver-trip-settlements/${row._id}`, {
                                  approvalStatus: "approved",
                                });
                                if (res.data?.success) {
                                  toast.success(`Settlement voucher ${row.voucherNumber || ""} approved!`);
                                  load();
                                }
                              } catch (err) {
                                toast.error(err.response?.data?.message || "Failed to approve settlement");
                              }
                            }}
                            className="rounded-lg p-1.5 text-emerald-950 bg-emerald-400 hover:bg-emerald-300 border border-emerald-500 flex items-center gap-1 px-2.5 text-xs font-black mr-2 shadow-xs transition cursor-pointer"
                            title="1-Click: Approve driver settlement voucher"
                          >
                            <LucideIcons.CheckCheck className="h-3.5 w-3.5" />
                            Approve
                          </button>
                        )}

                        {/* ONE-CLICK ACTION: Trips - Mark Delivered or Settle Advance */}
                        {resource.key === "trips" && (
                          <div className="flex items-center gap-1.5 mr-2">
                            {(row.status === "in_transit" || row.status === "dispatched") && (
                              <button
                                onClick={async () => {
                                  try {
                                    const res = await api.put(`/trips/${row._id}`, {
                                      status: "delivered",
                                      unloadingDate: new Date().toISOString(),
                                    });
                                    if (res.data?.success) {
                                      toast.success(`Trip ${row.tripNumber} marked as Delivered!`);
                                      load();
                                    }
                                  } catch (err) {
                                    toast.error(err.response?.data?.message || "Failed to update trip status");
                                  }
                                }}
                                className="rounded-lg p-1.5 text-emerald-950 bg-emerald-400 hover:bg-emerald-300 border border-emerald-500 flex items-center gap-1 px-2 text-xs font-black shadow-xs transition cursor-pointer"
                                title="1-Click: Mark trip as safely delivered at destination"
                              >
                                <LucideIcons.CheckCheck className="h-3.5 w-3.5" />
                                Mark Delivered
                              </button>
                            )}
                            {row.status === "delivered" && (
                              <button
                                onClick={() => {
                                  const vId = typeof row.vehicleId === "object" ? row.vehicleId?._id : row.vehicleId;
                                  const dId = typeof row.driverId === "object" ? row.driverId?._id : row.driverId;
                                  router.push(
                                    `/driver-trip-settlements?autoOpenAdd=true&tripId=${row._id}&vehicleId=${vId || ""}&driverId=${dId || ""}`
                                  );
                                }}
                                className="rounded-lg p-1.5 text-amber-950 bg-amber-400 hover:bg-amber-300 border border-amber-500 flex items-center gap-1 px-2 text-xs font-black shadow-xs transition cursor-pointer"
                                title="1-Click: Create Driver Trip Settlement voucher"
                              >
                                <LucideIcons.Receipt className="h-3.5 w-3.5" />
                                Settle Advance
                              </button>
                            )}
                          </div>
                        )}

                        {/* ONE-CLICK ACTION: Customer Invoices - Collect Payment */}
                        {resource.key === "customer-invoices" && row.paymentStatus !== "paid" && (
                          <button
                            onClick={() => {
                              const pId = typeof row.partyId === "object" ? row.partyId?._id : row.partyId;
                              const amt = row.outstandingAmount || row.balanceAmount || "";
                              router.push(
                                `/customer-payments?autoOpenAdd=true&invoiceId=${row._id}&partyId=${pId || ""}&amount=${amt}`
                              );
                            }}
                            className="rounded-lg p-1.5 text-emerald-950 bg-emerald-400 hover:bg-emerald-300 border border-emerald-500 flex items-center gap-1 px-2.5 text-xs font-black mr-2 shadow-xs transition cursor-pointer"
                            title="1-Click: Record customer payment for this invoice"
                          >
                            <LucideIcons.CreditCard className="h-3.5 w-3.5" />
                            Receive Payment
                          </button>
                        )}

                        {/* ONE-CLICK ACTION: Vendor Bills - Pay Vendor */}
                        {resource.key === "vendor-bills" && row.paymentStatus !== "paid" && (
                          <button
                            onClick={() => {
                              const vId = typeof row.vendorId === "object" ? row.vendorId?._id : row.vendorId;
                              const amt = row.outstandingAmount || "";
                              router.push(
                                `/vendor-payments?autoOpenAdd=true&vendorBillId=${row._id}&vendorId=${vId || ""}&amount=${amt}`
                              );
                            }}
                            className="rounded-lg p-1.5 text-indigo-950 bg-indigo-100 hover:bg-indigo-200 border border-indigo-300 flex items-center gap-1 px-2.5 text-xs font-black mr-2 shadow-xs transition cursor-pointer"
                            title="1-Click: Record vendor payment for this bill"
                          >
                            <LucideIcons.Coins className="h-3.5 w-3.5" />
                            Pay Vendor
                          </button>
                        )}

                        <button
                          onClick={() => setViewing(row)}
                          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {canEdit && row.role !== "super_admin" && (
                          <button
                            onClick={() => openForm(row)}
                            className="rounded-lg p-2 text-indigo-600 hover:bg-indigo-50"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                        {canDelete && row.role !== "super_admin" && (
                          <button
                            onClick={() => remove(row)}
                            className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {tableSummary && tableSummary.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-slate-800 bg-[#0b1220] px-5 py-3 text-xs text-slate-300">
            <div className="flex items-center gap-1.5 text-amber-400 font-black uppercase tracking-wider text-[11px]">
              <LucideIcons.Calculator className="h-3.5 w-3.5" />
              <span>Table Tally & Totals:</span>
            </div>
            {tableSummary.map((item, idx) => (
              <div key={idx} className="flex items-center gap-1.5 font-medium">
                <span className="text-slate-400">{item.label}:</span>
                <span
                  className={`font-mono font-black ${item.highlight ? "text-amber-400 font-bold" : item.textClass || "text-white"}`}
                >
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-col gap-4 border-t border-slate-100 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Showing{" "}
            <span className="font-semibold text-slate-900">
              {filtered.length ? (page - 1) * pageSize + 1 : 0}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-slate-900">
              {Math.min(page * pageSize, filtered.length)}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-slate-900">
              {filtered.length}
            </span>{" "}
            records
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="h-8 rounded-lg border border-slate-200 bg-white px-2 py-0 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 disabled:pointer-events-none disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="flex h-8 items-center justify-center px-2 text-sm font-semibold text-slate-700">
                {page} / {totalPages}
              </div>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 disabled:pointer-events-none disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
      {show && (
        <FormModal
          resource={resource}
          row={editing}
          options={options}
          onClose={() => {
            setShow(false);
            setEditing(null);
          }}
          onSave={save}
          saving={saving}
        />
      )}{" "}
      {viewing && (
        <ViewModal
          resource={resource}
          row={viewing}
          onClose={() => setViewing(null)}
          onPrintBilty={(r) => {
            setViewing(null);
            setPrintBiltyRow(r);
          }}
          onPrintInvoice={(r) => {
            setViewing(null);
            setPrintInvoiceRow(r);
          }}
          onPrintPayment={(r) => {
            setViewing(null);
            setPrintPaymentRow(r);
          }}
          onPrintSlip={(r, type) => {
            setViewing(null);
            setPrintSlipRow(r);
            setPrintSlipType(type);
          }}
        />
      )}
      {printBiltyRow && (
        <BiltyPrintModal
          biltyData={printBiltyRow}
          lrId={idOf(printBiltyRow)}
          onClose={() => setPrintBiltyRow(null)}
        />
      )}
      {printInvoiceRow && (
        <InvoicePrintModal
          invoiceData={printInvoiceRow}
          invoiceId={idOf(printInvoiceRow)}
          onClose={() => setPrintInvoiceRow(null)}
        />
      )}
      {printPaymentRow && (
        <PaymentReceiptModal
          paymentData={printPaymentRow}
          paymentId={idOf(printPaymentRow)}
          onClose={() => setPrintPaymentRow(null)}
        />
      )}
      {printSlipRow && (
        <SalarySlipPrintModal
          record={printSlipRow}
          type={printSlipType}
          onClose={() => setPrintSlipRow(null)}
        />
      )}
    </div>
  );
}

function FormModal({ resource, row, options, onClose, onSave, saving }) {
  const router = useRouter();
  const [advanceInfo, setAdvanceInfo] = useState(null);
  const [attendanceInfo, setAttendanceInfo] = useState(null);
  const [payrollLoading, setPayrollLoading] = useState(false);

  const [form, setForm] = useState(() =>
    Object.fromEntries(
      resource.fields
        .filter((f) => !f.readOnly && !f.hidden)
        .map((f) => {
          const raw = row?.[f.name];
          let val =
            raw && typeof raw === "object"
              ? raw._id || raw.id || ""
              : (raw ?? "");

          // If creating new record or val is empty, default status to "active"
          if (val === "" || val === undefined || val === null) {
            if (f.defaultValue !== undefined) {
              val = f.defaultValue;
            } else if (f.name === "status") {
              const hasActive = f.options?.some(
                (o) => (typeof o === "object" ? o.value : o) === "active",
              );
              if (hasActive || !f.options) {
                val = resource.key === "payrolls" ? "processed" : "active";
              }
            } else if (
              resource.key === "customer-invoices" &&
              f.name === "paymentStatus"
            ) {
              val = "unpaid";
            } else if (resource.key === "payrolls") {
              if (f.name === "payrollMonth") {
                const now = new Date();
                val = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
              } else if (f.name === "workingDays") {
                val = 30;
              } else if (f.name === "presentDays") {
                val = 30;
              } else if (f.name === "leaveDays") {
                val = 0;
              } else if (f.name === "overtimeAmount") {
                val = 0;
              } else if (f.name === "allowances") {
                val = 0;
              } else if (f.name === "advanceDeduction") {
                val = 0;
              } else if (f.name === "otherDeduction") {
                val = 0;
              } else if (f.name === "paymentStatus") {
                val = "unpaid";
              }
            } else if (resource.key === "maintenances") {
              if (f.name === "maintenanceDate") {
                val = new Date().toISOString().split("T")[0];
              } else if (f.name === "status") {
                val = "completed";
              } else if (
                f.name === "partsCost" ||
                f.name === "labourCost" ||
                f.name === "totalCost"
              ) {
                val = 0;
              } else if (f.name === "paymentMode") {
                val = "cash";
              }
            }
          }
          return [f.name, val];
        }),
    ),
  );
  const change = (name, v) => {
    setForm((x) => {
      const next = { ...x, [name]: v };

      // Smart Auto-fill: when vehicleId changes, auto-select its linked driver if available
      if (name === "vehicleId" && v && options?.vehicles) {
        const foundVeh = options.vehicles.find(
          (veh) => veh._id === v || veh.id === v,
        );
        if (foundVeh?.driverId && !next.driverId) {
          const dId =
            typeof foundVeh.driverId === "object"
              ? foundVeh.driverId._id || foundVeh.driverId.id
              : foundVeh.driverId;
          if (dId) next.driverId = dId;
        }
      }

      // Smart Auto-fill for Maintenances:
      if (resource.key === "maintenances") {
        if (name === "vehicleId" && v && options?.vehicles) {
          const veh = options.vehicles.find(
            (item) => item._id === v || item.id === v,
          );
          if (veh) {
            const currentKm =
              veh.currentOdometer || veh.odometerReading || veh.odometer;
            if (
              currentKm &&
              (!next.odometerReading || Number(next.odometerReading) === 0)
            ) {
              next.odometerReading = currentKm;
            }
          }
        }
        if (name === "partsCost" || name === "labourCost") {
          const parts = Number(name === "partsCost" ? v : next.partsCost || 0);
          const labour = Number(
            name === "labourCost" ? v : next.labourCost || 0,
          );
          next.totalCost = parts + labour;
        }
        if (name === "odometerReading" || name === "serviceType") {
          const curKm = Number(
            name === "odometerReading" ? v : next.odometerReading || 0,
          );
          if (
            curKm > 0 &&
            (!next.nextServiceOdometer ||
              Number(next.nextServiceOdometer) === 0)
          ) {
            next.nextServiceOdometer = curKm + 10000;
          }
          if (!next.nextServiceDate) {
            const d = new Date();
            d.setMonth(d.getMonth() + 3);
            next.nextServiceDate = d.toISOString().split("T")[0];
          }
        }
      }

      // Smart Auto-fill for Customer Payments: when invoiceId changes
      if (
        resource.key === "customer-payments" &&
        name === "invoiceId" &&
        v &&
        options?.["customer-invoices"]
      ) {
        const inv = options["customer-invoices"].find(
          (item) => item._id === v || item.id === v,
        );
        if (inv) {
          const pId =
            typeof inv.partyId === "object" ? inv.partyId?._id : inv.partyId;
          if (pId) next.partyId = pId;
          const due = Number(
            inv.outstandingAmount !== undefined
              ? inv.outstandingAmount
              : inv.grandTotal || 0,
          );
          if (due > 0) next.amount = due;
          if (!next.paymentDate)
            next.paymentDate = new Date().toISOString().split("T")[0];
          if (!next.paymentMode) next.paymentMode = "bank_transfer";
        }
      }

      // Smart Auto-fill for Salary Payments: when payrollId changes
      if (
        resource.key === "salary-payments" &&
        name === "payrollId" &&
        v &&
        options?.payrolls
      ) {
        const p = options.payrolls.find(
          (item) => item._id === v || item.id === v,
        );
        if (p) {
          const eId =
            typeof p.employeeId === "object" ? p.employeeId?._id : p.employeeId;
          if (eId) next.employeeId = eId;
          const net = Number(p.netSalary || 0);
          if (net >= 0 && (!next.amount || Number(next.amount) === 0)) {
            next.amount = net;
          }
          if (!next.paymentDate)
            next.paymentDate = new Date().toISOString().split("T")[0];
          if (!next.paymentMode) next.paymentMode = "cash";
        }
      }

      // Smart Auto-fill for Salary Payments: when employeeId changes
      if (
        resource.key === "salary-payments" &&
        name === "employeeId" &&
        v &&
        options?.payrolls &&
        !next.payrollId
      ) {
        const foundPayroll = options.payrolls.find((p) => {
          const eId =
            typeof p.employeeId === "object" ? p.employeeId?._id : p.employeeId;
          return eId === v;
        });
        if (foundPayroll) {
          next.payrollId = foundPayroll._id || foundPayroll.id;
          const net = Number(foundPayroll.netSalary || 0);
          if (net >= 0 && (!next.amount || Number(next.amount) === 0)) {
            next.amount = net;
          }
          if (!next.paymentDate)
            next.paymentDate = new Date().toISOString().split("T")[0];
          if (!next.paymentMode) next.paymentMode = "cash";
        }
      }

      // Smart Auto-fill for Customer Invoices: when bookingId changes
      if (
        resource.key === "customer-invoices" &&
        name === "bookingId" &&
        v &&
        options?.bookings
      ) {
        const b = options.bookings.find(
          (item) => item._id === v || item.id === v,
        );
        if (b) {
          const pId =
            typeof b.billingPartyId === "object"
              ? b.billingPartyId?._id
              : b.billingPartyId || b.partyId;
          if (pId) next.partyId = pId;

          const lrId =
            typeof b.lrBiltyId === "object" ? b.lrBiltyId?._id : b.lrBiltyId;
          if (lrId) next.lrBiltyId = lrId;

          const rate = Number(b.billingRate || b.rate || 0);
          if (rate) next.freightRate = rate;

          const qty = Number(b.quantity || 0);
          if (qty) next.quantity = qty;

          if (b.unit) next.unit = b.unit;

          const effectiveRate = next.freightRate || rate || 0;
          const effectiveQty = next.quantity || qty || 0;
          const freightAmt = effectiveRate * effectiveQty;
          next.freightAmount = freightAmt;

          const taxable =
            freightAmt +
            Number(next.hammali || 0) +
            Number(next.detention || 0) +
            Number(next.otherCharges || 0);
          next.taxableAmount = taxable;

          const taxPct = Number(
            next.taxPercent !== undefined && next.taxPercent !== ""
              ? next.taxPercent
              : 5,
          );
          next.taxPercent = taxPct;
          next.taxAmount = Math.round((taxable * taxPct) / 100);

          if (!next.paymentStatus) next.paymentStatus = "unpaid";
          if (!next.status) next.status = "draft";
          if (!next.invoiceDate)
            next.invoiceDate = new Date().toISOString().split("T")[0];
        }
      }

      // Dynamic calculation for Customer Invoices amounts
      if (
        resource.key === "customer-invoices" &&
        [
          "freightRate",
          "quantity",
          "hammali",
          "detention",
          "otherCharges",
          "taxPercent",
        ].includes(name)
      ) {
        const rate = Number(name === "freightRate" ? v : next.freightRate || 0);
        const qty = Number(name === "quantity" ? v : next.quantity || 0);
        const freight = rate * qty;
        next.freightAmount = freight;

        const hammali = Number(name === "hammali" ? v : next.hammali || 0);
        const detention = Number(
          name === "detention" ? v : next.detention || 0,
        );
        const other = Number(
          name === "otherCharges" ? v : next.otherCharges || 0,
        );
        const taxable = freight + hammali + detention + other;
        next.taxableAmount = taxable;

        const taxPct = Number(
          name === "taxPercent"
            ? v
            : next.taxPercent !== undefined && next.taxPercent !== ""
              ? next.taxPercent
              : 5,
        );
        const taxAmt = Math.round((taxable * taxPct) / 100);
        next.taxAmount = taxAmt;

        if (next.paymentStatus === "paid") {
          next.paidAmount = taxable + taxAmt;
        }
      }

      // Handling Customer Invoice paymentStatus change
      if (resource.key === "customer-invoices" && name === "paymentStatus") {
        const taxable = Number(next.taxableAmount || 0);
        const taxAmt = Number(next.taxAmount || 0);
        const total = taxable + taxAmt;
        if (v === "paid") {
          next.paidAmount = total;
          if (!next.paymentMode) next.paymentMode = "bank_transfer";
        } else if (v === "partial") {
          if (!next.paymentMode) next.paymentMode = "bank_transfer";
        } else {
          next.paidAmount = 0;
        }
      }

      // Smart Auto-fill for Employees: when employeeType changes
      if (resource.key === "employees" && name === "employeeType") {
        if (v === "driver") {
          if (!next.department || next.department === "")
            next.department = "Fleet Operations";
          if (!next.designation || next.designation === "")
            next.designation = "Commercial Driver";
        } else if (v === "accountant") {
          if (!next.department || next.department === "")
            next.department = "Accounts & Finance";
          if (!next.designation || next.designation === "")
            next.designation = "Accountant";
        } else if (v === "manager") {
          if (!next.department || next.department === "")
            next.department = "Administration & HR";
          if (!next.designation || next.designation === "")
            next.designation = "Branch Manager";
        } else if (v === "office_staff") {
          if (!next.department || next.department === "")
            next.department = "Dispatch & Logistics";
          if (!next.designation || next.designation === "")
            next.designation = "Operations Staff";
        }
      }

      // Smart Auto-fill & Live Calculation for Payrolls
      if (resource.key === "payrolls") {
        if (
          [
            "basicSalary",
            "workingDays",
            "presentDays",
            "leaveDays",
            "overtimeAmount",
            "allowances",
            "advanceDeduction",
            "otherDeduction",
          ].includes(name)
        ) {
          const basic = Number(
            name === "basicSalary" ? v : next.basicSalary || 0,
          );
          const wDays = Math.max(
            1,
            Number(name === "workingDays" ? v : next.workingDays || 30),
          );
          const pDays = Number(
            name === "presentDays"
              ? v
              : next.presentDays !== undefined && next.presentDays !== ""
                ? next.presentDays
                : wDays,
          );
          if (name === "workingDays" || name === "presentDays") {
            next.leaveDays = Math.max(0, wDays - pDays);
          }
          const earned = Math.round((basic / wDays) * pDays);
          next.earnedBasicSalary = earned;

          const ot = Number(
            name === "overtimeAmount" ? v : next.overtimeAmount || 0,
          );
          const allow = Number(
            name === "allowances" ? v : next.allowances || 0,
          );
          const gross = Math.round(earned + ot + allow);
          next.grossSalary = gross;

          const adv = Number(
            name === "advanceDeduction" ? v : next.advanceDeduction || 0,
          );
          const other = Number(
            name === "otherDeduction" ? v : next.otherDeduction || 0,
          );
          const totalDed = Math.round(adv + other);
          next.totalDeduction = totalDed;

          const net = Math.max(0, gross - totalDed);
          next.netSalary = net;
        }
      }

      return next;
    });

    // Trigger auto-fetch if employee or month changed in payroll
    if (resource.key === "payrolls") {
      if (name === "employeeId" && v) {
        fetchAndApplyPayrollData(v, form.payrollMonth);
      } else if (name === "payrollMonth" && v && form.employeeId) {
        fetchAndApplyPayrollData(form.employeeId, v);
      }
    }
  };

  const fetchAndApplyPayrollData = async (empId, month) => {
    if (!empId) return;
    setPayrollLoading(true);
    try {
      let emp = options?.employees?.find(
        (e) => e._id === empId || e.id === empId,
      );
      if (!emp) {
        try {
          const empRes = await api.get(`/employees/${empId}`);
          emp = empRes.data?.data;
        } catch {}
      }
      const basic = Number(emp?.basicSalary || emp?.salary || 0);

      // Check active advances
      let totalPendingAdv = 0;
      let pendingCount = 0;
      try {
        const advRes = await api.get(`/employee-advances`, {
          params: { employeeId: empId, status: "pending" },
        });
        const list = advRes.data?.data || [];
        const activeAdvs = list.filter(
          (a) => a.status === "pending" || a.status === "partial",
        );
        pendingCount = activeAdvs.length;
        totalPendingAdv = activeAdvs.reduce(
          (sum, a) =>
            sum +
            Number(
              a.outstandingAmount !== undefined
                ? a.outstandingAmount
                : Number(a.amount || 0) - Number(a.recoveredAmount || 0),
            ),
          0,
        );
      } catch (err) {
        console.warn("Advances fetch error", err);
      }

      if (totalPendingAdv > 0) {
        setAdvanceInfo({
          total: totalPendingAdv,
          count: pendingCount,
          employeeName: emp?.name,
        });
      } else {
        setAdvanceInfo(null);
      }

      // Check attendance for month
      const targetMonth =
        month || form.payrollMonth || new Date().toISOString().slice(0, 7);
      let pDaysCount = 30;
      let lDaysCount = 0;
      let attendanceMatched = false;
      try {
        const attRes = await api.get(`/attendances`, {
          params: { employeeId: empId },
        });
        const allAtt = attRes.data?.data || [];
        const monthAtt = allAtt.filter((a) => {
          if (!a.attendanceDate) return false;
          const d = new Date(a.attendanceDate).toISOString().slice(0, 7);
          return d === targetMonth;
        });

        if (monthAtt.length > 0) {
          attendanceMatched = true;
          const present = monthAtt.filter((a) => a.status === "present").length;
          const half = monthAtt.filter((a) => a.status === "half_day").length;
          const leave = monthAtt.filter(
            (a) => a.status === "leave" || a.status === "absent",
          ).length;
          pDaysCount = present + half * 0.5;
          lDaysCount = leave;
          setAttendanceInfo({
            present: pDaysCount,
            leave: lDaysCount,
            totalRecords: monthAtt.length,
            month: targetMonth,
          });
        } else {
          setAttendanceInfo({
            present: 30,
            leave: 0,
            default: true,
            month: targetMonth,
          });
        }
      } catch (err) {
        console.warn("Attendance fetch error", err);
      }

      setForm((prev) => {
        const next = { ...prev };
        next.employeeId = empId;
        next.payrollMonth = targetMonth;
        next.basicSalary = basic;
        next.workingDays = Math.max(1, Number(prev.workingDays || 30));
        next.presentDays = attendanceMatched
          ? pDaysCount
          : prev.presentDays !== undefined && prev.presentDays !== ""
            ? Number(prev.presentDays)
            : 30;
        next.leaveDays = attendanceMatched
          ? lDaysCount
          : Math.max(0, next.workingDays - next.presentDays);

        const earned = Math.round(
          (basic / next.workingDays) * next.presentDays,
        );
        next.earnedBasicSalary = earned;

        const ot = Number(prev.overtimeAmount || 0);
        const allow = Number(prev.allowances || 0);
        next.grossSalary = Math.round(earned + ot + allow);

        // If user already specified an advance deduction or if passed via URL, keep it, otherwise auto-fill from totalPendingAdv
        const advDed =
          prev.advanceDeduction !== undefined &&
          prev.advanceDeduction !== "" &&
          Number(prev.advanceDeduction) > 0
            ? Number(prev.advanceDeduction)
            : totalPendingAdv;
        next.advanceDeduction = advDed;

        const otherDed = Number(prev.otherDeduction || 0);
        next.totalDeduction = Math.round(advDed + otherDed);
        next.netSalary = Math.max(0, next.grossSalary - next.totalDeduction);

        if (!next.paymentStatus) next.paymentStatus = "unpaid";
        if (!next.status) next.status = "processed";

        return next;
      });
    } finally {
      setPayrollLoading(false);
    }
  };

  // Auto-fetch for Payroll on mount if employeeId is provided (e.g. from employee-advances quick action)
  useEffect(() => {
    if (resource.key === "payrolls" && form.employeeId) {
      fetchAndApplyPayrollData(form.employeeId, form.payrollMonth);
    }
  }, [resource.key, form.employeeId]);

  // Auto-fill driver from vehicle when prefilled via URL or async options load
  useEffect(() => {
    if (form.vehicleId && !form.driverId && options?.vehicles?.length) {
      const foundVeh = options.vehicles.find(
        (veh) => veh._id === form.vehicleId || veh.id === form.vehicleId,
      );
      if (foundVeh?.driverId) {
        const dId =
          typeof foundVeh.driverId === "object"
            ? foundVeh.driverId._id || foundVeh.driverId.id
            : foundVeh.driverId;
        if (dId) {
          setForm((prev) =>
            prev.driverId ? prev : { ...prev, driverId: dId },
          );
        }
      }
    }
  }, [form.vehicleId, form.driverId, options?.vehicles]);

  // Auto-fill Customer Payments from invoice when prefilled via URL or async options load
  useEffect(() => {
    if (
      resource.key === "customer-payments" &&
      form.invoiceId &&
      options?.["customer-invoices"]?.length
    ) {
      const inv = options["customer-invoices"].find(
        (i) => i._id === form.invoiceId || i.id === form.invoiceId,
      );
      if (inv) {
        setForm((prev) => {
          const next = { ...prev };
          let changed = false;
          const pId =
            typeof inv.partyId === "object" ? inv.partyId?._id : inv.partyId;
          if (pId && !next.partyId) {
            next.partyId = pId;
            changed = true;
          }
          const due = Number(
            inv.outstandingAmount !== undefined
              ? inv.outstandingAmount
              : inv.grandTotal || 0,
          );
          if (due > 0 && !next.amount) {
            next.amount = due;
            changed = true;
          }
          if (!next.paymentDate) {
            next.paymentDate = new Date().toISOString().split("T")[0];
            changed = true;
          }
          if (!next.paymentMode) {
            next.paymentMode = "bank_transfer";
            changed = true;
          }
          return changed ? next : prev;
        });
      }
    }
  }, [resource.key, form.invoiceId, options?.["customer-invoices"]]);

  // Auto-fill Customer Invoice fields from booking on initial load or async options load
  useEffect(() => {
    if (resource.key === "customer-invoices") {
      setForm((prev) => {
        const next = { ...prev };
        let changed = false;

        if (!next.invoiceDate) {
          next.invoiceDate = new Date().toISOString().split("T")[0];
          changed = true;
        }
        if (!next.paymentStatus) {
          next.paymentStatus = "unpaid";
          changed = true;
        }
        if (!next.status) {
          next.status = "draft";
          changed = true;
        }
        if (next.taxPercent === undefined || next.taxPercent === "") {
          next.taxPercent = 5;
          changed = true;
        }

        if (next.bookingId && options?.bookings?.length) {
          const booking = options.bookings.find(
            (b) => b._id === next.bookingId || b.id === next.bookingId,
          );
          if (booking) {
            const pId =
              typeof booking.billingPartyId === "object"
                ? booking.billingPartyId?._id
                : booking.billingPartyId || booking.partyId;
            if (pId && !next.partyId) {
              next.partyId = pId;
              changed = true;
            }

            const lrId =
              typeof booking.lrBiltyId === "object"
                ? booking.lrBiltyId?._id
                : booking.lrBiltyId;
            if (lrId && !next.lrBiltyId) {
              next.lrBiltyId = lrId;
              changed = true;
            }

            const rate = Number(booking.billingRate || booking.rate || 0);
            if (rate && (!next.freightRate || Number(next.freightRate) === 0)) {
              next.freightRate = rate;
              changed = true;
            }

            const qty = Number(booking.quantity || 0);
            if (qty && (!next.quantity || Number(next.quantity) === 0)) {
              next.quantity = qty;
              changed = true;
            }

            if (booking.unit && !next.unit) {
              next.unit = booking.unit;
              changed = true;
            }

            const effectiveRate = Number(next.freightRate || rate || 0);
            const effectiveQty = Number(next.quantity || qty || 0);
            const freight = effectiveRate * effectiveQty;
            if (
              freight &&
              (!next.freightAmount || Number(next.freightAmount) === 0)
            ) {
              next.freightAmount = freight;
              changed = true;
            }

            const taxable =
              freight +
              Number(next.hammali || 0) +
              Number(next.detention || 0) +
              Number(next.otherCharges || 0);
            if (
              taxable &&
              (!next.taxableAmount || Number(next.taxableAmount) === 0)
            ) {
              next.taxableAmount = taxable;
              changed = true;
            }

            const taxPct = Number(
              next.taxPercent !== undefined && next.taxPercent !== ""
                ? next.taxPercent
                : 5,
            );
            const taxAmt = Math.round((taxable * taxPct) / 100);
            if (taxAmt && (!next.taxAmount || Number(next.taxAmount) === 0)) {
              next.taxAmount = taxAmt;
              changed = true;
            }
          }
        }

        return changed ? next : prev;
      });
    }
  }, [resource.key, form.bookingId, options?.bookings]);

  // Auto-fetch next sequence number for resources with sequential number fields
  useEffect(() => {
    if (row && idOf(row)) return; // Only for creation mode

    const sequenceResources = [
      "customer-invoices",
      "customer-payments",
      "bookings",
      "lr-bilties",
      "trips",
      "supply-orders",
      "do-received",
      "vendor-bills",
      "vendor-payments",
      "expenses",
      "trip-expenses",
      "employee-advances",
      "salary-payments",
    ];

    if (!sequenceResources.includes(resource.key)) return;

    const autoNumberFields = [
      "invoiceNumber",
      "paymentNumber",
      "bookingNumber",
      "lrNumber",
      "soNumber",
      "doNumber",
      "billNumber",
      "expenseNumber",
      "advanceNumber",
    ];

    const hasSeqField = resource.fields.some((f) =>
      autoNumberFields.includes(f.name),
    );

    if (!hasSeqField) return;

    let isMounted = true;
    api
      .get(`/sequence/next?type=${resource.key}`)
      .then((res) => {
        if (!isMounted) return;
        const data = res.data?.data;
        if (data) {
          setForm((prev) => {
            const next = { ...prev };
            if (data.bookingNumber && !next.bookingNumber) {
              next.bookingNumber = data.bookingNumber;
            }
            if (data.lrNumber && !next.lrNumber) {
              next.lrNumber = data.lrNumber;
            }
            if (data.number) {
              const targetField = resource.fields.find((f) =>
                autoNumberFields.includes(f.name),
              )?.name;
              if (targetField && !next[targetField]) {
                next[targetField] = data.number;
              }
            }
            return next;
          });
        }
      })
      .catch((err) => {
        console.warn("Sequence auto-fetch failed:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [resource.key, row]);

  const fieldsToRender = resource.fields.filter(
    (f) => !f.readOnly && !f.hidden,
  );

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden flex flex-col rounded-3xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b px-6 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-amber-600">
              {row && idOf(row) ? "Edit" : "Create"}
            </p>
            <h2 className="text-xl font-black">
              {row && idOf(row)
                ? `Edit ${resource.singular}`
                : `Add ${resource.singular}`}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 hover:bg-slate-100"
          >
            <X />
          </button>
        </div>
        <div className="overflow-y-auto p-6 flex-1">
          {/* Payroll Intelligence Banner */}
          {resource.key === "payrolls" && (
            <div className="mb-6 rounded-2xl border-2 border-indigo-200/80 bg-gradient-to-br from-indigo-50/70 via-white to-slate-50 p-4.5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-indigo-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
                    <LucideIcons.Calculator className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wide text-indigo-950 flex items-center gap-2">
                      Live Payroll Auto-Calculator & Smart Sync
                      {payrollLoading && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 bg-indigo-100/80 px-2 py-0.5 rounded-full">
                          <LucideIcons.Loader2 className="h-3 w-3 animate-spin" />{" "}
                          Fetching Master Data...
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-indigo-700/80 font-medium">
                      Select Employee and Month to auto-populate Basic Salary,
                      Attendance, and Active Advance Deductions.
                    </p>
                  </div>
                </div>

                {form.employeeId && (
                  <button
                    type="button"
                    onClick={() =>
                      fetchAndApplyPayrollData(
                        form.employeeId,
                        form.payrollMonth,
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-100 hover:bg-indigo-200 text-indigo-900 font-bold text-xs transition cursor-pointer border border-indigo-200"
                  >
                    <LucideIcons.RefreshCw
                      className={`h-3.5 w-3.5 ${payrollLoading ? "animate-spin" : ""}`}
                    />
                    Sync Attendance & Advances
                  </button>
                )}
              </div>

              {/* Live KPI / Calculation Strip */}
              <div className="mt-3.5 grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Basic & Attendance
                  </span>
                  <div className="mt-1">
                    <span className="text-base font-black text-slate-900">
                      ₹{Number(form.basicSalary || 0).toLocaleString("en-IN")}
                    </span>
                    <span className="text-[11px] block font-semibold text-slate-500 mt-0.5">
                      {form.presentDays || 0} Present / {form.workingDays || 30}{" "}
                      Days
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">
                    Gross Earnings
                  </span>
                  <div className="mt-1">
                    <span className="text-base font-black text-blue-900">
                      ₹{Number(form.grossSalary || 0).toLocaleString("en-IN")}
                    </span>
                    <span className="text-[11px] block font-semibold text-blue-600 mt-0.5">
                      Earned ₹
                      {Number(form.earnedBasicSalary || 0).toLocaleString(
                        "en-IN",
                      )}{" "}
                      + OT/Allw
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">
                    Total Deductions
                  </span>
                  <div className="mt-1">
                    <span className="text-base font-black text-amber-900">
                      ₹
                      {Number(form.totalDeduction || 0).toLocaleString("en-IN")}
                    </span>
                    <span className="text-[11px] block font-semibold text-amber-600 mt-0.5">
                      Adv ₹
                      {Number(form.advanceDeduction || 0).toLocaleString(
                        "en-IN",
                      )}{" "}
                      + Other
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border-2 border-emerald-400 bg-emerald-50/70 p-3">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block">
                    Take-Home Net Salary
                  </span>
                  <div className="mt-1">
                    <span className="text-lg font-black text-emerald-950">
                      ₹{Number(form.netSalary || 0).toLocaleString("en-IN")}
                    </span>
                    <span className="text-[11px] block font-bold text-emerald-700 mt-0.5">
                      Net Payable to Employee
                    </span>
                  </div>
                </div>
              </div>

              {/* Informational chips for advances & attendance */}
              {(advanceInfo || attendanceInfo) && (
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  {advanceInfo && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-100 text-amber-900 border border-amber-200 font-semibold">
                      <LucideIcons.AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                      <span>
                        Active Advances:{" "}
                        <strong>
                          ₹{advanceInfo.total.toLocaleString("en-IN")}
                        </strong>{" "}
                        ({advanceInfo.count} pending voucher) — Auto-applied to
                        Advance Deduction
                      </span>
                    </div>
                  )}
                  {attendanceInfo && !attendanceInfo.default && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-100 text-sky-900 border border-sky-200 font-semibold">
                      <LucideIcons.CalendarCheck className="h-3.5 w-3.5 text-sky-600" />
                      <span>
                        Attendance Synced:{" "}
                        <strong>{attendanceInfo.present} present days</strong>,{" "}
                        {attendanceInfo.leave} leave days recorded in{" "}
                        {attendanceInfo.month}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {fieldsToRender.map((field) => {
              // Custom handling for Customer Invoices payment status
              if (
                resource.key === "customer-invoices" &&
                field.name === "paymentStatus"
              ) {
                const isEdit = Boolean(row && idOf(row));
                if (isEdit) {
                  const pStatus =
                    form.paymentStatus || row.paymentStatus || "unpaid";
                  const pPaid = Number(row.paidAmount || form.paidAmount || 0);
                  const pOut = Number(
                    row.outstandingAmount !== undefined
                      ? row.outstandingAmount
                      : form.outstandingAmount || 0,
                  );
                  const pTotal = Number(row.grandTotal || form.grandTotal || 0);
                  return (
                    <div
                      key={field.name}
                      className="col-span-full rounded-2xl border border-slate-200 bg-slate-50/80 p-4 shadow-xs mt-1"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                            Payment Status & Ledger
                          </span>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider border ${
                                pStatus === "paid"
                                  ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                  : pStatus === "partial"
                                    ? "bg-sky-100 text-sky-800 border-sky-300"
                                    : "bg-rose-100 text-rose-800 border-rose-300"
                              }`}
                            >
                              {pStatus}
                            </span>
                            <span className="text-xs font-semibold text-slate-700">
                              Grand Total: ₹{pTotal.toLocaleString("en-IN")} •
                              Paid: ₹{pPaid.toLocaleString("en-IN")} • Due: ₹
                              {pOut.toLocaleString("en-IN")}
                            </span>
                          </div>
                        </div>
                        {pStatus !== "paid" && (
                          <button
                            type="button"
                            onClick={() => {
                              const pId =
                                typeof form.partyId === "object"
                                  ? form.partyId?._id
                                  : form.partyId ||
                                    (typeof row.partyId === "object"
                                      ? row.partyId?._id
                                      : row.partyId);
                              router.push(
                                `/customer-payments?autoOpenAdd=true&invoiceId=${idOf(row)}&partyId=${pId || ""}&amount=${pOut || pTotal}`,
                              );
                              onClose();
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition active:scale-95 cursor-pointer"
                          >
                            <LucideIcons.CreditCard className="h-4 w-4 text-emerald-200" />
                            Record Payment in Customer Payments
                          </button>
                        )}
                      </div>
                      {pStatus !== "paid" ? (
                        <p className="mt-2.5 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2 leading-relaxed">
                          ⚠️ Payment status cannot be changed directly here to
                          maintain audit integrity. Click the button above to
                          record received payment with Payment Mode, Cheque/UTR,
                          and automatic ledger update.
                        </p>
                      ) : (
                        <p className="mt-2 text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
                          <LucideIcons.CheckCircle2 className="h-4 w-4" />
                          This commercial invoice has been fully settled in
                          Customer Payments.
                        </p>
                      )}
                    </div>
                  );
                }

                // In Create Mode: Render paymentStatus dropdown + dynamic payment inputs if paid or partial
                return (
                  <div key={field.name} className="col-span-full space-y-3">
                    <Field
                      field={field}
                      resource={resource}
                      value={form[field.name] || "unpaid"}
                      options={options}
                      onChange={(v) => change(field.name, v)}
                    />

                    {form.paymentStatus && form.paymentStatus !== "unpaid" && (
                      <div className="rounded-2xl border-2 border-emerald-500/30 bg-emerald-50/50 p-4 space-y-3 shadow-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white text-xs font-bold">
                              ₹
                            </span>
                            <h4 className="text-xs font-black uppercase tracking-wider text-emerald-950">
                              {form.paymentStatus === "paid"
                                ? "Immediate Full Payment Settlement"
                                : "Partial / Advance Payment Details"}
                            </h4>
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-200/70 px-2 py-0.5 rounded border border-emerald-300">
                            Auto-Creates Payment Voucher
                          </span>
                        </div>

                        <div className="grid gap-3 md:grid-cols-3">
                          {form.paymentStatus === "partial" && (
                            <div>
                              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
                                Amount Received Now{" "}
                                <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={form.paidAmount || ""}
                                onChange={(e) =>
                                  change("paidAmount", e.target.value)
                                }
                                placeholder="e.g. 10000"
                                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 focus:border-emerald-500 focus:outline-none"
                                required
                              />
                              <span className="text-[10px] text-slate-500 mt-1 block">
                                Due Balance: ₹
                                {Math.max(
                                  0,
                                  (form.grandTotal ||
                                    (form.freightAmount || 0) +
                                      (form.hammali || 0) +
                                      (form.detention || 0) +
                                      (form.otherCharges || 0) +
                                      (form.taxAmount || 0) ||
                                    0) - Number(form.paidAmount || 0),
                                ).toLocaleString("en-IN")}
                              </span>
                            </div>
                          )}

                          <div
                            className={
                              form.paymentStatus === "paid"
                                ? "md:col-span-1"
                                : ""
                            }
                          >
                            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
                              Payment Mode{" "}
                              <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={form.paymentMode || "bank_transfer"}
                              onChange={(e) =>
                                change("paymentMode", e.target.value)
                              }
                              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 focus:border-emerald-500 focus:outline-none"
                              required
                            >
                              <option value="bank_transfer">
                                Bank Transfer (NEFT/RTGS/IMPS)
                              </option>
                              <option value="upi">UPI / QR Code</option>
                              <option value="cash">Cash</option>
                              <option value="cheque">Cheque</option>
                              <option value="neft">NEFT</option>
                              <option value="rtgs">RTGS</option>
                              <option value="imps">IMPS</option>
                              <option value="other">Other</option>
                            </select>
                          </div>

                          <div
                            className={
                              form.paymentStatus === "paid"
                                ? "md:col-span-2"
                                : ""
                            }
                          >
                            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
                              Reference / UTR / Cheque No.
                            </label>
                            <input
                              type="text"
                              value={form.referenceNumber || ""}
                              onChange={(e) =>
                                change("referenceNumber", e.target.value)
                              }
                              placeholder="e.g. UTR20261013098 / Cheque #123456"
                              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 focus:border-emerald-500 focus:outline-none"
                            />
                          </div>
                        </div>

                        <p className="text-[11px] text-emerald-900 bg-emerald-100/60 p-2 rounded-lg border border-emerald-200 leading-relaxed">
                          💡{" "}
                          {form.paymentStatus === "paid"
                            ? `Full payment of ₹${Number(form.grandTotal || (form.freightAmount || 0) + (form.hammali || 0) + (form.detention || 0) + (form.otherCharges || 0) + (form.taxAmount || 0)).toLocaleString("en-IN")} will be settled now. An official voucher will appear automatically in Customer Payments.`
                            : `Received ₹${Number(form.paidAmount || 0).toLocaleString("en-IN")} will be settled. Remaining balance will remain outstanding, and an official voucher will appear automatically in Customer Payments.`}
                        </p>
                      </div>
                    )}
                  </div>
                );
              }

              // Standard Field rendering for all other fields
              return (
                <div
                  key={field.name}
                  className={field.type === "textarea" ? "col-span-full" : ""}
                >
                  {field.section && (
                    <div className="col-span-full mt-4 first:mt-0 mb-3 pt-3 border-t border-slate-200">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-amber-500 inline-block" />
                        {field.section}
                      </h4>
                      {field.sectionDesc && (
                        <p className="mt-1 text-xs text-slate-600 font-medium bg-slate-50 border border-slate-200/80 rounded-lg p-2.5 leading-relaxed">
                          {field.sectionDesc}
                        </p>
                      )}
                    </div>
                  )}
                  <Field
                    field={field}
                    resource={resource}
                    value={form[field.name]}
                    options={options}
                    onChange={(v) => change(field.name, v)}
                  />
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex shrink-0 justify-end gap-2 border-t bg-slate-50 px-6 py-4">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={saving} onClick={() => onSave(form)}>
            {saving ? <Spinner /> : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
function Field({ field, resource = null, value, options, onChange }) {
  let formattedValue =
    value && typeof value === "object"
      ? value._id || value.id || ""
      : (value ?? "");

  // Auto-default status field if empty, unset, or unselected
  if (
    field.name === "status" &&
    (!formattedValue ||
      formattedValue === "" ||
      String(formattedValue).toLowerCase().startsWith("select"))
  ) {
    const hasActive = field.options?.some(
      (o) => (typeof o === "object" ? o.value : o) === "active",
    );
    if (hasActive || field.defaultValue === "active" || !field.options) {
      formattedValue = field.defaultValue || "active";
    }
  }

  if (
    field.type === "date" &&
    typeof formattedValue === "string" &&
    formattedValue.includes("T")
  ) {
    formattedValue = formattedValue.split("T")[0];
  }

  const sequenceResources = [
    "customer-invoices",
    "customer-payments",
    "bookings",
    "lr-bilties",
    "trips",
    "supply-orders",
    "do-received",
    "vendor-bills",
    "vendor-payments",
    "expenses",
    "trip-expenses",
    "employee-advances",
    "salary-payments",
  ];

  const isAutoSeqField =
    resource?.key !== "maintenances" &&
    (resource ? sequenceResources.includes(resource.key) : true) &&
    [
      "invoiceNumber",
      "paymentNumber",
      "bookingNumber",
      "lrNumber",
      "soNumber",
      "doNumber",
      "billNumber",
      "expenseNumber",
      "advanceNumber",
    ].includes(field.name);

  const labelClass =
    "mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600";

  const common = {
    value: formattedValue,
    required: field.required,
    onChange: (e) => onChange(e.target.value),
    placeholder: field.placeholder,
  };

  const renderLabel = () => (
    <span
      className={`${labelClass} flex items-center justify-between gap-1.5 flex-wrap`}
    >
      <span className="flex items-center gap-1.5 flex-wrap">
        <span>
          {field.label}
          {field.required && <span className="ml-1 text-red-500">*</span>}
        </span>
        {field.hint && (
          <span
            className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold normal-case tracking-normal border ${
              field.hintType === "market"
                ? "bg-amber-100 text-amber-900 border-amber-300"
                : field.hintType === "destination"
                  ? "bg-indigo-100 text-indigo-900 border-indigo-300"
                  : "bg-slate-100 text-slate-700 border-slate-300"
            }`}
          >
            {field.hint}
          </span>
        )}
      </span>
      {field.autoCalculated && (
        <span className="inline-flex items-center gap-1 rounded bg-indigo-500/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-indigo-700 border border-indigo-500/30">
          ⚡ Auto-Calculated
        </span>
      )}
      {isAutoSeqField && (
        <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-700 border border-amber-500/30">
          Auto-Generated • Editable
        </span>
      )}
    </span>
  );

  if (field.type === "file") {
    const baseUrl =
      process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") ||
      "https://narmada-road-lines.onrender.com";
    return (
      <label className="block">
        {renderLabel()}
        <input
          type="file"
          accept={field.accept}
          onChange={(e) => onChange(e.target.files?.[0] || "")}
          className="block w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm"
        />
        {field.helperText && (
          <p className="mt-1 text-[11px] font-medium text-slate-500 leading-tight">
            {field.helperText}
          </p>
        )}
        {value && typeof value === "string" && (
          <p className="mt-2 text-xs text-slate-500">
            Existing file:{" "}
            <a
              href={`${baseUrl}${value}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 underline font-semibold ml-1"
            >
              View / Download
            </a>
          </p>
        )}
      </label>
    );
  }
  if (field.type === "textarea")
    return (
      <label className="block md:col-span-2">
        {renderLabel()}
        <Textarea {...common} />
        {field.helperText && (
          <p className="mt-1 text-[11px] font-medium text-slate-500 leading-tight">
            {field.helperText}
          </p>
        )}
      </label>
    );
  if (field.type === "select") {
    const opts = field.ref
      ? (options[field.ref] || []).map((x) => ({
          value: x._id,
          label:
            (field.ref === "employees" && x.name
              ? `${x.name} ${x.employeeCode ? `[${x.employeeCode}]` : ""} — ${x.designation || x.department || "Staff"} (Basic: ₹${Number(x.basicSalary || x.salary || 0).toLocaleString("en-IN")})`
              : null) ||
            (field.ref === "payrolls"
              ? (() => {
                  const emp =
                    typeof x.employeeId === "object"
                      ? x.employeeId
                      : options?.employees?.find(
                          (e) => (e._id || e.id) === x.employeeId,
                        );
                  const empName = emp?.name || "Staff";
                  const month = x.payrollMonth || "Month";
                  const net = Number(x.netSalary || 0).toLocaleString("en-IN");
                  return `${month} — ${empName} (Net Salary: ₹${net})`;
                })()
              : null) ||
            (x.bookingNumber
              ? `${x.bookingNumber} ${x.billingPartyId?.name ? `— ${x.billingPartyId.name}` : ""}`
              : null) ||
            (x.vehicleNumber
              ? `${x.vehicleNumber} ${x.vehicleType ? `(${x.vehicleType})` : ""}`
              : null) ||
            (x.name ? `${x.name} ${x.phone ? `(${x.phone})` : ""}` : null) ||
            (x.lrNumber
              ? `${x.lrNumber} ${x.partyId?.name ? `— ${x.partyId.name}` : ""}`
              : null) ||
            x.vendorName ||
            x.employeeCode ||
            x.soNumber ||
            x.doNumber ||
            x.invoiceNumber ||
            x.billNumber ||
            x.paymentNumber ||
            x.tripNumber ||
            x.expenseNumber ||
            x.advanceNumber ||
            x.receiptNumber ||
            x.serialNumber ||
            x.itemName ||
            x.itemCode ||
            x.tyreNumber ||
            x._id,
        }))
      : field.options;
    return (
      <label className="block">
        {renderLabel()}
        <Select {...common}>
          {field.name !== "status" && (
            <option value="">Select {field.label}</option>
          )}
          {opts?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        {field.helperText && (
          <p className="mt-1 text-[11px] font-medium text-slate-500 leading-tight">
            {field.helperText}
          </p>
        )}
      </label>
    );
  }

  return (
    <label className="block">
      {renderLabel()}
      <Input
        {...common}
        type={field.type || "text"}
        readOnly={Boolean(field.autoCalculated)}
        className={
          field.autoCalculated
            ? "bg-slate-100/90 font-black text-slate-800 cursor-not-allowed border-slate-300 focus:ring-0 focus:border-slate-300"
            : ""
        }
        placeholder={
          field.placeholder ||
          (field.autoCalculated
            ? "Auto-calculated by formula"
            : isAutoSeqField
              ? "Auto-generated sequence"
              : "")
        }
      />
      {field.helperText && (
        <p className="mt-1 text-[11px] font-medium text-slate-500 leading-tight">
          {field.helperText}
        </p>
      )}
    </label>
  );
}
function ViewModal({
  resource,
  row,
  onClose,
  onPrintBilty,
  onPrintInvoice,
  onPrintPayment,
  onPrintSlip,
}) {
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [activeTab, setActiveTab] = useState("details");

  useEffect(() => {
    if (activeTab === "logs" && row) {
      setLoadingLogs(true);
      api
        .get("/activity-logs", {
          params: { entity: resource.key, entityId: row._id || row.id },
        })
        .then((res) => {
          setLogs(res?.data?.data || []);
        })
        .catch((e) => console.error("Error fetching logs:", e))
        .finally(() => setLoadingLogs(false));
    }
  }, [activeTab, resource.key, row]);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-4xl flex flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4 shrink-0">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-amber-600">
              Record details
            </p>
            <h2 className="text-xl font-black">{resource.singular}</h2>
          </div>
          <div className="flex items-center gap-2">
            {resource.key === "lr-bilties" && (
              <button
                onClick={() => onPrintBilty && onPrintBilty(row)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-1.5 text-xs font-black text-slate-950 shadow-md hover:bg-amber-400 transition cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                Print Official Lorry Receipt (LR)
              </button>
            )}
            {resource.key === "bookings" && (row.lrNumber || row.lrBiltyId) && (
              <button
                onClick={() =>
                  onPrintBilty && onPrintBilty(row.lrBiltyId || row)
                }
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-1.5 text-xs font-black text-slate-950 shadow-md hover:bg-amber-400 transition cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                Print Associated LR
              </button>
            )}
            {resource.key === "customer-invoices" && (
              <button
                onClick={() => onPrintInvoice && onPrintInvoice(row)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-3.5 py-1.5 text-xs font-black text-slate-950 shadow-md hover:from-amber-400 hover:to-amber-500 transition cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                Print / Download Bill
              </button>
            )}
            {resource.key === "customer-payments" && (
              <button
                onClick={() => onPrintPayment && onPrintPayment(row)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-3.5 py-1.5 text-xs font-black text-white shadow-md hover:from-emerald-400 hover:to-emerald-500 transition cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                Print Money Receipt (MR)
              </button>
            )}
            {resource.key === "salary-payments" && (
              <button
                onClick={() =>
                  onPrintSlip && onPrintSlip(row, "salary-payment")
                }
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-3.5 py-1.5 text-xs font-black text-white shadow-md hover:from-emerald-400 hover:to-emerald-500 transition cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                Print / Download Payment Slip
              </button>
            )}
            {resource.key === "payrolls" && (
              <button
                onClick={() => onPrintSlip && onPrintSlip(row, "payroll")}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 px-3.5 py-1.5 text-xs font-black text-white shadow-md hover:from-indigo-400 hover:to-indigo-500 transition cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                Print / Download Pay Slip
              </button>
            )}
            {resource.key === "employee-advances" && (
              <button
                onClick={() => onPrintSlip && onPrintSlip(row, "advance")}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-3.5 py-1.5 text-xs font-black text-slate-950 shadow-md hover:from-amber-400 hover:to-amber-500 transition cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                Print Advance Voucher
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-xl p-2 hover:bg-slate-100"
            >
              <X />
            </button>
          </div>
        </div>

        <div className="flex border-b border-slate-100 px-6 pt-2 shrink-0 gap-4">
          <button
            onClick={() => setActiveTab("details")}
            className={`border-b-2 pb-2 text-sm font-bold transition-colors ${
              activeTab === "details"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab("logs")}
            className={`border-b-2 pb-2 text-sm font-bold transition-colors ${
              activeTab === "logs"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Activity Logs
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {activeTab === "details" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {resource.fields
                .filter((f) => !f.hidden && f.type !== "password")
                .map((f) => (
                  <div
                    key={f.name}
                    className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4"
                  >
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      {f.label}
                    </p>
                    <div className="mt-1 break-words text-sm font-semibold text-slate-800">
                      {f.name.toLowerCase().includes("status") ||
                      f.name === "paymentStatus" ? (
                        <Badge value={row[f.name]} />
                      ) : (
                        formatValue(row[f.name], f.type, f.name, f, null, row)
                      )}
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="space-y-4">
              {loadingLogs ? (
                <div className="flex justify-center p-8">
                  <Spinner />
                </div>
              ) : logs.length === 0 ? (
                <div className="rounded-xl bg-white p-8 text-center border border-slate-100 shadow-sm">
                  <p className="font-bold text-slate-600">
                    No activity recorded
                  </p>
                </div>
              ) : (
                <div className="relative border-l-2 border-slate-200 ml-4 space-y-6 pb-4">
                  {logs.map((log) => (
                    <div key={log._id} className="relative pl-6">
                      <span className="absolute -left-[9px] top-1 h-4 w-4 rounded-full border-4 border-white bg-indigo-500"></span>
                      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between gap-4">
                          <p className="font-bold text-slate-900 text-sm">
                            {log.action}
                          </p>
                          <span className="text-xs font-semibold text-slate-400">
                            {new Date(log.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">
                          {log.description}
                        </p>
                        <p className="mt-2 text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg inline-block">
                          By: {log.user?.name || "System"} (
                          {log.user?.role || "Auto"})
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
