"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  LockKeyhole,
  Mail,
  ArrowRight,
  Truck,
  ShieldCheck,
  BarChart3,
  Route,
  ArrowLeft,
  Eye,
  EyeOff,
  CheckCircle2,
  Phone,
  AlertCircle,
  Building2,
  Sparkles,
} from "lucide-react";
import { login } from "@/src/services/auth.service";
import { saveSession, getToken, getActiveCompany, getStoredUser, setActiveCompany } from "@/src/lib/auth";
import { getCompanies } from "@/src/services/company.service";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [companyName, setCompanyName] = useState("Bhumi Container Service");

  useEffect(() => {
    if (getToken()) {
      const u = getStoredUser();
      const active = getActiveCompany();
      const storedId =
        typeof window !== "undefined"
          ? sessionStorage.getItem("nrl_company")
          : null;
      if (u?.role === "super_admin" && !active && !storedId) {
        getCompanies()
          .then((res) => {
            const list = res?.data || [];
            if (list.length === 1) {
              setActiveCompany(list[0]);
              router.replace("/dashboard");
            } else if (list.length > 1) {
              router.replace("/select-company");
            } else {
              router.replace("/dashboard");
            }
          })
          .catch(() => router.replace("/dashboard"));
      } else {
        router.replace("/dashboard");
      }
      return;
    }
    try {
      const active = getActiveCompany();
      if (active?.name) {
        setCompanyName(active.name);
      }
    } catch {
      // ignore SSR
    }
  }, [router]);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const r = await login({ email, password });
      saveSession(r.token, r.user);

      // Auto-set company if attached directly or returned in response
      const autoCompany =
        r.company ||
        r.autoSelectedCompany ||
        (r.user?.companyId && typeof r.user.companyId === "object"
          ? r.user.companyId
          : null);

      if (autoCompany) {
        setActiveCompany(autoCompany);
        router.replace("/dashboard");
        return;
      }

      // If super_admin, check active companies count
      if (r.user?.role === "super_admin") {
        try {
          const compRes = await getCompanies();
          const list = compRes?.data || [];
          if (list.length === 1) {
            setActiveCompany(list[0]);
            router.replace("/dashboard");
            return;
          } else if (list.length > 1) {
            router.replace("/select-company");
            return;
          }
        } catch {
          // fallback to dashboard
        }
      }

      router.replace("/dashboard");
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Invalid email or password. Please verify and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-600 selection:text-white flex flex-col justify-between">
      {/* ========================================================= */}
      {/* TOP HEADER / BACK TO WEBSITE NAVIGATION                   */}
      {/* ========================================================= */}
      <header className="border-b border-slate-800 bg-[#0b1220]/95 backdrop-blur-md text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-white border border-slate-200 p-0.5 shadow-sm group-hover:scale-105 transition flex items-center justify-center">
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
              <span className="text-base font-black tracking-tight text-white group-hover:text-amber-400 transition">
                {companyName}
              </span>
              <p className="text-[11px] font-semibold text-slate-400">
                Logistics &amp; Fleet Operations TMS
              </p>
            </div>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs font-bold text-slate-200 shadow-xs hover:border-amber-500/50 hover:text-amber-300 transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Public Website</span>
          </Link>
        </div>
      </header>

      {/* ========================================================= */}
      {/* MAIN LOGIN SECTION (Bright, Modern Two-Column Layout)      */}
      {/* ========================================================= */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8 lg:p-12">
        <div className="w-full max-w-5xl grid lg:grid-cols-[1.1fr_0.9fr] gap-8 items-center">
          {/* Left Column: Visual Showcase (Hidden on Mobile) */}
          <div className="hidden lg:flex flex-col justify-between rounded-3xl border border-slate-800 bg-[#0e1726] p-8 shadow-2xl relative overflow-hidden h-full min-h-[580px] text-white">
            {/* Ambient Background Gradient */}
            <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-blue-100/60 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-amber-100/50 blur-3xl" />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-300">
                <Sparkles className="h-3.5 w-3.5" />
                Enterprise Operations Tower
              </div>

              <h1 className="mt-4 text-3xl font-black text-white leading-tight">
                One unified control center for your freight business.
              </h1>
              <p className="mt-3 text-sm text-slate-300 leading-relaxed font-normal">
                Seamlessly dispatch vehicles, issue digital Bilty, manage FASTag fuel
                allowances, generate GST invoices, track live IoT GPS telematics, and audit
                operational reports.
              </p>

              {/* Feature Highlights Grid */}
              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3.5">
                  <div className="flex items-center gap-2 font-bold text-xs text-slate-200">
                    <Route className="h-4 w-4 text-blue-600" /> Dispatch Control
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 font-normal">
                    Trips, loading sheets &amp; vehicle allocations
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3.5">
                  <div className="flex items-center gap-2 font-bold text-xs text-slate-200">
                    <BarChart3 className="h-4 w-4 text-emerald-600" /> Bilty &amp; Accounts
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 font-normal">
                    GST invoices, payments, e-Way bills &amp; reports
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3.5">
                  <div className="flex items-center gap-2 font-bold text-xs text-slate-200">
                    <Truck className="h-4 w-4 text-amber-500" /> Fleet Telematics
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 font-normal">
                    GPS radar, fuel monitoring &amp; maintenance
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3.5">
                  <div className="flex items-center gap-2 font-bold text-xs text-slate-200">
                    <ShieldCheck className="h-4 w-4 text-indigo-600" /> RBAC Security
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 font-normal">
                    Strict company-scoped roles &amp; permissions
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Truck Image Card */}
            <div className="relative mt-6 h-48 w-full overflow-hidden rounded-2xl border border-slate-200">
              <Image
                src="/images/hero-truck.jpg"
                alt="Logistics fleet truck"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white">
                <span className="flex items-center gap-1.5 font-bold">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  Live GPS Radar Active
                </span>
                <span className="text-slate-300 font-medium">99.98% System Uptime</span>
              </div>
            </div>
          </div>

          {/* Right Column: Clean White Login Form Card */}
          <div className="w-full">
            <div className="rounded-3xl border border-slate-200 bg-white p-7 sm:p-10 shadow-xl">
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl bg-white border border-slate-200 p-1 shadow-xs flex items-center justify-center">
                    <Image
                      src="/images/logo.png"
                      alt="Bhumi Container Service Logo"
                      width={48}
                      height={48}
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-amber-600 block">
                      Operations Portal
                    </span>
                    <span className="text-sm font-extrabold text-slate-900">
                      Bhumi Container Service
                    </span>
                  </div>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Sign in to TMS Portal
                </h2>
                <p className="mt-1.5 text-xs sm:text-sm text-slate-500">
                  Enter your assigned company credentials to continue.
                </p>
              </div>

              {/* Error Message Alert */}
              {error && (
                <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700 animate-in fade-in duration-200">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                  <div className="flex-1">{error}</div>
                </div>
              )}

              {/* Form */}
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. admin@bhumicontainer.in"
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-3.5 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-amber-500/10 transition"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Password
                    </label>
                    <span className="text-[11px] text-slate-400">
                      Company encrypted
                    </span>
                  </div>
                  <div className="relative">
                    <LockKeyhole className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-11 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-amber-500/10 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-500 to-amber-600 py-3.5 text-sm font-black text-slate-950 shadow-xl shadow-amber-500/25 hover:from-amber-400 hover:to-amber-500 transition active:scale-98 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                  >
                    {loading ? (
                      "Signing In..."
                    ) : (
                      <>
                        Sign In to Operations Portal
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Security & Support Note */}
              <div className="mt-6 border-t border-slate-100 pt-5 space-y-3">
                <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-500">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Protected by 256-Bit SSL &amp; Role Access Control
                </div>
                <div className="text-center text-[11px] text-slate-400">
                  Having trouble signing in? Call Control Room:{" "}
                  <a
                    href="tel:+919884008698"
                    className="font-bold text-amber-600 hover:underline"
                  >
                    +91 98840 08698
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ========================================================= */}
      {/* MINIMAL CLEAN FOOTER                                      */}
      {/* ========================================================= */}
      <footer className="border-t border-slate-800 bg-[#080d17] py-4 text-xs text-slate-400">
        <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-between px-4 sm:px-6 gap-2">
          <p>© {new Date().getFullYear()} {companyName}. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-amber-400 transition">Public Website</Link>
            <span>•</span>
            <span className="text-slate-400">IBA Approved Commercial Carrier</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
