"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useEffect } from "react";
import {
  ArrowRight,
  ArrowLeft,
  BookOpen,
  ClipboardList,
  Search,
  Truck,
  WalletCards,
  Wrench,
  ChevronRight,
  FileText,
  Network,
  PhoneCall,
  ShieldCheck,
  Fuel,
  MapPin,
  Clock,
  Gauge,
  ReceiptIndianRupee,
  BadgeAlert,
  HelpCircle,
  Navigation,
  Compass
} from "lucide-react";
import { getStoredUser, useActiveCompany } from "@/src/lib/auth";
import { canViewModule } from "@/src/lib/rbac";

const workflows = [
  {
    title: "1. Consignment Indenting & Lorry Receipt (LR) Desk",
    badge: "Indenting & Booking",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
    summary: "From customer delivery order (D.O.) receipt to legal consignment note (Bilty) generation.",
    icon: <ClipboardList className="h-5 w-5 text-blue-700" />,
    steps: [
      ["1", "Customer D.O. Received", "Log factory delivery order with commodity, grade, tonnage & dispatch deadline.", "/do-received"],
      ["2", "Internal Supply Order", "Create internal execution indent, allocate booked vs balance pending tonnage.", "/supply-orders"],
      ["3", "Truck Booking & Placement", "Book consignor payload against owned vehicle or hired market transporter.", "/bookings"],
      ["4", "Legal LR / Bilty Note", "Generate official 4-copy Consignment Note with GST, E-Way Bill & freight terms.", "/lr-bilties"],
    ],
  },
  {
    title: "2. Highway Dispatch, En-Route Transit & POD",
    badge: "Fleet Movement",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
    summary: "Vehicle assignment, fuel slip issuance, highway tracking to signed POD collection.",
    icon: <Truck className="h-5 w-5 text-emerald-700" />,
    steps: [
      ["1", "Trip Dispatch Slip", "Assign vehicle & licensed driver, verify starting odometer reading & route.", "/trips"],
      ["2", "Diesel Slip & Cash Advance", "Issue authorized fuel pump voucher and driver highway meal cash (Bata).", "/fuels"],
      ["3", "Transit & En-Route Checkpoints", "Monitor FASTag toll movement, border checkposts and delivery milestones.", "/trips"],
      ["4", "Road Expenses & Driver Bata", "Record highway toll receipts, tyre puncture, weighing scale & bridge expenses.", "/trip-expenses"],
      ["5", "POD (Proof of Delivery)", "Collect consignee rubber-stamped & signed acknowledgment copy of bilty.", "/customer-invoices"],
    ],
  },
  {
    title: "3. Fleet Maintenance, Fuel Efficiency & RTO Compliance",
    badge: "Workshop & Garage",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
    summary: "Commercial fleet upkeep, driver licensing, diesel mileage audits and statutory RTO fitness.",
    icon: <Wrench className="h-5 w-5 text-amber-700" />,
    steps: [
      ["1", "Commercial Vehicle Master", "Register truck payload capacity (MT), body type (Open/Container) & tyre axles.", "/vehicles"],
      ["2", "HMV Driver KYC & Licenses", "Maintain heavy commercial vehicle driving license, badge number & driver KYC.", "/drivers"],
      ["3", "Diesel Fuel Log & KM/L Audit", "Audit pump voucher slip, fuel price/litre, odometer difference & vehicle mileage.", "/fuels"],
      ["4", "Yard Workshop & Tyre Job Cards", "Track spare parts, engine servicing, tyre serial number fitment & retreading.", "/maintenances"],
      ["5", "RTO Statutory Document Tracking", "Monitor Fitness Certificate, National Permit, Road Tax, Insurance & PUC validity.", "/vehicle-documents"],
    ],
  },
  {
    title: "4. Freight Billing, Transporter Payouts & P&L",
    badge: "Accounts & Audit",
    badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
    summary: "Shipper freight invoicing, collections, market transporter settlement and trip profitability.",
    icon: <WalletCards className="h-5 w-5 text-purple-700" />,
    steps: [
      ["1", "Shipper Freight Invoicing", "Generate GST freight invoice attached with physical or scanned POD copies.", "/customer-invoices"],
      ["2", "Freight Payment Recovery", "Record NEFT/RTGS/Cheque collections, deduct TDS (Sec 194C) & close ledger.", "/customer-payments"],
      ["3", "Market Transporter Freight Bills", "Audit hired vehicle bills, deduct diesel advances, TDS & detention charges.", "/vendor-bills"],
      ["4", "Transporter Vendor Payouts", "Disburse final bank payments to fleet owners and market suppliers.", "/vendor-payments"],
      ["5", "Driver Trip Settlement", "Reconcile driver road cash, toll, loading charges & final trip accounts.", "/driver-trip-settlements"],
      ["6", "Trip Profitability (P&L) Audit", "Audit net margin: Billed Freight minus Diesel, Toll, Bata & Maintenance.", "/reports/trip-profitability"],
    ],
  },
  {
    title: "5. Port Container Free Days, Demurrage & Empty Return",
    badge: "Port & Demurrage",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
    summary: "Shipping line container inward from port terminal, free days tracking (7/14 days), and empty yard return.",
    icon: <Clock className="h-5 w-5 text-amber-700" />,
    steps: [
      ["1", "Port Container Gate-Out & Inward", "Record container number (20ft/40ft/40HC), shipping line, port terminal & seal number.", "/container-detentions"],
      ["2", "Free Time & Demurrage Watch", "Track shipping line free days window to avoid ₹3,000–₹5,000/day detention penalties.", "/container-detentions"],
      ["3", "Factory Unloading & CFS Transport", "Move container from port to customer factory or CFS depot on heavy trailer.", "/trips"],
      ["4", "Empty Container Depot Return", "Log empty return date & EIR interchange receipt at designated empty yard.", "/container-detentions"],
      ["5", "Detention Penalty Audit", "Audit final shipping line demurrage invoices against actual gate-in interchange receipts.", "/container-detentions"],
    ],
  },
];

const transportTerms = [
  { 
    term: "Container Demurrage & Free Days", 
    code: "PORT DETENTION",
    meaning: "Daily financial penalty billed by shipping lines (Maersk, MSC, CMA CGM) when a container is held beyond free days (usually 7 or 14 days) before empty return to depot.", 
    icon: <Clock className="w-4 h-4 text-amber-600" /> 
  },
  { 
    term: "EIR (Equipment Interchange Receipt)", 
    code: "PORT GATE PASS",
    meaning: "Official physical/electronic dock receipt issued by port or CFS terminal proving container gate-in/gate-out condition and handover timestamp.", 
    icon: <FileText className="w-4 h-4 text-emerald-600" /> 
  },
  { 
    term: "LR / Bilty (Lorry Receipt)", 
    code: "CONSIGNMENT NOTE",
    meaning: "The foundational legal contract under Carriage by Road Act 2007. Serves as official title to goods during highway transit.", 
    icon: <FileText className="w-4 h-4 text-blue-600" /> 
  },
  { 
    term: "D.O. (Delivery Order)", 
    code: "DISPATCH AUTHORITY",
    meaning: "Official delivery order issued by consignor or manufacturing plant authorizing the transport carrier to lift goods.", 
    icon: <ClipboardList className="w-4 h-4 text-emerald-600" /> 
  },
  { 
    term: "POD (Proof of Delivery)", 
    code: "RECEIPT VOUCHER",
    meaning: "Physical consignee-signed & rubber-stamped copy of LR proving safe delivery. Mandatory for releasing freight payment.", 
    icon: <ShieldCheck className="w-4 h-4 text-purple-600" /> 
  },
  { 
    term: "Driver Batta / Trip Allowance", 
    code: "HIGHWAY ALLOWANCE",
    meaning: "Daily subsistence allowance provided to heavy truck drivers for highway meals, en-route tea, and personal upkeep.", 
    icon: <ReceiptIndianRupee className="w-4 h-4 text-amber-600" /> 
  },
  { 
    term: "Diesel Slip / Indent", 
    code: "PUMP VOUCHER",
    meaning: "Credit voucher issued to contracted petrol pumps (IOCL/BPCL/HPCL) authorizing truck refueling with odometer logging.", 
    icon: <Fuel className="w-4 h-4 text-rose-600" /> 
  },
  { 
    term: "Halting / Detention", 
    code: "DEMURRAGE",
    meaning: "Demurrage charges billed per day to consignor or consignee when a truck is detained beyond standard loading/unloading hours.", 
    icon: <Clock className="w-4 h-4 text-indigo-600" /> 
  },
  { 
    term: "Hired Vehicle / Market Truck", 
    code: "THIRD-PARTY FLEET",
    meaning: "Commercial vehicle outsourced from market broker or affiliated transporter when owned fleet is fully occupied.", 
    icon: <Truck className="w-4 h-4 text-slate-600" /> 
  },
  { 
    term: "E-Way Bill (EWB)", 
    code: "GST COMPLIANCE",
    meaning: "Mandatory 12-digit electronic waybill on the GST portal required for movement of goods consignment valued over ₹50,000.", 
    icon: <FileText className="w-4 h-4 text-teal-600" /> 
  },
];

const quickActions = [
  { label: "New Booking", href: "/bookings", icon: BookOpen, desc: "Book payload against order" },
  { label: "Issue LR / Bilty", href: "/lr-bilties", icon: FileText, desc: "Generate legal consignment note" },
  { label: "Dispatch Trip", href: "/trips", icon: Truck, desc: "Assign lorry & start journey" },
  { label: "Container Watch", href: "/container-detentions", icon: Clock, desc: "Monitor port free days" },
  { label: "Issue Fuel Slip", href: "/fuels", icon: Fuel, desc: "Log diesel slip & odometer" },
  { label: "Freight Invoice", href: "/customer-invoices", icon: ReceiptIndianRupee, desc: "Bill consignor with POD" },
];

export default function HelpPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const activeCompany = useActiveCompany();
  const role = getStoredUser()?.role || "";

  useEffect(() => {
    if (role === "driver" || role === "vendor") {
      router.replace(role === "driver" ? "/trips" : "/dashboard");
    }
  }, [role, router]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const visible = workflows
      .map((w) => ({
        ...w,
        steps: w.steps.filter((s) => {
          const href = s[3];
          const moduleKey = href?.split("/").filter(Boolean)[0];
          return (!moduleKey || canViewModule(role, moduleKey)) && (!q || s.join(" ").toLowerCase().includes(q));
        }),
      }))
      .filter((w) => w.steps.length);
    return visible.filter((w) => !q || w.title.toLowerCase().includes(q) || w.steps.length);
  }, [search, role]);

  if (role === "driver" || role === "vendor") {
    return null;
  }

  return (
    <div className="w-full min-w-0 space-y-7 pb-16 pt-2">
      
      {/* Control Tower Header - Authentic Indian Transport Operations Desk */}
      <div className="rounded-3xl border border-slate-800 bg-[#0b1220] p-6 text-white sm:p-8 shadow-xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2.5 flex flex-wrap items-center gap-2">
              <Link 
                href="/dashboard" 
                className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs font-bold text-amber-400 hover:bg-slate-700 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
              </Link>
              <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-black uppercase tracking-wider text-amber-400">
                Transport Standard Operating Procedure (SOP)
              </span>
              <span className="text-xs text-slate-400">
                📍 {activeCompany?.city ? `${activeCompany.city} Central Dispatch Hub` : "Central Dispatch Hub"}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
              <Compass className="h-7 w-7 text-amber-400 shrink-0" />
              Fleet Operations & Transport Desk Manual
            </h1>

            <p className="mt-2 text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              Standard operating procedures for consignment indenting, legal LR / Bilty generation, highway dispatch, fuel slips, driver trip settlements and freight accounting.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-300">
              <span className="inline-flex items-center gap-1 bg-slate-900/80 border border-slate-700 px-2.5 py-1 rounded-lg text-amber-300">
                <Truck className="h-3.5 w-3.5" /> All-India Heavy Commercial Fleet
              </span>
              <span className="inline-flex items-center gap-1 bg-slate-900/80 border border-slate-700 px-2.5 py-1 rounded-lg text-emerald-300">
                <ShieldCheck className="h-3.5 w-3.5" /> Carriage by Road Act 2007 Compliant
              </span>
              <span className="inline-flex items-center gap-1 bg-slate-900/80 border border-slate-700 px-2.5 py-1 rounded-lg text-blue-300">
                <Navigation className="h-3.5 w-3.5" /> {activeCompany?.city ? `${activeCompany.city} Regional Hub` : "Regional Highway Hubs"}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0">
            <Link 
              href="/help/architecture" 
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 px-5 py-3 font-black text-sm transition-all shadow-md"
            >
              <Network className="w-4 h-4" />
              Full Architecture Flow Map
            </Link>
            <Link 
              href="/reports" 
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2.5 font-bold text-xs transition-all"
            >
              <FileText className="w-4 h-4 text-amber-400" />
              Fleet & Freight Reports
            </Link>
          </div>
        </div>
      </div>

      {/* Emergency Highway & Breakdown SOS Helpline Strip */}
      <div className="rounded-2xl border border-amber-300 bg-amber-50/90 p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-500 text-slate-950 font-black shadow-xs">
              <PhoneCall className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-amber-900">
                24x7 Highway Breakdown, Driver SOS & Dispatch Desk Helpline
              </p>
              <p className="text-xs text-amber-800 mt-0.5">
                Immediate roadside assistance, diesel card emergency, tyre replacement & highway accident coordination.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <a
              href="tel:+919884008698"
              className="rounded-xl border border-amber-200 bg-white px-3 py-1.5 shadow-2xs hover:border-amber-400 hover:bg-amber-50/50 transition cursor-pointer"
            >
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Central Dispatch Desk</span>
              <span className="font-mono font-black text-slate-900">{activeCompany?.phone || "+91 98840 08698"}</span>
            </a>
            <a
              href="tel:+919884008698"
              className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-1.5 shadow-2xs hover:border-emerald-400 hover:bg-emerald-100/70 transition cursor-pointer"
            >
              <span className="text-[10px] uppercase font-bold text-emerald-800 block">Highway SOS 24/7</span>
              <span className="font-mono font-black text-emerald-900">+91 98840 08698</span>
            </a>
            <div className="rounded-xl border border-amber-200 bg-white px-3 py-1.5 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Yard Workshop Manager</span>
              <span className="font-mono font-black text-slate-900">{activeCompany?.city ? `${activeCompany.city} Depot` : "Puzhal Container Yard"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Jump Shortcuts for Operations Staff */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Navigation className="h-3.5 w-3.5 text-amber-600" />
            Daily Transport Desk Quick Launch
          </h2>
          <span className="text-[11px] font-semibold text-slate-400">Direct Module Links</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {quickActions.map((act) => {
            const Icon = act.icon;
            return (
              <Link
                key={act.label}
                href={act.href}
                className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/60 p-3 hover:border-amber-400 hover:bg-amber-50/40 transition shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <Icon className="h-4 w-4 text-slate-700 group-hover:text-amber-700 transition" />
                  <ArrowRight className="h-3 w-3 text-slate-300 group-hover:translate-x-0.5 group-hover:text-amber-600 transition" />
                </div>
                <div className="mt-2">
                  <p className="text-xs font-black text-slate-900 leading-snug">{act.label}</p>
                  <p className="text-[10px] text-slate-500 truncate">{act.desc}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <input 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
          placeholder="Search transport workflows, SOPs, LR bilty, driver bata, diesel slips or freight billing..." 
          className="w-full bg-white border border-slate-300 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 shadow-sm transition" 
        />
      </div>

      {/* Main Content Grid: SOP Workflows + Sidebar Glossary */}
      <div className="grid gap-7 lg:grid-cols-[1fr_340px]">
        
        {/* SOP Workflows Column */}
        <div className="space-y-6">
          {filtered.map((workflow) => (
            <div key={workflow.title} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:border-slate-300 transition">
              <div className="p-5 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                    {workflow.icon}
                  </div>
                  <div>
                    <h2 className="text-base font-black text-slate-950">{workflow.title}</h2>
                    <p className="text-xs text-slate-500 mt-0.5">{workflow.summary}</p>
                  </div>
                </div>
                <span className={`self-start sm:self-auto rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${workflow.badgeColor}`}>
                  {workflow.badge}
                </span>
              </div>

              <div className="p-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  {workflow.steps.map(([n, title, desc, href]) => (
                    <Link 
                      key={n + title} 
                      href={href} 
                      className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-3.5 hover:border-amber-400 hover:bg-amber-50/20 hover:shadow-xs transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-amber-400 text-xs font-black shadow-2xs group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors">
                          {n}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-xs font-black text-slate-900 group-hover:text-amber-900 transition-colors">
                            {title}
                          </h3>
                          <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                            {desc}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-end text-[11px] font-bold text-amber-700 opacity-0 group-hover:opacity-100 transition-opacity">
                        Open Desk <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="py-20 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
              <Search className="mx-auto h-10 w-10 text-slate-300 mb-3" />
              <h3 className="text-base font-black text-slate-900">No transport workflow found</h3>
              <p className="text-xs text-slate-500 mt-1">Try searching for 'Booking', 'Trip', 'Bilty', 'Fuel' or 'POD'.</p>
            </div>
          )}
        </div>

        {/* Sidebar: Transport Terminology & Commercial Glossary */}
        <div className="space-y-6">
          
          {/* Glossary Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4 text-amber-600" />
                  Transport Commercial Glossary
                </h3>
                <p className="text-[10px] text-slate-500">Key terms used in daily Indian logistics</p>
              </div>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                {transportTerms.length} Terms
              </span>
            </div>

            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
              {transportTerms.map((t) => (
                <div key={t.term} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 hover:border-slate-200 transition">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded bg-white border border-slate-200 shadow-2xs">
                        {t.icon}
                      </div>
                      <p className="font-black text-xs text-slate-900">{t.term}</p>
                    </div>
                    <span className="rounded bg-slate-200/80 px-1.5 py-0.5 text-[9px] font-mono font-bold text-slate-700">
                      {t.code}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-snug pl-8">
                    {t.meaning}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Architecture Map Box */}
          <div className="rounded-2xl border border-slate-800 bg-[#0b1220] p-5 text-white shadow-md">
            <div className="flex items-center gap-2 mb-2">
              <Network className="h-4 w-4 text-amber-400" />
              <h3 className="text-xs font-black uppercase tracking-wider text-amber-400">
                Full ERP Workflow Blueprint
              </h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              View the end-to-end ASCII flow diagram connecting Master Data, Operations, Fleet, Accounts and Super Admin modules.
            </p>
            <Link 
              href="/help/architecture"
              className="inline-flex w-full justify-center items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2.5 text-xs font-black text-slate-950 transition shadow-sm"
            >
              Open Architecture Map <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

        </div>

      </div>
    </div>
  );
}
