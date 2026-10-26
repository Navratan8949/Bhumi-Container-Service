"use client";

import Link from "next/link";
import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import api from "@/src/services/api";
import {
  ArrowRight,
  AlertTriangle,
  ClipboardList,
  FileCheck,
  Fuel,
  IndianRupee,
  RefreshCcw,
  Route,
  Truck,
  Wrench,
  UsersRound,
  Search,
  Phone,
  Printer,
  Navigation,
  MapPin,
  Play,
  PackageCheck,
  CheckCircle2,
  Activity,
  Radio,
  BookOpen,
  Receipt,
  FileText,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Gauge,
  TrendingUp,
  BarChart3,
  PieChart as PieChartIcon,
  Layers,
  Zap,
  ArrowUpRight,
  WalletCards,
  BadgeIndianRupee,
  HandCoins,
  Calculator,
  Banknote,
  Landmark,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
} from "recharts";
import { getDashboard } from "@/src/services/dashboard.service";
import { startTrip, deliverTrip } from "@/src/services/trip.service";
import {
  getActiveCompany,
  getStoredUser,
  useActiveCompany,
} from "@/src/lib/auth";
import { ROLES } from "@/src/lib/rbac";
import { Button, Badge } from "./ui";
import { toast } from "sonner";

const money = (v) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(v || 0));

const num = (v) => Number(v || 0).toLocaleString("en-IN");

const CustomCurrencyTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-900/95 p-3 text-xs text-white shadow-2xl backdrop-blur-md min-w-[180px]">
        <p className="font-extrabold text-slate-300 pb-1.5 border-b border-slate-800 flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5 text-amber-400" />
          <span>{label}</span>
        </p>
        <div className="mt-2 space-y-1.5">
          {payload.map((entry, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between gap-3 font-mono text-[11px]"
            >
              <span className="flex items-center gap-1.5 font-sans font-medium text-slate-300">
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: entry.color || entry.fill }}
                />
                {entry.name}:
              </span>
              <span className="font-bold text-white">{money(entry.value)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

const CustomCountTooltip = ({ active, payload, label, unit = "" }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-900/95 p-3 text-xs text-white shadow-2xl backdrop-blur-md min-w-[170px]">
        <p className="font-extrabold text-slate-300 pb-1.5 border-b border-slate-800 flex items-center gap-1.5">
          <Truck className="h-3.5 w-3.5 text-indigo-400" />
          <span>{label}</span>
        </p>
        <div className="mt-2 space-y-1.5">
          {payload.map((entry, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between gap-3 font-mono text-[11px]"
            >
              <span className="flex items-center gap-1.5 font-sans font-medium text-slate-300">
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: entry.color || entry.fill }}
                />
                {entry.name}:
              </span>
              <span className="font-bold text-white">
                {entry.value} {unit}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

function Stat({ icon: Icon, label, value, hint, href, color = "indigo" }) {
  const colorMap = {
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    rose: "bg-rose-50 text-rose-700 border-rose-100",
    slate: "bg-slate-100 text-slate-700 border-slate-200",
  };

  const content = (
    <>
      <div className="flex items-center justify-between">
        <span
          className={`grid h-11 w-11 place-items-center rounded-2xl border ${
            colorMap[color] || colorMap.slate
          } shadow-xs font-black`}
        >
          <Icon className="h-5 w-5" />
        </span>
        {href && (
          <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-1 group-hover:text-indigo-600" />
        )}
      </div>
      <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-2xl font-black text-slate-950">{value}</p>
      {hint && (
        <p className="mt-1 text-xs text-slate-500 font-medium">{hint}</p>
      )}
    </>
  );

  return href ? (
    <Link
      href={href}
      className="group rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md"
    >
      {content}
    </Link>
  ) : (
    <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs">
      {content}
    </div>
  );
}

function SimpleDashboard({ role }) {
  const driver = role === ROLES.DRIVER;
  const activeCompany = useActiveCompany();
  return (
    <div className="space-y-6 pb-10">
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 text-white shadow-xl sm:p-8">
        <div className="flex items-center gap-2">
          <Truck className="h-5 w-5 text-amber-400" />
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-300">
            {driver
              ? "Driver Portal • Fleet Operations"
              : "Broker & Transporter Portal"}
          </p>
        </div>
        <h1 className="mt-2 text-3xl font-black tracking-tight">
          {driver
            ? "Driver Dashboard & Active Trips"
            : "Broker & Transporter Dashboard"}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
          Access your assigned trips, highway routes, and live dispatch updates
          in real time.
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        {driver ? (
          <>
            <Link
              href="/trips"
              className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-indigo-300 transition"
            >
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                <Route className="h-6 w-6" />
              </div>
              <div>
                <b className="block text-base text-slate-900">
                  My Assigned Trips
                </b>
                <span className="text-xs text-slate-500">
                  Start trip dispatch and mark destination delivery
                </span>
              </div>
            </Link>

            <Link
              href="/profile"
              className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-indigo-300 transition"
            >
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                <UsersRound className="h-6 w-6" />
              </div>
              <div>
                <b className="block text-base text-slate-900">Driver Profile</b>
                <span className="text-xs text-slate-500">
                  Review license and personal contact details
                </span>
              </div>
            </Link>
          </>
        ) : (
          <>
            <Link
              href="/vendor-bills"
              className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-indigo-300 transition"
            >
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                <ClipboardList className="h-6 w-6" />
              </div>
              <div>
                <b className="block text-base text-slate-900">
                  Freight & Hire Bills
                </b>
                <span className="text-xs text-slate-500">
                  Review payable hire invoices
                </span>
              </div>
            </Link>

            <Link
              href="/profile"
              className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-indigo-300 transition"
            >
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                <UsersRound className="h-6 w-6" />
              </div>
              <div>
                <b className="block text-base text-slate-900">
                  Transporter Profile
                </b>
                <span className="text-xs text-slate-500">
                  Company registration & operational info
                </span>
              </div>
            </Link>
          </>
        )}
      </div>

      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 text-xs font-semibold text-indigo-900 flex items-center gap-3">
        <Radio className="h-5 w-5 text-indigo-600 shrink-0 animate-pulse" />
        <span>
          <b>{activeCompany?.name || "Central Fleet Control Tower"}:</b> For
          emergency roadside assistance, breakdowns, or toll issues, contact
          Central Operations Desk
          {activeCompany?.phone ? (
            <>
              {" "}
              at <b>{activeCompany.phone}</b>
            </>
          ) : (
            ""
          )}
          .
        </span>
      </div>
    </div>
  );
}

function AccountantDashboard({ d, load, loading, activeCompany }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("memos"); // "memos" | "settlements" | "expenses"
  const [recentMemos, setRecentMemos] = useState([]);
  const [recentSettlements, setRecentSettlements] = useState([]);
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [recentLoading, setRecentLoading] = useState(true);

  // Load recent records for Advance, Settlements, and Expenses
  useEffect(() => {
    let cancel = false;
    const fetchAccountsData = async () => {
      setRecentLoading(true);
      try {
        const [memosRes, settRes, expRes] = await Promise.all([
          api
            .get("/advance-memos?limit=6")
            .catch(() => ({ data: { data: [] } })),
          api
            .get("/driver-trip-settlements?limit=6")
            .catch(() => ({ data: { data: [] } })),
          api.get("/expenses?limit=6").catch(() => ({ data: { data: [] } })),
        ]);
        if (!cancel) {
          setRecentMemos(memosRes.data?.data || []);
          setRecentSettlements(settRes.data?.data || []);
          setRecentExpenses(expRes.data?.data || []);
        }
      } catch (err) {
        console.error("Failed to load accountant data:", err);
      } finally {
        if (!cancel) setRecentLoading(false);
      }
    };
    fetchAccountsData();
    return () => {
      cancel = true;
    };
  }, [d]);

  // Financial figures from dashboard stats
  const expenses = d?.accounts?.expenses || {};
  const advances = d?.hr?.advances || {};
  const totalBurn = Number(expenses.total || 0);
  const fuelBurn = Number(expenses.fuel || d?.fleet?.fuel?.expense || 0);
  const maintBurn = Number(
    expenses.maintenance || d?.fleet?.maintenance?.expense || 0,
  );
  const tyresBurn = Number(
    expenses.tyres || d?.fleet?.tyres?.purchaseAmount || 0,
  );
  const generalBurn = Number(expenses.general || 0);

  // Advance Memo stats
  const advanceMemosCount = d?.advanceMemos?.total || recentMemos.length;
  const unsettledAdvanceMemos =
    d?.advanceMemos?.pending ||
    recentMemos.filter((m) => m.status !== "settled").length;
  const totalAdvanceDisbursed =
    recentMemos.reduce((acc, m) => acc + (Number(m.advance) || 0), 0) ||
    Number(advances.amount || 0);
  const totalMemoBalancePending = recentMemos.reduce(
    (acc, m) => acc + (Number(m.balance) || 0),
    0,
  );

  // Driver Trip Settlement stats
  const driverSettlementsCount =
    d?.driverSettlements?.total || recentSettlements.length;
  const pendingTripsToSettle = d?.driverSettlements?.pendingTrips || 0;

  // Trend data
  const trendData = useMemo(() => {
    if (Array.isArray(d?.trends) && d.trends.length > 0) {
      const hasData = d.trends.some(
        (t) => t.revenue > 0 || t.expenses > 0 || t.collections > 0,
      );
      if (hasData) {
        return d.trends.map((t) => ({
          name: t.period,
          Advances: t.collections || 0,
          Expenses: t.expenses || 0,
        }));
      }
    }
    return [];
  }, [d]);

  // Operational cost distribution
  const costDistributionData = useMemo(() => {
    const list = [
      { name: "Diesel & Fuel", value: fuelBurn, color: "#f59e0b" },
      { name: "Vehicle Repairs & Maintenance", value: maintBurn, color: "#3b82f6" },
      { name: "Tyre Replacements", value: tyresBurn, color: "#10b981" },
      {
        name: "Tolls & En Route Expenses",
        value: generalBurn,
        color: "#8b5cf6",
      },
    ].filter((x) => x.value > 0);

    return list.length
      ? list
      : [
          {
            name: "Fleet Operational Expenses",
            value: totalBurn || 1,
            color: "#f59e0b",
          },
        ];
  }, [fuelBurn, maintBurn, tyresBurn, generalBurn, totalBurn]);

  return (
    <div className="space-y-6 pb-12 w-full max-w-full overflow-x-hidden min-w-0">
      {/* 1. Control Tower Header for Accounts */}
      <section className="relative overflow-visible rounded-3xl bg-gradient-to-br from-slate-950 via-[#0a1526] to-[#1e1b4b] p-6 text-white shadow-2xl sm:p-8 border border-slate-800">
        <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
          <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="absolute right-40 bottom-0 h-40 w-40 rounded-full bg-amber-500/10 blur-2xl" />
        </div>

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-emerald-300">
                <IndianRupee className="h-3.5 w-3.5 text-emerald-400" />{" "}
                {activeCompany?.name?.toUpperCase() ||
                  "BHUMI CONTAINER SERVICE"}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 text-[11px] font-bold text-amber-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                Live Financial Control Tower
              </span>
            </div>

            <h1 className="mt-3 text-2xl sm:text-3xl font-black tracking-tight text-white">
              Commercial Accounts &amp; Settlement Desk
            </h1>
            <p className="mt-2 max-w-2xl text-xs sm:text-sm leading-relaxed text-slate-300">
              Dedicated control desk for Trip Advance Memos, Driver Trip
              Settlements, and Fleet Operational Expenses
              monitoring.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="secondary"
              onClick={load}
              disabled={loading}
              className="rounded-2xl border border-white/10 bg-white/10 text-white backdrop-blur hover:bg-white/20 font-bold text-xs cursor-pointer"
            >
              <RefreshCcw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />{" "}
              Refresh Accounts Data
            </Button>
          </div>
        </div>
      </section>

      {/* 2. Fast Accounts Launchpad: 3 Core Workflows */}
      <section className="grid gap-4 md:grid-cols-3">
        {/* Advance Memo Action Card */}
        <div className="group relative overflow-hidden rounded-2xl border border-pink-200/90 bg-gradient-to-br from-pink-50/70 via-white to-pink-50/30 p-5 shadow-xs transition hover:shadow-md hover:border-pink-300">
          <div className="flex items-start justify-between">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-pink-600 text-white font-bold shadow-md shadow-pink-600/20">
              <FileText className="h-6 w-6" />
            </span>
            <span className="rounded-full bg-pink-100 text-pink-700 text-[10px] font-black px-2.5 py-0.5 uppercase tracking-wider">
              1. Advance Desk
            </span>
          </div>
          <h2 className="mt-4 text-base font-black text-slate-900">
            Advance Memos (Advance)
          </h2>
          <p className="mt-1 text-xs text-slate-500 leading-relaxed">
            Create pre-trip vouchers, disburse diesel &amp; cash advance to
            drivers, and generate printable memo slips.
          </p>
          <div className="mt-4 flex items-center gap-2 pt-3 border-t border-pink-100">
            <button
              onClick={() => router.push("/advance-memos?autoOpenAdd=true")}
              className="flex-1 rounded-xl bg-pink-600 px-3 py-2 text-center text-xs font-bold text-white shadow-xs hover:bg-pink-700 transition cursor-pointer"
            >
              + New Advance Memo
            </button>
            <button
              onClick={() => router.push("/advance-memos")}
              className="rounded-xl border border-pink-200 bg-white px-3 py-2 text-xs font-bold text-pink-700 hover:bg-pink-50 transition cursor-pointer"
            >
              View Memos ➔
            </button>
          </div>
        </div>

        {/* Settlement Action Card */}
        <div className="group relative overflow-hidden rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/70 via-white to-emerald-50/30 p-5 shadow-xs transition hover:shadow-md hover:border-emerald-300">
          <div className="flex items-start justify-between">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/20">
              <Banknote className="h-6 w-6" />
            </span>
            <span className="rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black px-2.5 py-0.5 uppercase tracking-wider">
              2. Settlement Desk
            </span>
          </div>
          <h2 className="mt-4 text-base font-black text-slate-900">
            Trip Settlement
          </h2>
          <p className="mt-1 text-xs text-slate-500 leading-relaxed">
            Calculate driver expenses vs advance given, adjust toll &amp; fuel
            bills, and settle final driver balance.
          </p>
          <div className="mt-4 flex items-center gap-2 pt-3 border-t border-emerald-100">
            <button
              onClick={() =>
                router.push("/driver-trip-settlements?autoOpenAdd=true")
              }
              className="flex-1 rounded-xl bg-emerald-600 px-3 py-2 text-center text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition cursor-pointer"
            >
              + Settle Trip Balance
            </button>
            <button
              onClick={() => router.push("/driver-trip-settlements")}
              className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
            >
              Settlements ➔
            </button>
          </div>
        </div>

        {/* Expense Dekhna Action Card */}
        <div className="group relative overflow-hidden rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50/70 via-white to-amber-50/30 p-5 shadow-xs transition hover:shadow-md hover:border-amber-300">
          <div className="flex items-start justify-between">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20">
              <Fuel className="h-6 w-6" />
            </span>
            <span className="rounded-full bg-amber-100 text-amber-800 text-[10px] font-black px-2.5 py-0.5 uppercase tracking-wider">
              3. Expense Desk
            </span>
          </div>
          <h2 className="mt-4 text-base font-black text-slate-900">
            Fleet &amp; Operational Expenses
          </h2>
          <p className="mt-1 text-xs text-slate-500 leading-relaxed">
            Track diesel slips, garage maintenance, tyre purchases, highway
            tolls, and branch office operational expenses.
          </p>
          <div className="mt-4 flex items-center gap-2 pt-3 border-t border-amber-100">
            <button
              onClick={() => router.push("/expenses?autoOpenAdd=true")}
              className="flex-1 rounded-xl bg-slate-900 px-3 py-2 text-center text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition cursor-pointer"
            >
              + Record Expense
            </button>
            <button
              onClick={() => router.push("/expenses")}
              className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs font-bold text-amber-800 hover:bg-amber-50 transition cursor-pointer"
            >
              View Expenses ➔
            </button>
          </div>
        </div>
      </section>

      {/* 3. Core Accounting Metrics (6 Stat Cards) */}
      <section className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Stat
          icon={HandCoins}
          color="rose"
          label="Total Advance Disbursed"
          value={money(totalAdvanceDisbursed)}
          hint={`${advanceMemosCount} Total Advance Memos`}
          href="/advance-memos"
        />
        <Stat
          icon={FileText}
          color="indigo"
          label="Open Advance Memos"
          value={`${unsettledAdvanceMemos} Open`}
          hint="Awaiting trip closure"
          href="/advance-memos"
        />
        <Stat
          icon={IndianRupee}
          color="amber"
          label="Pending Settlement Balance"
          value={money(totalMemoBalancePending)}
          hint="Balance freight to receive"
          href="/advance-memos"
        />
        <Stat
          icon={CheckCircle2}
          color="emerald"
          label="Trip Settlements Done"
          value={`${driverSettlementsCount} Settled`}
          hint={`${pendingTripsToSettle} Trips awaiting settlement`}
          href="/driver-trip-settlements"
        />
        <Stat
          icon={Activity}
          color="rose"
          label="Total Operational Expenses"
          value={money(totalBurn)}
          hint="Diesel, repairs &amp; tolls"
          href="/expenses"
        />
        <Stat
          icon={Fuel}
          color="amber"
          label="Diesel &amp; Toll Expenses"
          value={money(fuelBurn + generalBurn)}
          hint={`${money(fuelBurn)} Diesel • ${money(generalBurn)} Toll`}
          href="/expenses"
        />
      </section>

      {/* 4. Visual Expense Telemetry & Cost Breakdown */}
      <section className="grid gap-5 lg:grid-cols-12">
        {/* Left: Operating Cost Breakdown Donut Chart */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                Operating Cost Distribution
              </p>
              <h3 className="text-sm font-black text-slate-900 mt-0.5">
                Fleet Expenses by Category
              </h3>
            </div>
            <span className="font-mono text-xs font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100">
              {money(totalBurn)}
            </span>
          </div>

          <div className="h-64 w-full pt-2 flex items-center justify-center">
            {costDistributionData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={costDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {costDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [money(value), "Amount"]} />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-400 font-medium">
                No fleet expenditure logged.
              </div>
            )}
          </div>
        </div>

        {/* Right: Cash Inflow vs Operating Burn Trend Chart */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                Cash Flow &amp; Burn Run-Rate
              </p>
              <h3 className="text-sm font-black text-slate-900 mt-0.5">
                Monthly Inflows vs Operational Expenses
              </h3>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-bold">
              <span className="flex items-center gap-1.5 text-emerald-600">
                <span className="h-2 w-2 rounded-full bg-emerald-600" /> Inflows
              </span>
              <span className="flex items-center gap-1.5 text-rose-600">
                <span className="h-2 w-2 rounded-full bg-rose-600" /> Burn
              </span>
            </div>
          </div>

          <div className="h-64 w-full pt-4">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="accInflow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="accBurn" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#e11d48" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#e11d48" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#f1f5f9"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={10}
                    tickLine={false}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<CustomCurrencyTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="Advances"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fill="url(#accInflow)"
                  />
                  <Area
                    type="monotone"
                    dataKey="Expenses"
                    stroke="#e11d48"
                    strokeWidth={2.5}
                    fill="url(#accBurn)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-slate-400 font-medium">
                No telemetry recorded for this cycle.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 5. Live Accounts Data Tables with Tab Switcher */}
      <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-900">
              Live Accounts Ledgers &amp; Recent Records
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Instant view of Advance Vouchers, Driver Settlements,
              and Operational Expenses.
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab("memos")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                activeTab === "memos"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Advance Memos ({recentMemos.length})
            </button>
            <button
              onClick={() => setActiveTab("settlements")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                activeTab === "settlements"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Driver Settlements ({recentSettlements.length})
            </button>
            <button
              onClick={() => setActiveTab("expenses")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                activeTab === "expenses"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Expenses ({recentExpenses.length})
            </button>
          </div>
        </div>

        {/* Tab 1: Advance Memos */}
        {activeTab === "memos" && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-600">
                Recent Advance Memo Vouchers
              </span>
              <Link
                href="/advance-memos"
                className="text-xs font-bold text-pink-700 hover:underline flex items-center gap-1"
              >
                Go to Advance Memo Register{" "}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {recentLoading ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Loading advance memos...
              </div>
            ) : recentMemos.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No advance memos recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full text-left text-xs">
                  <thead className="bg-rose-50/90 text-[11px] font-black uppercase text-slate-800 border-b border-rose-200/80">
                    <tr>
                      <th className="px-3.5 py-2.5">Memo #</th>
                      <th className="px-3.5 py-2.5">Date</th>
                      <th className="px-3.5 py-2.5">Truck / Vehicle</th>
                      <th className="px-3.5 py-2.5">Driver</th>
                      <th className="px-3.5 py-2.5 text-right">Freight (₹)</th>
                      <th className="px-3.5 py-2.5 text-right text-emerald-700 font-bold">
                        Advance (₹)
                      </th>
                      <th className="px-3.5 py-2.5 text-right text-amber-700 font-bold">
                        Balance (₹)
                      </th>
                      <th className="px-3.5 py-2.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {recentMemos.map((m, idx) => (
                      <tr
                        key={m._id}
                        className={`${idx % 2 === 0 ? "bg-white hover:bg-[#f8f8f8]" : "bg-amber-50/80 hover:bg-amber-100/70"} transition-colors`}
                      >
                        <td className="px-3.5 py-2.5 font-bold text-slate-900">
                          {m.memoNumber ? `#${m.memoNumber}` : "-"}
                        </td>
                        <td className="px-3.5 py-2.5 text-slate-500">
                          {m.date
                            ? new Date(m.date).toLocaleDateString("en-IN")
                            : "-"}
                        </td>
                        <td className="px-3.5 py-2.5 font-mono font-bold text-slate-900">
                          {m.truckNumber ||
                            m.vehicleId?.vehicleNumber ||
                            "Company Truck"}
                        </td>
                        <td className="px-3.5 py-2.5">
                          <span className="font-semibold text-slate-900">
                            {m.driverName || "-"}
                          </span>
                          {m.driverPhone && (
                            <span className="block text-[10px] text-slate-400 font-mono">
                              {m.driverPhone}
                            </span>
                          )}
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-mono font-bold">
                          ₹{Number(m.totalFreight || 0).toLocaleString("en-IN")}
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-mono font-bold text-emerald-700">
                          ₹{Number(m.advance || 0).toLocaleString("en-IN")}
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-mono font-bold text-amber-700">
                          ₹{Number(m.balance || 0).toLocaleString("en-IN")}
                        </td>
                        <td className="px-3.5 py-2.5 text-center">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              m.status === "settled"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {m.status === "settled"
                              ? "Settled"
                              : "Open / Pending"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Driver Trip Settlements */}
        {activeTab === "settlements" && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-600">
                Recent Company Lorry Settlements
              </span>
              <Link
                href="/driver-trip-settlements"
                className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
              >
                Go to Settlement Register <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {recentLoading ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Loading settlements...
              </div>
            ) : recentSettlements.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No driver settlements recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full text-left text-xs">
                  <thead className="bg-rose-50/90 text-[11px] font-black uppercase text-slate-800 border-b border-rose-200/80">
                    <tr>
                      <th className="px-3.5 py-2.5">Date</th>
                      <th className="px-3.5 py-2.5">Truck / Vehicle</th>
                      <th className="px-3.5 py-2.5">Driver</th>
                      <th className="px-3.5 py-2.5 text-right">
                        Advance Given (₹)
                      </th>
                      <th className="px-3.5 py-2.5 text-right">
                        Driver Expenses (₹)
                      </th>
                      <th className="px-3.5 py-2.5 text-right font-black">
                        Net Balance (₹)
                      </th>
                      <th className="px-3.5 py-2.5 text-center">Mode</th>
                      <th className="px-3.5 py-2.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {recentSettlements.map((s, idx) => {
                      const net = Number(s.netPayableToDriver || 0);
                      const isPayable = net >= 0;
                      return (
                        <tr
                          key={s._id}
                          className={`${idx % 2 === 0 ? "bg-white hover:bg-[#f8f8f8]" : "bg-amber-50/80 hover:bg-amber-100/70"} transition-colors`}
                        >
                          <td className="px-3.5 py-2.5 text-slate-500">
                            {s.settlementDate
                              ? new Date(s.settlementDate).toLocaleDateString(
                                  "en-IN",
                                )
                              : "-"}
                          </td>
                          <td className="px-3.5 py-2.5 font-mono font-bold text-slate-900">
                            {s.vehicleId?.vehicleNumber || s.truckNumber || "-"}
                          </td>
                          <td className="px-3.5 py-2.5 font-semibold text-slate-900">
                            {s.driverId?.name || s.driverName || "-"}
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-mono font-bold text-slate-900">
                            ₹
                            {Number(s.advanceGiven || 0).toLocaleString(
                              "en-IN",
                            )}
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-mono font-bold text-rose-700">
                            ₹
                            {Number(
                              s.totalDriverExpenditure || 0,
                            ).toLocaleString("en-IN")}
                          </td>
                          <td
                            className={`px-3.5 py-2.5 text-right font-mono font-black ${
                              isPayable ? "text-emerald-700" : "text-amber-700"
                            }`}
                          >
                            {isPayable
                              ? `+₹${net.toLocaleString("en-IN")} (Pay)`
                              : `-₹${Math.abs(net).toLocaleString("en-IN")} (Refund)`}
                          </td>
                          <td className="px-3.5 py-2.5 text-center uppercase font-mono text-[10px] text-slate-500 font-bold">
                            {s.paymentMode || "Cash"}
                          </td>
                          <td className="px-3.5 py-2.5 text-center">
                            <span
                              className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                s.settlementStatus === "paid_settled"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-amber-100 text-amber-900 border border-amber-300"
                              }`}
                            >
                              {s.settlementStatus === "paid_settled"
                                ? "Paid & Settled"
                                : s.settlementStatus || "Draft"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Expenses */}
        {activeTab === "expenses" && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-600">
                Recent Fleet &amp; Operational Expenses
              </span>
              <Link
                href="/expenses"
                className="text-xs font-bold text-slate-900 hover:underline flex items-center gap-1"
              >
                Go to Expense Register <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {recentLoading ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Loading expenses...
              </div>
            ) : recentExpenses.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No expenses recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full text-left text-xs">
                  <thead className="bg-rose-50/90 text-[11px] font-black uppercase text-slate-800 border-b border-rose-200/80">
                    <tr>
                      <th className="px-3.5 py-2.5">Date</th>
                      <th className="px-3.5 py-2.5">Expense #</th>
                      <th className="px-3.5 py-2.5">Category</th>
                      <th className="px-3.5 py-2.5">Description</th>
                      <th className="px-3.5 py-2.5 text-right font-black">
                        Amount (₹)
                      </th>
                      <th className="px-3.5 py-2.5 text-center">Mode</th>
                      <th className="px-3.5 py-2.5">Broker / Payee</th>
                      <th className="px-3.5 py-2.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {recentExpenses.map((exp, idx) => (
                      <tr
                        key={exp._id}
                        className={`${idx % 2 === 0 ? "bg-white hover:bg-[#f8f8f8]" : "bg-amber-50/80 hover:bg-amber-100/70"} transition-colors`}
                      >
                        <td className="px-3.5 py-2.5 text-slate-500">
                          {exp.expenseDate
                            ? new Date(exp.expenseDate).toLocaleDateString(
                                "en-IN",
                              )
                            : "-"}
                        </td>
                        <td className="px-3.5 py-2.5 font-bold text-slate-900">
                          {exp.expenseNumber || "-"}
                        </td>
                        <td className="px-3.5 py-2.5">
                          <span className="inline-block rounded-md bg-slate-100 text-slate-800 font-bold px-2 py-0.5 text-[10px] uppercase">
                            {String(exp.category || "General").replace(
                              "_",
                              " ",
                            )}
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 text-slate-600 max-w-xs truncate">
                          {exp.description || "-"}
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-mono font-black text-rose-700">
                          ₹{Number(exp.amount || 0).toLocaleString("en-IN")}
                        </td>
                        <td className="px-3.5 py-2.5 text-center uppercase font-mono text-[10px] text-slate-500 font-bold">
                          {exp.paymentMode || "Cash"}
                        </td>
                        <td className="px-3.5 py-2.5 text-slate-600">
                          {exp.vendorName || "-"}
                        </td>
                        <td className="px-3.5 py-2.5 text-center">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              exp.status === "active"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {exp.status || "active"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const user = getStoredUser();
  const activeCompany = useActiveCompany();
  const role = user?.role || "";
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(
    ![ROLES.DRIVER, ROLES.VENDOR].includes(role),
  );
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState({
    trips: [],
    bilties: [],
    vehicles: [],
    advanceMemos: [],
    containers: [],
  });
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [mounted, setMounted] = useState(false);
  const [analyticsTab, setAnalyticsTab] = useState("all"); // "all" | "commercial" | "operations"
  const searchRef = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Commercial revenue vs operational burn telemetry data (Real 6-Month backend trends)
  const financialTrendData = useMemo(() => {
    if (Array.isArray(d?.trends) && d.trends.length > 0) {
      const hasData = d.trends.some(
        (t) => t.revenue > 0 || t.expenses > 0 || t.collections > 0,
      );
      if (hasData) {
        return d.trends;
      }
    }
    return [];
  }, [d]);

  // Fleet deployment & yard status data
  const fleetUtilizationData = useMemo(() => {
    const total = Number(d?.fleet?.vehicles?.total || 0);
    const inTransit = Number(d?.operations?.trips?.inTransit || 0);
    const dispatched = Number(d?.operations?.trips?.dispatched || 0);
    const maint = Number(d?.fleet?.maintenance?.count || 0);
    const yardAvailable = Math.max(0, total - inTransit - dispatched - maint);

    if (total === 0 && inTransit === 0 && dispatched === 0 && maint === 0) {
      return [];
    }

    const items = [
      { name: "In Transit", value: inTransit, color: "#4f46e5" },
      { name: "Dispatched / Loading", value: dispatched, color: "#d97706" },
      {
        name: "Yard Ready",
        value:
          yardAvailable > 0
            ? yardAvailable
            : Math.max(0, total - inTransit - dispatched),
        color: "#059669",
      },
      { name: "In Maintenance", value: maint, color: "#ef4444" },
    ];
    return items.filter((i) => i.value > 0);
  }, [d]);

  // Operational cost breakdown
  const expenseDistributionData = useMemo(() => {
    const fuel = Number(
      d?.accounts?.expenses?.fuel || d?.fleet?.fuel?.expense || 0,
    );
    const maint = Number(
      d?.accounts?.expenses?.maintenance || d?.fleet?.maintenance?.expense || 0,
    );
    const tyre = Number(
      d?.accounts?.expenses?.tyres || d?.fleet?.tyres?.purchaseAmount || 0,
    );
    const gen = Number(d?.accounts?.expenses?.general || 0);

    if (fuel === 0 && maint === 0 && tyre === 0 && gen === 0) {
      return [];
    }

    const items = [
      { name: "Diesel Fuel", value: fuel, color: "#059669" },
      { name: "Vehicle Maintenance", value: maint, color: "#d97706" },
      { name: "Tyre Replacements", value: tyre, color: "#0284c7" },
      { name: "Tolls & Trip Sundry", value: gen, color: "#8b5cf6" },
    ];
    return items.filter((i) => i.value > 0);
  }, [d]);

  // High volume highway transit corridors
  const corridorVolumeData = useMemo(() => {
    const trips = d?.activeTrips || [];
    const map = {};
    trips.forEach((t) => {
      if (t.from && t.to && t.from !== "N/A" && t.to !== "N/A") {
        const key = `${t.from} → ${t.to}`;
        if (!map[key]) map[key] = { route: key, trips: 0, tonnage: 0 };
        map[key].trips += 1;
        map[key].tonnage += Math.round(Number(t.weight || 0));
      }
    });

    return Object.values(map)
      .sort((a, b) => b.trips - a.trips)
      .slice(0, 5);
  }, [d]);

  // Consignment lifecycle dispatch funnel
  const consignmentStatusData = useMemo(() => {
    const t = d?.operations?.trips || {};
    const total = Number(t.total || 0);
    if (total === 0) {
      return [];
    }
    return [
      { stage: "Planned", count: Number(t.planned || 0), fill: "#64748b" },
      {
        stage: "Dispatched",
        count: Number(t.dispatched || 0),
        fill: "#d97706",
      },
      { stage: "In Transit", count: Number(t.inTransit || 0), fill: "#4f46e5" },
      { stage: "Delivered", count: Number(t.delivered || 0), fill: "#059669" },
      { stage: "Completed", count: Number(t.completed || 0), fill: "#0284c7" },
    ];
  }, [d]);

  // Overall financial telemetry badges
  const totalBilled = Number(d?.accounts?.receivable?.invoiceAmount || 0);
  const totalBurn = Number(d?.accounts?.expenses?.total || 0);
  const totalCollected = Number(d?.accounts?.receivable?.received || 0);
  const netMarginVal = Math.max(0, totalBilled - totalBurn);
  const marginPct =
    totalBilled > 0 ? ((netMarginVal / totalBilled) * 100).toFixed(1) : "0.0";
  const collectionPct =
    totalBilled > 0 ? ((totalCollected / totalBilled) * 100).toFixed(1) : "0.0";

  // Close search dropdown on click outside
  useEffect(() => {
    const handleDocClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleDocClick);
    return () => document.removeEventListener("mousedown", handleDocClick);
  }, []);

  // Debounced live search across Fleet, Bilties, Trips & Bookings
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults({
        trips: [],
        bilties: [],
        vehicles: [],
        advanceMemos: [],
        containers: [],
      });
      setShowSearchDropdown(false);
      setSearchLoading(false);
      return;
    }

    // Set loading immediately to prevent flashing "no records found" before API returns
    setSearchLoading(true);

    const timer = setTimeout(async () => {
      try {
        const res = await api.get("/dashboard/search", { params: { q } });
        if (res.data?.success && res.data?.data) {
          setSearchResults(res.data.data);
          setShowSearchDropdown(true);
        }
      } catch (err) {
        console.error("Live dashboard search failed:", err);
      } finally {
        setSearchLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const load = async () => {
    if ([ROLES.DRIVER, ROLES.VENDOR].includes(role)) return;
    if (role === "super_admin") {
      const active = getActiveCompany();
      const storedId =
        typeof window !== "undefined"
          ? sessionStorage.getItem("nrl_company")
          : null;
      if (!active && !storedId) {
        router.replace("/select-company");
        return;
      }
    }
    setLoading(true);
    try {
      const [r, alertsRes] = await Promise.all([
        getDashboard(),
        api.get("/dashboard/alerts").catch(() => ({ data: { data: [] } })),
      ]);
      setD(r?.data?.data ?? r?.data ?? null);
      if (alertsRes?.data?.data && Array.isArray(alertsRes.data.data)) {
        const alertList = alertsRes.data.data;
        setAlerts(alertList);

        // Auto-open compliance pop alert on screen ONLY for super_admin
        if (role === "super_admin") {
          const hasDocAlerts = alertList.some(
            (a) =>
              a.category === "document" ||
              a.documentType ||
              a.title?.toLowerCase().includes("document"),
          );
          if (hasDocAlerts) {
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent("nrl-open-compliance-alert"));
            }, 350);
          }
        }
      }
      setError("");
    } catch (e) {
      if (
        role === "super_admin" &&
        (e?.message?.includes("Company is required") ||
          e?.message?.includes("400") ||
          e?.message?.includes("Invalid companyId"))
      ) {
        router.replace("/select-company");
        return;
      }
      setError(e?.message || "Dashboard could not be loaded");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [role, activeCompany?._id]);

  const actOnTrip = async (fn, tripId, actionName) => {
    try {
      await fn(tripId, {});
      toast.success(`Trip status updated: ${actionName}`);
      load();
    } catch (err) {
      toast.error(err?.message || "Action failed");
    }
  };

  if ([ROLES.DRIVER, ROLES.VENDOR].includes(role)) {
    return <SimpleDashboard role={role} />;
  }

  if (loading && !d) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-amber-500" />
          <p className="mt-4 text-sm font-bold text-slate-800">
            {role === ROLES.ACCOUNTANT
              ? "Initializing Commercial Accounts Tower…"
              : role === ROLES.MANAGER
                ? "Initializing Fleet Operations Control Tower…"
                : "Initializing Executive Control Tower…"}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {role === ROLES.ACCOUNTANT
              ? "Loading financial ledgers, receivables and vouchers"
              : "Loading real-time transit and dispatch status"}
          </p>
        </div>
      </div>
    );
  }

  if (role === ROLES.ACCOUNTANT) {
    return (
      <AccountantDashboard
        d={d}
        load={load}
        loading={loading}
        activeCompany={activeCompany}
      />
    );
  }

  const trips = d?.operations?.trips || {};
  const activeTripsList = d?.activeTrips || [];
  const totalVehicles = d?.fleet?.vehicles?.total || 0;
  const inTransitTrips = trips.inTransit || 0;
  const dispatchedTrips = trips.dispatched || 0;
  const plannedTrips = trips.planned || 0;
  const availableVehicles = Math.max(
    0,
    totalVehicles - inTransitTrips - dispatchedTrips,
  );

  // Search filter across active & recent trips
  const filteredActiveTrips = activeTripsList.filter((t) => {
    if (!searchQuery) return true;
    const cleanQ = searchQuery.toLowerCase().replace(/[^a-z0-9]/g, "");
    const cleanVehicle = String(t.vehicle || "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
    const cleanTrip = String(t.tripNumber || "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
    const q = searchQuery.toLowerCase();

    return (
      (cleanQ && cleanVehicle.includes(cleanQ)) ||
      (cleanQ && cleanTrip.includes(cleanQ)) ||
      t.vehicle?.toLowerCase().includes(q) ||
      t.tripNumber?.toLowerCase().includes(q) ||
      t.driver?.toLowerCase().includes(q) ||
      t.from?.toLowerCase().includes(q) ||
      t.to?.toLowerCase().includes(q) ||
      t.cargo?.toLowerCase().includes(q) ||
      t.status?.toLowerCase().includes(q)
    );
  });

  const totalResultsCount =
    (searchResults.vehicles?.length || 0) +
    (searchResults.trips?.length || 0) +
    (searchResults.advanceMemos?.length || 0) +
    (searchResults.bilties?.length || 0) +
    (searchResults.containers?.length || 0);

  return (
    <div className="space-y-6 pb-12 w-full max-w-full overflow-x-hidden min-w-0">
      {/* 1. Control Tower Header */}
      <section className="relative overflow-visible rounded-3xl bg-gradient-to-br from-slate-950 via-[#0d1627] to-[#1e1b4b] p-6 text-white shadow-2xl sm:p-8 border border-slate-800">
        <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
          <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />
          <div className="absolute right-40 bottom-0 h-40 w-40 rounded-full bg-amber-500/10 blur-2xl" />
        </div>

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-amber-300">
                <Truck className="h-3.5 w-3.5 text-amber-400" />{" "}
                {activeCompany?.name?.toUpperCase() ||
                  (role === ROLES.MANAGER
                    ? "FLEET OPERATIONS TMS"
                    : "ENTERPRISE TMS")}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 text-[11px] font-bold text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                Live Control Tower
              </span>
            </div>

            <h1 className="mt-3 text-2xl sm:text-3xl font-black tracking-tight text-white">
              {role === ROLES.MANAGER
                ? "Fleet Operations & Dispatch Control Tower"
                : "Executive Fleet & Operations Control Tower"}
            </h1>
            <p className="mt-2 max-w-2xl text-xs sm:text-sm leading-relaxed text-slate-300">
              {role === ROLES.MANAGER
                ? "Live highway consignments, active vehicle tracking, driver allocations, and dispatch controls."
                : "Executive overview: live highway transit, commercial operations, fleet health, and dispatch control."}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="secondary"
              onClick={load}
              disabled={loading}
              className="rounded-2xl border border-white/10 bg-white/10 text-white backdrop-blur hover:bg-white/20 font-bold text-xs"
            >
              <RefreshCcw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />{" "}
              Refresh Live Data
            </Button>
          </div>
        </div>

        {/* Live Search Bar for Trip / Vehicle with Instant Results Dropdown (Hidden for Accountant, Driver, Vendor) */}
        {role !== "accountant" && role !== ROLES.ACCOUNTANT && role !== ROLES.DRIVER && role !== ROLES.VENDOR && (
          <div ref={searchRef} className="relative mt-6 max-w-2xl">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const q = searchQuery.trim();
                if (!q) return;
                if (searchResults.vehicles?.length > 0) {
                  router.push(`/vehicles?search=${encodeURIComponent(q)}`);
                } else if (searchResults.advanceMemos?.length > 0) {
                  router.push(`/advance-memos?search=${encodeURIComponent(q)}`);
                } else if (searchResults.bilties?.length > 0) {
                  router.push(`/lr-bilties?search=${encodeURIComponent(q)}`);
                } else if (searchResults.containers?.length > 0) {
                  router.push(`/container-detentions?search=${encodeURIComponent(q)}`);
                } else {
                  router.push(`/trips?search=${encodeURIComponent(q)}`);
                }
                setShowSearchDropdown(false);
              }}
              className="relative"
            >
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-amber-400" />
              <input
                type="text"
                value={searchQuery}
                onFocus={() => {
                  if (searchQuery.trim()) setShowSearchDropdown(true);
                }}
                onChange={(e) => {
                  const val = e.target.value;
                  setSearchQuery(val);
                  if (val.trim()) {
                    setShowSearchDropdown(true);
                    setSearchLoading(true);
                  } else {
                    setShowSearchDropdown(false);
                    setSearchLoading(false);
                  }
                }}
                placeholder="Search by Trip No, Truck No (MP-09...), Driver, Party..."
                className="w-full rounded-2xl border-2 border-slate-700/80 bg-slate-900/90 py-3.5 pl-12 pr-24 text-sm font-semibold text-white placeholder:text-slate-400 outline-none focus:border-amber-400 focus:bg-slate-900 focus:ring-4 focus:ring-amber-500/20 transition shadow-inner"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                {searchLoading && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-amber-400 border-t-transparent mr-1" />
                )}
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setShowSearchDropdown(false);
                      setSearchLoading(false);
                    }}
                    className="rounded-lg bg-slate-800 px-2 py-1 text-xs font-bold text-slate-300 hover:bg-slate-750 hover:text-white transition"
                  >
                    Clear
                  </button>
                )}
              </div>
            </form>

            {/* Floating Live Search Dropdown */}
            {showSearchDropdown && searchQuery.trim() && (
              <div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl border border-slate-700 bg-[#0d1627]/98 backdrop-blur-xl shadow-2xl p-4 text-white max-h-[460px] overflow-y-auto [scrollbar-width:thin]">
                <div className="mb-3 flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${searchLoading ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`}
                    />
                    <p className="text-xs font-black uppercase tracking-wider text-amber-300">
                      {searchLoading
                        ? "Searching Fleet & Consignments…"
                        : `Live Search Results (${totalResultsCount} found)`}
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {searchLoading
                      ? "Querying database..."
                      : "Click to open record"}
                  </span>
                </div>

                {searchLoading ? (
                  <div className="py-8 text-center text-sm text-slate-400 flex flex-col items-center justify-center gap-2.5">
                    <span className="h-6 w-6 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
                    <p className="text-xs font-semibold text-slate-300">
                      Searching fleet, trips &amp; records for &quot;{searchQuery}&quot;...
                    </p>
                  </div>
                ) : totalResultsCount === 0 ? (
                  <div className="py-8 text-center text-sm text-slate-400">
                    <p>
                      No matching vehicles, trips, memos, or bilties found for &quot;{searchQuery}&quot;.
                    </p>
                    <button
                      onClick={() => {
                        router.push(
                          `/trips?search=${encodeURIComponent(searchQuery)}`,
                        );
                        setShowSearchDropdown(false);
                      }}
                      className="mt-2 text-xs font-bold text-amber-400 hover:underline"
                    >
                      Search in Trips Register ➔
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Matching Vehicles */}
                    {searchResults.vehicles?.length > 0 && (
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                          <Truck className="h-3.5 w-3.5 text-amber-400" />{" "}
                          Commercial Vehicles ({searchResults.vehicles.length})
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {searchResults.vehicles.map((v) => (
                            <button
                              key={v._id}
                              type="button"
                              onClick={() => {
                                router.push(
                                  `/vehicles?search=${encodeURIComponent(v.vehicleNumber)}`,
                                );
                                setShowSearchDropdown(false);
                              }}
                              className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/80 p-2.5 text-left hover:border-amber-400/60 hover:bg-slate-800 transition"
                            >
                              <div className="flex items-center gap-2">
                                <span className="rounded border border-amber-400 bg-amber-300 px-2 py-0.5 font-mono text-xs font-black text-slate-950">
                                  {v.vehicleNumber}
                                </span>
                                <span className="text-[11px] text-slate-300">
                                  {v.vehicleType}
                                </span>
                              </div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase">
                                {v.status}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Matching Trips */}
                    {searchResults.trips?.length > 0 && (
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                          <Route className="h-3.5 w-3.5 text-indigo-400" />{" "}
                          Highway Trips ({searchResults.trips.length})
                        </p>
                        <div className="grid gap-2">
                          {searchResults.trips.map((t) => (
                            <button
                              key={t._id}
                              type="button"
                              onClick={() => {
                                router.push(
                                  `/trips?search=${encodeURIComponent(t.tripNumber)}`,
                                );
                                setShowSearchDropdown(false);
                              }}
                              className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/80 p-2.5 text-left hover:border-indigo-400/60 hover:bg-slate-800 transition"
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="font-mono text-xs font-black text-amber-300">
                                  {t.tripNumber}
                                </span>
                                <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[11px] font-bold text-slate-200">
                                  {t.vehicle}
                                </span>
                                {t.party && (
                                  <span className="text-xs text-slate-300">
                                    {t.party}
                                  </span>
                                )}
                                {(t.from || t.to) && (
                                  <span className="text-xs text-slate-400">
                                    ({t.from} ➔ {t.to})
                                  </span>
                                )}
                              </div>
                              <Badge value={t.status} />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Matching Advance Memos */}
                    {searchResults.advanceMemos?.length > 0 && (
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 text-pink-400" />{" "}
                          Advance Memos ({searchResults.advanceMemos.length})
                        </p>
                        <div className="grid gap-2">
                          {searchResults.advanceMemos.map((m) => (
                            <button
                              key={m._id}
                              type="button"
                              onClick={() => {
                                router.push(
                                  `/advance-memos?search=${encodeURIComponent(m.memoNumber)}`,
                                );
                                setShowSearchDropdown(false);
                              }}
                              className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/80 p-2.5 text-left hover:border-pink-400/60 hover:bg-slate-800 transition"
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="font-mono text-xs font-black text-pink-400">
                                  {m.memoNumber}
                                </span>
                                {m.truckNumber && (
                                  <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[11px] font-bold text-slate-200">
                                    {m.truckNumber}
                                  </span>
                                )}
                                {m.party && (
                                  <span className="text-xs text-slate-300">
                                    {m.party}
                                  </span>
                                )}
                                {(m.fromLocation || m.toLocation) && (
                                  <span className="text-xs text-slate-400">
                                    ({m.fromLocation} ➔ {m.toLocation})
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] font-bold text-pink-400">
                                View Memo ➔
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Matching LR Bilties */}
                    {searchResults.bilties?.length > 0 && (
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                          <Receipt className="h-3.5 w-3.5 text-amber-400" />{" "}
                          LR Bilties ({searchResults.bilties.length})
                        </p>
                        <div className="grid gap-2">
                          {searchResults.bilties.map((b) => (
                            <button
                              key={b._id}
                              type="button"
                              onClick={() => {
                                router.push(
                                  `/lr-bilties?search=${encodeURIComponent(b.lrNumber)}`,
                                );
                                setShowSearchDropdown(false);
                              }}
                              className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/80 p-2.5 text-left hover:border-amber-400/60 hover:bg-slate-800 transition"
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="font-mono text-xs font-black text-amber-300">
                                  {b.lrNumber}
                                </span>
                                {b.party && (
                                  <span className="text-xs text-slate-200">
                                    {b.party}
                                  </span>
                                )}
                                {(b.from || b.to) && (
                                  <span className="text-xs text-slate-400">
                                    ({b.from} ➔ {b.to})
                                  </span>
                                )}
                              </div>
                              <Badge value={b.status || "active"} />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Matching Containers */}
                    {searchResults.containers?.length > 0 && (
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                          <Layers className="h-3.5 w-3.5 text-cyan-400" />{" "}
                          Container Detentions ({searchResults.containers.length})
                        </p>
                        <div className="grid gap-2">
                          {searchResults.containers.map((c) => (
                            <button
                              key={c._id}
                              type="button"
                              onClick={() => {
                                router.push(
                                  `/container-detentions?search=${encodeURIComponent(c.containerNumber)}`,
                                );
                                setShowSearchDropdown(false);
                              }}
                              className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/80 p-2.5 text-left hover:border-cyan-400/60 hover:bg-slate-800 transition"
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="font-mono text-xs font-black text-cyan-400">
                                  {c.containerNumber}
                                </span>
                                {c.shippingLine && (
                                  <span className="text-xs text-slate-300">
                                    {c.shippingLine} ({c.containerSize || "20ft"})
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase">
                                {c.emptyReturned ? "Returned" : "Active Detention"}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
          <AlertTriangle className="h-5 w-5 shrink-0" /> {error}
        </div>
      )}

      {/* RTO Statutory Transport Compliance Banner (if documents expiring/expired) */}
      {role === "super_admin" &&
        (Number(d?.fleet?.documents?.expiringWithin30Days || 0) > 0 ||
          alerts.some(
            (a) =>
              a.category === "document" ||
              a.documentType ||
              a.title?.toLowerCase().includes("document"),
          )) && (
        <div className="relative overflow-hidden rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-50 via-rose-50/50 to-amber-50/80 p-3.5 sm:p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-500 text-slate-950 font-black shadow-xs ring-2 ring-amber-400/40">
              <ShieldAlert className="h-5 w-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-amber-600 px-1.5 py-0.5 text-[9px] font-black uppercase text-white tracking-wide">
                  M.V. Act RTO Alert
                </span>
                <p className="text-xs font-black text-slate-900">
                  {d?.fleet?.documents?.expiringWithin30Days ||
                    alerts.filter(
                      (a) => a.category === "document" || a.documentType,
                    ).length}{" "}
                  Commercial Vehicle Document(s) Expiring / Expired!
                </p>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Statutory Fitness, Permit or Insurance renewal required to
                prevent highway impounding & penalties.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={() => {
                window.dispatchEvent(
                  new CustomEvent("nrl-open-compliance-alert"),
                );
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 px-3.5 py-1.5 text-xs font-black text-white hover:from-rose-500 hover:to-amber-500 transition cursor-pointer shadow-xs"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Show Pop-up Alert</span>
            </button>
            <Link
              href="/vehicle-documents"
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              <span>Document Desk</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Loan & Vehicle EMI Alerts Banner */}
      {alerts.some((a) => a.category === "loan") && (
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-white p-3.5 sm:p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-500 text-slate-950 font-black shadow-xs ring-2 ring-amber-400/40">
              <Landmark className="h-5 w-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-amber-500 px-1.5 py-0.5 text-[9px] font-black uppercase text-slate-950 tracking-wide">
                  Vehicle Loan & EMI Alert
                </span>
                <p className="text-xs font-black text-slate-900">
                  {alerts.filter((a) => a.category === "loan").length} Vehicle
                  EMI(s) Approaching Due Date or Overdue!
                </p>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Pay vehicle installments on time to maintain credit rating and
                avoid penalty charges.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center">
            <Link
              href="/loans"
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2 text-xs font-black text-slate-950 transition cursor-pointer shadow-xs"
            >
              <span>Manage & Pay EMIs</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* 2. Fast Transport Actions Launchpad */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-indigo-600" />
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-800">
              Operations Launchpad • Fast Actions
            </h2>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            1-Click Dispatch, Fleet & Vehicle Controls
          </span>
        </div>

        <div className="mt-3.5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          <button
            onClick={() => router.push("/advance-memos")}
            className="group flex flex-col items-start gap-1.5 rounded-xl border border-pink-200 bg-pink-50/50 p-3 transition hover:-translate-y-0.5 hover:border-pink-400 hover:bg-pink-100/60 cursor-pointer"
          >
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-pink-600 text-white font-bold shadow-xs">
              <FileText className="h-4 w-4" />
            </span>
            <span className="font-extrabold text-xs text-slate-900">
              + Advance Memo
            </span>
            <span className="text-[10px] text-pink-700 font-semibold">
              Advance Voucher
            </span>
          </button>

          <button
            onClick={() => router.push("/trips?autoOpenAdd=true")}
            className="group flex flex-col items-start gap-1.5 rounded-xl border border-amber-200 bg-amber-50/50 p-3 transition hover:-translate-y-0.5 hover:border-amber-400 hover:bg-amber-100/60 cursor-pointer"
          >
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-500 text-slate-950 font-bold shadow-xs">
              <Truck className="h-4 w-4" />
            </span>
            <span className="font-extrabold text-xs text-slate-900">
              + Trip (Total Lorry)
            </span>
            <span className="text-[10px] text-slate-500 font-semibold">
              Trip Dispatch
            </span>
          </button>

          <button
            onClick={() =>
              router.push("/driver-trip-settlements?autoOpenAdd=true")
            }
            className="group flex flex-col items-start gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 transition hover:-translate-y-0.5 hover:border-emerald-400 hover:bg-emerald-100/60 cursor-pointer"
          >
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-600 text-white font-bold shadow-xs">
              <Banknote className="h-4 w-4" />
            </span>
            <span className="font-extrabold text-xs text-slate-900">
              + Company Lorry Settlement
            </span>
            <span className="text-[10px] text-emerald-700 font-semibold">
              Driver Settlement
            </span>
          </button>

          <button
            onClick={() => router.push("/vendor-bills?autoOpenAdd=true")}
            className="group flex flex-col items-start gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/50 p-3 transition hover:-translate-y-0.5 hover:border-indigo-400 hover:bg-indigo-100/60 cursor-pointer"
          >
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-600 text-white font-bold shadow-xs">
              <BookOpen className="h-4 w-4" />
            </span>
            <span className="font-extrabold text-xs text-slate-900">
              + Market Lorry Account
            </span>
            <span className="text-[10px] text-indigo-700 font-semibold">
              Broker Lorry Account
            </span>
          </button>

          <button
            onClick={() => router.push("/customer-invoices?autoOpenAdd=true")}
            className="group flex flex-col items-start gap-1.5 rounded-xl border border-blue-200 bg-blue-50/50 p-3 transition hover:-translate-y-0.5 hover:border-blue-400 hover:bg-blue-100/60 cursor-pointer"
          >
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-600 text-white font-bold shadow-xs">
              <FileCheck className="h-4 w-4" />
            </span>
            <span className="font-extrabold text-xs text-slate-900">
              + Party Account
            </span>
            <span className="text-[10px] text-blue-700 font-semibold">
              Billing &amp; Ledger
            </span>
          </button>

          <button
            onClick={() => router.push("/fuels?autoOpenAdd=true")}
            className="group flex flex-col items-start gap-1.5 rounded-xl border border-rose-200 bg-rose-50/50 p-3 transition hover:-translate-y-0.5 hover:border-rose-400 hover:bg-rose-100/60 cursor-pointer"
          >
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-rose-600 text-white font-bold shadow-xs">
              <Fuel className="h-4 w-4" />
            </span>
            <span className="font-extrabold text-xs text-slate-900">
              + Fuel Entry
            </span>
            <span className="text-[10px] text-slate-500 font-semibold">
              Diesel &amp; FASTag
            </span>
          </button>
        </div>
      </section>

      {/* 3. Real-time Fleet Status Strip */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {/* On Highway */}
        <div className="flex items-center gap-3.5 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-xs">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20 font-black shrink-0">
            <Truck className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 truncate">
              In Transit (On Highway)
            </p>
            <p className="text-2xl font-black text-slate-950">
              {num(inTransitTrips)}
            </p>
            <p className="text-[10px] text-slate-500 truncate">
              Active Trucks on Road
            </p>
          </div>
        </div>

        {/* Loading / Dispatched */}
        <div className="flex items-center gap-3.5 rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-4 shadow-xs">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-black shrink-0">
            <Play className="h-6 w-6 fill-current" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-800 truncate">
              Dispatched / Loading
            </p>
            <p className="text-2xl font-black text-slate-950">
              {num(dispatchedTrips + plannedTrips)}
            </p>
            <p className="text-[10px] text-slate-500 truncate">
              Planned & Dispatched
            </p>
          </div>
        </div>

        {/* Yard Available / Free */}
        <div className="flex items-center gap-3.5 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-4 shadow-xs">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-600/20 font-black shrink-0">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-800 truncate">
              Yard Available (Free)
            </p>
            <p className="text-2xl font-black text-slate-950">
              {num(availableVehicles)}
            </p>
            <p className="text-[10px] text-slate-500 truncate">
              Ready for Booking
            </p>
          </div>
        </div>

        {/* Advance Memos */}
        <Link
          href="/advance-memos"
          className="flex items-center gap-3.5 rounded-2xl border border-amber-300 bg-gradient-to-br from-amber-50 to-white p-4 shadow-xs hover:border-amber-400 hover:shadow-md transition cursor-pointer"
        >
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black shrink-0">
            <FileText className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-900 truncate">
              Advance Memos
            </p>
            <p className="text-2xl font-black text-slate-950">
              {num(d?.advanceMemos?.total || 0)}
            </p>
            <p className="text-[10px] text-slate-500 truncate">
              Trip Advance Records
            </p>
          </div>
        </Link>

        {/* Driver Trip Settlements */}
        <Link
          href="/driver-trip-settlements"
          className="flex items-center gap-3.5 rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 to-white p-4 shadow-xs hover:border-purple-300 hover:shadow-md transition cursor-pointer"
        >
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-purple-600 text-white shadow-md shadow-purple-600/20 font-black shrink-0">
            <Banknote className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-purple-900 truncate">
              Trip Settlements
            </p>
            <p className="text-2xl font-black text-slate-950">
              {num(d?.driverSettlements?.pendingTrips || 0)}
            </p>
            <p className="text-[10px] text-slate-500 truncate">
              Delivered Trips to Settle
            </p>
          </div>
        </Link>

        {/* 4th Card: Customer Invoices for Accountant vs RTO Expiry Alert for Super Admin */}
        {role === "accountant" ? (
          <Link
            href="/customer-invoices"
            className="flex items-center gap-3.5 rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 to-white p-4 shadow-xs hover:border-rose-400 hover:shadow-md transition cursor-pointer"
          >
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-600 text-white shadow-md shadow-rose-600/20 font-black shrink-0">
              <Receipt className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-rose-800 truncate">
                Party Accounts
              </p>
              <p className="text-2xl font-black text-slate-950">
                {num(d?.accounts?.pendingInvoices || 0)}
              </p>
              <p className="text-[10px] text-slate-500 truncate">
                Pending / Overdue Bills
              </p>
            </div>
          </Link>
        ) : (
          <div
            onClick={() => {
              window.dispatchEvent(new CustomEvent("nrl-open-compliance-alert"));
            }}
            className="flex items-center justify-between rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 to-white p-4 shadow-xs hover:border-rose-400 hover:shadow-md transition cursor-pointer group"
            role="button"
            tabIndex={0}
            title="Click to view Commercial Transport Compliance Pop-up Alert"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-600 text-white shadow-md shadow-rose-600/20 font-black group-hover:scale-105 transition-transform shrink-0">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-rose-800 flex items-center gap-1.5 truncate">
                  RTO Expiry Alert
                  {Number(d?.fleet?.documents?.expiringWithin30Days || 0) > 0 && (
                    <span className="inline-block h-2 w-2 rounded-full bg-rose-600 animate-ping" />
                  )}
                </p>
                <p className="text-2xl font-black text-slate-950">
                  {num(d?.fleet?.documents?.expiringWithin30Days || 0)}
                </p>
                <p className="text-[10px] text-slate-500 truncate">
                  Fitness / Permit Docs
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 4. Fleet Telemetry & Commercial Analytics (Recharts Engine) */}
      <section className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-xs">
                <BarChart3 className="h-4 w-4" />
              </span>
              <h2 className="text-lg font-black text-slate-950 flex items-center gap-2">
                Fleet Telemetry & Commercial Analytics
                <span className="rounded-full bg-indigo-50 border border-indigo-200/70 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-indigo-700">
                  Recharts Visual Engine
                </span>
              </h2>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Live freight revenue vs fleet burn rate, vehicle utilization
              ratio, highway corridor density & operating cost breakdown
            </p>
          </div>

          {/* Interactive Tab Switcher */}
          <div className="flex items-center gap-1.5 rounded-2xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setAnalyticsTab("all")}
              className={`rounded-xl px-3 py-1.5 text-xs font-black transition ${
                analyticsTab === "all"
                  ? "bg-white text-indigo-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-950"
              }`}
            >
              All Telemetry
            </button>
            <button
              type="button"
              onClick={() => setAnalyticsTab("commercial")}
              className={`rounded-xl px-3 py-1.5 text-xs font-black transition ${
                analyticsTab === "commercial"
                  ? "bg-white text-indigo-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-950"
              }`}
            >
              Commercial & Margins
            </button>
            <button
              type="button"
              onClick={() => setAnalyticsTab("operations")}
              className={`rounded-xl px-3 py-1.5 text-xs font-black transition ${
                analyticsTab === "operations"
                  ? "bg-white text-indigo-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-950"
              }`}
            >
              Fleet Corridors & Utilization
            </button>
          </div>
        </div>

        {/* Commercial Highlights Mini-Cards */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-3.5">
            <div className="flex items-center justify-between text-indigo-700 text-xs font-bold">
              <span>Freight Billed</span>
              <ArrowUpRight className="h-4 w-4" />
            </div>
            <p className="mt-1 text-lg font-black text-slate-950">
              {money(totalBilled)}
            </p>
            <p className="text-[10px] text-slate-500">Total Freight Invoices</p>
          </div>

          <div className="rounded-2xl border border-rose-100 bg-rose-50/40 p-3.5">
            <div className="flex items-center justify-between text-rose-700 text-xs font-bold">
              <span>Operating Burn</span>
              <Fuel className="h-4 w-4" />
            </div>
            <p className="mt-1 text-lg font-black text-slate-950">
              {money(totalBurn)}
            </p>
            <p className="text-[10px] text-slate-500">
              Fuel, Maintenance & Tyres
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-3.5">
            <div className="flex items-center justify-between text-emerald-700 text-xs font-bold">
              <span>Net Gross Margin</span>
              <span className="font-mono text-[11px] font-black">
                {marginPct}%
              </span>
            </div>
            <p className="mt-1 text-lg font-black text-emerald-700">
              {money(netMarginVal)}
            </p>
            <p className="text-[10px] text-slate-500">Gross Operating Profit</p>
          </div>

          <div className="rounded-2xl border border-amber-100 bg-amber-50/40 p-3.5">
            <div className="flex items-center justify-between text-amber-700 text-xs font-bold">
              <span>Collection Realized</span>
              <span className="font-mono text-[11px] font-black">
                {collectionPct}%
              </span>
            </div>
            <p className="mt-1 text-lg font-black text-slate-950">
              {money(totalCollected)}
            </p>
            <p className="text-[10px] text-slate-500">Customer Cash Inflow</p>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* Chart 1: Revenue vs Burn Trend (AreaChart) */}
          {(analyticsTab === "all" || analyticsTab === "commercial") && (
            <div
              className={`${analyticsTab === "commercial" ? "lg:col-span-8" : "lg:col-span-7"} rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs min-w-0 overflow-hidden`}
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                    <TrendingUp className="h-4 w-4 text-indigo-600" />
                    Commercial Run-Rate • 6-Month Freight Invoicing vs Operating
                    Burn
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Monthly freight revenue vs operational diesel & trip burn
                    (Real Ledgers)
                  </p>
                </div>
                <div className="hidden sm:flex items-center gap-3 text-[11px] font-bold">
                  <span className="flex items-center gap-1 text-indigo-700">
                    <span className="h-2.5 w-2.5 rounded-full bg-indigo-600" />{" "}
                    Billed
                  </span>
                  <span className="flex items-center gap-1 text-emerald-700">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />{" "}
                    Collected
                  </span>
                  <span className="flex items-center gap-1 text-rose-600">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />{" "}
                    Burn
                  </span>
                </div>
              </div>

              <div className="h-64 w-full min-w-0">
                {mounted ? (
                  financialTrendData.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4">
                      <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 mb-2">
                        <TrendingUp className="h-5 w-5 text-indigo-500" />
                      </div>
                      <p className="text-xs font-bold text-slate-700">
                        No Commercial Revenue / Expense Data Yet
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Create freight invoices or record trip expenses to
                        generate weekly run-rate
                      </p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={financialTrendData}
                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient
                            id="colorRev"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#4f46e5"
                              stopOpacity={0.25}
                            />
                            <stop
                              offset="95%"
                              stopColor="#4f46e5"
                              stopOpacity={0.0}
                            />
                          </linearGradient>
                          <linearGradient
                            id="colorRec"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#059669"
                              stopOpacity={0.25}
                            />
                            <stop
                              offset="95%"
                              stopColor="#059669"
                              stopOpacity={0.0}
                            />
                          </linearGradient>
                          <linearGradient
                            id="colorExp"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#ef4444"
                              stopOpacity={0.2}
                            />
                            <stop
                              offset="95%"
                              stopColor="#ef4444"
                              stopOpacity={0.0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="#f1f5f9"
                        />
                        <XAxis
                          dataKey="period"
                          tick={{ fontSize: 11, fill: "#64748b" }}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: "#64748b" }}
                          tickFormatter={(val) =>
                            val >= 100000
                              ? `${(val / 100000).toFixed(1)}L`
                              : val >= 1000
                                ? `${(val / 1000).toFixed(0)}k`
                                : val
                          }
                        />
                        <Tooltip content={<CustomCurrencyTooltip />} />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          name="Invoiced Freight"
                          stroke="#4f46e5"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#colorRev)"
                        />
                        <Area
                          type="monotone"
                          dataKey="collections"
                          name="Collections"
                          stroke="#059669"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorRec)"
                        />
                        <Area
                          type="monotone"
                          dataKey="expenses"
                          name="Operating Burn"
                          stroke="#ef4444"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorExp)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )
                ) : (
                  <div className="h-full grid place-items-center text-xs text-slate-400">
                    Loading charts...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Chart 2: Operating Expense Distribution (PieChart) */}
          {(analyticsTab === "all" || analyticsTab === "commercial") && (
            <div
              className={`${analyticsTab === "commercial" ? "lg:col-span-4" : "lg:col-span-5"} rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs min-w-0 overflow-hidden`}
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                    <PieChartIcon className="h-4 w-4 text-emerald-600" />
                    Fleet Cost Distribution
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Diesel, maintenance, tyres & trip tolls
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                  {money(totalBurn)}
                </span>
              </div>

              <div className="h-48 w-full min-w-0">
                {mounted ? (
                  expenseDistributionData.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4">
                      <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 mb-2">
                        <PieChartIcon className="h-5 w-5 text-emerald-500" />
                      </div>
                      <p className="text-xs font-bold text-slate-700">
                        No Operating Expenses Recorded
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Diesel slips, repairs & tyre costs will appear here
                      </p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={expenseDistributionData}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={75}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {expenseDistributionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(val) => [money(val), "Cost"]}
                          contentStyle={{
                            backgroundColor: "#0f172a",
                            borderRadius: "12px",
                            border: "1px solid #1e293b",
                            color: "#ffffff",
                            fontSize: "11px",
                            fontWeight: "bold",
                            boxShadow: "0 10px 25px -5px rgba(0,0,0,0.4)",
                          }}
                          labelStyle={{
                            color: "#ffffff",
                            fontWeight: "bold",
                            marginBottom: "4px",
                          }}
                          itemStyle={{
                            color: "#f8fafc",
                            fontWeight: "600",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )
                ) : (
                  <div className="h-full grid place-items-center text-xs text-slate-400">
                    Loading cost chart...
                  </div>
                )}
              </div>

              {/* Legend with exact amounts */}
              {expenseDistributionData.length === 0 ? (
                <div className="mt-2 pt-2 border-t border-slate-100 text-center text-[11px] text-slate-400">
                  ₹0 Total Operating Expenses Logged
                </div>
              ) : (
                <div className="mt-2 grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                  {expenseDistributionData.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-1.5 text-[11px]"
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-slate-600 truncate">
                        {item.name}
                      </span>
                      <span className="ml-auto font-mono font-bold text-slate-900">
                        {money(item.value)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Chart 3: Fleet Vehicle Utilization & Allocation (Donut Chart) */}
          {(analyticsTab === "all" || analyticsTab === "operations") && (
            <div
              className={`${analyticsTab === "operations" ? "lg:col-span-4" : "lg:col-span-4"} rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs min-w-0 overflow-hidden`}
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                    <Truck className="h-4 w-4 text-indigo-600" />
                    Fleet Vehicle Utilization
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Active trucks, dispatch & yard availability
                  </p>
                </div>
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-black text-indigo-700">
                  {num(d?.fleet?.vehicles?.total || 0)} Trucks
                </span>
              </div>

              <div className="h-48 w-full min-w-0">
                {mounted ? (
                  fleetUtilizationData.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4">
                      <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 mb-2">
                        <Truck className="h-5 w-5 text-indigo-500" />
                      </div>
                      <p className="text-xs font-bold text-slate-700">
                        No Fleet Vehicles Registered
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Add vehicles to view live yard & highway transit
                        allocation
                      </p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={fleetUtilizationData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={75}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {fleetUtilizationData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(val) => [`${val} Trucks`, "Count"]}
                          contentStyle={{
                            backgroundColor: "#0f172a",
                            borderRadius: "12px",
                            border: "1px solid #1e293b",
                            color: "#ffffff",
                            fontSize: "11px",
                            fontWeight: "bold",
                            boxShadow: "0 10px 25px -5px rgba(0,0,0,0.4)",
                          }}
                          labelStyle={{
                            color: "#ffffff",
                            fontWeight: "bold",
                            marginBottom: "4px",
                          }}
                          itemStyle={{
                            color: "#38bdf8",
                            fontWeight: "600",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )
                ) : (
                  <div className="h-full grid place-items-center text-xs text-slate-400">
                    Loading fleet chart...
                  </div>
                )}
              </div>

              {/* Status Breakdown Legend */}
              {fleetUtilizationData.length === 0 ? (
                <div className="mt-2 pt-2 border-t border-slate-100 text-center text-[11px] text-slate-400">
                  0 Fleet Units Registered
                </div>
              ) : (
                <div className="mt-2 grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                  {fleetUtilizationData.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-1.5 text-[11px]"
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-slate-600 truncate">
                        {item.name}
                      </span>
                      <span className="ml-auto font-mono font-bold text-slate-900">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}

          {/* Chart 4: Top Highway Corridors & Volumes (BarChart) */}
          {(analyticsTab === "all" || analyticsTab === "operations") && (
            <div
              className={`${analyticsTab === "operations" ? "lg:col-span-8" : "lg:col-span-8"} rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs min-w-0 overflow-hidden`}
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                    <Route className="h-4 w-4 text-amber-500" />
                    Top Transit Corridors & Cargo Tonnage
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Highway route trips density and loaded metric tonnage
                  </p>
                </div>
                <div className="flex items-center gap-3 text-[11px] font-bold">
                  <span className="flex items-center gap-1 text-indigo-700">
                    <span className="h-2.5 w-2.5 rounded-full bg-indigo-600" />{" "}
                    Dispatched Trips
                  </span>
                  <span className="flex items-center gap-1 text-amber-600">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />{" "}
                    Tonnage (MT)
                  </span>
                </div>
              </div>

              <div className="h-56 w-full min-w-0">
                {mounted ? (
                  corridorVolumeData.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4">
                      <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 mb-2">
                        <Route className="h-5 w-5 text-amber-500" />
                      </div>
                      <p className="text-xs font-bold text-slate-700">
                        No Highway Transit Corridors Active
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Trips dispatched with Route & Cargo tonnage will form
                        density rankings here
                      </p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={corridorVolumeData}
                        margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="#f1f5f9"
                        />
                        <XAxis
                          dataKey="route"
                          tick={{ fontSize: 10, fill: "#64748b" }}
                        />
                        <YAxis tick={{ fontSize: 10, fill: "#64748b" }} />
                        <Tooltip
                          formatter={(val) => [`${val} Trips`, "Traffic"]}
                          contentStyle={{
                            backgroundColor: "#0f172a",
                            borderRadius: "12px",
                            border: "1px solid #1e293b",
                            color: "#ffffff",
                            fontSize: "11px",
                            fontWeight: "bold",
                            boxShadow: "0 10px 25px -5px rgba(0,0,0,0.4)",
                          }}
                          labelStyle={{
                            color: "#ffffff",
                            fontWeight: "bold",
                            marginBottom: "4px",
                          }}
                          itemStyle={{
                            color: "#60a5fa",
                            fontWeight: "600",
                          }}
                        />
                        <Bar
                          dataKey="trips"
                          name="Trips"
                          fill="#4f46e5"
                          radius={[6, 6, 0, 0]}
                        />
                        <Bar
                          dataKey="tonnage"
                          name="Cargo (MT)"
                          fill="#f59e0b"
                          radius={[6, 6, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )
                ) : (
                  <div className="h-full grid place-items-center text-xs text-slate-400">
                    Loading route corridors...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Chart 5: Consignment Lifecycle Pipeline */}
          {(analyticsTab === "all" || analyticsTab === "operations") && (
            <div className="lg:col-span-12 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs min-w-0 overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-blue-600" />
                    Consignment Dispatch Lifecycle & Transit Pipeline
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Trip velocity across stages: Planned → Dispatched → In
                    Transit → Delivered → Completed
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-700">
                  Total Managed Trips: {num(d?.operations?.trips?.total || 0)}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 mb-3">
                {consignmentStatusData.map((s) => (
                  <span
                    key={s.stage}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 border border-slate-200/80 px-2.5 py-1 text-[11px] font-semibold text-slate-700"
                  >
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: s.fill }}
                    />
                    <span>{s.stage}:</span>
                    <strong className="font-bold text-slate-900">
                      {s.count}
                    </strong>
                  </span>
                ))}
              </div>

              <div className="h-44 w-full min-w-0">
                {mounted ? (
                  consignmentStatusData.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4">
                      <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 mb-2">
                        <Layers className="h-5 w-5 text-blue-500" />
                      </div>
                      <p className="text-xs font-bold text-slate-700">
                        No Consignments in Lifecycle Pipeline
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Trips will automatically populate across Planned,
                        Dispatched, In Transit, Delivered & Completed
                      </p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={consignmentStatusData}
                        layout="horizontal"
                        margin={{ top: 16, right: 10, left: -10, bottom: 0 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="#f1f5f9"
                        />
                        <XAxis
                          dataKey="stage"
                          tick={{ fontSize: 11, fill: "#64748b" }}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: "#64748b" }}
                          allowDecimals={false}
                          domain={[
                            0,
                            (dataMax) => Math.max(4, Number(dataMax) + 1),
                          ]}
                        />
                        <Tooltip
                          formatter={(val) => [`${val} Trips`, "Count"]}
                          contentStyle={{
                            backgroundColor: "#0f172a",
                            borderRadius: "12px",
                            border: "1px solid #1e293b",
                            color: "#ffffff",
                            fontSize: "11px",
                            fontWeight: "bold",
                            boxShadow: "0 10px 25px -5px rgba(0,0,0,0.4)",
                          }}
                          labelStyle={{
                            color: "#ffffff",
                            fontWeight: "bold",
                            marginBottom: "4px",
                          }}
                          itemStyle={{
                            color: "#93c5fd",
                            fontWeight: "bold",
                          }}
                        />
                        <Bar
                          dataKey="count"
                          name="Trips"
                          maxBarSize={48}
                          radius={[8, 8, 0, 0]}
                        >
                          <LabelList
                            dataKey="count"
                            position="top"
                            style={{
                              fontSize: 11,
                              fontWeight: "bold",
                              fill: "#475569",
                            }}
                          />
                          {consignmentStatusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )
                ) : (
                  <div className="h-full grid place-items-center text-xs text-slate-400">
                    Loading pipeline...
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 5. Live Highway Transit Board */}
      <section className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-50 text-indigo-600">
                <Truck className="h-4 w-4" />
              </span>
              <h2 className="text-lg font-black text-slate-950">
                Active & Recent Fleet • Live Dispatch Board
              </h2>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Real-time vehicle journey cards, driver contacts, transit status,
              and instant trip dispatch
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {searchQuery && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">
                Filter: “{searchQuery}” ({filteredActiveTrips.length})
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="ml-1 text-amber-800 hover:text-black font-black"
                >
                  ✕
                </button>
              </span>
            )}
            <span className="rounded-full bg-slate-100 px-3 py-1 font-mono text-xs font-bold text-slate-700">
              Showing: {filteredActiveTrips.length} Trips
            </span>
            <Link
              href="/trips"
              className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
            >
              View All Trips <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {filteredActiveTrips.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-slate-100 text-slate-400">
              <Truck className="h-7 w-7" />
            </div>
            <p className="mt-3 text-sm font-bold text-slate-700">
              {searchQuery
                ? "No matching trips found"
                : "No active highway trips at the moment"}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Click <b>+ Dispatch Trip</b> above to dispatch vehicles on route.
            </p>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredActiveTrips.map((trip) => {
              const st = trip.status?.toLowerCase();

              return (
                <div
                  key={trip._id}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs transition hover:border-indigo-300 hover:shadow-md"
                >
                  {/* Card Header: Truck & Status */}
                  <div>
                    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`grid h-10 w-10 place-items-center rounded-xl font-bold shadow-xs ${
                            st === "in_transit"
                              ? "bg-emerald-500 text-white"
                              : st === "dispatched"
                                ? "bg-indigo-600 text-white"
                                : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          <Truck className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="inline-flex items-center rounded border border-amber-400 bg-amber-100/90 px-2 py-0.5 font-mono text-xs font-black tracking-wider text-slate-900 shadow-2xs">
                            <span className="mr-1.5 rounded-xs bg-blue-700 px-1 py-0.2 text-[8px] font-black text-white uppercase tracking-tighter">
                              IND
                            </span>
                            {trip.vehicle}
                          </div>
                          <p className="mt-1 text-[10px] font-bold text-slate-500 uppercase">
                            {trip.vehicleType || "Heavy Goods Truck"} •{" "}
                            <span className="font-mono text-slate-700 font-bold">
                              {trip.tripNumber}
                            </span>
                          </p>
                        </div>
                      </div>
                      <Badge value={trip.status} />
                    </div>

                    {/* Route Track */}
                    <div className="my-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-emerald-600" />
                          {trip.from}
                        </span>
                        <span
                          className={`text-[10px] font-semibold uppercase ${
                            st === "completed" ||
                            st === "delivered" ||
                            st === "settled"
                              ? "text-emerald-700 font-bold"
                              : st === "in_transit"
                                ? "text-amber-600"
                                : "text-slate-500"
                          }`}
                        >
                          {st === "completed"
                            ? "Journey Completed"
                            : st === "delivered"
                              ? "Delivered"
                              : st === "in_transit"
                                ? "On Highway"
                                : "Transit Route"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Navigation className="h-3 w-3 text-indigo-600" />
                          {trip.to}
                        </span>
                      </div>

                      <div className="relative mt-2">
                        <div className="h-1.5 w-full rounded-full bg-slate-200">
                          <div
                            className={`h-1.5 rounded-full transition-all ${
                              st === "completed" ||
                              st === "delivered" ||
                              st === "settled"
                                ? "w-full bg-emerald-500"
                                : st === "in_transit"
                                  ? "w-3/5 bg-emerald-500 animate-pulse"
                                  : st === "dispatched"
                                    ? "w-1/4 bg-blue-500"
                                    : "w-1/12 bg-slate-300"
                            }`}
                          />
                        </div>
                      </div>

                      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                        <span>
                          Dispatch:{" "}
                          <b>
                            {trip.dispatchDate
                              ? new Date(trip.dispatchDate).toLocaleDateString(
                                  "en-IN",
                                  {
                                    day: "2-digit",
                                    month: "short",
                                  },
                                )
                              : "—"}
                          </b>
                        </span>
                        {trip.startingOdometer ? (
                          <span>
                            Odometer: <b>{trip.startingOdometer} km</b>
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* Driver & Consignment Details */}
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1.5">
                        <span className="text-slate-500 font-medium">
                          Assigned Driver:
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900">
                            {trip.driver}
                          </span>
                          {trip.driverPhone && trip.driverPhone !== "N/A" && (
                            <a
                              href={`tel:${trip.driverPhone}`}
                              className="inline-flex items-center gap-1 rounded bg-indigo-50 px-1.5 py-0.5 text-[11px] font-bold text-indigo-600 hover:bg-indigo-100"
                              title="Call Driver"
                            >
                              <Phone className="h-2.5 w-2.5" />
                              {trip.driverPhone}
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1.5">
                        <span className="text-slate-500 font-medium">
                          Trip Reference:
                        </span>
                        <span className="font-mono font-bold text-slate-800">
                          {trip.tripNumber ||
                            trip.bookingNumber ||
                            "Direct Dispatch"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Fast Action Buttons Footer */}
                  <div className="mt-3.5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2.5">
                    {st === "dispatched" && (
                      <button
                        onClick={() =>
                          actOnTrip(startTrip, trip._id, "started")
                        }
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-black text-slate-950 shadow-xs hover:bg-amber-400 transition"
                      >
                        <Play className="h-3 w-3 fill-current" />
                        Start Trip
                      </button>
                    )}

                    {st === "in_transit" && (
                      <button
                        onClick={() =>
                          actOnTrip(deliverTrip, trip._id, "delivered")
                        }
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-amber-700 transition"
                      >
                        <PackageCheck className="h-3 w-3" />
                        Mark Delivered
                      </button>
                    )}

                    {/* Diesel Slip Link */}
                    <button
                      onClick={() => router.push(`/fuels?autoOpenAdd=true`)}
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                      title="Add Diesel Voucher"
                    >
                      <Fuel className="h-3 w-3 text-slate-400" />
                      Fuel
                    </button>

                    <Link
                      href="/trips"
                      className="inline-flex h-7 w-7 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 transition"
                      title="Open Trip Details"
                    >
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
