"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  Printer,
  RefreshCcw,
  Search,
  SlidersHorizontal,
  TrendingUp,
  IndianRupee,
  Truck,
  FileText,
  Calendar,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Fuel,
  MapPin,
  Gauge,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import api from "@/src/services/api";
import { reportConfigs } from "@/src/lib/resources";
import AccessDenied from "./AccessDenied";
import { getStoredUser, useActiveCompany } from "@/src/lib/auth";
import { canViewReport } from "@/src/lib/rbac";
import { Button, Input, Select, Spinner, Badge } from "./ui";
import { exportToExcelProfessional } from "@/src/lib/excelExport";

const moneyKeys =
  /amount|revenue|expense|cost|salary|payment|outstanding|profit|rate|price|balance|grandTotal|subTotal|freight|toll|advance|dieselAmount/i;
const dateKeys = /date|month|createdAt|updatedAt|deliveryDate|dispatchDate/i;
const vehicleKeys = /vehicle|truck|lorry/i;
const routeKeys =
  /origin|destination|fromCity|toCity|route|loadingPoint|unloadingPoint|city/i;
const weightKeys =
  /weight|quantity|tonnage|payload|loadedWeight|unloadedWeight/i;
const distanceKeys = /odometer|distance|kms|kmRun|km/i;
const fuelQtyKeys = /litres|fuelQty|qtyLtr|dieselLtr|fuelQuantity/i;

const isIndianPlate = (str) => {
  if (typeof str !== "string") return false;
  const clean = str.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return /^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}$/.test(clean);
};

const formatPlate = (str) => {
  if (typeof str !== "string") return str;
  const clean = str.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const m = clean.match(/^([A-Z]{2})([0-9]{1,2})([A-Z]{1,3})([0-9]{4})$/);
  if (m) {
    return `${m[1]}-${m[2]}-${m[3]}-${m[4]}`;
  }
  return str.toUpperCase();
};

const labelize = (s) =>
  String(s || "")
    .replaceAll("_", " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bVendor\b/g, "Broker");

const formatRaw = (v, k) => {
  if (v == null || v === "") return "—";
  if (typeof v === "number") {
    if (moneyKeys.test(k)) {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
      }).format(v);
    }
    return v.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  }
  if (dateKeys.test(k) && !Number.isNaN(new Date(v).getTime())) {
    return new Date(v).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }
  return typeof v === "object"
    ? v.name ||
        v.vendorName ||
        v.vehicleNumber ||
        v.employeeName ||
        v.employeeCode ||
        v._id ||
        JSON.stringify(v)
    : String(v).replaceAll("_", " ");
};

function renderCellContent(v, k) {
  if (v == null || v === "") return <span className="text-slate-400">—</span>;

  // Status check
  if (String(k).toLowerCase().includes("status")) {
    return <Badge value={v} />;
  }

  // Vehicle plate check
  const strVal = String(
    typeof v === "object" ? v.vehicleNumber || v.name || "" : v,
  );
  if (vehicleKeys.test(k) || isIndianPlate(strVal)) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded border border-amber-400 bg-amber-300 px-2.5 py-0.5 font-mono text-xs font-black tracking-wider text-slate-950 shadow-2xs">
        <span className="border-r border-amber-500/70 pr-1 text-[9px] font-black text-blue-900">
          IND
        </span>
        {formatPlate(strVal)}
      </span>
    );
  }

  // Route / City check
  if (routeKeys.test(k) && typeof v === "string") {
    if (v.includes(" to ") || v.includes(" -> ") || v.includes(" - ")) {
      const parts = v.split(/\s*(?:to|->|-)\s*/i);
      return (
        <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-800">
          <span className="text-emerald-700">📍 {parts[0]}</span>
          <span className="text-slate-400 font-normal">➔</span>
          <span className="text-blue-700">🏁 {parts[1] || ""}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700">
        <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
        {v}
      </span>
    );
  }

  // Money check
  if (moneyKeys.test(k) && typeof v === "number") {
    const isNegative = v < 0;
    return (
      <span
        className={`font-mono text-xs font-bold ${isNegative ? "text-rose-600" : "text-slate-900"}`}
      >
        {new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
          maximumFractionDigits: 0,
        }).format(v)}
      </span>
    );
  }

  // Weight check
  if (weightKeys.test(k) && typeof v === "number") {
    return (
      <span className="font-mono text-xs font-semibold text-slate-800">
        {v.toLocaleString("en-IN")}{" "}
        <span className="text-[10px] text-slate-500 uppercase">MT</span>
      </span>
    );
  }

  // Fuel Qty check
  if (fuelQtyKeys.test(k) && typeof v === "number") {
    return (
      <span className="font-mono text-xs font-semibold text-slate-800">
        ⛽ {v.toLocaleString("en-IN")}{" "}
        <span className="text-[10px] text-slate-500">Ltr</span>
      </span>
    );
  }

  // Distance check
  if (distanceKeys.test(k) && typeof v === "number") {
    return (
      <span className="font-mono text-xs font-semibold text-slate-800">
        <Gauge className="inline h-3 w-3 mr-1 text-indigo-500" />
        {v.toLocaleString("en-IN")}{" "}
        <span className="text-[10px] text-slate-500">KM</span>
      </span>
    );
  }

  // Date check
  if (dateKeys.test(k) && !Number.isNaN(new Date(v).getTime())) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-slate-600">
        <Calendar className="h-3 w-3 text-slate-400" />
        {new Date(v).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })}
      </span>
    );
  }

  return <span className="text-xs text-slate-700">{formatRaw(v, k)}</span>;
}

function rowsFrom(data) {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object") return [];
  if (Array.isArray(data.data)) return data.data;
  const arrays = Object.values(data).filter(Array.isArray);
  return arrays.length ? arrays[0] : [];
}

function summaryEntries(data, prefix = "") {
  if (!data || typeof data !== "object") return [];
  const out = [];
  Object.entries(data).forEach(([k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "number" && !k.toLowerCase().includes("id"))
      out.push([key, v]);
    else if (v && typeof v === "object" && !Array.isArray(v))
      out.push(...summaryEntries(v, key));
  });
  return out;
}

function chartRows(data) {
  if (!data || typeof data !== "object") return [];
  const arr = Object.values(data).find(
    (v) =>
      Array.isArray(v) &&
      v.length &&
      v.every((x) => x && typeof x === "object"),
  );
  if (!arr) return [];
  const key =
    Object.keys(arr[0]).find((k) => typeof arr[0][k] === "string") ||
    Object.keys(arr[0])[0];
  const value = Object.keys(arr[0]).find((k) => typeof arr[0][k] === "number");
  if (!value) return [];
  return arr
    .slice(0, 12)
    .map((x) => ({ name: labelize(x[key]), value: x[value] }));
}

function tableRows(data) {
  const rows = rowsFrom(data);
  if (rows.length) return rows;
  if (data && typeof data === "object") return [data];
  return [];
}

function exportCsv(rows, reportTitle = "transport_report") {
  if (!rows.length) return;
  const keys = [...new Set(rows.flatMap((r) => Object.keys(r || {})))].filter(
    (k) => typeof rows.find((r) => r?.[k])?.[k] !== "object",
  );
  const csv = [
    keys.map(labelize).join(","),
    ...rows.map((r) =>
      keys
        .map((k) => `"${String(formatRaw(r?.[k], k)).replaceAll('"', '""')}"`)
        .join(","),
    ),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${reportTitle.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportDetail({ reportKey }) {
  const cfg = reportConfigs.find((x) => x.key === reportKey);
  const user = getStoredUser();
  const activeCompany = useActiveCompany();
  const role = user?.role || "";
  const allowed = Boolean(cfg && canViewReport(role, reportKey));
  const [data, setData] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [fromDate, setFromDate] = useState(""),
    [toDate, setToDate] = useState(""),
    [status, setStatus] = useState(""),
    [search, setSearch] = useState("");

  const load = async () => {
    if (!cfg) return;
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;
      if (status) params.status = status;
      const r = await api.get(cfg.endpoint, { params });
      setData(r.data?.data ?? r.data);
    } catch (e) {
      setError(
        e?.response?.data?.message || e?.message || "Failed to load report",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [cfg?.endpoint]);

  const rows = useMemo(
    () =>
      tableRows(data).filter(
        (r) =>
          !search ||
          Object.values(r || {}).some((v) =>
            String(formatRaw(v, ""))
              .toLowerCase()
              .includes(search.toLowerCase()),
          ),
      ),
    [data, search],
  );
  const summaries = summaryEntries(data?.summary || data).slice(0, 12);
  const chart = chartRows(data?.summary || data);
  const columns = useMemo(
    () =>
      [...new Set(rows.flatMap((r) => Object.keys(r || {})))]
        .filter(
          (k) =>
            !k.toLowerCase().includes("_id") &&
            !k.toLowerCase().includes("companyid"),
        )
        .slice(0, 12),
    [rows],
  );

  // Compute column totals for numeric columns
  const columnTotals = useMemo(() => {
    const totals = {};
    columns.forEach((col) => {
      const isNumeric = rows.some((r) => typeof r?.[col] === "number");
      if (isNumeric) {
        totals[col] = rows.reduce(
          (sum, r) => sum + (typeof r?.[col] === "number" ? r[col] : 0),
          0,
        );
      }
    });
    return totals;
  }, [rows, columns]);

  const handleExportExcel = () => {
    const cols = columns.map((col) => ({
      key: col,
      label: labelize(col),
      type: rows.some((r) => typeof r?.[col] === "number")
        ? "number"
        : dateKeys.test(col)
          ? "date"
          : "text",
    }));

    exportToExcelProfessional({
      title: `${cfg.title} Report`,
      subtitle: `${activeCompany?.name || "Fleet Enterprise TMS"} • Commercial Transport Audit`,
      filename: `${activeCompany?.code || "TMS"}_${reportKey}_Report`,
      sheetName: cfg.title,
      columns: cols,
      rows: rows,
    });
  };

  if (!cfg)
    return (
      <div className="rounded-3xl border bg-white p-10 font-bold text-slate-700">
        Report not found.
      </div>
    );
  if (!allowed) return <AccessDenied />;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner - Authentic Transport Control Tower Style */}
      <div className="rounded-3xl border border-slate-800 bg-[#0b1220] p-6 text-white shadow-xl sm:p-7">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <Link
                href="/reports"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs font-bold text-amber-400 hover:bg-slate-700 transition"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to All Reports
              </Link>
              <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-black uppercase tracking-wider text-amber-400 border border-amber-500/20">
                {cfg.group} AUDIT
              </span>
              <span className="text-xs text-slate-400">
                📍{" "}
                {activeCompany?.city
                  ? `${activeCompany.city} Central Hub`
                  : "Central Operations Hub"}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
              <Truck className="h-7 w-7 text-amber-400 hidden sm:inline" />
              {cfg.title}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-300">
              Live commercial transport audit register & fleet intelligence
              report • Real-time database sync.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* 1. Print Register */}
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/90 px-3.5 py-2 text-xs font-bold text-slate-100 transition-all duration-150 hover:bg-slate-700 hover:border-slate-600 hover:text-white active:scale-95 cursor-pointer shadow-xs"
              title="Print Official Ledger / Report"
            >
              <Printer className="h-4 w-4 text-slate-300" />
              <span>Print Register</span>
            </button>

            {/* 2. Export Excel (.xlsx) - High-contrast Emerald Transport Theme */}
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-500 bg-emerald-600 px-3.5 py-2 text-xs font-black text-white transition-all duration-150 hover:bg-emerald-500 hover:border-emerald-400 active:scale-95 shadow-md shadow-emerald-950/40 cursor-pointer"
              title="Download Formatted Excel (.xlsx)"
            >
              <Download className="h-4 w-4 text-emerald-100" />
              <span>Export Excel (.xlsx)</span>
            </button>

            {/* 3. Export CSV */}
            <button
              type="button"
              onClick={() => exportCsv(rows, cfg.title)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/90 px-3.5 py-2 text-xs font-bold text-slate-100 transition-all duration-150 hover:bg-slate-700 hover:border-slate-600 hover:text-white active:scale-95 cursor-pointer shadow-xs"
              title="Export Raw CSV Data"
            >
              <Download className="h-4 w-4 text-slate-300" />
              <span>Export CSV</span>
            </button>

            {/* 4. Refresh Button */}
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-amber-400 bg-gradient-to-r from-amber-400 to-amber-500 px-3.5 py-2 text-xs font-black text-slate-950 transition-all duration-150 hover:from-amber-300 hover:to-amber-400 hover:border-amber-300 active:scale-95 shadow-md shadow-amber-500/20 cursor-pointer disabled:opacity-50"
              title="Refresh Real-time Data"
            >
              <RefreshCcw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700">
            <SlidersHorizontal className="h-4 w-4 text-amber-600" />
            Audit Parameters & Date Filters
          </div>
          <span className="text-[11px] font-semibold text-slate-400">
            Showing {rows.length} records
          </span>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="text-[11px] font-bold text-slate-500 mb-1 block">
              From Date
            </label>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 mb-1 block">
              To Date
            </label>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 mb-1 block">
              Status
            </label>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="active">Active / In Transit</option>
              <option value="completed">Completed / Delivered</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 mb-1 block">
              Search Register
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Vehicle, City, Bill..."
              />
            </div>
          </div>
          <div className="flex items-end gap-2">
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => {
                setFromDate("");
                setToDate("");
                setStatus("");
                setSearch("");
                load();
              }}
            >
              Reset Filters
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid place-items-center rounded-2xl border bg-white py-32 shadow-sm">
          <div className="text-center">
            <Spinner />
            <p className="mt-3 text-xs font-bold uppercase tracking-wider text-slate-400">
              Loading live operational register...
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Summary KPIs */}
          {summaries.length > 0 && (
            <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
              {summaries.slice(0, 8).map(([k, v]) => {
                const isMoney = moneyKeys.test(k);
                const isFuel = fuelQtyKeys.test(k);
                const isDist = distanceKeys.test(k);
                return (
                  <div
                    key={k}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-amber-400 transition"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 truncate">
                        {labelize(k.split(".").pop())}
                      </p>
                      <div className="grid h-8 w-8 place-items-center rounded-lg bg-amber-50 text-amber-700">
                        {isMoney ? (
                          <IndianRupee className="h-4 w-4" />
                        ) : isFuel ? (
                          <Fuel className="h-4 w-4" />
                        ) : isDist ? (
                          <Gauge className="h-4 w-4" />
                        ) : (
                          <TrendingUp className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                    <p className="text-xl sm:text-2xl font-black text-slate-950 font-mono">
                      {isMoney
                        ? new Intl.NumberFormat("en-IN", {
                            style: "currency",
                            currency: "INR",
                            maximumFractionDigits: 0,
                          }).format(v)
                        : formatRaw(v, k)}
                    </p>
                    <p className="mt-1 text-[10px] text-slate-500 font-semibold">
                      Audit Aggregate
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Distribution Chart */}
          {chart.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="font-black text-slate-900 text-sm tracking-tight">
                    Operational Breakdown & Distribution
                  </h2>
                  <p className="text-xs text-slate-500">
                    Visual trend for selected parameters
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                  Recharts Engine
                </span>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chart}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#f1f5f9"
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "#64748b" }}
                    />
                    <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                    <Tooltip
                      formatter={(val) => [
                        typeof val === "number"
                          ? val.toLocaleString("en-IN")
                          : val,
                        "Value",
                      ]}
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        borderRadius: "12px",
                        border: "1px solid #1e293b",
                        color: "#ffffff",
                        fontSize: "12px",
                        fontWeight: "bold",
                        boxShadow: "0 10px 25px -5px rgba(0,0,0,0.4)",
                      }}
                      labelStyle={{
                        color: "#ffffff",
                        fontWeight: "bold",
                        marginBottom: "4px",
                      }}
                      itemStyle={{
                        color: "#fbbf24",
                        fontWeight: "bold",
                      }}
                    />
                    <Bar dataKey="value" fill="#d97706" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Transport Records Table */}
          {rows.length > 0 ? (
            <div className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
                <div className="flex items-center gap-2">
                  <div className="grid h-7 w-7 place-items-center rounded-lg bg-amber-100 text-amber-800">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="font-black text-slate-950 text-sm">
                      {cfg.title} — Official Ledger
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      {rows.length} Entries found matching audit criteria
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                    Live Transport Register
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-left">
                  <thead className="bg-rose-50/90 text-slate-800 border-b-2 border-rose-200/80">
                    <tr>
                      <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wider text-slate-700 w-12 text-center">
                        #
                      </th>
                      {columns.map((k) => (
                        <th
                          key={k}
                          className="whitespace-nowrap px-4 py-3 text-[11px] font-black uppercase tracking-wider text-slate-700"
                        >
                          {labelize(k)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {rows.slice(0, 500).map((r, i) => (
                      <tr
                        key={i}
                        className={`${i % 2 === 0 ? "bg-white hover:bg-[#f8f8f8]" : "bg-amber-50/80 hover:bg-amber-100/70"} transition-colors`}
                      >
                        <td className="px-4 py-3 text-center text-xs font-mono font-bold text-slate-400">
                          {i + 1}
                        </td>
                        {columns.map((k) => (
                          <td
                            key={k}
                            className="max-w-[300px] whitespace-nowrap px-4 py-3"
                          >
                            {renderCellContent(r[k], k)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>

                  {/* Transport Tally & Summary Footer */}
                  {Object.keys(columnTotals).length > 0 && (
                    <tfoot className="bg-slate-900 text-white font-bold border-t-2 border-slate-700">
                      <tr>
                        <td className="px-4 py-3 text-center text-xs font-black uppercase tracking-wider text-amber-400">
                          TOTAL
                        </td>
                        {columns.map((k) => {
                          const total = columnTotals[k];
                          if (total != null && total !== 0) {
                            const isMoney = moneyKeys.test(k);
                            return (
                              <td
                                key={k}
                                className="whitespace-nowrap px-4 py-3 text-xs font-mono font-black text-amber-300"
                              >
                                {isMoney
                                  ? new Intl.NumberFormat("en-IN", {
                                      style: "currency",
                                      currency: "INR",
                                      maximumFractionDigits: 0,
                                    }).format(total)
                                  : total.toLocaleString("en-IN", {
                                      maximumFractionDigits: 2,
                                    })}
                              </td>
                            );
                          }
                          return (
                            <td
                              key={k}
                              className="whitespace-nowrap px-4 py-3 text-xs text-slate-500"
                            >
                              —
                            </td>
                          );
                        })}
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              <div className="border-t border-slate-200 bg-slate-50 px-5 py-3 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
                <span>
                  {activeCompany?.name || "Fleet Enterprise TMS"} • Transport
                  Audit Ledger • Confidential Internal Document
                </span>
                <span>Page 1 • {rows.length} Total Records</span>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-slate-900">
                    Report Metrics Overview
                  </h2>
                  <p className="text-xs text-slate-500">
                    Aggregated figures from the database
                  </p>
                </div>
                <FileText className="h-5 w-5 text-slate-400" />
              </div>
              {summaries.length === 0 ? (
                <div className="py-16 text-center text-sm text-slate-500">
                  No transport report data found for the selected filters.
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {summaries.map(([k, v]) => (
                    <div
                      key={k}
                      className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                    >
                      <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                        {labelize(k.split(".").pop())}
                      </p>
                      <p className="mt-1 text-lg font-black text-slate-900 font-mono">
                        {formatRaw(v, k)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
