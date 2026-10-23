"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Search,
  WalletCards,
  Truck,
  Users,
  ReceiptIndianRupee,
  Star,
  Fuel,
  IndianRupee,
  Route,
  ShieldCheck,
  TrendingUp,
  FileText,
} from "lucide-react";
import { reportConfigs } from "@/src/lib/resources";
import { getStoredUser, useActiveCompany } from "@/src/lib/auth";
import { canViewReport } from "@/src/lib/rbac";

const icons = {
  Accounts: IndianRupee,
  Operations: Route,
  Fleet: Truck,
  HR: Users,
  Expenses: ReceiptIndianRupee,
};

const popular = [
  {
    key: "trip-profitability",
    title: "Trip Profitability (P&L)",
    desc: "Freight billed vs diesel, toll & driver allowance per journey.",
    icon: TrendingUp,
    color: "text-emerald-600 bg-emerald-50",
  },
  {
    key: "customer-outstanding",
    title: "Shipper Freight Outstanding",
    desc: "Commercial consignor billing & pending freight ledger.",
    icon: IndianRupee,
    color: "text-amber-600 bg-amber-50",
  },
  {
    key: "vendor-outstanding",
    title: "Market Lorry / Broker Payables",
    desc: "Market lorry broker hire balances, advance deductions & TDS.",
    icon: WalletCards,
    color: "text-blue-600 bg-blue-50",
  },
  {
    key: "fuel-efficiency",
    title: "Diesel Mileage & Efficiency",
    desc: "KM per litre audit across commercial goods vehicles.",
    icon: Fuel,
    color: "text-indigo-600 bg-indigo-50",
  },
  {
    key: "running-cost",
    title: "Per-KM Running Cost",
    desc: "Tyre, maintenance, toll & fuel cost per vehicle kilometre.",
    icon: Truck,
    color: "text-slate-800 bg-slate-100",
  },
];

export default function ReportsLanding() {
  const [search, setSearch] = useState("");
  const user = getStoredUser();
  const activeCompany = useActiveCompany();
  const role = user?.role || "";

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const allowedReports = reportConfigs.filter((r) =>
      canViewReport(role, r.key),
    );
    return Object.entries(
      allowedReports.reduce((acc, r) => {
        (acc[r.group] ??= []).push(r);
        return acc;
      }, {}),
    )
      .map(([group, items]) => [
        group,
        items.filter(
          (r) => !q || `${r.title} ${r.group}`.toLowerCase().includes(q),
        ),
      ])
      .filter(([, items]) => items.length);
  }, [search, role]);

  return (
    <div className="w-full min-w-0 space-y-6 pb-10">
      {/* Header Banner - Transport Operations Control Tower Style */}
      <section className="rounded-3xl border border-slate-800 bg-[#0b1220] p-6 text-white sm:p-8 shadow-xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="grid h-6 w-6 place-items-center rounded-lg bg-amber-500/10 text-amber-400">
                <Truck className="h-3.5 w-3.5" />
              </span>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-400">
                Transport Intelligence • Financial & Fleet Audit Desk
              </p>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white">
              Fleet & Freight Audit Reports
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Audit trip net profitability, diesel consumption & mileage,
              shipper freight receivables, hired transporter ledgers & driver
              trip settlements.
            </p>
            <div className="mt-3 flex items-center gap-4 text-xs font-semibold text-slate-400">
              <span>
                📍{" "}
                {activeCompany?.city
                  ? `${activeCompany.city} Central Hub`
                  : "Central Operations Hub"}
              </span>
              <span>•</span>
              <span>{activeCompany?.name || "Active Transport Entity"}</span>
              <span>•</span>
              <span className="text-emerald-400">Audit Compliant</span>
            </div>
          </div>
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reports by title or group…"
              className="w-full rounded-xl border border-slate-700 bg-slate-900/90 py-3 pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition"
            />
          </div>
        </div>
      </section>

      {/* Featured Transport Management Reports */}
      {!search && (
        <section>
          <div className="mb-3.5 flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-lg bg-amber-100 text-amber-700">
              <Star className="h-3.5 w-3.5 fill-current" />
            </span>
            <h2 className="text-base font-black text-slate-900 tracking-tight">
              Key Operational & Freight Audits
            </h2>
          </div>
          <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-5">
            {popular
              .filter((p) => canViewReport(role, p.key))
              .map((p) => {
                const Icon = p.icon;
                return (
                  <Link
                    key={p.key}
                    href={`/reports/${p.key}`}
                    className="group flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs transition-all hover:-translate-y-0.5 hover:border-amber-400 hover:shadow-md"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span
                          className={`grid h-9 w-9 place-items-center rounded-xl font-bold shadow-2xs ${p.color}`}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">
                          Audit
                        </span>
                      </div>
                      <p className="mt-3 text-sm font-black text-slate-900 leading-snug">
                        {p.title}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-500">
                        {p.desc}
                      </p>
                    </div>
                    <span className="mt-4 inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 group-hover:text-amber-800">
                      Open Register{" "}
                      <ArrowRight className="h-3 w-3 transition group-hover:translate-x-1" />
                    </span>
                  </Link>
                );
              })}
          </div>
        </section>
      )}

      {/* Grouped Audit Sections */}
      <div className="grid gap-5 xl:grid-cols-2">
        {groups.map(([group, items]) => {
          const Icon = icons[group] || BarChart3;
          return (
            <section
              key={group}
              className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs"
            >
              <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-900 text-amber-400 shadow-2xs">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-black text-slate-950 text-base">
                      {group} Audit
                    </h2>
                    <p className="text-xs text-slate-500">
                      {items.length} Transport Ledgers & Statements
                    </p>
                  </div>
                </div>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700">
                  {items.length} Reports
                </span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {items.map((r) => (
                  <Link
                    key={r.key}
                    href={`/reports/${r.key}`}
                    className="group flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/40 p-3 transition hover:border-amber-300 hover:bg-amber-50/50"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900 leading-snug group-hover:text-slate-950">
                        {r.title}
                      </p>
                      <p className="mt-0.5 text-[10px] text-slate-500">
                        Live operational ledger
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-1 group-hover:text-amber-600 shrink-0 ml-2" />
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {!groups.length && (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
          No transport report matched “{search}”.
        </div>
      )}
    </div>
  );
}
