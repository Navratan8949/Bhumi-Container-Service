"use client";
import { useEffect, useMemo, useState, useRef } from "react";
import {
  Menu,
  Search,
  X,
  ChevronDown,
  ChevronRight,
  Plus,
  BookOpen,
  Fuel,
  ReceiptIndianRupee,
  Route,
  CircleHelp,
  Bell,
  AlertTriangle,
  FileCheck,
  Info,
  Truck,
  ShieldAlert,
  Activity,
  PhoneCall,
  MapPin,
  UserCheck,
  SlidersHorizontal,
  LogOut,
  Building2,
  ShieldCheck,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import {
  clearSession,
  companyName,
  roleLabel,
  useActiveCompany,
} from "@/src/lib/auth";
import { groups } from "@/src/lib/resources";
import api from "@/src/services/api";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") ||
  "http://localhost:8000";

export default function Header({ user, onMenu, collapsed, onToggleCollapse }) {
  const router = useRouter();
  const activeCompany = useActiveCompany();
  const pathname = usePathname();
  const [q, setQ] = useState("");
  const [quickOpen, setQuickOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [alerts, setAlerts] = useState([]);

  const quickRef = useRef(null);
  const alertsRef = useRef(null);
  const profileRef = useRef(null);

  // Click outside listener for all dropdowns
  useEffect(() => {
    const handleDocClick = (e) => {
      if (quickRef.current && !quickRef.current.contains(e.target)) {
        setQuickOpen(false);
      }
      if (alertsRef.current && !alertsRef.current.contains(e.target)) {
        setAlertsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleDocClick);
    return () => document.removeEventListener("mousedown", handleDocClick);
  }, []);

  // Fetch alerts
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await api.get("/dashboard/alerts");
        if (res.data?.success && Array.isArray(res.data.data)) {
          const list = res.data.data;
          setAlerts(list);
        }
      } catch (e) {
        console.error("Failed to fetch alerts");
      }
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, []);

  const results = useMemo(() => {
    const all = groups.flatMap((g) =>
      g.items.map(([key, label]) => ({ key, label, group: g.label })),
    );
    return all
      .filter(
        (x) =>
          x.label.toLowerCase().includes(q.toLowerCase()) ||
          x.key.toLowerCase().includes(q.toLowerCase()),
      )
      .slice(0, 8);
  }, [q]);

  const current = groups
    .flatMap((g) => g.items)
    .find(([key]) => pathname === `/${key}` || pathname.startsWith(`/${key}/`));

  const go = (url) => {
    setQuickOpen(false);
    setAlertsOpen(false);
    setProfileOpen(false);
    router.push(url);
  };

  const logout = () => {
    setProfileOpen(false);
    clearSession();
    router.replace("/login");
  };

  const isAccountant = user?.role === "accountant";

  const quickActions = isAccountant
    ? [
        {
          label: "New Advance Memo",
          hint: "Issue driver advance & create voucher",
          icon: FileText,
          href: "/advance-memos?autoOpenAdd=true",
        },
        {
          label: "Settle Trip Balance",
          hint: "Driver expenses & baki balance settlement",
          icon: ReceiptIndianRupee,
          href: "/driver-trip-settlements?autoOpenAdd=true",
        },
        {
          label: "Record / Check Expense",
          hint: "Fleet diesel, repairs & operational kharcha",
          icon: Fuel,
          href: "/expenses?autoOpenAdd=true",
        },
      ]
    : [
        {
          label: "Dispatch Trip",
          hint: "Create truck trip & route",
          icon: Route,
          href: "/trips?autoOpenAdd=true",
        },
        {
          label: "New Advance Memo",
          hint: "Fast trip advance issuance",
          icon: BookOpen,
          href: "/advance-memos?autoOpenAdd=true",
        },
        {
          label: "Diesel / Fuel Slip",
          hint: "Fuel issuance & voucher",
          icon: Fuel,
          href: "/fuels?autoOpenAdd=true",
        },
        {
          label: "Lorry Settlement",
          hint: "Driver trip expense & batta settlement",
          icon: ReceiptIndianRupee,
          href: "/driver-trip-settlements?autoOpenAdd=true",
        },
      ];

  const [multipleCompanies, setMultipleCompanies] = useState(false);

  useEffect(() => {
    if (user?.role === "super_admin") {
      api.get("/companies")
        .then((res) => {
          const list = res?.data?.data || [];
          setMultipleCompanies(list.length > 1);
        })
        .catch(() => {});
    }
  }, [user]);

  const canSwitchCompany = user?.role === "super_admin" && multipleCompanies;

  return (
    <header className="fixed top-0 left-0 right-0 z-30 flex h-[72px] items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur-xl sm:px-6 lg:static lg:h-auto lg:min-h-[72px] lg:px-8 shadow-xs">
      {/* Left: Operational Context & Hub Status */}
      <div className="flex min-w-0 items-center gap-2.5">
        {/* Mobile menu trigger */}
        <button
          onClick={onMenu}
          className="rounded-xl p-2.5 text-slate-600 hover:bg-slate-100 lg:hidden cursor-pointer"
          title="Open Mobile Navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Desktop Sidebar Collapse / Expand Toggle */}
        {/* <button
          onClick={onToggleCollapse}
          title={collapsed ? "Expand Sidebar (Ctrl+B)" : "Collapse Sidebar to Icons (Ctrl+B)"}
          className="hidden lg:flex items-center justify-center rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
        >
          {collapsed ? (
            <PanelLeftOpen className="h-5 w-5 text-amber-600" />
          ) : (
            <PanelLeftClose className="h-5 w-5" />
          )}
        </button> */}

        <div className="min-w-0">
          <div className="hidden sm:flex items-center gap-2">
            <span className="h-5 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.16em] text-amber-600 leading-none">
              <Truck className="h-3 w-3 shrink-0" />
              <span className="leading-none">
                {activeCompany?.name || "Transport Management"}
              </span>
            </span>
            <span className="h-1 w-1 rounded-full bg-slate-300 shrink-0" />
            <span className="h-5 inline-flex items-center justify-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2 text-[9px] font-bold text-emerald-700 leading-none">
              <span className="relative flex h-1.5 w-1.5 shrink-0 items-center justify-center">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              <span className="leading-none">
                {activeCompany?.city
                  ? `${activeCompany.city} Hub Active`
                  : "Central Hub Active"}
              </span>
            </span>
            {canSwitchCompany && (
              <button
                type="button"
                onClick={() => go("/select-company")}
                className="h-5 inline-flex items-center justify-center gap-1 rounded-full bg-indigo-50 border border-indigo-200/90 px-2 text-[9px] font-black uppercase tracking-wider text-indigo-700 hover:bg-indigo-100 transition cursor-pointer leading-none"
                title="Switch Active Operating Company"
              >
                <Building2 className="h-2.5 w-2.5 shrink-0" />
                <span className="leading-none">Switch</span>
              </button>
            )}
          </div>
          <h1 className="truncate text-base sm:text-lg font-black tracking-tight text-slate-950">
            {current?.[1] || "Fleet Operations Control Tower"}
          </h1>
        </div>
      </div>

      {/* Middle & Right: Search, Quick Dispatch, Alerts, Profile */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* TMS Search Bar (Hidden for Driver & Vendor) */}
        {user?.role !== "driver" && user?.role !== "vendor" && (
          <div className="relative hidden xl:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search Trip No, Truck No (MP-09...), Booking, Driver..."
              className="w-80 rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-9 text-xs font-medium text-slate-900 outline-none focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-500/10 placeholder:text-slate-400"
            />
            {q && (
              <button
                onClick={() => setQ("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            {q && (
              <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-88 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
                <div className="px-3 py-1.5 border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Logistics Modules Matching "{q}"
                </div>
                {results.length ? (
                  results.map((x) => (
                    <button
                      key={x.key}
                      onClick={() =>
                        go(
                          x.key === "dashboard"
                            ? "/dashboard"
                            : x.key === "reports"
                              ? "/reports"
                              : `/${x.key}`,
                        )
                      }
                      className="w-full rounded-xl px-3 py-2 text-left hover:bg-amber-50/60 transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-800">
                          {x.label}
                        </p>
                        <p className="text-[10px] text-slate-400 uppercase font-semibold">
                          {x.group}
                        </p>
                      </div>
                      <span className="text-[11px] font-bold text-amber-600">
                        Open ➔
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-center text-xs text-slate-400 font-medium">
                    No operational module found.
                  </div>
                )}
              </div>
            )}
          </div>
        )}



        {/* Fleet Compliance & Document Expiry Alerts (Hidden for Driver & Vendor) */}
        {user?.role !== "driver" && user?.role !== "vendor" && (
          <div ref={alertsRef} className="relative">
            <button
              onClick={() => {
                setAlertsOpen(!alertsOpen);
                setQuickOpen(false);
                setProfileOpen(false);
              }}
              className={`relative flex h-10 w-10 items-center justify-center rounded-xl border transition-all cursor-pointer ${
                alerts.length > 0
                  ? "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Bell className="h-4 w-4" />
              {alerts.length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-rose-600 px-1 font-mono text-[9px] font-black text-white shadow-xs">
                  {alerts.length}
                </span>
              )}
            </button>

            {alertsOpen && (
              <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-88 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 px-1">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-amber-600" />
                    <p className="text-xs font-black text-slate-900 uppercase tracking-wide">
                      Fleet Alerts & Expiries ({alerts.length})
                    </p>
                  </div>
                  <button
                    onClick={() => go("/vehicle-documents")}
                    className="text-[10px] font-bold text-amber-700 hover:text-amber-800 hover:underline cursor-pointer"
                  >
                    View All Documents
                  </button>
                </div>

                <div className="max-h-80 overflow-y-auto py-2 space-y-1.5 [scrollbar-width:thin]">
                  {alerts.length > 0 ? (
                    alerts.map((a, i) => (
                      <div
                        key={i}
                        onClick={() => {
                          setAlertsOpen(false);
                          if (
                            a.category === "document" ||
                            a.documentType ||
                            a.title?.toLowerCase().includes("document")
                          ) {
                            window.dispatchEvent(
                              new CustomEvent("nrl-open-compliance-alert"),
                            );
                          } else {
                            go(a.link || "/vehicle-documents");
                          }
                        }}
                        className={`flex items-start gap-2.5 rounded-xl border p-2.5 cursor-pointer transition-colors ${
                          a.severity === "high" || a.type === "danger"
                            ? "border-rose-100 bg-rose-50/50 hover:bg-rose-50 text-rose-900"
                            : a.severity === "medium" || a.type === "warning"
                              ? "border-amber-100 bg-amber-50/50 hover:bg-amber-50 text-amber-900"
                              : "border-slate-100 bg-slate-50/50 hover:bg-slate-50 text-slate-800"
                        }`}
                      >
                        <AlertTriangle
                          className={`h-4 w-4 shrink-0 mt-0.5 ${
                            a.severity === "high" || a.type === "danger"
                              ? "text-rose-600"
                              : "text-amber-600"
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <p className="text-xs font-bold leading-snug">
                              {a.title}
                            </p>
                            {(a.category === "document" || a.documentType) && (
                              <span className="text-[9px] font-black uppercase text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded-md">
                                Pop Alert
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] opacity-80 mt-0.5 leading-relaxed">
                            {a.message}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
                        <FileCheck className="h-6 w-6 text-emerald-600" />
                      </div>
                      <p className="mt-3 text-xs font-black text-slate-900">
                        All Vehicles & Permits In Order
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        No overdue documents or fitness expiries.
                      </p>
                    </div>
                  )}
                </div>

                {alerts.some(
                  (a) =>
                    a.category === "document" ||
                    a.documentType ||
                    a.title?.toLowerCase().includes("document"),
                ) && (
                  <div className="pt-2 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setAlertsOpen(false);
                        window.dispatchEvent(
                          new CustomEvent("nrl-open-compliance-alert"),
                        );
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-black transition cursor-pointer shadow-xs"
                    >
                      <ShieldAlert className="h-4 w-4" />
                      <span>View Transport Compliance Pop-up Alert</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Quick Operations Dispatch Add Button (Hidden for Driver & Vendor) */}
        {user?.role !== "driver" && user?.role !== "vendor" && (
          <div ref={quickRef} className="relative hidden sm:block">
            <button
              onClick={() => {
                setQuickOpen(!quickOpen);
                setAlertsOpen(false);
                setProfileOpen(false);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-3.5 py-2 text-xs font-black text-slate-950 shadow-sm shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 transition-all uppercase tracking-wider cursor-pointer"
            >
              <Plus className="h-4 w-4 stroke-[3]" />
              <span>{isAccountant ? "Accounts Actions" : "Fast Dispatch"}</span>
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform duration-200 ${quickOpen ? "rotate-180" : ""}`}
              />
            </button>

            {quickOpen && (
              <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-80 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
                <div className="px-3 pb-2 pt-2 border-b border-slate-100">
                  <p className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    {isAccountant
                      ? "Accounts & Settlement Desk"
                      : "Fast Operations Desk"}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {isAccountant
                      ? "Manage advance memos, trip settlements (baki balance) & expenses."
                      : "Generate dispatch documents and vouchers immediately."}
                  </p>
                </div>
                <div className="py-1">
                  {quickActions.map(({ label, hint, icon: Icon, href }) => (
                    <button
                      key={label}
                      onClick={() => go(href)}
                      className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left hover:bg-amber-50/70 transition-colors cursor-pointer"
                    >
                      <span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-100/80 text-amber-900 shrink-0">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div>
                        <span className="block text-xs font-bold text-slate-900">
                          {label}
                        </span>
                        <span className="block text-[10px] text-slate-500">
                          {hint}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => go("/help")}
                  className="mt-1 flex w-full items-center gap-2.5 rounded-xl border-t border-slate-100 p-2.5 text-left hover:bg-slate-50 cursor-pointer"
                >
                  <CircleHelp className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="text-xs font-bold text-slate-700">
                    TMS Standard Operating Manual
                  </span>
                </button>
              </div>
            )}
          </div>
        )}

        {user?.role !== "driver" && user?.role !== "vendor" && (
          <div className="hidden h-7 w-px bg-slate-200 sm:block" />
        )}

        {/* ========================================================= */}
        {/* OPERATOR USER CARD & HIGH-END TRANSPORT PROFILE DROPDOWN  */}
        {/* ========================================================= */}
        <div ref={profileRef} className="relative">
          <button
            onClick={() => {
              setProfileOpen(!profileOpen);
              setQuickOpen(false);
              setAlertsOpen(false);
            }}
            className={`flex items-center gap-2.5 rounded-xl border p-1.5 pr-2.5 transition-all cursor-pointer ${
              profileOpen
                ? "border-amber-400 bg-amber-50/60 ring-2 ring-amber-400/20 shadow-xs"
                : "border-slate-200 bg-white hover:border-amber-300 hover:bg-amber-50/30"
            }`}
          >
            {/* Operator Avatar with Green Pulse Online Indicator */}
            <div className="relative">
              {user?.profileImage ? (
                <img
                  src={`${BASE_URL}${user.profileImage}`}
                  alt="Avatar"
                  className="h-9 w-9 rounded-xl object-cover border border-slate-200"
                />
              ) : (
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-slate-900 text-xs font-black text-amber-400 border border-slate-800 shadow-2xs">
                  {(user?.name || "OP").slice(0, 2).toUpperCase()}
                </div>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500">
                <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
              </span>
            </div>

            {/* Operator Text Details (Desktop) */}
            <div className="hidden text-left sm:block">
              <p className="max-w-32 truncate text-xs font-black text-slate-900 leading-tight">
                {user?.name || "Dispatch Operator"}
              </p>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span className="rounded bg-amber-100/90 px-1.5 py-0.2 font-mono text-[9px] font-black uppercase tracking-wider text-amber-800 border border-amber-200/80">
                  {roleLabel(user?.role)}
                </span>
              </div>
            </div>

            <ChevronDown
              className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
                profileOpen ? "rotate-180 text-amber-600" : ""
              }`}
            />
          </button>

          {/* Floating High-End Profile Card Dropdown */}
          {profileOpen && (
            <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-80 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xl transition-all animate-in fade-in slide-in-from-top-2 duration-150">
              {/* Dropdown Header: Dark Control Tower Operator ID Badge */}
              <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-[#0b1220] to-slate-900 p-4 text-white border-b border-slate-800">
                <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-amber-500/10 blur-xl pointer-events-none" />

                <div className="relative flex items-center gap-3">
                  {user?.profileImage ? (
                    <img
                      src={`${BASE_URL}${user.profileImage}`}
                      alt="Avatar"
                      className="h-11 w-11 rounded-xl object-cover border-2 border-amber-400/80 shadow-md"
                    />
                  ) : (
                    <div className="grid h-11 w-11 place-items-center rounded-xl bg-amber-500 text-slate-950 text-sm font-black border border-amber-400 shadow-md">
                      {(user?.name || "OP").slice(0, 2).toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-black text-white">
                        {user?.name || "Dispatch Operator"}
                      </p>
                      <Sparkles className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    </div>
                    <p className="truncate font-mono text-[11px] text-slate-400">
                      {user?.email ||
                        (activeCompany?.code
                          ? `operator@${activeCompany.code.toLowerCase()}logistics.com`
                          : "operator@transportops.com")}
                    </p>
                  </div>
                </div>

                {/* Hub & Role Badges Strip */}
                <div className="mt-3 flex flex-wrap items-center gap-1.5 pt-2.5 border-t border-slate-800/80 text-[10px]">
                  <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/20 px-2 py-0.5 font-mono font-black uppercase text-amber-300">
                    <Truck className="h-3 w-3 text-amber-400" />
                    {roleLabel(user?.role)}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 font-semibold text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Online •{" "}
                    {activeCompany?.city
                      ? `${activeCompany.city} Hub`
                      : "Central Hub"}
                  </span>
                </div>

                {/* Branch / Operating Company Notice */}
                <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between bg-slate-900/60 rounded-lg px-2.5 py-1 border border-slate-800">
                  <span className="text-slate-400 font-medium">
                    Depot Context:
                  </span>
                  <span className="font-bold text-amber-200 truncate max-w-[150px]">
                    {companyName(user)}
                  </span>
                </div>
              </div>

              {/* Categorized Menu Items with Transport Icons */}
              <div className="p-2 space-y-1">
                <div className="px-3 pt-2 pb-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Operator Workspace
                </div>

                {/* 1. My Profile */}
                <button
                  onClick={() => go("/profile")}
                  className="group flex w-full items-center justify-between rounded-xl p-2.5 text-left hover:bg-amber-50/60 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-blue-700 border border-blue-100/80 group-hover:bg-blue-100/80 transition-colors shrink-0">
                      <UserCheck className="h-4.5 w-4.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-900 group-hover:text-amber-950 transition-colors">
                        My Profile & KYC
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">
                        Personal credentials, mobile & password
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                </button>

                {/* 2. Fleet & System Settings (Hidden for Driver & Vendor) */}
                {user?.role !== "driver" && user?.role !== "vendor" && (
                  <button
                    onClick={() => go("/settings")}
                    className="group flex w-full items-center justify-between rounded-xl p-2.5 text-left hover:bg-amber-50/60 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-50 text-amber-700 border border-amber-200/80 group-hover:bg-amber-100/80 transition-colors shrink-0">
                        <SlidersHorizontal className="h-4.5 w-4.5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-slate-900 group-hover:text-amber-950 transition-colors">
                          Fleet & Depot Settings
                        </p>
                        <p className="text-[10px] text-slate-500 truncate">
                          Company masters, voucher series & prefixes
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                  </button>
                )}

                {/* 3. Switch Operating Hub / Company */}
                {canSwitchCompany && (
                  <button
                    onClick={() => go("/select-company")}
                    className="group flex w-full items-center justify-between rounded-xl p-2.5 text-left hover:bg-emerald-50/60 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 group-hover:bg-emerald-100 transition-colors shrink-0">
                        <Building2 className="h-4.5 w-4.5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-slate-900 group-hover:text-emerald-950 transition-colors">
                          Switch Branch / Company
                        </p>
                        <p className="text-[10px] text-slate-500 truncate">
                          Multi-depot & company switcher
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                  </button>
                )}

                {/* 4. Transport Desk SOP & Manual (Hidden for Driver & Vendor) */}
                {user?.role !== "driver" && user?.role !== "vendor" && (
                  <button
                    onClick={() => go("/help")}
                    className="group flex w-full items-center justify-between rounded-xl p-2.5 text-left hover:bg-purple-50/60 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="grid h-9 w-9 place-items-center rounded-xl bg-purple-50 text-purple-700 border border-purple-100 group-hover:bg-purple-100 transition-colors shrink-0">
                        <BookOpen className="h-4.5 w-4.5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-slate-900 group-hover:text-purple-950 transition-colors">
                          Transport Desk SOP & Manual
                        </p>
                        <p className="text-[10px] text-slate-500 truncate">
                          Consignment rules, driver allowance &amp; operations guide
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                  </button>
                )}
              </div>

              {/* Divider & Secure Sign Out */}
              <div className="border-t border-slate-100 p-2 bg-slate-50/40">
                <button
                  onClick={logout}
                  className="group flex w-full items-center justify-between rounded-xl p-2.5 text-left hover:bg-rose-50 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-rose-100/80 text-rose-700 border border-rose-200/80 group-hover:bg-rose-200 transition-colors shrink-0">
                      <LogOut className="h-4.5 w-4.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-rose-700 group-hover:text-rose-800 transition-colors">
                        Logout Operator Session
                      </p>
                      <p className="text-[10px] text-rose-500/80 truncate">
                        Safely sign out from Control Tower
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-rose-300 group-hover:text-rose-600 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
