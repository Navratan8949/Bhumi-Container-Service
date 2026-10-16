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
  Headphones,
  Navigation,
  Sparkles,
  Menu,
  X,
  Gauge,
  Fuel,
  CreditCard,
  AlertCircle,
  ExternalLink,
  ShieldAlert,
  Award,
  ChevronDown,
  Layers,
  ArrowUpRight,
} from "lucide-react";
import { getActiveCompany, getToken, getStoredUser, useActiveCompany } from "@/src/lib/auth";

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  const hookCompany = useActiveCompany();
  const [activeCompany, setActiveCompanyState] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [storedUser, setStoredUser] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Tracking Widget State
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingType, setTrackingType] = useState("lr"); // "lr" or "vehicle"
  const [trackingResult, setTrackingResult] = useState(null);
  const [trackingModalOpen, setTrackingModalOpen] = useState(false);
  const [isTrackingLoading, setIsTrackingLoading] = useState(false);

  // Freight Estimator State
  const [originCity, setOriginCity] = useState("Indore / Dewas");
  const [destCity, setDestCity] = useState("Mumbai / Bhiwandi");
  const [truckCategory, setTruckCategory] = useState("32ft-mxl");
  const [estimatedQuote, setEstimatedQuote] = useState(null);
  const [quoteSubmitted, setQuoteSubmitted] = useState(false);
  const [shipperPhone, setShipperPhone] = useState("");

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
  }, []);

  const currentCompany = mounted ? (hookCompany || activeCompany) : null;
  const companyDisplayName =
    currentCompany?.name || "Bhumi Container Service";
  const companyPhone = currentCompany?.phone || "9884008698";
  const companyEmail = currentCompany?.email || "bhumicontainerservice@gmail.com";
  const companyAddress = currentCompany?.address
    ? `${currentCompany.address}${currentCompany.city ? ", " + currentCompany.city : ""}${currentCompany.state ? ", " + currentCompany.state : ""}`
    : "Plot No 25, 1st Floor, Shree Ram Nagar, Second Street, Puzhal, Chennai 600066";
  const companyGst = currentCompany?.gstNumber || "Registered Commercial Carrier";
  
  const isSuperAdminWithoutCompany =
    mounted &&
    storedUser?.role === "super_admin" &&
    !currentCompany &&
    !(typeof window !== "undefined" && sessionStorage.getItem("nrl_company"));

  const portalUrl = mounted && isLoggedIn
    ? (isSuperAdminWithoutCompany ? "/select-company" : "/dashboard")
    : "/login";
  const portalLabel = mounted && isLoggedIn
    ? (isSuperAdminWithoutCompany ? "Select Operating Company" : "Open TMS Dashboard")
    : "Operations Portal Login";

  // Mock tracking samples
  const handleTrackSubmit = (e) => {
    if (e) e.preventDefault();
    const query = trackingNumber.trim() || "BCS-8942";
    setIsTrackingLoading(true);

    setTimeout(() => {
      setIsTrackingLoading(false);
      setTrackingResult({
        queryNumber: query.toUpperCase(),
        type: trackingType === "lr" ? "Consignment Bilty / LR" : "Vehicle GPS Tracking",
        status: "In Transit — On Schedule",
        origin: "Puzhal Container Terminal, Chennai (TN)",
        destination: "Bangalore / Hyderabad Logistics Corridor",
        currentLocation: "Sri City / Tada Toll (NH 16), Tamil Nadu - AP Border",
        vehicleNo: "TN-05-AB-4821",
        vehicleType: "40 Ft High Cube Marine Container",
        driverName: "K. Murugan",
        driverPhone: "+91 98840 08698",
        speed: "52 km/h (Smooth Highway Cruise)",
        bookingDate: "Today, 06:30 AM",
        eta: "Tomorrow, 07:00 AM",
        cargoDescription: "Commercial Machinery & Heavy Industrial Cargo (26.4 MT)",
        steps: [
          { title: "LR Generated & Verified", time: "Today 06:30 AM", done: true, desc: "Digital Bilty with GST E-Way Bill auto-validated." },
          { title: "Cargo Loaded & Scaled", time: "Today 08:45 AM", done: true, desc: "Electronic weighbridge verified (14.2 MT). Digital tamper seal applied." },
          { title: "Dispatched from Origin Hub", time: "Today 10:15 AM", done: true, desc: "Crossed MP Border via Sendhwa Checkpoint. GPS telemetry active." },
          { title: "En Route to Destination Hub", time: "Expected 11:30 PM", done: false, desc: "Approaching Nashik-Bhiwandi freight corridor." },
          { title: "Out for Unloading & e-POD", time: "Tomorrow 07:00 AM", done: false, desc: "Receiver signature & instant digital delivery confirmation." },
        ],
      });
      setTrackingModalOpen(true);
    }, 400);
  };

  const handleCalculateQuote = (e) => {
    e.preventDefault();
    const rates = {
      "32ft-mxl": { base: 38500, time: "16-18 Hrs", cap: "14 - 18 MT" },
      "20ft-close": { base: 26000, time: "14-16 Hrs", cap: "7 - 9 MT" },
      "taurus-10w": { base: 45000, time: "18-20 Hrs", cap: "21 - 25 MT" },
      "trailer-40ft": { base: 68000, time: "22-26 Hrs", cap: "30+ MT" },
    };
    const r = rates[truckCategory] || rates["32ft-mxl"];
    setEstimatedQuote({
      origin: originCity,
      destination: destCity,
      truck: truckCategory.toUpperCase().replace("-", " "),
      approxRate: r.base,
      transitTime: r.time,
      capacity: r.cap,
    });
  };

  const services = [
    {
      icon: Truck,
      color: "bg-blue-600 text-white",
      title: "Full Truckload (FTL) Freight",
      desc: "Dedicated point-to-point heavy commercial trucks for factory plants, industrial production cargo, and bulk wholesale logistics.",
      badge: "Fastest Transit",
    },
    {
      icon: Navigation,
      color: "bg-indigo-600 text-white",
      title: "Interstate Scheduled Corridors",
      desc: "Daily regular runs connecting Central India (Indore/Pithampur) to Mumbai, Bhiwandi, Gujarat, Pune, and Delhi NCR.",
      badge: "Daily Departures",
    },
    {
      icon: FileCheck,
      color: "bg-emerald-600 text-white",
      title: "Digital LR, Bilty & e-Way Bill",
      desc: "Instant digital LR generation, automated GST invoices, real-time e-Way bill extension, and transparent toll accounting.",
      badge: "100% Tax Compliant",
    },
    {
      icon: Gauge,
      color: "bg-amber-500 text-slate-950",
      title: "24x7 IoT & GPS Fleet Radar",
      desc: "Real-time satellite vehicle tracking with live route telematics, speed geo-fencing, engine diagnostics, and highway SOS.",
      badge: "Live Telematics",
    },
    {
      icon: PackageCheck,
      color: "bg-teal-600 text-white",
      title: "Secure Cargo & Digital e-POD",
      desc: "Tamper-evident container seals, weather-sealed cargo bays, and digital proof-of-delivery uploaded within 2 hours of delivery.",
      badge: "Zero Pilferage",
    },
    {
      icon: Building2,
      color: "bg-slate-800 text-white",
      title: "Warehouse & Yard Management",
      desc: "Transit staging yards, mechanized loading bays, forklift operations, cross-docking, and dedicated contract fleet management.",
      badge: "Strategic Depots",
    },
  ];

  const corridors = [
    { from: "Indore / Dewas", to: "Mumbai / Bhiwandi", time: "16-18 Hours", dist: "585 KM", frequency: "Daily 8+ Fleets", type: "Container & FTL", tag: "Popular Corridor" },
    { from: "Indore / Pithampur", to: "Ahmedabad / Surat", time: "12-14 Hours", dist: "410 KM", frequency: "Daily 6+ Fleets", type: "Industrial Freight", tag: "Express" },
    { from: "Indore / Bhopal", to: "Pune / Chakan Auto Hub", time: "18-20 Hours", dist: "640 KM", frequency: "Daily 5+ Fleets", type: "Automotive Cargo", tag: "Heavy Duty" },
    { from: "Central India", to: "Delhi NCR / Haryana", time: "20-22 Hours", dist: "820 KM", frequency: "Daily 4+ Fleets", type: "Northern Hub", tag: "High Demand" },
    { from: "Indore / Dewas", to: "Hyderabad / Bangalore", time: "28-32 Hours", dist: "1,150 KM", frequency: "Bi-Weekly Express", type: "South Logistics", tag: "Long Haul" },
    { from: "Pan-India Multi-Hub", to: "Custom Point-to-Point", time: "On-Demand", dist: "All States", frequency: "Contract Fleet", type: "ODC & Custom", tag: "Tailored Route" },
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
      bestFor: "Factory Equipment, Transformers, Precast Beams, Structural Steel",
      imageTag: "Multi-Axle Heavy Trailer",
      badge: "Specialized ODC",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-600 selection:text-white">
      {/* ========================================================= */}
      {/* TOP ANNOUNCEMENT & HOTLINE STRIP (Clean Modern Corporate) */}
      {/* ========================================================= */}
      <div className="border-b border-slate-200/80 bg-slate-100/90 text-[11px] text-slate-600">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 font-bold text-blue-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Pan-India Commercial Freight Network
            </span>
            <span className="hidden text-slate-300 md:inline">•</span>
            <span className="hidden text-slate-500 md:inline font-medium">
              IBA Approved Commercial Carrier · 100% GST &amp; E-Way Bill Compliant
            </span>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="tel:+919826012345"
              className="flex items-center gap-1.5 font-bold text-slate-800 hover:text-blue-600 transition"
            >
              <Phone className="h-3 w-3 text-blue-600" />
              <span>24x7 Control Room: +91 98260 12345</span>
            </a>
            <span className="hidden sm:inline text-slate-300">•</span>
            <span className="hidden sm:flex items-center gap-1 text-slate-600 font-medium">
              <Clock className="h-3 w-3 text-emerald-600" /> Live Highway Dispatches
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MAIN NAVBAR (Seamless Sticky White & Polished)            */}
      {/* ========================================================= */}
      <header className="sticky top-0 z-40 border-b border-slate-200/90 bg-white/95 backdrop-blur-md shadow-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
          {/* Logo & Brand Name */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-tr from-blue-700 to-blue-500 text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition">
              <Truck className="h-5 w-5 stroke-[2.3]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span suppressHydrationWarning className="text-lg font-black tracking-tight text-slate-900 group-hover:text-blue-600 transition">
                  {companyDisplayName}
                </span>
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-extrabold text-blue-700 border border-blue-200">
                  TMS
                </span>
              </div>
              <p className="text-[11px] font-semibold text-slate-500">
                Heavy Commercial Fleet &amp; Freight Carrier
              </p>
            </div>
          </Link>

          {/* Desktop Nav Links with Pill Hover */}
          <nav className="hidden lg:flex items-center gap-1 text-sm font-bold text-slate-700">
            <a
              href="#services"
              className="px-3.5 py-2 rounded-xl hover:text-blue-600 hover:bg-blue-50/70 transition"
            >
              Services
            </a>
            <a
              href="#tracking"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl hover:text-blue-600 hover:bg-blue-50/70 transition"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Track Consignment
            </a>
            <a
              href="#corridors"
              className="px-3.5 py-2 rounded-xl hover:text-blue-600 hover:bg-blue-50/70 transition"
            >
              Major Corridors
            </a>
            <a
              href="#fleet"
              className="px-3.5 py-2 rounded-xl hover:text-blue-600 hover:bg-blue-50/70 transition"
            >
              Our Fleet
            </a>
            <a
              href="#quote"
              className="px-3.5 py-2 rounded-xl hover:text-blue-600 hover:bg-blue-50/70 transition"
            >
              Rate Calculator
            </a>
            <a
              href="#contact"
              className="px-3.5 py-2 rounded-xl hover:text-blue-600 hover:bg-blue-50/70 transition"
            >
              Control Room SOS
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="hidden sm:flex items-center gap-3">
            <a
              href="#tracking"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 transition"
            >
              <Search className="h-3.5 w-3.5 text-blue-600" />
              Track LR
            </a>
            <Link
              href={portalUrl}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4.5 py-2 text-xs font-black text-white shadow-md shadow-blue-600/25 hover:from-blue-700 hover:to-indigo-700 transition active:scale-95"
            >
              <Building2 className="h-3.5 w-3.5" />
              {portalLabel}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-b border-slate-200 bg-white px-5 py-4 shadow-xl space-y-2.5 animate-in slide-in-from-top-2 duration-200">
            <a
              href="#services"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm font-bold text-slate-800 hover:bg-blue-50 hover:text-blue-600"
            >
              Services
            </a>
            <a
              href="#tracking"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-slate-800 hover:bg-blue-50 hover:text-blue-600"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Track Consignment
            </a>
            <a
              href="#corridors"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm font-bold text-slate-800 hover:bg-blue-50 hover:text-blue-600"
            >
              Major Corridors
            </a>
            <a
              href="#fleet"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm font-bold text-slate-800 hover:bg-blue-50 hover:text-blue-600"
            >
              Our Fleet
            </a>
            <a
              href="#quote"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm font-bold text-slate-800 hover:bg-blue-50 hover:text-blue-600"
            >
              Rate Calculator
            </a>
            <a
              href="tel:+919826012345"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-slate-800 hover:bg-blue-50 hover:text-blue-600"
            >
              <Phone className="h-4 w-4 text-blue-600" />
              Control Room: +91 98260 12345
            </a>
            <div className="pt-2 border-t border-slate-100">
              <Link
                href={portalUrl}
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 text-sm font-black text-white shadow-md"
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
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-50/70 via-slate-50 to-white pt-10 pb-16 lg:pt-14 lg:pb-24 border-b border-slate-200/80">
        {/* Subtle background decorative shapes */}
        <div className="pointer-events-none absolute -top-40 right-0 h-96 w-96 rounded-full bg-blue-200/40 blur-3xl" />
        <div className="pointer-events-none absolute top-1/2 left-0 h-96 w-96 rounded-full bg-amber-100/40 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            {/* Left Content */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-3.5 py-1 text-xs font-bold text-blue-700 shadow-xs">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Trusted by 500+ Industrial Shippers Across India
              </div>

              <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl text-slate-900 leading-[1.08]">
                Fast, Safe &amp; Modern{" "}
                <span className="text-blue-600">
                  Road Freight Logistics
                </span>
              </h1>

              <p className="mt-5 text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl font-normal">
                Pan-India Full Truckload (FTL), heavy containerized freight, and scheduled highway
                corridors. Real-time GPS telematics, instant digital Bilty, and 99.8% on-time
                delivery guarantee.
              </p>

              {/* Action Buttons */}
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  href={portalUrl}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700 transition active:scale-95"
                >
                  <Building2 className="h-4 w-4" />
                  {portalLabel}
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <a
                  href="#quote"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3.5 text-sm font-bold text-slate-800 shadow-xs hover:border-slate-400 hover:bg-slate-50 transition"
                >
                  <Fuel className="h-4 w-4 text-amber-500" />
                  Get Freight Rate Estimate
                </a>
              </div>

              {/* Trust Metric Strip */}
              <div className="mt-10 grid grid-cols-2 gap-4 border-t border-slate-200 pt-7 sm:grid-cols-4">
                <div className="rounded-xl bg-white p-3.5 border border-slate-200/80 shadow-xs">
                  <p className="text-2xl font-black text-slate-900 sm:text-3xl">10K+</p>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">Trips Dispatched</p>
                </div>
                <div className="rounded-xl bg-white p-3.5 border border-slate-200/80 shadow-xs">
                  <p className="text-2xl font-black text-emerald-600 sm:text-3xl">99.8%</p>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">On-Time Transit</p>
                </div>
                <div className="rounded-xl bg-white p-3.5 border border-slate-200/80 shadow-xs">
                  <p className="text-2xl font-black text-blue-600 sm:text-3xl">150+</p>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">Heavy Fleets</p>
                </div>
                <div className="rounded-xl bg-white p-3.5 border border-slate-200/80 shadow-xs">
                  <p className="text-2xl font-black text-amber-500 sm:text-3xl">24/7</p>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">Control Tower</p>
                </div>
              </div>
            </div>

            {/* Right Card: High-Impact Image + Consignment Tracking Box */}
            <div id="tracking" className="relative">
              {/* Image Preview Box */}
              <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
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
                  <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-xs font-black text-emerald-700 backdrop-blur border border-emerald-200 shadow-sm">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    LIVE FLEET SATELLITE RADAR
                  </div>
                </div>

                {/* Tracking Query Card Container */}
                <div className="p-6 sm:p-7 relative bg-white border-t border-slate-100">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                        <Search className="h-4 w-4 text-blue-600" />
                        Track Consignment or Vehicle
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Instant status update with real-time route milestone
                      </p>
                    </div>

                    {/* Toggle Button */}
                    <div className="flex rounded-lg bg-slate-100 p-1 text-[11px] font-bold">
                      <button
                        onClick={() => setTrackingType("lr")}
                        className={`rounded px-2.5 py-1 transition ${
                          trackingType === "lr"
                            ? "bg-white text-blue-600 shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Bilty / LR No.
                      </button>
                      <button
                        onClick={() => setTrackingType("vehicle")}
                        className={`rounded px-2.5 py-1 transition ${
                          trackingType === "vehicle"
                            ? "bg-white text-blue-600 shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Vehicle No.
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
                            trackingType === "lr"
                              ? "Enter LR No. (e.g. BCS-8942)"
                              : "Enter Vehicle No. (e.g. TN-05-AB-4821)"
                          }
                          className="w-full rounded-xl border border-slate-300 bg-slate-50 px-10 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isTrackingLoading}
                        className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-extrabold text-white shadow-md shadow-blue-600/20 hover:bg-blue-700 transition active:scale-95 disabled:opacity-50"
                      >
                        {isTrackingLoading ? "Searching..." : "Track Status"}
                      </button>
                    </div>

                    {/* Quick Demo Prompts */}
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span>Quick Test:</span>
                      <button
                        type="button"
                        onClick={() => {
                          setTrackingNumber("BCS-8942");
                          setTrackingType("lr");
                        }}
                        className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition"
                      >
                        BCS-8942 (Chennai-Bangalore Route)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTrackingNumber("TN-05-AB-4821");
                          setTrackingType("vehicle");
                        }}
                        className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition"
                      >
                        TN-05-AB-4821 (40ft High Cube)
                      </button>
                    </div>
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
      <section id="services" className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs font-black uppercase tracking-widest text-blue-600">
              Complete Transport Solutions
            </span>
            <h2 className="mt-2 text-3xl font-black text-slate-900 sm:text-4xl">
              Engineered for Industrial &amp; Enterprise Freight
            </h2>
            <p className="mt-3 text-sm text-slate-600">
              From individual factory consignments to dedicated multi-fleet contracts, we ensure
              seamless transit across all major industrial corridors.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="group rounded-2xl border border-slate-200/90 bg-slate-50/50 p-7 hover:border-blue-200 hover:bg-white hover:shadow-xl transition-all duration-300"
                >
                  <div className="flex items-center justify-between">
                    <div className={`grid h-12 w-12 place-items-center rounded-xl ${item.color} shadow-sm group-hover:scale-105 transition`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="rounded-full bg-white border border-slate-200 px-2.5 py-1 text-[11px] font-bold text-slate-700 shadow-2xs">
                      {item.badge}
                    </span>
                  </div>
                  <h3 className="mt-5 text-lg font-black text-slate-900 group-hover:text-blue-600 transition-colors">
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
      <section id="corridors" className="border-t border-slate-200/90 bg-slate-100/60 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <span className="text-xs font-black uppercase tracking-widest text-blue-600">
                Scheduled Transit Network
              </span>
              <h2 className="mt-2 text-3xl font-black text-slate-900 sm:text-4xl">
                High-Frequency Interstate Corridors
              </h2>
              <p className="mt-2 text-sm text-slate-600 max-w-xl">
                Regular daily dispatches with guaranteed transit windows between key manufacturing
                hubs and container freight stations (CFS).
              </p>
            </div>
            <a
              href="#quote"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:text-blue-700"
            >
              Request Custom Route Rate <ChevronRight className="h-4 w-4" />
            </a>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {corridors.map((c, i) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs hover:border-blue-300 hover:shadow-md transition"
              >
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="rounded-md bg-blue-50 text-blue-700 px-2 py-0.5 font-bold border border-blue-100">
                    {c.type}
                  </span>
                  <span className="flex items-center gap-1 text-slate-600 font-medium">
                    <Clock className="h-3.5 w-3.5 text-emerald-600" /> {c.time}
                  </span>
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <div>
                    <p className="text-base font-black text-slate-900">{c.from}</p>
                    <p className="text-xs font-medium text-slate-500">Loading Hub</p>
                  </div>
                  <div className="flex-1 flex items-center justify-center">
                    <div className="h-0.5 w-full bg-slate-200 relative">
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full bg-blue-600 ring-2 ring-blue-100" />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-black text-slate-900">{c.to}</p>
                    <p className="text-xs font-medium text-slate-500">Destination Hub</p>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs">
                  <span className="text-slate-500">
                    Est. Distance: <strong className="text-slate-800">{c.dist}</strong>
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
            <span className="text-xs font-black uppercase tracking-widest text-blue-600">
              Commercial Fleet Lineup
            </span>
            <h2 className="mt-2 text-3xl font-black text-slate-900 sm:text-4xl">
              Equipped for Every Cargo Category
            </h2>
            <p className="mt-3 text-sm text-slate-600">
              Modern containerized vehicles, multi-axle trailers, and heavy load trucks maintained
              with periodic mechanical audits and FASTag automated tolling.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {fleetTypes.map((truck, idx) => (
              <div
                key={idx}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/60 p-6 hover:bg-white hover:border-blue-300 hover:shadow-lg transition"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-100 text-blue-700">
                      <Truck className="h-5 w-5" />
                    </div>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                      GPS Monitored
                    </span>
                  </div>

                  <h3 className="mt-4 text-base font-black text-slate-900">{truck.name}</h3>
                  <div className="mt-3 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Payload Cap:</span>
                      <span className="font-bold text-slate-900">{truck.capacity}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Volume:</span>
                      <span className="font-bold text-slate-900">{truck.volume}</span>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl bg-white p-3 border border-slate-200 shadow-2xs">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Ideal Goods:
                    </p>
                    <p className="text-xs text-slate-700 mt-1 font-medium">{truck.bestFor}</p>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-blue-700 font-bold">{truck.imageTag}</span>
                  <a
                    href="#quote"
                    className="font-bold text-slate-900 hover:text-blue-600 transition flex items-center gap-1"
                  >
                    Book <ChevronRight className="h-3 w-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* Operational Hub Image Feature */}
          <div className="mt-14 relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-900 text-white shadow-xl">
            <div className="grid lg:grid-cols-[1fr_1.1fr]">
              <div className="p-8 sm:p-12 flex flex-col justify-center">
                <span className="text-xs font-black uppercase tracking-widest text-amber-400">
                  Strategic Hub Facilities
                </span>
                <h3 className="mt-2 text-2xl sm:text-3xl font-black text-white">
                  Yard &amp; Warehouse Staging Infrastructure
                </h3>
                <p className="mt-4 text-sm text-slate-300 leading-relaxed font-normal">
                  Our central distribution hubs feature high-bay loading docks, dedicated forklift
                  teams, overnight staging yards, and electronic weighbridge facilities to ensure
                  zero turnaround delay.
                </p>
                <div className="mt-6 grid grid-cols-2 gap-4 text-xs font-bold text-slate-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Electronic Weighbridge
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" /> 24x7 CCTV &amp; Security
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Mechanized Loading Bays
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Driver Rest Lounge
                  </div>
                </div>
              </div>
              <div className="relative h-64 sm:h-80 lg:h-auto min-h-[260px]">
                <Image
                  src="/images/fleet-hub.jpg"
                  alt="High-tech logistics hub distribution warehouse with trucks"
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
      {/* INTERACTIVE FREIGHT RATE ESTIMATOR / INQUIRY              */}
      {/* ========================================================= */}
      <section id="quote" className="border-t border-slate-200 bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <span className="text-xs font-black uppercase tracking-widest text-blue-600">
                Transparent Freight Quotes
              </span>
              <h2 className="mt-2 text-3xl font-black text-slate-900 sm:text-4xl">
                Quick Freight Rate Estimator
              </h2>
              <p className="mt-4 text-sm text-slate-600 leading-relaxed">
                Select your corridor and commercial vehicle type to get an instant route estimate.
                Our logistics coordinators confirm final tailored pricing for corporate contracts.
              </p>

              <div className="mt-8 space-y-4">
                <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Guaranteed Transparent Rates</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      No surprise transit surcharges on standard scheduled freight movement.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Commercial Credit Billing</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Flexible 15 to 30 day credit billing cycles for verified corporate consignors.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Calculator Card */}
            <div className="rounded-3xl border border-slate-200 bg-white p-7 sm:p-9 shadow-xl">
              <h3 className="text-lg font-black text-slate-900">Calculate Route Estimate</h3>
              <p className="text-xs text-slate-500 mt-1">
                Enter your shipment details for estimated transit pricing
              </p>

              <form onSubmit={handleCalculateQuote} className="mt-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Origin Hub / City
                    </label>
                    <input
                      type="text"
                      value={originCity}
                      onChange={(e) => setOriginCity(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Destination City
                    </label>
                    <input
                      type="text"
                      value={destCity}
                      onChange={(e) => setDestCity(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Vehicle Category
                  </label>
                  <select
                    value={truckCategory}
                    onChange={(e) => setTruckCategory(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition cursor-pointer"
                  >
                    <option value="32ft-mxl">32 Ft Multi-Axle Container (14 - 18 MT)</option>
                    <option value="20ft-close">20 Ft Close Body (7 - 9 MT)</option>
                    <option value="taurus-10w">10-Wheeler Taurus (21 - 25 MT)</option>
                    <option value="trailer-40ft">40 Ft Heavy Flatbed Trailer (30+ MT)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Consignor Contact Mobile (Optional)
                  </label>
                  <input
                    type="tel"
                    value={shipperPhone}
                    onChange={(e) => setShipperPhone(e.target.value)}
                    placeholder="+91 98XXXXXXXX"
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-blue-600 py-3 text-sm font-black text-white shadow-md shadow-blue-600/20 hover:bg-blue-700 transition"
                >
                  Estimate Freight Rate
                </button>
              </form>

              {/* Estimate Result Display */}
              {estimatedQuote && (
                <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50/60 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
                        Indicative Freight Quote
                      </p>
                      <h4 className="text-2xl font-black text-slate-900 mt-1">
                        ₹{estimatedQuote.approxRate.toLocaleString("en-IN")}{" "}
                        <span className="text-xs font-normal text-slate-500">
                          (Excl. GST &amp; Tolls)
                        </span>
                      </h4>
                    </div>
                    <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white shadow-xs">
                      Standard FTL
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs border-t border-blue-200/80 pt-3">
                    <div>
                      <span className="text-slate-500">Est. Transit:</span>{" "}
                      <strong className="text-slate-900">{estimatedQuote.transitTime}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Payload Cap:</span>{" "}
                      <strong className="text-slate-900">{estimatedQuote.capacity}</strong>
                    </div>
                  </div>

                  <button
                    onClick={() => setQuoteSubmitted(true)}
                    className="mt-4 w-full rounded-xl bg-white py-2.5 text-xs font-black text-blue-700 border border-blue-200 hover:bg-blue-50 transition shadow-2xs"
                  >
                    {quoteSubmitted
                      ? "Inquiry Received! Our Team Will Call You Shortly."
                      : "Lock Rate & Request Fleet Booking"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* HIGHWAY SOS & 24x7 CONTROL ROOM HOTLINE (Vibrant Strip)   */}
      {/* ========================================================= */}
      <section id="contact" className="border-t border-slate-200 bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="rounded-3xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 p-8 sm:p-12 text-white shadow-xl">
            <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
              <div>
                <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-black uppercase tracking-wider text-white backdrop-blur">
                  24x7 Centralized Dispatch Desk
                </span>
                <h3 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl text-white">
                  Ready to Book Cargo or Need Highway Breakdown Assistance?
                </h3>
                <p className="mt-3 text-sm sm:text-base font-normal text-blue-100 leading-relaxed max-w-xl">
                  Our operations team, fleet controllers, and roadside breakdown assistance network
                  are active round-the-clock across all national highway corridors.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row lg:flex-col gap-3 justify-end">
                <a
                  href="tel:+919826012345"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 text-sm font-black text-blue-900 shadow-xl hover:bg-blue-50 transition"
                >
                  <Phone className="h-4 w-4 text-blue-600" />
                  Call Control Tower: +91 98260 12345
                </a>
                <Link
                  href={portalUrl}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-900/60 border border-white/20 px-6 py-4 text-sm font-black text-white shadow-xl hover:bg-blue-900 transition"
                >
                  <Building2 className="h-4 w-4 text-amber-400" />
                  Access Employee &amp; Fleet TMS Portal
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* CORPORATE FOOTER (Real Company Contact & Navigation)      */}
      {/* ========================================================= */}
      <footer className="border-t border-slate-200/90 bg-white py-14 text-sm text-slate-600">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {/* Col 1: Brand Info & Legal Compliance */}
            <div>
              <div className="flex items-center gap-2.5">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-tr from-blue-700 to-blue-500 text-white shadow-sm">
                  <Truck className="h-5 w-5" />
                </div>
                <span suppressHydrationWarning className="text-base font-black text-slate-900">
                  {companyDisplayName}
                </span>
              </div>
              <p className="mt-3.5 text-xs text-slate-500 leading-relaxed">
                Premier heavy commercial fleet &amp; freight management organization delivering
                secure interstate transport, digital Bilty management, and end-to-end logistics
                excellence across India.
              </p>
              <div className="mt-4 space-y-1.5 text-[11px] font-semibold text-slate-500">
                <div className="flex items-center gap-1.5 text-blue-700">
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
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                Quick Navigation
              </h4>
              <ul className="mt-4 space-y-2.5 text-xs font-semibold">
                <li><a href="#" className="hover:text-blue-600 transition">Home / Overview</a></li>
                <li><a href="#tracking" className="flex items-center gap-1.5 hover:text-blue-600 transition"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Track Consignment (LR)</a></li>
                <li><a href="#services" className="hover:text-blue-600 transition">Freight &amp; Fleet Services</a></li>
                <li><a href="#corridors" className="hover:text-blue-600 transition">Major Interstate Corridors</a></li>
                <li><a href="#fleet" className="hover:text-blue-600 transition">Commercial Vehicle Lineup</a></li>
                <li><a href="#quote" className="hover:text-blue-600 transition">Instant Rate Estimator</a></li>
              </ul>
            </div>

            {/* Col 3: Official Contact & Headquarters */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                Contact &amp; Headquarters
              </h4>
              <ul className="mt-4 space-y-3 text-xs text-slate-600">
                <li className="flex items-start gap-2.5">
                  <MapPin className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-800 block">Registered Office / Yard:</span>
                    <span className="text-slate-500 leading-relaxed">{companyAddress}</span>
                  </div>
                </li>
                <li className="flex items-center gap-2.5">
                  <Phone className="h-4 w-4 text-blue-600 shrink-0" />
                  <div>
                    <span className="text-slate-500 block text-[11px]">24x7 Control Room:</span>
                    <a href={`tel:${companyPhone}`} className="font-bold text-slate-900 hover:text-blue-600 transition">
                      {companyPhone}
                    </a>
                  </div>
                </li>
                <li className="flex items-center gap-2.5">
                  <Mail className="h-4 w-4 text-blue-600 shrink-0" />
                  <div>
                    <span className="text-slate-500 block text-[11px]">Dispatch &amp; Billing Email:</span>
                    <a href={`mailto:${companyEmail}`} className="font-bold text-slate-900 hover:text-blue-600 transition">
                      {companyEmail}
                    </a>
                  </div>
                </li>
                <li className="flex items-center gap-2.5 text-slate-500">
                  <Clock className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>24x7 Dispatches &amp; Satellite Fleet Radar</span>
                </li>
              </ul>
            </div>

            {/* Col 4: TMS Operations Portal Access */}
            <div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 shadow-xs">
                <div className="flex items-center gap-2">
                  <div className="grid h-7 w-7 place-items-center rounded-lg bg-blue-600 text-white">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                    Operations Portal
                  </h4>
                </div>
                <p className="mt-2.5 text-xs text-slate-500 leading-relaxed font-normal">
                  Authorized access for dispatchers, fleet managers, accountants, and staff members.
                </p>
                <div className="mt-4">
                  <Link
                    href={portalUrl}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-xs font-black text-white shadow-md shadow-blue-500/20 hover:from-blue-700 hover:to-indigo-700 transition active:scale-95"
                  >
                    {portalLabel}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Protected by 256-Bit SSL &amp; RBAC</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Copyright & Legal Links */}
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-between border-t border-slate-200/80 pt-8 text-xs text-slate-500">
            <p suppressHydrationWarning>© {new Date().getFullYear()} {companyDisplayName}. All rights reserved.</p>
            <div className="mt-4 sm:mt-0 flex gap-6 font-medium">
              <a href="#tracking" className="hover:text-blue-600 transition">Track LR / Bilty</a>
              <a href="#quote" className="hover:text-blue-600 transition">Freight Rate Card</a>
              <a href="#contact" className="hover:text-blue-600 transition">Emergency SOS</a>
              <Link href="/login" className="hover:text-blue-600 transition font-bold text-blue-700">Staff Portal Login</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* ========================================================= */}
      {/* INTERACTIVE TRACKING MODAL POPUP (Clean Light Theme)     */}
      {/* ========================================================= */}
      {trackingModalOpen && trackingResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl text-left">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-emerald-50 px-3 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                    {trackingResult.status}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    {trackingResult.type}
                  </span>
                </div>
                <h3 className="mt-2 text-2xl font-black text-slate-900">
                  {trackingResult.queryNumber}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Vehicle: <strong className="text-slate-800">{trackingResult.vehicleNo}</strong> | Speed:{" "}
                  <strong className="text-emerald-600">{trackingResult.speed}</strong>
                </p>
              </div>

              <button
                onClick={() => setTrackingModalOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Current Geo Location Pill */}
            <div className="mt-5 rounded-2xl bg-blue-50/70 border border-blue-100 p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-600 text-white shadow-xs">
                  <Navigation className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
                    Current Live Satellite Location
                  </p>
                  <p className="text-sm font-black text-slate-900 mt-0.5">
                    {trackingResult.currentLocation}
                  </p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3 border-t border-blue-100 pt-3 text-xs">
                <div>
                  <span className="text-slate-500">Driver:</span>{" "}
                  <strong className="text-slate-800">{trackingResult.driverName}</strong>
                </div>
                <div>
                  <span className="text-slate-500">ETA:</span>{" "}
                  <strong className="text-blue-700 font-bold">{trackingResult.eta}</strong>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <span className="text-slate-500">Driver Contact:</span>{" "}
                  <strong className="text-slate-800">{trackingResult.driverPhone}</strong>
                </div>
              </div>
            </div>

            {/* Timeline Progress Tracker */}
            <div className="mt-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
                Shipment Transit Milestones
              </h4>
              <div className="space-y-4">
                {trackingResult.steps.map((st, i) => (
                  <div key={i} className="flex items-start gap-3 relative">
                    <div className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border ${
                      st.done
                        ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                        : "bg-slate-50 border-slate-200 text-slate-400"
                    }`}>
                      {st.done ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <Clock className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p
                          className={`text-sm font-bold ${
                            st.done ? "text-slate-900" : "text-slate-500"
                          }`}
                        >
                          {st.title}
                        </p>
                        <span className="text-xs text-slate-400 font-medium">{st.time}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{st.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Close Button */}
            <div className="mt-7 flex justify-end">
              <button
                onClick={() => setTrackingModalOpen(false)}
                className="rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition"
              >
                Close Tracking Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
