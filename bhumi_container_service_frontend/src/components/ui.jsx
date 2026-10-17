"use client";
import {
  Loader2,
  Search,
  Plus,
  X,
  Trash2,
  Pencil,
  Eye,
  AlertCircle,
  CheckCircle2,
  Truck,
  Wrench,
  Clock,
  Check,
  AlertTriangle,
  ShieldCheck,
  FileText,
} from "lucide-react";

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 active:scale-[.98] cursor-pointer";
  const variants = {
    primary:
      "bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/20 hover:bg-amber-400 font-extrabold",
    secondary:
      "border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50",
    danger: "bg-red-600 text-white hover:bg-red-700",
    ghost: "text-slate-600 hover:bg-slate-100",
  };
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Input({ className = "", ...props }) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 ${className}`}
    />
  );
}

export function Select({ children, className = "", ...props }) {
  return (
    <select
      {...props}
      className={`w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 cursor-pointer ${className}`}
    >
      {children}
    </select>
  );
}

export function Textarea({ className = "", ...props }) {
  return (
    <textarea
      {...props}
      className={`min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 ${className}`}
    />
  );
}

export function Spinner() {
  return <Loader2 className="h-5 w-5 animate-spin text-amber-500" />;
}

export function Badge({ value }) {
  const s = String(value ?? "")
    .toLowerCase()
    .trim();
  const label = String(value || "—").replaceAll("_", " ");

  if (!value) {
    return (
      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500 ring-1 ring-slate-200">
        —
      </span>
    );
  }

  // 1. In Transit / Highway
  if (
    s.includes("transit") ||
    s.includes("en_route") ||
    s.includes("on_road")
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-black text-amber-800 shadow-2xs">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
        <Truck className="h-3 w-3 text-amber-600" />
        {label}
      </span>
    );
  }

  // 2. Dispatched / Loaded
  if (
    s.includes("dispatch") ||
    s.includes("loaded") ||
    s.includes("scheduled")
  ) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 shadow-2xs">
        <Truck className="h-3 w-3 text-blue-600" />
        {label}
      </span>
    );
  }

  // 3. Delivered / Complete / Paid / Present / Active
  if (
    s.includes("deliver") ||
    s.includes("complete") ||
    s.includes("paid") ||
    s.includes("present") ||
    s.includes("fitted") ||
    s === "active"
  ) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800 shadow-2xs">
        <Check className="h-3 w-3 text-emerald-600 stroke-[3]" />
        {label}
      </span>
    );
  }

  // 4. Breakdown / Maintenance / Repair / Inspection
  if (
    s.includes("breakdown") ||
    s.includes("repair") ||
    s.includes("maintenance") ||
    s.includes("workshop") ||
    s.includes("retread")
  ) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-xs font-bold text-purple-800 shadow-2xs">
        <Wrench className="h-3 w-3 text-purple-600" />
        {label}
      </span>
    );
  }

  // 5. Cancelled / Expired / Inactive / Absent
  if (
    s.includes("cancel") ||
    s.includes("inactive") ||
    s.includes("absent") ||
    s.includes("expired") ||
    s.includes("scrapped")
  ) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-700 shadow-2xs">
        <AlertTriangle className="h-3 w-3 text-red-600" />
        {label}
      </span>
    );
  }

  // 6. Pending / Partial / Draft
  if (
    s.includes("pending") ||
    s.includes("partial") ||
    s.includes("draft") ||
    s.includes("hold")
  ) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50/80 px-2.5 py-0.5 text-xs font-bold text-amber-700 shadow-2xs">
        <Clock className="h-3 w-3 text-amber-600" />
        {label}
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-bold capitalize text-slate-700 shadow-2xs">
      {label}
    </span>
  );
}

export function Empty({ text = "No records found" }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
      <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-amber-50 text-amber-600">
        <Truck className="h-6 w-6" />
      </div>
      <p className="text-sm font-bold text-slate-700">{text}</p>
      <p className="mt-0.5 text-xs text-slate-400">
        No matching operations records found.
      </p>
    </div>
  );
}

export function ToastMessage({ type, message }) {
  return (
    <div
      className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm shadow-md ${
        type === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-red-200 bg-red-50 text-red-800"
      }`}
    >
      {type === "success" ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
      ) : (
        <AlertCircle className="h-4 w-4 text-red-600" />
      )}
      <span className="font-semibold">{message}</span>
    </div>
  );
}

export const Icons = { Search, Plus, X, Trash2, Pencil, Eye };
