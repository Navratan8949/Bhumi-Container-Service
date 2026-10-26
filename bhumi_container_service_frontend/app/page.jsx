"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Truck,
  ShieldCheck,
  MapPin,
  Clock,
  Phone,
  Mail,
  Search,
  CheckCircle2,
  ArrowRight,
  ChevronRight,
  PackageCheck,
  Building2,
  FileCheck,
  Navigation,
  Sparkles,
  Menu,
  X,
  Gauge,
  AlertCircle,
  ExternalLink,
  ShieldAlert,
  Award,
  ChevronDown,
  Layers,
  ArrowUpRight,
  MessageCircle,
} from "lucide-react";
import {
  getActiveCompany,
  getToken,
  getStoredUser,
  useActiveCompany,
} from "@/src/lib/auth";
import api from "@/src/services/api";

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  const hookCompany = useActiveCompany();
  const [activeCompany, setActiveCompanyState] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [storedUser, setStoredUser] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Tracking Widget State
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingType, setTrackingType] = useState("vehicle"); // "vehicle" or "tracking_id"
  const [trackingResult, setTrackingResult] = useState(null);
  const [trackingModalOpen, setTrackingModalOpen] = useState(false);
  const [isTrackingLoading, setIsTrackingLoading] = useState(false);
  const [trackError, setTrackError] = useState("");



  // FAQ Accordion State (Rich SEO & Knowledge Base)
  const [openFaq, setOpenFaq] = useState(0);

  const [publicCompany, setPublicCompany] = useState(null);

  useEffect(() => {
    setMounted(true);
    try {
      const company = getActiveCompany();
      if (company) setActiveCompanyState(company);
      const token = getToken();
      if (token) setIsLoggedIn(true);
      const user = getStoredUser();
      if (user) setStoredUser(user);
    } catch {
      // ignore SSR checks
    }

    // Load active company profile dynamically from backend
    api
      .get("/public/company")
      .then((res) => {
        if (res.data?.success && res.data?.data) {
          setPublicCompany(res.data.data);
        }
      })
    // Check URL parameters for direct consignment tracking
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const q = params.get("track") || params.get("q");
      if (q) {
        performTrack(q);
      }
    }
  }, []);

  // Listen for Escape key to close tracking modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setTrackingModalOpen(false);
    };
    if (trackingModalOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [trackingModalOpen]);

  const currentCompany = mounted
    ? hookCompany || activeCompany || publicCompany
    : null;
  const companyDisplayName = currentCompany?.name || "Bhumi Container Service";
  const rawPhone = currentCompany?.phone || "98840 08698";
  const cleanPhoneDigits = rawPhone.replace(/\D/g, "");
  const waPhone =
    cleanPhoneDigits.length === 10
      ? `91${cleanPhoneDigits}`
      : cleanPhoneDigits || "919884008698";
  const displayPhone = rawPhone.startsWith("+91")
    ? rawPhone
    : `+91 ${rawPhone.trim()}`;
  const companyPhone = displayPhone;
  const companyEmail =
    currentCompany?.email || "bhumicontainerservice@gmail.com";
  const companyAddress = currentCompany?.address
    ? `${currentCompany.address}${currentCompany.city ? ", " + currentCompany.city : ""}${currentCompany.state ? ", " + currentCompany.state : ""}`
    : "Plot No 25, 1st Floor, Shree Ram Nagar, Second Street, Puzhal, Chennai 600066";
  const companyGst =
    currentCompany?.gstNumber || "Registered Commercial Carrier";

  const isSuperAdminWithoutCompany =
    mounted &&
    storedUser?.role === "super_admin" &&
    !currentCompany &&
    !(typeof window !== "undefined" && sessionStorage.getItem("nrl_company"));

  const portalUrl =
    mounted && isLoggedIn
      ? isSuperAdminWithoutCompany
        ? "/select-company"
        : "/dashboard"
      : "/login";
  const portalLabel =
    mounted && isLoggedIn
      ? isSuperAdminWithoutCompany
        ? "Select Operating Company"
        : "Open TMS Dashboard"
      : "Operations Portal Login";

  // Real Consignment & Fleet Tracking from MongoDB
  const performTrack = async (inputQuery, type = "vehicle") => {
    const query = String(inputQuery || "").trim();
    if (!query) {
      setTrackError("Please enter a Vehicle Number or Tracking ID.");
      return;
    }
    setTrackError("");
    setTrackingNumber(query);
    setTrackingType(type);
    setIsTrackingLoading(true);

    try {
      const res = await api.get(`/public/track?q=${encodeURIComponent(query)}`);
      if (res.data?.success && res.data?.data) {
        setTrackingResult(res.data.data);
        setTrackingModalOpen(true);
      } else {
        setTrackError(res.data?.message || "Record not found");
      }
    } catch (err) {
      setTrackError(
        err.response?.data?.message ||
          `No active record found for "${query}". Please check your Vehicle No. or Tracking ID, or call ${displayPhone}.`,
      );
    } finally {
      setIsTrackingLoading(false);
    }
  };

  const handleTrackSubmit = async (e) => {
    if (e) e.preventDefault();
    await performTrack(trackingNumber, trackingType);
  };



  const services = [
    {
      icon: Truck,
      color: "bg-blue-600 text-white",
      title: "Full Truckload (FTL) Freight",
      desc: "Dedicated heavy commercial trucks for factory shipments, industrial production goods, and point-to-point interstate road logistics.",
      badge: "Direct Route",
    },
    {
      icon: Navigation,
      color: "bg-indigo-600 text-white",
      title: "Container Drayage & Haulage",
      desc: "Moving 20 Ft, 40 Ft, and 40 Ft High Cube marine containers from Chennai Port, Ennore Port, and CFS yards with customs bottle seal security.",
      badge: "20ft & 40ft Units",
    },
    {
      icon: FileCheck,
      color: "bg-emerald-600 text-white",
      title: "Trip Challans & Advance Memos",
      desc: "Fast digital generation of trip sheets, loading memos, driver advance cash, diesel slips, and transparent trip records.",
      badge: "Digital Records",
    },
    {
      icon: Layers,
      color: "bg-amber-500 text-slate-950",
      title: "Company & Market Fleet Operations",
      desc: "Dual fleet operational model managing company-owned trailers and verified market lorry contractors across all major highway routes.",
      badge: "Verified Lorries",
    },
    {
      icon: ShieldCheck,
      color: "bg-teal-600 text-white",
      title: "Vehicle Compliance & RTO Tracking",
      desc: "Active document monitoring for vehicle fitness certificates, national permits, insurance, road tax, and driver commercial licenses.",
      badge: "RTO Compliant",
    },
    {
      icon: Building2,
      color: "bg-slate-800 text-white",
      title: "Freight Billing & Trip Settlements",
      desc: "Accurate customer invoicing with GST, transparent vendor lorry hire bills, and automated driver trip expense settlements.",
      badge: "GST Compliant",
    },
  ];

  const corridors = [
    {
      from: "Chennai Port / Puzhal",
      to: "Bangalore / Hosur / Whitefield",
      time: "7-9 Hours",
      dist: "340 KM",
      frequency: "Daily 12+ Fleets",
      type: "20ft/40ft Container & FTL",
      tag: "Express Corridor",
    },
    {
      from: "Chennai Port / Ennore",
      to: "Sri City / Tada SEZ",
      time: "2-3 Hours",
      dist: "75 KM",
      frequency: "Daily 15+ Fleets",
      type: "Export-Import Containers",
      tag: "SEZ Shuttle",
    },
    {
      from: "Chennai / Ranipet Belt",
      to: "Hyderabad / Shamshabad",
      time: "12-14 Hours",
      dist: "620 KM",
      frequency: "Daily 8+ Fleets",
      type: "Industrial & Auto Freight",
      tag: "Heavy Duty",
    },
    {
      from: "Chennai Port / Kattupalli",
      to: "Coimbatore / Tirupur Knitwear Hub",
      time: "10-12 Hours",
      dist: "510 KM",
      frequency: "Daily 6+ Fleets",
      type: "Export Containers & Textile",
      tag: "High Demand",
    },
    {
      from: "Chennai Port / Central Hub",
      to: "Mumbai / Nhava Sheva (JNPT)",
      time: "30-34 Hours",
      dist: "1,320 KM",
      frequency: "Daily 5+ Fleets",
      type: "Inter-Port Container Transit",
      tag: "Long Haul",
    },
    {
      from: "Pan-India Port & ICD Terminals",
      to: "Custom Factory & CFS Delivery",
      time: "On-Demand",
      dist: "All Major Ports & ICDs",
      frequency: "Contract Trailer Fleet",
      type: "ODC & Custom 40HC",
      tag: "Tailored Route",
    },
  ];

  const fleetTypes = [
    {
      name: "32 Ft Multi-Axle Container (MXL)",
      capacity: "14 - 18 Metric Tonnes",
      volume: "1,850 - 2,100 Cu.Ft",
      bestFor: "FMCG, Pharmaceuticals, High-Value Consumer Goods, White Goods",
      imageTag: "Weatherproof Closed Bay",
      badge: "High Demand",
    },
    {
      name: "20 Ft / 24 Ft Close Body Truck",
      capacity: "7 - 9 Metric Tonnes",
      volume: "950 - 1,200 Cu.Ft",
      bestFor: "Express Packaging, Electricals, Automotive Spares, Hardware",
      imageTag: "Fast Express Transit",
      badge: "Express Transit",
    },
    {
      name: "10-Wheeler / 12-Wheeler Taurus",
      capacity: "21 - 25 Metric Tonnes",
      volume: "Heavy Cargo Flat / High Side",
      bestFor: "Steel Coils, Cement, Grain Bags, Heavy Machinery, Raw Metal",
      imageTag: "Heavy Duty Hauler",
      badge: "Heavy Hauler",
    },
    {
      name: "40 Ft Flatbed Heavy Trailer",
      capacity: "30 - 38 Metric Tonnes",
      volume: "Over-Dimensional Cargo (ODC)",
      bestFor:
        "Factory Equipment, Transformers, Precast Beams, Structural Steel",
      imageTag: "Multi-Axle Heavy Trailer",
    },
  ];

  const faqs = [
    {
      q: "How can I check the status of my container or vehicle?",
      a: "Enter your Vehicle Registration Number or Tracking ID (Trip Number or Advance Memo Number) into the search widget on this page. You will instantly view assigned vehicle details, container and customs seal records, driver contact, and current dispatch status.",
    },
    {
      q: "Which major routes and industrial corridors do you operate?",
      a: "We operate regular scheduled commercial corridors connecting Chennai Port, Puzhal, and Ennore to Bangalore, Sri City, Hosur, Hyderabad, Vizag, and key manufacturing belts across South and Central India.",
    },
    {
      q: "What container sizes and vehicle types do you handle?",
      a: "We specialize in 20 Feet standard containers, 40 Feet standard containers, 40 Feet High Cube (HC) marine units, and multi-axle commercial trailers capable of handling 7 to 38 metric tonnes of industrial cargo.",
    },
    {
      q: "What documentation and compliance standards does Bhumi Container Service follow?",
      a: "Bhumi Container Service adheres strictly to the Carriage by Road Act and GST norms. We provide 100% GST-compliant freight invoices, complete e-Way bill coordination, digital advance memos, and documented trip challans.",
    },
    {
      q: "How are Trip Challans, Advance Memos, and driver expenses managed?",
      a: "Every trip is initiated with a digital Trip Record and Advance Memo detailing truck assignment, container number, driver advance cash, and diesel slip allocations. Trip closures and driver expense settlements are finalized upon consignment unloading.",
    },
    {
      q: "How do you ensure container security during transit?",
      a: "Every marine container is secured with tamper-evident customs bottle seals before departure from the port or container freight station (CFS), verified upon gate dispatch, and cross-checked at the destination unloading point.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-amber-500 selection:text-slate-950">
      {/* ========================================================= */}
      {/* TOP ANNOUNCEMENT & HOTLINE STRIP (Clean Modern Corporate) */}
      {/* ========================================================= */}
      <div className="border-b border-white/[0.08] bg-[#080d17] text-[11px] text-slate-300">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-3.5 py-1.5 sm:py-2 sm:px-6 lg:px-8">
          {/* Left: Freight Network Status */}
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="flex items-center gap-1.5 font-bold text-amber-400 whitespace-nowrap">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="sm:hidden">Container Freight</span>
              <span className="hidden sm:inline">
                Commercial Container &amp; FTL Freight Operations
              </span>
            </span>
            <span className="hidden text-slate-700 md:inline">•</span>
            <span className="hidden text-slate-400 md:inline font-medium">
              Chennai Port &amp; CFS Drayage · 100% GST &amp; E-Way Bill Compliant
            </span>
          </div>

          {/* Right: Hotline & Live Dispatches */}
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <a
              href={`tel:+${waPhone}`}
              className="flex items-center gap-1.5 font-bold text-slate-200 hover:text-amber-400 transition whitespace-nowrap"
            >
              <Phone className="h-3 w-3 text-amber-400" />
              <span className="sm:hidden">{displayPhone}</span>
              <span className="hidden sm:inline">
                Operations Support: {displayPhone}
              </span>
            </a>
            <span className="hidden sm:inline text-slate-700">•</span>
            <span className="hidden sm:flex items-center gap-1 text-slate-300 font-medium whitespace-nowrap">
              <Clock className="h-3 w-3 text-emerald-400" /> Daily Highway Dispatches
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MAIN NAVBAR (Spacious, Modern & Responsive)              */}
      {/* ========================================================= */}
      <header className="sticky top-0 z-40 border-b border-slate-800/90 bg-[#0b1220]/95 backdrop-blur-md shadow-lg text-white">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          {/* Logo & Brand Name */}
          <Link href="/" className="flex items-center gap-3 group shrink-0">
            <div className="relative h-10 w-10 sm:h-11 sm:w-11 shrink-0 overflow-hidden rounded-xl bg-white border border-white/20 p-0.5 shadow-md shadow-black/30 group-hover:scale-105 transition flex items-center justify-center">
              <Image
                src="/images/logo.png"
                alt="Bhumi Container Service Logo"
                width={44}
                height={44}
                className="h-full w-full object-contain"
                priority
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  suppressHydrationWarning
                  className="text-base sm:text-lg font-black tracking-tight text-white group-hover:text-amber-400 transition"
                >
                  {companyDisplayName}
                </span>
                <span className="rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider">
                  BCS
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-400 hidden xl:block">
                Heavy Commercial Fleet &amp; Freight Carrier
              </p>
            </div>
          </Link>

          {/* Desktop Nav Links with Airy Spacing & Hover */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-3 text-[13px] xl:text-sm font-semibold text-slate-300">
            <a
              href="#services"
              className="px-3 py-1.5 xl:px-3.5 xl:py-2 rounded-xl hover:text-amber-400 hover:bg-white/[0.06] transition whitespace-nowrap"
            >
              Services
            </a>
            <a
              href="#corridors"
              className="px-3 py-1.5 xl:px-3.5 xl:py-2 rounded-xl hover:text-amber-400 hover:bg-white/[0.06] transition whitespace-nowrap"
            >
              Major Corridors
            </a>
            <a
              href="#fleet"
              className="px-3 py-1.5 xl:px-3.5 xl:py-2 rounded-xl hover:text-amber-400 hover:bg-white/[0.06] transition whitespace-nowrap"
            >
              Our Fleet
            </a>
            <a
              href="#faq"
              className="px-3 py-1.5 xl:px-3.5 xl:py-2 rounded-xl hover:text-amber-400 hover:bg-white/[0.06] transition whitespace-nowrap"
            >
              FAQs
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="hidden sm:flex items-center gap-2.5 xl:gap-3.5 shrink-0">
            <div className="hidden xl:block h-5 w-px bg-slate-800" />
            <a
              href="#tracking"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-1.5 xl:px-3.5 xl:py-2 text-xs font-bold text-slate-200 hover:border-amber-500/50 hover:text-amber-300 transition shadow-xs whitespace-nowrap"
            >
              <Search className="h-3.5 w-3.5 text-amber-400" />
              <span>Track Vehicle / ID</span>
            </a>
            <Link
              href={portalUrl}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-500 to-amber-600 px-3.5 py-1.5 xl:px-4.5 xl:py-2 text-xs font-black text-slate-950 shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 transition active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>{portalLabel}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden grid h-9 w-9 place-items-center rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-b border-slate-800 bg-[#0b1220] px-5 py-4 shadow-2xl space-y-2.5 animate-in slide-in-from-top-2 duration-200">
            <a
              href="#services"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm font-bold text-slate-200 hover:bg-slate-800 hover:text-amber-400"
            >
              Services
            </a>
            <a
              href="#tracking"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-slate-200 hover:bg-slate-800 hover:text-amber-400"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Track Vehicle / ID
            </a>
            <a
              href="#corridors"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm font-bold text-slate-200 hover:bg-slate-800 hover:text-amber-400"
            >
              Major Corridors
            </a>
            <a
              href="#fleet"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm font-bold text-slate-200 hover:bg-slate-800 hover:text-amber-400"
            >
              Our Fleet
            </a>
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm font-bold text-slate-200 hover:bg-slate-800 hover:text-amber-400"
            >
              FAQs
            </a>
            <div className="pt-2 border-t border-slate-800">
              <Link
                href={portalUrl}
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-500 to-amber-600 py-3 text-sm font-black text-slate-950 shadow-md"
              >
                {portalLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ========================================================= */}
      {/* HERO SECTION (Bright, Fresh, High-Trust Corporate Design) */}
      {/* ========================================================= */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#0b1220] via-[#0f172a] to-[#080d17] text-white pt-12 pb-20 lg:pt-16 lg:pb-28 border-b border-slate-800">
        {/* Subtle background ambient glows matching dashboard */}
        <div className="pointer-events-none absolute -top-40 right-0 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="pointer-events-none absolute top-1/2 left-0 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />
        {/* Subtle background decorative shapes */}
        <div className="pointer-events-none absolute -top-40 right-0 h-96 w-96 rounded-full bg-blue-200/40 blur-3xl" />
        <div className="pointer-events-none absolute top-1/2 left-0 h-96 w-96 rounded-full bg-amber-100/40 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            {/* Left Content */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-bold text-amber-300 backdrop-blur shadow-xs">
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Commercial Container Freight &amp; Fleet Operations
              </div>

              <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl text-white leading-[1.08]">
                Fast, Safe &amp; Modern{" "}
                <span className="bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 bg-clip-text text-transparent">
                  Road Freight Logistics
                </span>
              </h1>

              <p className="mt-5 text-base sm:text-lg text-slate-300 leading-relaxed max-w-xl font-normal">
                Dedicated container transport (20ft, 40ft &amp; 40ft HC), full
                truckload (FTL) freight, and scheduled highway corridors. Digital
                trip management, advance memos, and transparent freight billing.
              </p>

              {/* Action Buttons */}
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  href={portalUrl}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-500 to-amber-600 px-6 py-3.5 text-sm font-black text-slate-950 shadow-xl shadow-amber-500/25 hover:from-amber-400 hover:to-amber-500 transition active:scale-95 cursor-pointer"
                >
                  <Building2 className="h-4 w-4" />
                  {portalLabel}
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <a
                  href="#tracking"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-5 py-3.5 text-sm font-bold text-slate-200 shadow-xs hover:border-amber-500/40 hover:text-white transition"
                >
                  <Search className="h-4 w-4 text-amber-400" />
                  Track Vehicle &amp; Consignment
                </a>
              </div>

              {/* Operational Capabilities Strip */}
              <div className="mt-10 grid grid-cols-2 gap-4 border-t border-slate-800/80 pt-7 sm:grid-cols-4">
                <div className="rounded-xl bg-[#0e1726] p-3.5 border border-slate-800 shadow-md">
                  <p className="text-xl sm:text-2xl font-black text-amber-400">
                    20 / 40 FT
                  </p>
                  <p className="text-xs font-semibold text-slate-400 mt-0.5">
                    Containers Handled
                  </p>
                </div>
                <div className="rounded-xl bg-[#0e1726] p-3.5 border border-slate-800 shadow-md">
                  <p className="text-xl sm:text-2xl font-black text-emerald-400">
                    Own &amp; Market
                  </p>
                  <p className="text-xs font-semibold text-slate-400 mt-0.5">
                    Fleet Operations
                  </p>
                </div>
                <div className="rounded-xl bg-[#0e1726] p-3.5 border border-slate-800 shadow-md">
                  <p className="text-xl sm:text-2xl font-black text-white">
                    Port &amp; CFS
                  </p>
                  <p className="text-xs font-semibold text-slate-400 mt-0.5">
                    Direct Drayage
                  </p>
                </div>
                <div className="rounded-xl bg-[#0e1726] p-3.5 border border-slate-800 shadow-md">
                  <p className="text-xl sm:text-2xl font-black text-amber-400">
                    100% GST
                  </p>
                  <p className="text-xs font-semibold text-slate-400 mt-0.5">
                    Compliant Billing
                  </p>
                </div>
              </div>
            </div>

            {/* Right Card: High-Impact Image + Consignment Tracking Box */}
            <div id="tracking" className="relative">
              {/* Image Preview Box */}
              <div className="relative overflow-hidden rounded-3xl border border-slate-700/80 bg-[#0e1726] shadow-2xl">
                <div className="relative h-64 sm:h-72 w-full overflow-hidden">
                  <Image
                    src="/images/hero-truck.jpg"
                    alt="Heavy commercial container truck on interstate highway"
                    fill
                    priority
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover object-center transform hover:scale-105 transition duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                  <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-[#0b1220]/90 px-3 py-1 text-xs font-bold text-amber-400 backdrop-blur border border-amber-500/30 shadow-sm">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    COMMERCIAL FREIGHT CARRIER
                  </div>
                </div>

                {/* Tracking Query Card Container */}
                <div className="p-6 sm:p-7 relative bg-[#0e1726] border-t border-slate-800 text-white">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-800">
                    <div>
                      <h3 className="text-base font-black text-white flex items-center gap-2">
                        <Search className="h-4 w-4 text-amber-400" />
                        Live Fleet &amp; Consignment Tracker
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Track live status with Vehicle Number or Tracking ID
                      </p>
                    </div>

                    {/* Toggle Button: Strictly Vehicle No & Tracking ID */}
                    <div className="flex rounded-lg bg-slate-900 border border-slate-800 p-1 text-[11px] font-bold gap-1">
                      <button
                        type="button"
                        onClick={() => setTrackingType("vehicle")}
                        className={`rounded px-3 py-1.5 transition cursor-pointer ${
                          trackingType === "vehicle"
                            ? "bg-amber-500 text-slate-950 font-black shadow-xs"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        Vehicle No.
                      </button>
                      <button
                        type="button"
                        onClick={() => setTrackingType("tracking_id")}
                        className={`rounded px-3 py-1.5 transition cursor-pointer ${
                          trackingType === "tracking_id"
                            ? "bg-amber-500 text-slate-950 font-black shadow-xs"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        Tracking ID
                      </button>
                    </div>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleTrackSubmit} className="mt-4">
                    <div className="flex flex-col sm:flex-row gap-2.5">
                      <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={trackingNumber}
                          onChange={(e) => setTrackingNumber(e.target.value)}
                          placeholder={
                            trackingType === "vehicle"
                              ? "Enter Vehicle / Truck No. (e.g. TN-05-AB-4821)"
                              : "Enter Tracking ID (e.g. TRIP-2026-001)"
                          }
                          className="w-full rounded-xl border border-slate-700 bg-[#080d17] px-10 py-3 text-sm text-white placeholder:text-slate-500 focus:border-amber-500 focus:bg-[#080d17] focus:outline-none focus:ring-4 focus:ring-amber-500/10 transition"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isTrackingLoading}
                        className="rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3 text-sm font-black text-slate-950 shadow-lg shadow-amber-500/25 hover:from-amber-400 hover:to-amber-500 transition active:scale-95 disabled:opacity-50 cursor-pointer"
                      >
                        {isTrackingLoading ? "Searching..." : "Track Status"}
                      </button>
                    </div>

                    {trackError && (
                      <div className="mt-3 flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-950/40 px-3.5 py-2.5 text-xs text-rose-300 animate-fadeIn">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
                        <div className="flex-1 font-medium">{trackError}</div>
                      </div>
                    )}
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* KEY LOGISTICS CAPABILITIES / SERVICES (Crisp White Cards) */}
      {/* ========================================================= */}
      <section
        id="services"
        className="bg-[#f8fafc] py-20 border-b border-slate-200/80"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs font-black uppercase tracking-widest text-amber-600">
              Complete Transport Solutions
            </span>
            <h2 className="mt-2 text-3xl font-black text-slate-900 sm:text-4xl">
              Engineered for Industrial &amp; Enterprise Freight
            </h2>
            <p className="mt-3 text-sm text-slate-600">
              From individual factory consignments to dedicated multi-fleet
              contracts, we ensure seamless transit across all major industrial
              corridors.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="group rounded-2xl border border-slate-200/90 bg-slate-50/50 p-7 hover:border-amber-400 hover:bg-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="flex items-center justify-between">
                    <div
                      className={`grid h-12 w-12 place-items-center rounded-xl ${item.color} shadow-sm group-hover:scale-105 transition`}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="rounded-full bg-white border border-slate-200 px-2.5 py-1 text-[11px] font-bold text-slate-700 shadow-2xs">
                      {item.badge}
                    </span>
                  </div>
                  <h3 className="mt-5 text-lg font-black text-slate-900 group-hover:text-amber-600 transition-colors">
                    {item.title}
                  </h3>
                  <p className="mt-2.5 text-sm text-slate-600 leading-relaxed font-normal">
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* MAJOR INTERSTATE CORRIDORS & NETWORK                     */}
      {/* ========================================================= */}
      <section
        id="corridors"
        className="border-t border-slate-200/90 bg-slate-100/60 py-20"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <span className="text-xs font-black uppercase tracking-widest text-amber-600">
                Scheduled Transit Network
              </span>
              <h2 className="mt-2 text-3xl font-black text-slate-900 sm:text-4xl">
                High-Frequency Interstate Corridors
              </h2>
              <p className="mt-2 text-sm text-slate-600 max-w-xl">
                Regular daily dispatches with guaranteed transit windows between
                key manufacturing hubs and container freight stations (CFS).
              </p>
            </div>
            <a
              href="#tracking"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-amber-600 hover:text-amber-700"
            >
              Track Active Fleet <ChevronRight className="h-4 w-4" />
            </a>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {corridors.map((c, i) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs hover:border-amber-400 hover:shadow-lg transition"
              >
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="rounded-md bg-amber-50 text-amber-800 px-2 py-0.5 font-bold border border-amber-200">
                    {c.type}
                  </span>
                  <span className="flex items-center gap-1 text-slate-600 font-medium">
                    <Clock className="h-3.5 w-3.5 text-emerald-600" /> {c.time}
                  </span>
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <div>
                    <p className="text-base font-black text-slate-900">
                      {c.from}
                    </p>
                    <p className="text-xs font-medium text-slate-500">
                      Loading Hub
                    </p>
                  </div>
                  <div className="flex-1 flex items-center justify-center">
                    <div className="h-0.5 w-full bg-slate-200 relative">
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full bg-amber-500 ring-4 ring-amber-100" />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-black text-slate-900">
                      {c.to}
                    </p>
                    <p className="text-xs font-medium text-slate-500">
                      Destination Hub
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs">
                  <span className="text-slate-500">
                    Est. Distance:{" "}
                    <strong className="text-slate-800">{c.dist}</strong>
                  </span>
                  <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                    {c.frequency}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* COMMERCIAL FLEET SPECIFICATIONS SHOWCASE                  */}
      {/* ========================================================= */}
      <section id="fleet" className="border-t border-slate-200 bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs font-black uppercase tracking-widest text-amber-600">
              Commercial Fleet Lineup
            </span>
            <h2 className="mt-2 text-3xl font-black text-slate-900 sm:text-4xl">
              Equipped for Every Cargo Category
            </h2>
            <p className="mt-3 text-sm text-slate-600">
              Modern containerized vehicles, multi-axle trailers, and heavy load
              trucks maintained with periodic mechanical audits and FASTag
              automated tolling.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {fleetTypes.map((truck, idx) => (
              <div
                key={idx}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/60 p-6 hover:bg-white hover:border-amber-400 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500/10 text-amber-700 border border-amber-500/20">
                      <Truck className="h-5 w-5" />
                    </div>
                    <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                      Verified Fleet
                    </span>
                  </div>

                  <h3 className="mt-4 text-base font-black text-slate-900">
                    {truck.name}
                  </h3>
                  <div className="mt-3 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Payload Cap:</span>
                      <span className="font-bold text-slate-900">
                        {truck.capacity}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Volume:</span>
                      <span className="font-bold text-slate-900">
                        {truck.volume}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl bg-white p-3 border border-slate-200 shadow-2xs">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Ideal Goods:
                    </p>
                    <p className="text-xs text-slate-700 mt-1 font-medium">
                      {truck.bestFor}
                    </p>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-amber-600 font-bold">
                    {truck.imageTag}
                  </span>
                  <a
                    href="#tracking"
                    className="font-bold text-slate-900 hover:text-amber-600 transition flex items-center gap-1"
                  >
                    Track <ChevronRight className="h-3 w-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* Operational Transport Backbone Feature */}
          <div className="mt-14 relative overflow-hidden rounded-3xl border border-slate-800 bg-[#0b1220] text-white shadow-2xl">
            <div className="grid lg:grid-cols-[1fr_1.1fr]">
              <div className="p-8 sm:p-12 flex flex-col justify-center">
                <span className="text-xs font-black uppercase tracking-widest text-amber-400">
                  Container Drayage &amp; Fleet Operations
                </span>
                <h3 className="mt-2 text-2xl sm:text-3xl font-black text-white">
                  Port Terminals, CFS Yards &amp; Highway Corridors
                </h3>
                <p className="mt-4 text-sm text-slate-300 leading-relaxed font-normal">
                  Registered commercial transport operations centered at Puzhal,
                  Chennai. We coordinate daily movements between Chennai Port,
                  Ennore, CFS facilities, and industrial manufacturing belts with
                  strict customs bottle seal verification and documented loading memos.
                </p>
                <div className="mt-6 grid grid-cols-2 gap-4 text-xs font-bold text-slate-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />{" "}
                    20ft &amp; 40ft Marine Units
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />{" "}
                    Customs Bottle Seal Security
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />{" "}
                    RTO Compliant Fleet
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />{" "}
                    Digital Advance Memos
                  </div>
                </div>
              </div>
              <div className="relative h-64 sm:h-80 lg:h-auto min-h-[260px]">
                <Image
                  src="/images/fleet-hub.jpg"
                  alt="Commercial freight truck fleet ready for highway dispatch"
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover object-center"
                />
              </div>
            </div>
          </div>
        </div>
      </section>





      {/* ========================================================= */}
      {/* FREQUENTLY ASKED QUESTIONS (Rich SEO & Knowledge Base)    */}
      {/* ========================================================= */}
      <section
        id="faq"
        className="border-t border-slate-200 bg-slate-50 py-20 text-slate-900"
      >
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-amber-700">
              <Sparkles className="h-3.5 w-3.5 text-amber-600" />
              Verified Knowledge Base
            </span>
            <h2 className="mt-4 text-3xl font-black text-slate-900 sm:text-4xl tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
              Clear, transparent answers about our container fleet capabilities,
              interstate corridors, digital documentation, and safety protocols
              for industrial shippers.
            </p>
          </div>

          <div className="mt-12 max-w-4xl mx-auto space-y-4">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className={`rounded-2xl border transition overflow-hidden shadow-xs ${
                    isOpen
                      ? "border-amber-500/60 bg-white ring-4 ring-amber-500/5 shadow-md"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                  }`}
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between gap-4 p-5 sm:p-6 text-left cursor-pointer hover:bg-slate-50/60 transition"
                  >
                    <span className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-3">
                      <span
                        className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-black font-mono border transition ${
                          isOpen
                            ? "bg-amber-500 text-slate-950 border-amber-500 font-bold"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        Q{idx + 1}
                      </span>
                      {faq.q}
                    </span>
                    <div
                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl transition-all duration-200 ${
                        isOpen
                          ? "rotate-180 bg-amber-500 text-slate-950 shadow-xs"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-5 sm:px-6 pb-6 pt-2 text-sm text-slate-600 leading-relaxed border-t border-slate-100 font-normal bg-slate-50/40">
                      <p>{faq.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* CORPORATE FOOTER (Real Company Contact & Navigation)      */}
      {/* ========================================================= */}
      <footer className="border-t border-slate-800 bg-[#080d17] py-14 text-sm text-slate-400">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {/* Col 1: Brand Info & Legal Compliance */}
            <div>
              <div className="flex items-center gap-2.5">
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-white border border-slate-200 p-0.5 shadow-xs flex items-center justify-center">
                  <Image
                    src="/images/logo.png"
                    alt="Bhumi Container Service Logo"
                    width={40}
                    height={40}
                    className="h-full w-full object-contain"
                  />
                </div>
                <span
                  suppressHydrationWarning
                  className="text-base font-black text-white"
                >
                  {companyDisplayName}
                </span>
              </div>
              <p className="mt-3.5 text-xs text-slate-300 leading-relaxed">
                Premier heavy commercial fleet &amp; freight management
                organization delivering secure interstate transport, digital
                trip management, and end-to-end container logistics excellence across
                India.
              </p>
              <div className="mt-4 space-y-1.5 text-[11px] font-semibold">
                <div className="flex items-center gap-1.5 text-amber-400">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>GSTIN: {companyGst}</span>
                </div>
                <div className="text-slate-400">
                  IBA Approved Carrier · Carriage by Road Act Compliant
                </div>
              </div>
            </div>

            {/* Col 2: Quick Navigation */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-400">
                Quick Navigation
              </h4>
              <ul className="mt-4 space-y-2.5 text-xs font-medium text-slate-300">
                <li>
                  <a href="#" className="hover:text-amber-400 transition">
                    Home / Overview
                  </a>
                </li>
                <li>
                  <a
                    href="#tracking"
                    className="flex items-center gap-1.5 hover:text-amber-400 transition"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Track Vehicle / Tracking ID
                  </a>
                </li>
                <li>
                  <a
                    href="#services"
                    className="hover:text-amber-400 transition"
                  >
                    Freight &amp; Fleet Services
                  </a>
                </li>
                <li>
                  <a
                    href="#corridors"
                    className="hover:text-amber-400 transition"
                  >
                    Major Interstate Corridors
                  </a>
                </li>
                <li>
                  <a href="#fleet" className="hover:text-amber-400 transition">
                    Commercial Vehicle Lineup
                  </a>
                </li>
                <li>
                  <a href="#faq" className="hover:text-amber-400 transition">
                    FAQs &amp; Knowledge Base
                  </a>
                </li>
              </ul>
            </div>

            {/* Col 3: Official Contact & Headquarters (High Contrast) */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-400">
                Contact &amp; Headquarters
              </h4>
              <ul className="mt-4 space-y-3.5 text-xs text-slate-300">
                <li className="flex items-start gap-2.5">
                  <MapPin className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white block">
                      Registered Office / Yard:
                    </span>
                    <span className="text-slate-300 leading-relaxed block mt-0.5">
                      {companyAddress}
                    </span>
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(companyAddress)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 hover:text-amber-300 hover:underline mt-1"
                    >
                      <MapPin className="h-3 w-3" />
                      View on Google Maps
                    </a>
                  </div>
                </li>
                <li className="flex items-center gap-2.5">
                  <Phone className="h-4 w-4 text-amber-400 shrink-0" />
                  <div>
                    <span className="text-slate-400 block text-[11px]">
                      24x7 Operations Desk:
                    </span>
                    <a
                      href={`tel:+${waPhone}`}
                      className="font-bold text-white hover:text-amber-400 transition text-sm"
                    >
                      {displayPhone}
                    </a>
                  </div>
                </li>
                <li className="flex items-center gap-2.5">
                  <Mail className="h-4 w-4 text-amber-400 shrink-0" />
                  <div>
                    <span className="text-slate-400 block text-[11px]">
                      Dispatch &amp; Billing Email:
                    </span>
                    <a
                      href={`mailto:${companyEmail}`}
                      className="font-bold text-white hover:text-amber-400 transition"
                    >
                      {companyEmail}
                    </a>
                  </div>
                </li>
                <li className="flex items-center gap-2.5 text-slate-300">
                  <Clock className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Daily Commercial Freight Dispatches</span>
                </li>
              </ul>
            </div>

            {/* Col 4: TMS Operations Portal Access */}
            <div>
              <div className="rounded-2xl border border-slate-800 bg-[#0b1220] p-5 shadow-md text-white">
                <div className="flex items-center gap-2">
                  <div className="grid h-7 w-7 place-items-center rounded-lg bg-blue-600 text-white">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-white">
                    Operations Portal
                  </h4>
                </div>
                <p className="mt-2.5 text-xs text-slate-400 leading-relaxed font-normal">
                  Authorized access for dispatchers, fleet managers,
                  accountants, and staff members.
                </p>
                <div className="mt-4">
                  <Link
                    href={portalUrl}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2.5 text-xs font-black text-slate-950 shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 transition active:scale-95 cursor-pointer"
                  >
                    {portalLabel}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Protected by 256-Bit SSL &amp; RBAC</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Copyright, Attribution & Legal Links */}
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-between border-t border-slate-800/80 pt-8 text-xs text-slate-400 gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-center sm:text-left">
              <p suppressHydrationWarning>
                © {new Date().getFullYear()} {companyDisplayName}. All rights
                reserved.
              </p>
              <span className="hidden sm:inline text-slate-700">•</span>
              <p className="text-slate-400">
                Developed by{" "}
                <span className="text-amber-400 font-bold">
                  ZDC Tech Global Solutions Pvt Ltd
                </span>
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 font-medium text-slate-300">
              <a href="#tracking" className="hover:text-amber-400 transition">
                Track Vehicle / Tracking ID
              </a>
              <Link
                href="/login"
                className="hover:text-amber-300 transition font-bold text-amber-400"
              >
                Staff Portal Login
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* ========================================================= */}
      {/* INTERACTIVE TRACKING MODAL POPUP (Clean Light Theme)     */}
      {/* ========================================================= */}
      {trackingModalOpen && trackingResult && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setTrackingModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl border border-slate-700 bg-gradient-to-b from-[#0b1220] via-[#0e1726] to-[#080d17] p-6 sm:p-8 shadow-2xl text-left text-white [scrollbar-width:none]">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-700/80 pb-5">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-xs font-black text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {trackingResult.status}
                  </span>
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                    {trackingResult.type}
                  </span>
                </div>
                <h3 className="mt-2.5 text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
                  <span className="text-amber-400 font-mono">
                    {trackingResult.queryNumber}
                  </span>
                </h3>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-slate-400">Vehicle:</span>
                  <strong className="text-white font-mono font-bold bg-white/10 border border-white/10 px-2 py-0.5 rounded-md">
                    {trackingResult.vehicleNo}
                  </strong>
                  {trackingResult.vehicleType && (
                    <>
                      <span className="text-slate-600">|</span>
                      <span className="text-slate-300 font-medium">
                        {trackingResult.vehicleType}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <button
                onClick={() => setTrackingModalOpen(false)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white transition border border-white/15 cursor-pointer shadow-xs"
                title="Close Window"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Current Transit Status Pill */}
            <div className="mt-5 rounded-2xl bg-gradient-to-br from-slate-900 via-[#0f172a] to-slate-950 border border-slate-700/80 p-4 sm:p-5 shadow-lg">
              <div className="flex items-start gap-3.5">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20">
                  <Navigation className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-[11px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
                    Consignment &amp; Transit Status
                  </p>
                  <p className="text-base sm:text-lg font-black text-white mt-0.5 leading-snug">
                    {trackingResult.currentLocation}
                  </p>
                  {trackingResult.origin && trackingResult.destination && (
                    <p className="text-xs text-slate-300 mt-1 flex flex-wrap items-center gap-1 font-medium">
                      <span className="text-slate-400">Transit Corridor:</span>
                      <span className="text-white font-bold">
                        {trackingResult.origin}
                      </span>
                      <span className="text-amber-400 font-black px-0.5">
                        →
                      </span>
                      <span className="text-amber-300 font-bold">
                        {trackingResult.destination}
                      </span>
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 border-t border-slate-800 pt-3.5 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">
                    Assigned Fleet Captain
                  </span>
                  <strong className="text-white text-sm font-bold block mt-0.5">
                    {trackingResult.driverName}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">
                    Estimated Delivery
                  </span>
                  <strong className="text-amber-400 text-sm font-bold block mt-0.5">
                    {trackingResult.eta}
                  </strong>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">
                    24x7 Driver Helpline
                  </span>
                  <strong className="text-emerald-400 font-mono font-bold text-sm block mt-0.5">
                    {trackingResult.driverPhone}
                  </strong>
                </div>
              </div>

              {/* Container & Customs Seal Strip */}
              <div className="mt-3.5 flex flex-wrap items-center gap-2 pt-3 border-t border-slate-800 text-[11px]">
                <span className="rounded-lg bg-amber-500/15 border border-amber-500/40 px-3 py-1 text-amber-300 font-mono font-bold">
                  📦 Container:{" "}
                  {trackingResult.containerNumber || "Assigned Freight Unit"}
                </span>
                <span className="rounded-lg bg-emerald-500/15 border border-emerald-500/40 px-3 py-1 text-emerald-300 font-mono font-bold">
                  🔒 Seal:{" "}
                  {trackingResult.customsSealNumber || "Customs Seal Intact"}
                </span>
                {trackingResult.shippingLine && (
                  <span className="rounded-lg bg-cyan-500/15 border border-cyan-500/40 px-3 py-1 text-cyan-300 font-bold">
                    🚢 Line: {trackingResult.shippingLine}
                  </span>
                )}
                {trackingResult.cargoDescription && (
                  <span className="rounded-lg bg-purple-500/15 border border-purple-500/40 px-3 py-1 text-purple-300 font-medium truncate max-w-full">
                    🏷️ Cargo: {trackingResult.cargoDescription}
                  </span>
                )}
              </div>
            </div>

            {/* Timeline Progress Tracker */}
            <div className="mt-6">
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 mb-4 flex items-center gap-2">
                <Truck className="h-4 w-4 text-amber-400" />
                Shipment Transit Milestones
              </h4>
              <div className="space-y-4">
                {trackingResult.steps.map((st, i) => (
                  <div key={i} className="flex items-start gap-3 relative">
                    <div
                      className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border ${
                        st.done
                          ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-sm shadow-emerald-500/20"
                          : "bg-slate-800 border-slate-700 text-slate-500"
                      }`}
                    >
                      {st.done ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <Clock className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <p
                          className={`text-sm font-bold ${st.done ? "text-white" : "text-slate-400"}`}
                        >
                          {st.title}
                        </p>
                        <span className="text-xs font-mono font-semibold text-amber-300/90">
                          {st.time}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                        {st.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Close Button */}
            <div className="mt-7 flex justify-end">
              <button
                onClick={() => setTrackingModalOpen(false)}
                className="rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 px-6 py-2.5 text-xs font-black text-slate-950 shadow-lg shadow-amber-500/20 transition cursor-pointer"
              >
                Close Tracking Window
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Floating WhatsApp Quick Connect Button */}
      <a
        href={`https://wa.me/${waPhone}?text=${encodeURIComponent("Hello Bhumi Container Service, I want to inquire about transport booking.")}`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-full shadow-2xl transition-all duration-300 hover:scale-105 font-bold text-xs border-2 border-white/80 cursor-pointer"
        title="Chat on WhatsApp"
      >
        <MessageCircle className="h-5 w-5 fill-white text-emerald-600" />
        <span className="hidden sm:inline">WhatsApp Booking</span>
      </a>
    </div>
  );
}
