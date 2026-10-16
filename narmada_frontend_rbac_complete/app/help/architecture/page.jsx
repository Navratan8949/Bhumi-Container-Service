"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, Copy, Check, Truck } from "lucide-react";
import { useActiveCompany } from "@/src/lib/auth";

const originalFlowDiagram = `╔══════════════════════════════════════════════════════════════════════════════╗
║              🚛 FLEET OPERATIONS TMS — COMPLETE OPERATIONAL FLOW            ║
╚══════════════════════════════════════════════════════════════════════════════╝

                              ┌───────────────┐
                              │     LOGIN     │
                              └───────┬───────┘
                                      │
                         ┌────────────▼────────────┐
                         │   COMPANY SELECTION    │
                         │   (Super Admin only)   │
                         └────────────┬────────────┘
                                      │
                                      ▼
                         ┌────────────────────────┐
                         │       DASHBOARD        │
                         │  Today • Alerts • KPIs  │
                         └────────────┬───────────┘
                                      │
             ┌────────────────────────┼────────────────────────┐
             │                        │                        │
             ▼                        ▼                        ▼
      ┌─────────────┐          ┌─────────────┐          ┌─────────────┐
      │  MASTER DATA │          │ OPERATIONS  │          │    FLEET    │
      └──────┬──────┘          └──────┬──────┘          └──────┬──────┘
             │                        │                        │
             │                        │                        │
   ┌─────────┼─────────┐              │             ┌──────────┼───────────┐
   │         │         │              │             │          │           │
   ▼         ▼         ▼              ▼             ▼          ▼           ▼
Customer  Consignor  Consignee   CUSTOMER       VEHICLE     DRIVER      VENDOR
Party     Product    City        ORDER / D.O.      │           │      (Hired Truck)
   │         │         │              │            │           │           │
   └─────────┴─────────┴──────────────┘            │           │           │
                                                   │           │           │
                                                   ▼           ▼           ▼
                                              VEHICLE      DRIVER       VENDOR
                                              DOCUMENTS   ASSIGNMENT    MASTER
                                                   │           │           │
                                                   └─────┬─────┘           │
                                                         │                 │
                                                         │                 │
                         ╔══════════════════════════════▼══════════════════▼═══╗
                         ║              📦 CORE TRANSPORT FLOW                ║
                         ╚══════════════════════════════╤══════════════════════╝
                                                        │
                                                        ▼
                                             ┌──────────────────┐
                                             │   D.O. RECEIVED  │
                                             │ Customer Order   │
                                             └────────┬─────────┘
                                                      │
                                                      ▼
                                             ┌──────────────────┐
                                             │  SUPPLY ORDER    │
                                             │ Plan / Allocate  │
                                             └────────┬─────────┘
                                                      │
                                                      ▼
                                             ┌──────────────────┐
                                             │     BOOKING      │
                                             │ Transport Booking│
                                             └────────┬─────────┘
                                                      │
                                                      ▼
                                             ┌──────────────────┐
                                             │    LR / BILTY    │
                                             │ Consignment Note │
                                             └────────┬─────────┘
                                                      │
                                                      ▼
                                        ┌──────────────────────────┐
                                        │ VEHICLE + DRIVER ASSIGN  │
                                        │ Own Truck / Market Vendor│
                                        └────────────┬─────────────┘
                                                     │
                                                     ▼
                                             ┌──────────────────┐
                                             │       TRIP       │
                                             │ Starting Odometer│
                                             └────────┬─────────┘
                                                      │
                                                      ▼
                                             ┌──────────────────┐
                                             │     DISPATCH     │
                                             │   Loading Slip   │
                                             └────────┬─────────┘
                                                      │
                                                      ▼
                                             ┌──────────────────┐
                                             │    IN TRANSIT    │
                                             │ FASTag / Checkpoint
                                             └────────┬─────────┘
                                                      │
                         ┌────────────────────────────┼────────────────────────┐
                         │                            │                        │
                         ▼                            ▼                        ▼
                  ┌──────────────┐             ┌──────────────┐         ┌──────────────┐
                  │     FUEL     │             │ TRIP EXPENSE │         │ MAINTENANCE  │
                  │ Diesel Slip  │             │ Toll / Bata  │         │ Repair / Fix │
                  │ Litres + KM  │             │ Weighbridge  │         │ In-house Yard│
                  └──────┬───────┘             └──────┬───────┘         └──────┬───────┘
                         │                            │                        │
                         └────────────────────────────┼────────────────────────┘
                                                      │
                                                      ▼
                                             ┌──────────────────┐
                                             │     DELIVERY     │
                                             │ Consignee Unload │
                                             │ Ending Odometer  │
                                             └────────┬─────────┘
                                                      │
                                                      ▼
                                             ┌──────────────────┐
                                             │  POD COLLECTION  │
                                             │ Consignee Stamped│
                                             │ Bilty Received   │
                                             └────────┬─────────┘
                                                      │
                                                      ▼
                                             ┌──────────────────┐
                                             │    TRIP CLOSE    │
                                             │ Driver Settlement│
                                             └────────┬─────────┘
                                                      │
                         ┌────────────────────────────┼───────────────────────┐
                         │                            │                       │
                         ▼                            ▼                       ▼
                  ┌──────────────┐             ┌──────────────┐       ┌──────────────┐
                  │   CUSTOMER   │             │    VENDOR    │       │   COMPANY    │
                  │   BILLING    │             │   BILLING    │       │   EXPENSE    │
                  └──────┬───────┘             └──────┬───────┘       └──────┬───────┘
                         │                            │                       │
                         ▼                            ▼                       │
                  ┌──────────────┐             ┌──────────────┐              │
                  │   INVOICE    │             │ VENDOR BILL  │              │
                  │ Attached POD │             │ Less Advances│              │
                  └──────┬───────┘             └──────┬───────┘              │
                         │                            │                       │
                         ▼                            ▼                       │
                  ┌──────────────┐             ┌──────────────┐              │
                  │   PAYMENT    │             │    PAYMENT   │              │
                  │ Bank RTGS/NEFT             │ Less TDS 194C│              │
                  └──────┬───────┘             └──────┬───────┘              │
                         │                            │                       │
                         ▼                            ▼                       ▼
                  ┌──────────────┐             ┌──────────────┐       ┌──────────────┐
                  │ CUSTOMER     │             │ VENDOR       │       │ EXPENSE      │
                  │ OUTSTANDING  │             │ OUTSTANDING  │       │ AUDIT        │
                  └──────┬───────┘             └──────┬───────┘       └──────┬───────┘
                         │                            │                      │
                         └────────────────────────────┼──────────────────────┘
                                                      │
                                                      ▼
                                             ╔══════════════════╗
                                             ║  TRIP P&L REPORT ║
                                             ║ Net Margin Audit ║
                                             ╚══════════════════╝


╔══════════════════════════════════════════════════════════════════════════════╗
║                         🚛 FLEET MANAGEMENT FLOW                            ║
╚══════════════════════════════════════════════════════════════════════════════╝

 VEHICLE
    │
    ├──────────► VEHICLE DOCUMENTS
    │              ├── RC
    │              ├── Insurance
    │              ├── Fitness
    │              ├── Permit
    │              └── PUC
    │
    ├──────────► DRIVER ASSIGNMENT
    │
    ├──────────► FUEL (DIESEL)
    │              ├── Litres
    │              ├── Rate
    │              ├── Amount
    │              ├── Odometer Diff
    │              └── Mileage (KM/L)
    │
    ├──────────► MAINTENANCE
    │              ├── Workshop Service
    │              ├── Mechanic Repair
    │              └── Parts & Cost
    │
    ├──────────► TYRE MANAGEMENT
    │              ├── Purchase
    │              ├── Installation / Axle Position
    │              ├── Running KM
    │              ├── Removal & Retreading
    │              └── Replacement / Scrap
    │
    └──────────► RUNNING COST
                   ├── Fuel / Diesel
                   ├── Maintenance / Workshop
                   ├── Tyre Cost
                   └── Per-KM Running Cost Audit


╔══════════════════════════════════════════════════════════════════════════════╗
║                           📦 INVENTORY FLOW                                 ║
╚══════════════════════════════════════════════════════════════════════════════╝

                         INVENTORY ITEM
                              │
                              ▼
                         STOCK IN
                     (Purchase Inward)
                              │
                              ▼
                       CURRENT STOCK
                              │
                 ┌────────────┴────────────┐
                 │                         │
                 ▼                         ▼
             STOCK OUT                 ADJUSTMENT
          (Issued to Truck)         (Damaged/Return)
                 │                         │
                 └────────────┬────────────┘
                              ▼
                         STOCK HISTORY
                              │
                              ▼
                       LOW STOCK ALERT
                              │
                              ▼
                    PURCHASE / RESTOCK


╔══════════════════════════════════════════════════════════════════════════════╗
║                              👨‍💼 HR FLOW                                    ║
╚══════════════════════════════════════════════════════════════════════════════╝

 EMPLOYEE (Drivers & Staff)
    │
    ▼
 ATTENDANCE
    │
    ├──────────────► EMPLOYEE ADVANCE (Trip Road Advance)
    │
    ▼
 PAYROLL
    │
    ▼
 SALARY PAYMENT
    │
    ▼
 SALARY / HR REPORTS


╔══════════════════════════════════════════════════════════════════════════════╗
║                              📊 REPORTS                                    ║
╚══════════════════════════════════════════════════════════════════════════════╝

                              REPORTS
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
        ▼                        ▼                        ▼
   OPERATIONS                  FLEET                   ACCOUNTS
        │                        │                        │
        ├─ Booking               ├─ Fuel & Mileage (KM/L) ├─ Customer Invoice
        ├─ LR / Bilty            ├─ Maintenance           ├─ Customer Payment
        ├─ Trip Movement         ├─ Tyre Lifecycle        ├─ Customer Outstanding
        ├─ Fulfillment           ├─ Running Cost (Per KM) ├─ Vendor Bill & TDS
        └─ Driver Assignment     └─ Vehicle Master        ├─ Vendor Payment
                                                          ├─ Vendor Outstanding
                                 │                        └─ Trip Profitability (P&L)
                                 ▼
                                HR
                                 │
                                 ├─ Employee Directory
                                 ├─ Daily Attendance
                                 ├─ Monthly Payroll
                                 └─ Advance Register


╔══════════════════════════════════════════════════════════════════════════════╗
║                         🎯 MANAGEMENT VIEW                                 ║
╚══════════════════════════════════════════════════════════════════════════════╝

                              DASHBOARD
                                  │
              ┌───────────────────┼───────────────────┐
              │                   │                   │
              ▼                   ▼                   ▼
          TODAY'S WORK          ALERTS              MONEY
              │                   │                   │
              ├─ Pending D.O.     ├─ Expiring Docs    ├─ Freight Receivable
              ├─ Pending Booking  ├─ Low Stock        ├─ Vendor Payable
              ├─ Active Trips     ├─ Vehicle Issues   ├─ Fuel & Road Expenses
              └─ Deliveries       └─ Pending Tasks    └─ Net Profitability`;

export default function ArchitecturePage() {
  const [copied, setCopied] = useState(false);
  const activeCompany = useActiveCompany();

  const copyToClipboard = () => {
    navigator.clipboard.writeText(originalFlowDiagram);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-16 pt-3">
      <div className="mx-auto max-w-7xl h-full flex flex-col space-y-5 px-4 sm:px-6 lg:px-8">
        
        {/* Control Tower Header - Transport Style */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 bg-[#0b1220] p-6 sm:p-7 rounded-3xl border border-slate-800 text-white shadow-xl">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link 
                href="/help" 
                className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors bg-slate-800/80 border border-slate-700 px-2.5 py-1 rounded-lg"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Operations Manual
              </Link>
              <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-black uppercase tracking-wider text-amber-400">
                Logistics Flowchart
              </span>
              <span className="text-xs text-slate-400">
                📍 {activeCompany?.city ? `${activeCompany.city} Central Dispatch Hub` : "Central Dispatch Hub"}
              </span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
              <Truck className="h-7 w-7 text-amber-400 shrink-0" />
              {activeCompany?.name || "Transport Management"} — System Architecture Map
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Complete end-to-end transport workflow blueprint: Master Data ➔ Operations ➔ Fleet ➔ Accounts ➔ Management.
            </p>
          </div>
          
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={copyToClipboard}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/90 px-3.5 py-2 text-xs font-bold text-amber-400 hover:bg-slate-700 transition"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy Flow"}
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2 text-xs transition shadow-sm"
            >
              <Printer className="h-4 w-4" />
              Print Map
            </button>
          </div>
        </div>

        {/* ASCII Flowchart Container - High-Contrast Transport Paper / Cardboard Look */}
        <div className="flex-1 rounded-3xl border border-slate-300 bg-white p-6 sm:p-10 shadow-md overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded-md bg-amber-100 text-amber-800 text-xs font-black">
                🚛
              </span>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                {activeCompany?.name || "Fleet Operations"} Complete Operational Flow Blueprint
              </h2>
            </div>
            <span className="rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-[11px] font-bold text-slate-600">
              Verified Against 32 Backend ERP Models
            </span>
          </div>

          <div className="h-full overflow-auto [scrollbar-width:thin] [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-amber-400/80 hover:[&::-webkit-scrollbar-thumb]:bg-amber-500 transition-colors pb-10 pr-6">
            <pre className="font-mono text-[12px] sm:text-[13px] leading-[1.3] tracking-widest text-slate-900 whitespace-pre font-semibold selection:bg-amber-200 selection:text-slate-950">
              {originalFlowDiagram}
            </pre>
          </div>

          <div className="border-t border-slate-200 pt-4 mt-2 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
            <span>{activeCompany?.name || "Operating Company"} • Central Transport Desk SOP • {activeCompany?.city ? `${activeCompany.city}, India` : "Regional Logistics Hub"}</span>
            <span className="font-mono font-bold text-slate-700">All Modules Integrated & Live</span>
          </div>
        </div>

      </div>
    </div>
  );
}
