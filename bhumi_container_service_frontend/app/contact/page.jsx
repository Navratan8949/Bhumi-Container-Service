"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  ShieldCheck,
  Send,
  Building2,
  ArrowRight,
  MessageCircle,
  Truck,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
} from "lucide-react";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    phone: "",
    email: "",
    corridor: "",
    serviceType: "Container Freight (20ft / 40ft)",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    const msg = encodeURIComponent(
      `Hello Bhumi Container Service,\nNew Inquiry from: ${formData.name} (${formData.company || "Independent"})\nPhone: ${formData.phone}\nEmail: ${formData.email}\nRoute/Corridor: ${formData.corridor || "General Inquiry"}\nService: ${formData.serviceType}\nMessage: ${formData.message}`
    );
    window.open(`https://wa.me/919884008698?text=${msg}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-[#080d17] text-white selection:bg-amber-500 selection:text-slate-950 font-sans">
      {/* Top Strip */}
      <div className="border-b border-white/[0.08] bg-[#05080f] text-[11px] text-slate-300">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-4 py-2 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold text-amber-400">24x7 National Highway Control Tower</span>
          </div>
          <a
            href="tel:9884008698"
            className="flex items-center gap-1.5 font-bold text-slate-200 hover:text-amber-400 transition"
          >
            <Phone className="h-3 w-3 text-amber-400" />
            <span>Emergency SOS: +91 98840 08698</span>
          </a>
        </div>
      </div>

      {/* Header */}
      <header className="border-b border-slate-800/90 bg-[#0b1220]/95 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-white border border-white/20 p-0.5 shadow-md flex items-center justify-center">
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
                <span className="text-base sm:text-lg font-black tracking-tight text-white group-hover:text-amber-400 transition">
                  Bhumi Container Service
                </span>
                <span className="rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider">
                  BCS
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-400">
                Heavy Commercial Fleet &amp; Freight Carrier
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-xs font-bold text-slate-300 hover:text-amber-400 px-3 py-2 rounded-xl border border-slate-700 bg-slate-800/80 transition"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Back to Home</span>
            </Link>
            <Link
              href="/login"
              className="hidden sm:inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-xs font-black text-slate-950 shadow-md hover:from-amber-400 hover:to-amber-500 transition"
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>Staff Portal Login</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-12 sm:py-16">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
          {/* Hero Banner */}
          <div className="max-w-3xl mb-12">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-amber-300">
              <Phone className="h-3.5 w-3.5 text-amber-400" />
              Corporate Dispatch &amp; Highway Support Desk
            </span>
            <h1 className="mt-4 text-3xl sm:text-5xl font-black text-white tracking-tight">
              Connect with <span className="text-amber-400">Bhumi Container Service</span>
            </h1>
            <p className="mt-3 text-base text-slate-300 leading-relaxed">
              Reach our 24x7 centralized operations tower in Puzhal, Chennai. We assist enterprise
              shippers, container freight forwarders, and highway drivers with rapid dispatch, contract
              pricing, and roadside assistance.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {/* Left 2 Cols: Interactive Inquiry & Booking Form */}
            <div className="lg:col-span-2 rounded-3xl border border-slate-800 bg-[#0b1220] p-6 sm:p-10 shadow-xl">
              <h2 className="text-xl sm:text-2xl font-black text-white">
                Request a Freight Rate Card or Container Booking
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-slate-400">
                Submit your freight requirements below. Our logistics coordinator will reach out within 30 minutes.
              </p>

              <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Ramesh Kumar"
                      className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Company / Organization Name
                    </label>
                    <input
                      type="text"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      placeholder="e.g. Apex Industries Pvt Ltd"
                      className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Mobile Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+91 98XXXXXXXX"
                      className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Email Address (Optional)
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="name@company.com"
                      className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Corridor / Route (Origin → Destination)
                    </label>
                    <input
                      type="text"
                      value={formData.corridor}
                      onChange={(e) => setFormData({ ...formData, corridor: e.target.value })}
                      placeholder="e.g. Chennai Port to Bangalore"
                      className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Service Requirement
                    </label>
                    <select
                      value={formData.serviceType}
                      onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-sm text-white focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 cursor-pointer"
                    >
                      <option>Container Freight (20ft / 40ft)</option>
                      <option>Full Truckload (FTL) Heavy Commercial</option>
                      <option>Scheduled Interstate Highway Corridor</option>
                      <option>Contract Fleet Dedicated Operations</option>
                      <option>Over-Dimensional Cargo (ODC) Flatbed</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Consignment Details &amp; Specific Requirements
                  </label>
                  <textarea
                    rows={4}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Specify container size, commodity, approximate dispatch date, and any special handling..."
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-500 to-amber-600 py-4 text-sm font-black text-slate-950 shadow-xl shadow-amber-500/25 hover:from-amber-400 hover:to-amber-500 transition cursor-pointer"
                >
                  <Send className="h-4 w-4" />
                  <span>
                    {submitted
                      ? "Inquiry Sent! Opening Direct WhatsApp Desk..."
                      : "Submit Inquiry & Connect with Dispatcher"}
                  </span>
                </button>
              </form>
            </div>

            {/* Right 1 Col: Direct Hotline & Office Cards */}
            <div className="space-y-6">
              {/* Emergency SOS Banner Card */}
              <div id="sos" className="rounded-3xl border border-red-500/40 bg-gradient-to-br from-red-950/40 via-slate-900 to-[#0b1220] p-6 shadow-xl relative overflow-hidden">
                <div className="flex items-center gap-2 text-red-400">
                  <AlertTriangle className="h-5 w-5 animate-bounce" />
                  <span className="text-xs font-black uppercase tracking-wider">
                    Emergency Highway Breakdown SOS
                  </span>
                </div>
                <h3 className="mt-2 text-lg font-black text-white">
                  24x7 Roadside &amp; Transit SOS Helpline
                </h3>
                <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                  For vehicle breakdowns, tyre bursts, accident recovery, or urgent container seal assistance on any national highway:
                </p>
                <div className="mt-4 flex flex-col gap-2.5">
                  <a
                    href="tel:9884008698"
                    className="flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-500 py-3 text-xs font-black text-white shadow-lg transition"
                  >
                    <Phone className="h-4 w-4" />
                    <span>Dial Emergency Hotline: +91 98840 08698</span>
                  </a>
                  <a
                    href="https://wa.me/919884008698?text=EMERGENCY%20HIGHWAY%20SOS:%20Vehicle%20Breakdown%20Assistance%20Required"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-3 text-xs font-black text-white shadow-lg transition"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>Share Live GPS on WhatsApp</span>
                  </a>
                </div>
              </div>

              {/* Registered Yard Card */}
              <div className="rounded-3xl border border-slate-800 bg-[#0b1220] p-6 shadow-xl space-y-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Registered Office &amp; Container Yard</h4>
                    <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                      Plot No 25, 1st Floor, Shree Ram Nagar, Second Street, Puzhal, Chennai 600066, Tamil Nadu
                    </p>
                    <a
                      href="https://maps.google.com/?q=Plot+No+25,+1st+Floor,+Shree+Ram+Nagar,+Second+Street,+Puzhal,+Chennai+600066"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 hover:text-amber-300 mt-2"
                    >
                      <MapPin className="h-3.5 w-3.5" />
                      Open Location in Google Maps
                    </a>
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-3.5 flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Billing &amp; Dispatch Desk</h4>
                    <p className="mt-0.5 text-xs text-slate-400">bhumicontainerservice@gmail.com</p>
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-3.5 flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Working Hours</h4>
                    <p className="mt-0.5 text-xs text-slate-300">
                      24 Hours / 7 Days a Week (Round-the-clock dispatches)
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-slate-800 bg-[#05080f] py-8 text-xs text-slate-400">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} Bhumi Container Service. All rights reserved.</p>
          <p>
            Developed by <span className="text-amber-400 font-bold">ZDC Tech Global Solutions Pvt Ltd</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
