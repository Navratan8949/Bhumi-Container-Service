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
import { saveSession, getToken, getActiveCompany } from "@/src/lib/auth";

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
        router.replace("/select-company");
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
      const active = getActiveCompany();
      const storedId =
        typeof window !== "undefined"
          ? sessionStorage.getItem("nrl_company")
          : null;
      router.replace(
        r.user?.role === "super_admin" && !active && !storedId
          ? "/select-company"
          : "/dashboard"
      );
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
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20 group-hover:bg-blue-700 transition">
              <Truck className="h-5 w-5 stroke-[2.3]" />
            </div>
            <div>
              <span className="text-base font-black tracking-tight text-slate-900 group-hover:text-blue-600 transition">
                {companyName}
              </span>
              <p className="text-[11px] font-semibold text-slate-500">
                Logistics &amp; Fleet Operations TMS
              </p>
            </div>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs hover:border-slate-300 hover:bg-slate-50 transition"
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
          <div className="hidden lg:flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-8 shadow-xl relative overflow-hidden h-full min-h-[580px]">
            {/* Ambient Background Gradient */}
            <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-blue-100/60 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-amber-100/50 blur-3xl" />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                <Sparkles className="h-3.5 w-3.5" />
                Enterprise Operations Tower
              </div>

              <h1 className="mt-4 text-3xl font-black text-slate-900 leading-tight">
                One unified control center for your freight business.
              </h1>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed font-normal">
                Seamlessly dispatch vehicles, issue digital Bilty, manage FASTag fuel
                allowances, generate GST invoices, track live IoT GPS telematics, and audit
                operational reports.
              </p>

              {/* Feature Highlights Grid */}
              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5">
                  <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
                    <Route className="h-4 w-4 text-blue-600" /> Dispatch Control
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 font-normal">
                    Trips, loading sheets &amp; vehicle allocations
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5">
                  <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
                    <BarChart3 className="h-4 w-4 text-emerald-600" /> Bilty &amp; Accounts
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 font-normal">
                    GST invoices, payments, e-Way bills &amp; reports
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5">
                  <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
                    <Truck className="h-4 w-4 text-amber-500" /> Fleet Telematics
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 font-normal">
                    GPS radar, fuel monitoring &amp; maintenance
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5">
                  <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
                    <ShieldCheck className="h-4 w-4 text-indigo-600" /> RBAC Security
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 font-normal">
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
                <div className="inline-grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-blue-600 mb-4">
                  <LockKeyhole className="h-5 w-5" />
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
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-3.5 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition"
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
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-11 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition"
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
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700 transition active:scale-98 disabled:opacity-50 disabled:pointer-events-none"
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
                    className="font-bold text-blue-600 hover:underline"
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
      <footer className="border-t border-slate-200/80 bg-white py-4 text-xs text-slate-500">
        <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-between px-4 sm:px-6 gap-2">
          <p>© {new Date().getFullYear()} {companyName}. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-blue-600 transition">Public Website</Link>
            <span>•</span>
            <span className="text-slate-400">IBA Approved Commercial Carrier</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
