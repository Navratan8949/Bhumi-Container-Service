"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Truck,
  Settings,
  Building2,
  FileText,
  Route,
  Fuel,
  Receipt,
  Users,
  MapPin,
  Package,
  ShieldCheck,
  CheckCircle2,
  Save,
  Printer,
  SlidersHorizontal,
  ExternalLink,
  ChevronRight,
  PhoneCall,
  Sparkles,
  Layers,
  Info,
  Mail,
  Send,
  KeyRound,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  getStoredUser,
  roleLabel,
  useActiveCompany,
  setActiveCompany,
} from "@/src/lib/auth";
import { canViewModule } from "@/src/lib/rbac";
import api from "@/src/services/api";

export default function SettingsPage() {
  const [user, setUser] = useState(null);
  const activeCompany = useActiveCompany();
  const [activeTab, setActiveTab] = useState("series");
  const [saving, setSaving] = useState(false);

  // Global System & SMTP Settings State
  const [systemSettings, setSystemSettings] = useState({
    smtpHost: "smtp.gmail.com",
    smtpPort: 587,
    smtpUser: "",
    smtpPass: "",
    hasSmtpPass: false,
    smtpFromEmail: "",
  });
  const [testEmailAddress, setTestEmailAddress] = useState("");
  const [isTestingEmail, setIsTestingEmail] = useState(false);

  // Config State (persisted per company context)
  const companyKey = activeCompany?._id
    ? `tms_fleet_settings_${activeCompany._id}`
    : "nrl_fleet_settings";
  const defaultSettings = useMemo(() => {
    const code = activeCompany?.code || "TMS";
    const gst = activeCompany?.gstNumber || activeCompany?.gstin || "";
    const pan =
      activeCompany?.panNumber ||
      (gst && gst.length >= 12 ? gst.slice(2, 12).toUpperCase() : "");

    return {
      tripPrefix: "TRIP-2026-",
      tripStartNumber: "501",
      dieselPrefix: "DSL-",
      dieselStartNumber: "201",
      invoicePrefix: "INV-2026-",
      invoiceStartNumber: "101",
      advancePrefix: "ADV-",
      advanceStartNumber: "301",
      primaryHub: activeCompany?.city
        ? `${activeCompany.city} Central Depot`
        : "Central Dispatch Depot",
      highwayCorridor: activeCompany?.city
        ? `${activeCompany.city} - Mumbai / Bhiwandi - Delhi NCR`
        : "Interstate Freight Corridors",
      gstNumber: gst,
      panNumber: pan,
      hotline: activeCompany?.phone || "1800-266-9999",
      printCopies: {
        consignor: true,
        consignee: true,
        driver: true,
        accounts: true,
      },
      termsCondition:
        "All consignments transported subject to Carriage by Road Act 2007. Demurrage chargeable @ ₹1000/day after 24 hours of arrival at destination terminal.",
    };
  }, [activeCompany]);

  const [settings, setSettings] = useState(defaultSettings);

  useEffect(() => {
    const u = getStoredUser();
    if (u) {
      setUser(u);
      if (u.email) setTestEmailAddress(u.email);
    }

    try {
      const saved = localStorage.getItem(companyKey);
      if (saved) {
        setSettings({ ...defaultSettings, ...JSON.parse(saved) });
      } else {
        setSettings(defaultSettings);
      }
    } catch (e) {
      console.error("Failed to load settings from storage", e);
      setSettings(defaultSettings);
    }

    // Load Centralized System & SMTP Settings
    api
      .get("/settings")
      .then((res) => {
        if (res.data?.success && res.data?.data) {
          setSystemSettings(res.data.data);
        }
      })
      .catch((err) => console.error("Global settings fetch error:", err));
  }, [companyKey, defaultSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      localStorage.setItem(companyKey, JSON.stringify(settings));

      // 1. Sync GSTIN & PAN to the operating company in backend database
      if (activeCompany?._id) {
        try {
          const res = await api.put(`/companies/${activeCompany._id}`, {
            gstNumber: settings.gstNumber?.trim().toUpperCase(),
            panNumber: settings.panNumber?.trim().toUpperCase(),
            phone: settings.hotline,
          });
          if (res.data?.success && res.data.data) {
            setActiveCompany(res.data.data);
          }
        } catch (apiErr) {
          console.error("Company database sync warning:", apiErr);
        }
      }

      // 2. Save Centralized Global Settings (SMTP Alerts Engine)
      try {
        const sysRes = await api.put("/settings", systemSettings);
        if (sysRes.data?.success && sysRes.data?.data) {
          setSystemSettings(sysRes.data.data);
        }
      } catch (sysErr) {
        console.error("System settings save error:", sysErr);
      }

      toast.success(
        "All settings & central SMTP configuration saved successfully!",
      );
    } catch (e) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmailAddress) {
      toast.error("Please enter an email address for testing");
      return;
    }
    setIsTestingEmail(true);
    try {
      const res = await api.post("/settings/test-email", {
        email: testEmailAddress,
      });
      if (res.data?.success) {
        toast.success(
          res.data.message ||
            `Test verification email sent to ${testEmailAddress}`,
        );
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          "SMTP connection failed. Check host, port, user and app password.",
      );
    } finally {
      setIsTestingEmail(false);
    }
  };

  const masters = [
    {
      title: "Container Fleet & Trucks",
      key: "vehicles",
      href: "/vehicles",
      icon: Truck,
      desc: "Prime movers, container trailers, fitness, insurance & permits",
      badge: "Fleet Assets",
    },
    {
      title: "Commercial Drivers & Crew",
      key: "drivers",
      href: "/drivers",
      icon: Users,
      desc: "Heavy container vehicle drivers, license validity & phone records",
      badge: "Driver Crew",
    },
    {
      title: "Brokers & Hired Transporters",
      key: "vendors",
      href: "/vendors",
      icon: Building2,
      desc: "Market truck owners, hired fleet brokers & freight partners",
      badge: "Market Logistics",
    },
    {
      title: "Fuel Stations & Diesel Pumps",
      key: "fuels",
      href: "/fuels",
      icon: Fuel,
      desc: "Authorized diesel bunk tie-ups, credit accounts & fuel indents",
      badge: "Fuel Accounts",
    },
    {
      title: "Staff & Accountants",
      key: "users",
      href: "/users",
      icon: ShieldCheck,
      desc: "Create & manage Accountants, Managers & Admin logins with role-based access",
      badge: "Accountants & Staff",
    },
    {
      title: "Companies & Operating Hubs",
      key: "companies",
      href: "/companies",
      icon: Building2,
      desc: "Registered transport operating entities & branch offices",
      badge: "Legal Entities",
    },
  ];

  const visibleMasters = useMemo(() => {
    return masters.filter((m) => canViewModule(user?.role, m.key));
  }, [user?.role]);

  return (
    <div className="w-full min-w-0 space-y-6 pb-20">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-amber-500/10 text-amber-600">
              <Truck className="h-3.5 w-3.5" />
            </span>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">
              Central Fleet Depot • Operational Configuration
            </p>
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
            Fleet & Depot Settings
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure trip series prefixes, highway corridor defaults, master
            directories & transit rules
          </p>
        </div>

        <button
          onClick={handleSave}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2.5 text-xs font-black text-slate-950 shadow-sm shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 transition cursor-pointer"
        >
          <Save className="h-4 w-4 stroke-[2.5]" />
          <span>Save Settings</span>
        </button>
      </div>

      {/* Control Tower Operating Context Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-950 via-[#0b1220] to-slate-900 p-6 text-white shadow-xl">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black shadow-lg shadow-amber-500/20 border border-amber-300">
              <Truck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-[0.16em] text-amber-400">
                  {activeCompany?.name || "Operating Transport Company"}
                </span>
                <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-300">
                  TMS Enterprise v2.4
                </span>
              </div>
              <h2 className="text-lg font-black text-white mt-0.5">
                Central Operations Command & Depot Control
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 max-w-xl leading-relaxed">
                Primary Dispatch Yard:{" "}
                <strong className="text-amber-200">
                  {activeCompany?.city
                    ? `${activeCompany.city} Depot`
                    : "Central Dispatch Depot"}
                </strong>{" "}
                · Active Corridors: Mumbai Bhiwandi, Ahmedabad, Pune, Delhi NCR.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left">
              <span className="block text-[10px] uppercase font-bold text-slate-400">
                Current Operator
              </span>
              <span className="block text-xs font-black text-amber-300 truncate max-w-[140px]">
                {user?.name || "Dispatch Officer"}
              </span>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left">
              <span className="block text-[10px] uppercase font-bold text-slate-400">
                Operating Role
              </span>
              <span className="block text-xs font-black text-emerald-300">
                {roleLabel(user?.role)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto [scrollbar-width:none]">
        {[
          { id: "series", label: "Voucher Series", icon: FileText },
          { id: "system", label: "Email & System SMTP", icon: Mail },
          { id: "masters", label: "Master Setup Directory", icon: Layers },
          { id: "depot", label: "Depot & Corridors", icon: Building2 },
          { id: "print", label: "Print & Transit Rules", icon: Printer },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                active
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: Voucher Series Configuration */}
      {activeTab === "series" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-950 uppercase tracking-wide">
                  Official Transport Document Numbering Series
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure dynamic auto-increment prefixes for Trip
                  Sheets, Diesel Slips, and Freight Invoices
                </p>
              </div>
              <span className="rounded-full bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 text-[10px] font-black text-indigo-700 uppercase">
                Series Engine
              </span>
            </div>

            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Trip Dispatch Sheet Series */}
              <div className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-100 text-emerald-700">
                      <Route className="h-4 w-4" />
                    </span>
                    <span className="text-xs font-black text-slate-900">
                      Trip Dispatch Sheet Series
                    </span>
                  </div>
                  <span className="font-mono text-xs font-black text-emerald-700">
                    Example: {settings.tripPrefix}
                    {settings.tripStartNumber}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Prefix
                    </label>
                    <input
                      type="text"
                      value={settings.tripPrefix}
                      onChange={(e) =>
                        setSettings({ ...settings, tripPrefix: e.target.value })
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-mono text-xs font-bold text-slate-900 focus:border-amber-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Starting Number
                    </label>
                    <input
                      type="text"
                      value={settings.tripStartNumber}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          tripStartNumber: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-mono text-xs font-bold text-slate-900 focus:border-amber-500 focus:outline-hidden"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  Assigned automatically to vehicle highway dispatches and
                  driver route manifests.
                </p>
              </div>

              {/* Fuel & Diesel Slip Voucher Series */}
              <div className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-amber-100 text-amber-700">
                      <Fuel className="h-4 w-4" />
                    </span>
                    <span className="text-xs font-black text-slate-900">
                      Diesel Slip Voucher Series
                    </span>
                  </div>
                  <span className="font-mono text-xs font-black text-amber-700">
                    Example: {settings.dieselPrefix}
                    {settings.dieselStartNumber}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Prefix
                    </label>
                    <input
                      type="text"
                      value={settings.dieselPrefix}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          dieselPrefix: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-mono text-xs font-bold text-slate-900 focus:border-amber-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Starting Number
                    </label>
                    <input
                      type="text"
                      value={settings.dieselStartNumber}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          dieselStartNumber: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-mono text-xs font-bold text-slate-900 focus:border-amber-500 focus:outline-hidden"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  Printed fuel pump indent issued to drivers for highway tank
                  filling.
                </p>
              </div>

              {/* Freight Commercial Invoice Series */}
              <div className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-blue-100 text-blue-700">
                      <Receipt className="h-4 w-4" />
                    </span>
                    <span className="text-xs font-black text-slate-900">
                      Commercial Invoice Series
                    </span>
                  </div>
                  <span className="font-mono text-xs font-black text-blue-700">
                    Example: {settings.invoicePrefix}
                    {settings.invoiceStartNumber}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Prefix
                    </label>
                    <input
                      type="text"
                      value={settings.invoicePrefix}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          invoicePrefix: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-mono text-xs font-bold text-slate-900 focus:border-amber-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Starting Number
                    </label>
                    <input
                      type="text"
                      value={settings.invoiceStartNumber}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          invoiceStartNumber: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-mono text-xs font-bold text-slate-900 focus:border-amber-500 focus:outline-hidden"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  Official GST Freight Invoices submitted to corporate
                  clients for billing.
                </p>
              </div>

              {/* Advance Memo Voucher Series */}
              <div className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-purple-100 text-purple-700">
                      <FileText className="h-4 w-4" />
                    </span>
                    <span className="text-xs font-black text-slate-900">
                      Advance Memo Series
                    </span>
                  </div>
                  <span className="font-mono text-xs font-black text-purple-700">
                    Example: {settings.advancePrefix || "ADV-"}
                    {settings.advanceStartNumber || "301"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Prefix
                    </label>
                    <input
                      type="text"
                      value={settings.advancePrefix || "ADV-"}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          advancePrefix: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-mono text-xs font-bold text-slate-900 focus:border-amber-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Starting Number
                    </label>
                    <input
                      type="text"
                      value={settings.advanceStartNumber || "301"}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          advanceStartNumber: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-mono text-xs font-bold text-slate-900 focus:border-amber-500 focus:outline-hidden"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  Driver pre-trip advance vouchers issued before container dispatch.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: Global System & SMTP Configuration */}
      {activeTab === "system" && (
        <div className="space-y-6">
          {/* Explanation Banner */}
          <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-5 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-600 text-white shadow-xs">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-blue-900">
                  Centralized Email &amp; SMTP Configuration
                </h4>
                <p className="mt-1 text-xs text-blue-700 leading-relaxed">
                  Configure your email server credentials once here. All
                  companies in your portal share this single SMTP connection for
                  daily morning compliance audit reports, document expiry
                  alerts, and maintenance warnings. The respective company’s
                  name (e.g.{" "}
                  <strong>
                    {activeCompany?.name || "Bhumi Container Service"}
                  </strong>
                  ) will automatically be shown as the Sender Name in the
                  dispatched emails.
                </p>
              </div>
            </div>
          </div>

          {/* SMTP Credentials Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-950 uppercase tracking-wide">
                  Mail Server (SMTP) Connection
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Standard TLS/SSL outgoing mail server for automated alerts and
                  notifications
                </p>
              </div>
              {systemSettings.hasSmtpPass ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Credentials Configured
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-bold text-amber-700">
                  <Info className="h-3.5 w-3.5 text-amber-600" />
                  Using .env Fallback
                </span>
              )}
            </div>

            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  SMTP Host Server
                </label>
                <input
                  type="text"
                  placeholder="smtp.gmail.com"
                  value={systemSettings.smtpHost || ""}
                  onChange={(e) =>
                    setSystemSettings({
                      ...systemSettings,
                      smtpHost: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-800 focus:border-amber-500 focus:outline-hidden"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  e.g. smtp.gmail.com, smtp.office365.com, or your corporate
                  mail host
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  SMTP Port
                </label>
                <input
                  type="number"
                  placeholder="587"
                  value={systemSettings.smtpPort || 587}
                  onChange={(e) =>
                    setSystemSettings({
                      ...systemSettings,
                      smtpPort: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-800 focus:border-amber-500 focus:outline-hidden"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Port 587 (TLS, recommended) or 465 (SSL)
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  SMTP User / Account Email
                </label>
                <input
                  type="email"
                  placeholder="operations@bhumicontainer.in"
                  value={systemSettings.smtpUser || ""}
                  onChange={(e) =>
                    setSystemSettings({
                      ...systemSettings,
                      smtpUser: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-800 focus:border-amber-500 focus:outline-hidden"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Full email address used for authenticating with the mail
                  server
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  SMTP App Password / Auth Secret
                </label>
                <input
                  type="password"
                  placeholder={
                    systemSettings.hasSmtpPass
                      ? "•••••••••••• (Leave blank to keep existing)"
                      : "Enter 16-character Google App Password"
                  }
                  value={systemSettings.smtpPass || ""}
                  onChange={(e) =>
                    setSystemSettings({
                      ...systemSettings,
                      smtpPass: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-800 focus:border-amber-500 focus:outline-hidden"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  For Gmail, generate an App Password in your Google Account
                  &gt; Security
                </span>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  From Email Address (Optional Override)
                </label>
                <input
                  type="email"
                  placeholder="bhumicontainerservice@gmail.com"
                  value={systemSettings.smtpFromEmail || ""}
                  onChange={(e) =>
                    setSystemSettings({
                      ...systemSettings,
                      smtpFromEmail: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-800 focus:border-amber-500 focus:outline-hidden"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Leave blank to send directly from the SMTP User email address
                </span>
              </div>
            </div>
          </div>

          {/* Test Email Connection Box */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5 shadow-xs">
            <h4 className="text-xs font-black uppercase tracking-wider text-amber-950 flex items-center gap-2">
              <Send className="h-4 w-4 text-amber-600" />
              Verify SMTP Connection &amp; Send Test Alert
            </h4>
            <p className="mt-1 text-xs text-amber-900 leading-relaxed">
              Send a test verification email right now to confirm that your SMTP
              server host, user, and app password are functioning properly.
            </p>
            <div className="mt-3 flex flex-col sm:flex-row items-center gap-2">
              <input
                type="email"
                placeholder="Enter recipient email (e.g. operations@bhumicontainer.in)"
                value={testEmailAddress}
                onChange={(e) => setTestEmailAddress(e.target.value)}
                className="w-full sm:max-w-md rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-amber-500 focus:outline-hidden"
              />
              <button
                type="button"
                onClick={handleSendTestEmail}
                disabled={isTestingEmail}
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-black text-slate-950 shadow-xs hover:bg-amber-400 transition cursor-pointer disabled:opacity-50"
              >
                {isTestingEmail ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    Send Test Email
                  </>
                )}
              </button>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: Setup & Admin Master Directory Grid */}
      {activeTab === "masters" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-950 uppercase tracking-wide">
                Central Transport Masters Directory
              </h3>
              <p className="text-xs text-slate-500">
                Direct access to client accounts, transport partners,
                commodities, hubs and operator privileges
              </p>
            </div>
            <span className="text-xs font-bold text-slate-400">
              {visibleMasters.length} Transport Masters
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {visibleMasters.map((m) => {
              const Icon = m.icon;
              return (
                <Link
                  key={m.key}
                  href={m.href}
                  className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:border-amber-400 hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-50 text-amber-700 border border-amber-200 group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors">
                        <Icon className="h-4.5 w-4.5" />
                      </span>
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-slate-600">
                        {m.badge}
                      </span>
                    </div>

                    <h4 className="mt-3 text-sm font-black text-slate-900 group-hover:text-amber-950 transition-colors">
                      {m.title}
                    </h4>
                    <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                      {m.desc}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-100 text-xs font-bold text-slate-600 group-hover:text-amber-800">
                    <span>Manage Master</span>
                    <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: Depot & Corridors */}
      {activeTab === "depot" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-black text-slate-950 uppercase tracking-wide">
              Central Depot & Regional Highway Corridors
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Hub operating address, highway routing matrix, and emergency
              control tower contacts
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                Primary Central Yard / Depot
              </label>
              <input
                type="text"
                value={settings.primaryHub}
                onChange={(e) =>
                  setSettings({ ...settings, primaryHub: e.target.value })
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-900 focus:border-amber-500 focus:outline-hidden"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Appears as default origin terminal in newly created trips.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                Major Highway Corridors
              </label>
              <input
                type="text"
                value={settings.highwayCorridor}
                onChange={(e) =>
                  setSettings({ ...settings, highwayCorridor: e.target.value })
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-900 focus:border-amber-500 focus:outline-hidden"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Key commercial transit routes monitored by Central Control
                Tower.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                Central Transport GSTIN (15 Digits)
              </label>
              <input
                type="text"
                placeholder="e.g. 23AABCN1234F1Z5"
                value={settings.gstNumber}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  const derivedPan =
                    val.length >= 12 &&
                    (!settings.panNumber ||
                      settings.panNumber === settings.gstNumber?.slice(2, 12))
                      ? val.slice(2, 12)
                      : settings.panNumber;
                  setSettings({
                    ...settings,
                    gstNumber: val,
                    panNumber: derivedPan,
                  });
                }}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-xs font-black text-slate-900 focus:border-amber-500 focus:outline-hidden"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Printed on Tax Invoices, e-Way bills & Challans.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                Income Tax PAN (10 Digits)
              </label>
              <input
                type="text"
                placeholder="e.g. AABCN1234F"
                maxLength={10}
                value={settings.panNumber}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    panNumber: e.target.value.toUpperCase(),
                  })
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-xs font-black text-slate-900 focus:border-amber-500 focus:outline-hidden"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Printed on Commercial Freight Tax Invoices (auto-derived from
                GST).
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                Company Helpline Number
              </label>
              <input
                type="text"
                value={settings.hotline}
                onChange={(e) =>
                  setSettings({ ...settings, hotline: e.target.value })
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-xs font-bold text-slate-900 focus:border-amber-500 focus:outline-hidden"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Printed on driver ID passes and transport documents for office assistance.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Print & Transit Rules */}
      {activeTab === "print" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-black text-slate-950 uppercase tracking-wide">
              Statutory Transport Conditions
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Legally compliant Carriage by Road statutory terms
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
              Statutory Consignment Terms & Conditions (Carriage by Road Act)
            </label>
            <textarea
              rows={4}
              value={settings.termsCondition}
              onChange={(e) =>
                setSettings({ ...settings, termsCondition: e.target.value })
              }
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-800 focus:border-amber-500 focus:outline-hidden"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Statutory carrier terms for {activeCompany?.name || "the operating company"}.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
