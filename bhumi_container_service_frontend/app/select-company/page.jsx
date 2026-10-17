"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/image";
import {
  Truck,
  Building2,
  ArrowRight,
  CheckCircle2,
  MapPin,
  ShieldCheck,
  Navigation,
  Route,
  Fuel,
  FileCheck,
  Phone,
  Sparkles,
  Layers,
  Clock,
  Radio,
  ArrowLeft,
} from "lucide-react";
import { getCompanies } from "@/src/services/company.service";
import { getStoredUser, getToken, setActiveCompany } from "@/src/lib/auth";
import { Spinner } from "@/src/components/ui";

export default function SelectCompany() {
  const router = useRouter();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState("");
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    const u = getStoredUser();
    if (u && u.role !== "super_admin") {
      router.replace("/dashboard");
      return;
    }
    setUser(u);
    getCompanies()
      .then((r) => {
        const list = r?.data || [];
        setCompanies(list);
        if (list.length === 1) {
          // If only 1 company exists, auto select and go straight to /dashboard!
          setActiveCompany(list[0]);
          router.replace("/dashboard");
          return;
        }
        if (list.length > 0) {
          // Pre-select first or previously active company if found
          const activeId = sessionStorage.getItem("nrl_company");
          if (activeId && list.some((c) => c._id === activeId)) {
            setSelected(activeId);
          } else {
            setSelected(list[0]._id);
          }
        }
      })
      .catch(() => setCompanies([]))
      .finally(() => setLoading(false));
  }, [router]);

  const go = () => {
    if (!selected) return;
    const chosen = companies.find((c) => c._id === selected);
    if (chosen) {
      setActiveCompany(chosen);
    } else {
      sessionStorage.setItem("nrl_company", selected);
    }
    router.replace("/dashboard");
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-600 selection:text-white flex flex-col justify-between">
      {/* ========================================================= */}
      {/* TOP HEADER / LOGISTICS RADAR BAR                          */}
      {/* ========================================================= */}
      <header className="border-b border-slate-800 bg-[#0b1220]/95 backdrop-blur-md shadow-md text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500 text-slate-950 font-black shadow-md shadow-blue-500/20">
              <Truck className="h-5 w-5 stroke-[2.3]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-tight text-white">
                  Fleet Operations TMS
                </span>
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-extrabold text-amber-300 border border-amber-500/30">
                  Multi-Company Command
                </span>
              </div>
              <p className="text-[11px] font-semibold text-slate-400">
                Super Admin Fleet &amp; Depot Selection
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Pan-India Fleet Radar Active
            </span>
            <a
              href="/"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              Public Website
            </a>
          </div>
        </div>
      </header>

      {/* ========================================================= */}
      {/* MAIN TRANSPORT FLEET SELECTION CONTAINER                  */}
      {/* ========================================================= */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-10">
        <div className="w-full max-w-5xl rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden grid lg:grid-cols-[1.05fr_1.15fr]">
          {/* Left Column: Commercial Transport Identity Card */}
          <div className="relative bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-8 sm:p-10 text-white flex flex-col justify-between overflow-hidden">
            {/* Background Ambient Glow */}
            <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-amber-500/15 blur-3xl" />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-amber-300">
                <Truck className="h-3.5 w-3.5" />
                Interstate Commercial Road Carrier
              </div>

              <h1 className="mt-5 text-3xl sm:text-4xl font-black leading-tight text-white tracking-tight">
                Select your operating transport line.
              </h1>

              <p className="mt-3.5 text-sm leading-relaxed text-slate-300 font-normal">
                Choose the freight carrier context you want to manage. Your selection
                activates specific vehicle fleets, GST e-Way bill series, driver trip
                sheets, and regional corridor depots.
              </p>

              {/* Transport Capabilities Pill Matrix */}
              <div className="mt-8 space-y-3">
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-xs">
                  <Route className="h-4 w-4 text-amber-400 shrink-0" />
                  <div>
                    <strong className="text-white block font-bold">
                      Route Corridors &amp; Trip Dispatches
                    </strong>
                    <span className="text-slate-400 text-[11px]">
                      Loading sheets, challans &amp; destination hub tracking
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-xs">
                  <FileCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                  <div>
                    <strong className="text-white block font-bold">
                      Company-Scoped Bilty &amp; GST Invoicing
                    </strong>
                    <span className="text-slate-400 text-[11px]">
                      Independent LR series, customer billing &amp; e-Way compliance
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-xs">
                  <Fuel className="h-4 w-4 text-blue-400 shrink-0" />
                  <div>
                    <strong className="text-white block font-bold">
                      FASTag &amp; Diesel Fuel Allocations
                    </strong>
                    <span className="text-slate-400 text-[11px]">
                      Vehicle maintenance audits, tyre tracking &amp; trip advances
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Truck Photo Container */}
            <div className="relative mt-8 h-36 w-full overflow-hidden rounded-2xl border border-white/15">
              <Image
                src="/images/hero-truck.jpg"
                alt="Commercial freight truck"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
              <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-[11px] text-white">
                <span className="flex items-center gap-1.5 font-bold">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  GPS Satellite Telematics
                </span>
                <span className="text-slate-300 font-semibold">IBA Approved Fleet</span>
              </div>
            </div>
          </div>

          {/* Right Column: Transport Company Selection Cards */}
          <div className="p-7 sm:p-10 flex flex-col justify-between bg-white">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                <div>
                  <span className="text-[11px] font-black uppercase tracking-widest text-blue-600">
                    Depot &amp; Carrier Context
                  </span>
                  <h2 className="mt-1 text-2xl font-black text-slate-900 tracking-tight">
                    Select Operating Company
                  </h2>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 border border-blue-200">
                  {companies.length} Transport Lines
                </span>
              </div>

              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500">
                  <Spinner />
                  <p className="text-xs font-bold">Loading active transport carriers...</p>
                </div>
              ) : companies.length === 0 ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center text-amber-800">
                  <Truck className="h-8 w-8 mx-auto text-amber-600 mb-2" />
                  <h4 className="text-sm font-bold">No Transport Companies Registered</h4>
                  <p className="text-xs mt-1 text-amber-700">
                    Please create a company in the database to start operating fleet modules.
                  </p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {companies.map((c) => {
                    const isCurrent = selected === c._id;
                    return (
                      <div
                        key={c._id}
                        onClick={() => setSelected(c._id)}
                        className={`group relative rounded-2xl border p-4.5 transition-all duration-200 cursor-pointer ${
                          isCurrent
                            ? "border-amber-500 bg-amber-50/70 shadow-md shadow-amber-500/15 ring-2 ring-amber-500/30"
                            : "border-slate-200 bg-slate-50/50 hover:border-blue-300 hover:bg-white hover:shadow-sm"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3.5">
                            {/* Truck Badge Icon */}
                            <div
                              className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl transition ${
                                isCurrent
                                  ? "bg-amber-500 text-slate-950 shadow-sm"
                                  : "bg-white text-slate-600 border border-slate-200 group-hover:text-blue-600 group-hover:border-blue-200"
                              }`}
                            >
                              <Truck className="h-5 w-5 stroke-[2.2]" />
                            </div>

                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-base font-black text-slate-900 group-hover:text-blue-700 transition">
                                  {c.name}
                                </h3>
                                <span className="rounded bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-700 uppercase">
                                  {c.code}
                                </span>
                              </div>

                              <p className="mt-1 flex items-center gap-2 text-xs font-medium text-slate-500">
                                <span className="flex items-center gap-1 text-slate-700">
                                  <MapPin className="h-3.5 w-3.5 text-blue-600" />
                                  {c.city ? `${c.city} Regional Hub` : "Main Transport Hub"}
                                </span>
                                {c.state && (
                                  <>
                                    <span>•</span>
                                    <span>{c.state}</span>
                                  </>
                                )}
                              </p>

                              {/* Commercial Transport Badges */}
                              <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[10px]">
                                <span className="rounded-md bg-white border border-slate-200 px-2 py-0.5 font-bold text-slate-700">
                                  Full Truckload (FTL)
                                </span>
                                <span className="rounded-md bg-white border border-slate-200 px-2 py-0.5 font-bold text-slate-700">
                                  Interstate Corridors
                                </span>
                                <span className="rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 font-bold">
                                  GST Compliant
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Selected Checkmark or Arrow */}
                          <div className="shrink-0 mt-1">
                            {isCurrent ? (
                              <div className="grid h-7 w-7 place-items-center rounded-full bg-blue-600 text-white shadow-xs">
                                <CheckCircle2 className="h-4 w-4" />
                              </div>
                            ) : (
                              <div className="grid h-7 w-7 place-items-center rounded-full bg-slate-200 text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition">
                                <ArrowRight className="h-3.5 w-3.5" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Launch Button Strip */}
            <div className="mt-8 pt-5 border-t border-slate-100">
              <button
                onClick={go}
                disabled={!selected || loading}
                className="w-full inline-flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-500 to-amber-600 py-4 px-6 text-sm font-black text-slate-950 shadow-xl shadow-amber-500/25 hover:from-amber-400 hover:to-amber-500 transition active:scale-98 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              >
                <Truck className="h-4.5 w-4.5" />
                <span>Launch Fleet Operations Dashboard</span>
                <ArrowRight className="h-4.5 w-4.5" />
              </button>

              <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  Active company sets Bilty &amp; Fleet context
                </span>
                <span>Switchable anytime from top bar</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ========================================================= */}
      {/* MINIMAL FOOTER                                            */}
      {/* ========================================================= */}
      <footer className="border-t border-slate-800 bg-[#080d17] py-3 text-xs text-slate-400">
        <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-between px-4 sm:px-6 gap-2">
          <p>© {new Date().getFullYear()} Commercial Fleet TMS. All rights reserved.</p>
          <div className="flex items-center gap-4 text-slate-400 font-medium">
            <span>24x7 Control Room: +91 98260 12345</span>
            <span>•</span>
            <span>IBA Approved Multi-Axle Fleet</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
