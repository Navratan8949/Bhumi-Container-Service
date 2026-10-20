"use client";

import { useEffect, useState, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import {
  getStoredUser,
  roleLabel,
  companyName,
  clearSession,
  saveSession,
  getToken,
  useActiveCompany,
} from "@/src/lib/auth";
import {
  User,
  Mail,
  Shield,
  Building2,
  LogOut,
  Pencil,
  KeyRound,
  X,
  Upload,
  Printer,
  Phone,
  Truck,
  Route,
  CheckCircle2,
  MapPin,
  Activity,
  FileText,
  Radio,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  CreditCard,
  Clock,
  Fuel,
  Receipt,
  Headphones,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { updateProfile, changePassword } from "@/src/services/auth.service";
import { Button, Input, Badge } from "@/src/components/ui";
import { toast } from "sonner";
import Link from "next/link";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") ||
  "https://narmada-road-lines.onrender.com";

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const activeCompany = useActiveCompany();
  const router = useRouter();

  const [editModal, setEditModal] = useState(false);
  const [passModal, setPassModal] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [profileImage, setProfileImage] = useState(null);

  const [currPass, setCurrPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [copiedId, setCopiedId] = useState(false);

  const fileInputRef = useRef(null);
  const printIdCardRef = useRef(null);

  useEffect(() => {
    const u = getStoredUser();
    if (u) {
      setUser(u);
      setName(u.name || "");
      setPhone(u.phone || "");
    }
  }, []);

  const handlePrintIdCard = useReactToPrint({
    contentRef: printIdCardRef,
    documentTitle: `${activeCompany?.code || "TMS"}_ID_Card_${user?.name?.replace(/\s+/g, "_") || "Operator"}`,
  });

  const handleLogout = () => {
    clearSession();
    router.replace("/login");
  };

  const copyOperatorCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedId(true);
    toast.success("Operator ID copied to clipboard");
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      let data = { name, phone };
      if (profileImage) {
        data = new FormData();
        data.append("name", name);
        data.append("phone", phone);
        data.append("profileImage", profileImage);
      }
      const res = await updateProfile(data);
      const updatedUser = res.user || res.data || res;
      setUser(updatedUser);
      saveSession(getToken(), updatedUser);
      toast.success("Transport profile updated successfully");
      setSuccess("Profile updated successfully");
      setProfileImage(null);
      setTimeout(() => setEditModal(false), 1200);
    } catch (err) {
      setError(err.message || "Failed to update profile");
      toast.error(err.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePass = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await changePassword({ currentPassword: currPass, newPassword: newPass });
      toast.success("Password changed successfully");
      setSuccess("Password changed successfully");
      setCurrPass("");
      setNewPass("");
      setTimeout(() => setPassModal(false), 1200);
    } catch (err) {
      setError(err.message || "Failed to change password");
      toast.error(err.message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  const role = user.role || "";
  const isDriver = role === "driver";
  const isDispatcher = role === "dispatcher" || role === "manager";
  const isAccountant = role === "accountant";
  const isAdmin = role === "super_admin" || role === "admin";

  const operatorCode =
    user.employeeCode ||
    `${activeCompany?.code || "TMS"}-${(user.role || "OPR").slice(0, 3).toUpperCase()}-${(
      user._id || "7801"
    )
      .slice(-4)
      .toUpperCase()}`;

  const roleBadgeConfig = () => {
    if (isDriver) {
      return {
        label: "Commercial Heavy Driver (HMV)",
        badgeBg: "bg-amber-400 text-slate-950 border-amber-500",
        icon: Truck,
        department: "Highway Transit & Long-Haul Fleet",
      };
    }
    if (isDispatcher) {
      return {
        label: "Highway Dispatch & LR Controller",
        badgeBg: "bg-indigo-600 text-white border-indigo-700",
        icon: Route,
        department: "Central Operations & Traffic Tower",
      };
    }
    if (isAccountant) {
      return {
        label: "Freight Billing & Accounts Incharge",
        badgeBg: "bg-emerald-600 text-white border-emerald-700",
        icon: Receipt,
        department: "Commercial Accounts & Payroll",
      };
    }
    return {
      label: "Fleet Operations Command • Super Admin",
      badgeBg:
        "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 border-amber-600",
      icon: ShieldCheck,
      department: "Executive Management & Central Control",
    };
  };

  const roleConfig = roleBadgeConfig();
  const RoleIcon = roleConfig.icon;

  return (
    <div className="w-full min-w-0 space-y-6 pb-20">
      {/* Top Header / Breadcrumbs */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-amber-100 text-amber-800">
              <Truck className="h-3.5 w-3.5" />
            </span>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-800">
              Central Fleet Depot • Operator Credential
            </p>
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
            Transport Personnel Profile
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Official operational credentials, dispatch authorization & central
            depot identity
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handlePrintIdCard}
            className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-800 shadow-2xs hover:bg-slate-50 transition cursor-pointer"
            title="Print Official Fleet Staff Identity Pass"
          >
            <Printer className="h-4 w-4 text-indigo-600" />
            Print Fleet ID Pass
          </button>
          <button
            onClick={() => {
              setEditModal(true);
              setError("");
              setSuccess("");
            }}
            className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition cursor-pointer shadow-2xs"
          >
            <Pencil className="h-4 w-4" />
            Edit Profile
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition cursor-pointer shadow-2xs"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </div>

      {/* Main Transport Operator ID Hero Card */}
      <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-sm">
        {/* Banner with Transport Graphics & Dark Luxury Logistics Styling */}
        <div className="relative bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 px-6 sm:px-8 pt-8 pb-16 text-white overflow-hidden">
          {/* Subtle Grid Graphic Background */}
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(#ffffff 1px, transparent 1px), radial-gradient(#ffffff 1px, #0b1220 1px)",
              backgroundSize: "24px 24px",
            }}
          />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-500 text-slate-950 font-black text-sm shadow-md">
                {activeCompany?.code || "TMS"}
              </span>
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400">
                  {activeCompany?.name?.toUpperCase() || "FLEET OPERATIONS TMS"}{" "}
                  • CENTRAL DEPOT
                </span>
                <p className="text-xs text-slate-300">
                  {activeCompany?.city
                    ? `${activeCompany.city} Heavy Commercial Logistics Hub`
                    : "Central Heavy Commercial Logistics Hub"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/20 px-3 py-1 text-[11px] font-bold text-emerald-300 backdrop-blur-md">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Active Session • Verified
              </span>
              <button
                onClick={() => {
                  setPassModal(true);
                  setError("");
                  setSuccess("");
                }}
                className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold text-white hover:bg-white/20 transition cursor-pointer backdrop-blur-md"
              >
                <KeyRound className="h-3.5 w-3.5 text-amber-300" />
                Change Password
              </button>
            </div>
          </div>
        </div>

        {/* Floating Profile Avatar & Primary Identity Bar */}
        <div className="relative px-6 sm:px-8 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between -mt-12 sm:-mt-14 pb-6 border-b border-slate-100 gap-4">
            <div className="flex flex-col sm:flex-row sm:items-end gap-5">
              {/* Profile Photo */}
              <div className="relative group shrink-0">
                <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-2xl border-4 border-white bg-slate-900 shadow-xl overflow-hidden flex items-center justify-center">
                  {user.profileImage ? (
                    <img
                      src={`${BASE_URL}${user.profileImage}`}
                      alt={user.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center bg-gradient-to-br from-slate-900 to-indigo-950 text-amber-400 font-mono text-3xl font-black">
                      {(user.name || "U").slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditModal(true);
                  }}
                  className="absolute bottom-1 right-1 grid h-7 w-7 place-items-center rounded-lg bg-amber-500 text-slate-950 shadow-md hover:bg-amber-400 transition cursor-pointer"
                  title="Upload / Change Profile Photo"
                >
                  <Upload className="h-3.5 w-3.5 stroke-[3]" />
                </button>
              </div>

              {/* Name & Credentials */}
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-950">
                    {user.name}
                  </h2>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-0.5 text-xs font-black uppercase tracking-wider shadow-2xs ${roleConfig.badgeBg}`}
                  >
                    <RoleIcon className="h-3.5 w-3.5" />
                    {roleConfig.label}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    {activeCompany?.city
                      ? `${activeCompany.city} Central Depot (HQ)`
                      : "Central Fleet Depot (HQ)"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                    {companyName(user)}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyOperatorCode(operatorCode)}
                    className="inline-flex items-center gap-1 font-mono font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-md transition cursor-pointer"
                    title="Click to copy Operator ID"
                  >
                    <span>ID: {operatorCode}</span>
                    {copiedId ? (
                      <Check className="h-3 w-3 text-emerald-600" />
                    ) : (
                      <Copy className="h-3 w-3 text-slate-400" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Access Badges */}
            <div className="flex items-center gap-2">
              <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700">
                Clearance:{" "}
                <b className="text-slate-950 font-black">
                  {isDriver
                    ? "Driver Field Operations"
                    : "Level 5 (Full Depot)"}
                </b>
              </span>
            </div>
          </div>

          {/* Operational Details Grid */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
                <span className="uppercase text-[10px] tracking-wider">
                  Official Email
                </span>
                <Mail className="h-4 w-4 text-indigo-600" />
              </div>
              <p className="mt-1 font-semibold text-slate-900 text-sm truncate">
                {user.email || "N/A"}
              </p>
              <p className="text-[10px] text-slate-500">
                Enterprise Login Handle
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
                <span className="uppercase text-[10px] tracking-wider">
                  Depot Contact Phone
                </span>
                <Phone className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="mt-1 font-mono font-bold text-slate-900 text-sm truncate">
                {user.phone ? (
                  <a
                    href={`tel:${user.phone}`}
                    className="hover:text-emerald-700"
                  >
                    {user.phone}
                  </a>
                ) : (
                  "—"
                )}
              </p>
              <p className="text-[10px] text-slate-500">
                Direct Highway Telephony
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
                <span className="uppercase text-[10px] tracking-wider">
                  Assigned Department
                </span>
                <Building2 className="h-4 w-4 text-amber-600" />
              </div>
              <p className="mt-1 font-bold text-slate-900 text-sm truncate">
                {roleConfig.department}
              </p>
              <p className="text-[10px] text-slate-500">
                Fleet Operations Wing
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
                <span className="uppercase text-[10px] tracking-wider">
                  Security & RBAC
                </span>
                <ShieldCheck className="h-4 w-4 text-purple-600" />
              </div>
              <p className="mt-1 font-bold text-slate-900 text-sm truncate">
                Enterprise Multi-Tenant
              </p>
              <p className="text-[10px] text-slate-500">
                ISO/RTO Compliant Access
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Operational Authorizations & Central Operations Desk */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Authorized Fleet Operations */}
        <div className="lg:col-span-7 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-indigo-50 text-indigo-700 font-bold">
                <Shield className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-sm font-black text-slate-950 uppercase tracking-wider">
                  {isDriver
                    ? "Commercial Driver Field Authorizations"
                    : "Authorized Fleet Clearances & Operations"}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {isDriver
                    ? "Assigned operational duties & highway transit tasks"
                    : `Permissions provisioned under ${activeCompany?.name || "Operating Transport Company"} RBAC matrix`}
                </p>
              </div>
            </div>
          </div>

          {isDriver ? (
            <div className="grid gap-2.5 sm:grid-cols-2 text-xs">
              <div className="flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-900 block">
                    Assigned Highway Transit
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Operate allocated commercial fleet vehicles on assigned
                    routes
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-900 block">
                    Trip Journey Controls
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Start journey dispatch & mark destination delivery arrival
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-900 block">
                    Odometer & Transit Logs
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Record starting and ending vehicle odometer readings
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-900 block">
                    24x7 Highway Emergency Support
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Direct access to Central SOS Control Room & roadside
                    helpline
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-2.5 sm:grid-cols-2 text-xs">
              <div className="flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-900 block">
                    Fleet Dispatch & Control
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Authorize vehicles & assign long-haul highway drivers
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-900 block">
                    Lorry Receipt (LR) Desk
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Generate, audit & print official transport bilties
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-900 block">
                    Fuel Slips & Diesel Slips
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Sanction petrol pump vouchers & fuel quantities
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-900 block">
                    Trip Advances & Allowances
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Issue road expense advances & manage salary recovery
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-900 block">
                    Compliance & RTO Expiries
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Permit, National Fitness & Insurance monitoring
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-900 block">
                    Freight Billing & Ledgers
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Issue customer tax invoices & reconcile customer receipts
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Direct Quick Launch Bar */}
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
              Direct Jump:
            </span>
            {isDriver ? (
              <>
                <Link
                  href="/trips"
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-100 hover:bg-slate-200 px-2.5 py-1 text-xs font-bold text-slate-800 transition"
                >
                  <Truck className="h-3 w-3 text-emerald-600" /> My Assigned
                  Trips
                </Link>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-100 hover:bg-slate-200 px-2.5 py-1 text-xs font-bold text-slate-800 transition"
                >
                  <Activity className="h-3 w-3 text-indigo-600" /> Driver
                  Dashboard
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-100 hover:bg-slate-200 px-2.5 py-1 text-xs font-bold text-slate-800 transition"
                >
                  <Activity className="h-3 w-3 text-indigo-600" /> Dispatch
                  Tower
                </Link>
                <Link
                  href="/lr-bilties"
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-100 hover:bg-slate-200 px-2.5 py-1 text-xs font-bold text-slate-800 transition"
                >
                  <FileText className="h-3 w-3 text-amber-600" /> LR Bilty Desk
                </Link>
                <Link
                  href="/trips"
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-100 hover:bg-slate-200 px-2.5 py-1 text-xs font-bold text-slate-800 transition"
                >
                  <Truck className="h-3 w-3 text-emerald-600" /> Live Trips
                </Link>
                <Link
                  href="/customer-invoices"
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-100 hover:bg-slate-200 px-2.5 py-1 text-xs font-bold text-slate-800 transition"
                >
                  <Receipt className="h-3 w-3 text-purple-600" /> Freight
                  Billing
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Right Column: Central Operations Desk & Regional Helpdesk */}
        <div className="lg:col-span-5 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-amber-50 text-amber-700 font-bold">
              <Headphones className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-black text-slate-950 uppercase tracking-wider">
                Central Operations & Highway Desk
              </h3>
              <p className="text-[11px] text-slate-500">
                Emergency escalation & central transit support
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 to-white p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-indigo-950 flex items-center gap-1.5">
                <Radio className="h-4 w-4 text-indigo-600 animate-pulse" />
                24x7 Highway Emergency Desk
              </span>
              <span className="rounded bg-indigo-600 text-white font-mono font-bold px-1.5 py-0.5 text-[10px]">
                LIVE DESK
              </span>
            </div>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              For highway vehicle breakdown, RTO escort assistance, FASTag toll
              balance issues, or destination gate entry clearance:
            </p>
            <div className="flex flex-col gap-1.5 pt-1">
              {activeCompany?.phone ? (
                <a
                  href={`tel:${activeCompany.phone}`}
                  className="inline-flex items-center gap-2 font-mono text-sm font-black text-indigo-950 hover:text-indigo-700"
                >
                  <Phone className="h-4 w-4 text-emerald-600" />
                  {activeCompany.phone}
                </a>
              ) : (
                <span className="inline-flex items-center gap-2 font-mono text-sm font-medium text-slate-500">
                  <Phone className="h-4 w-4 text-slate-400" />—
                </span>
              )}
              <span className="text-[11px] text-slate-500 font-medium">
                Email: {activeCompany?.email || "—"}
              </span>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Regional Transit Hubs
            </p>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                <p className="font-bold text-slate-900">
                  {activeCompany?.city
                    ? `${activeCompany.city} Central Hub`
                    : "Central Operations Hub"}
                </p>
                <p className="text-slate-500 text-[10px]">
                  {activeCompany?.city
                    ? `${activeCompany.city} (Head Yard)`
                    : "Main Transit Yard"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                <p className="font-bold text-slate-900">Mumbai Western Hub</p>
                <p className="text-slate-500 text-[10px]">
                  Bhiwandi Complex (M.H.)
                </p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                <p className="font-bold text-slate-900">Ahmedabad Hub</p>
                <p className="text-slate-500 text-[10px]">
                  Aslali Bypass (Gujarat)
                </p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                <p className="font-bold text-slate-900">Pune Hub</p>
                <p className="text-slate-500 text-[10px]">Chakan MIDC (M.H.)</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden Printable Official Fleet ID Card for Print Output */}
      <div className="hidden">
        <div
          ref={printIdCardRef}
          className="p-8 max-w-[400px] mx-auto bg-white border-2 border-slate-900 rounded-2xl text-slate-900 print:block"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          {/* Card Header */}
          <div className="bg-slate-950 text-white p-4 rounded-xl text-center">
            <div className="flex items-center justify-center gap-2">
              <span className="h-6 w-6 rounded bg-amber-400 text-slate-950 font-black text-xs grid place-items-center">
                {activeCompany?.code || "TMS"}
              </span>
              <h2 className="text-base font-black tracking-wider uppercase">
                {activeCompany?.name?.toUpperCase() || "FLEET OPERATIONS TMS"}
              </h2>
            </div>
            <p className="text-[9px] font-bold tracking-widest text-amber-400 uppercase mt-0.5">
              OFFICIAL FLEET PERSONNEL PASS
            </p>
          </div>

          {/* Photo & Details */}
          <div className="mt-4 text-center">
            <div className="mx-auto h-24 w-24 rounded-full border-4 border-slate-900 overflow-hidden bg-slate-100 flex items-center justify-center">
              {user.profileImage ? (
                <img
                  src={`${BASE_URL}${user.profileImage}`}
                  alt={user.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="font-mono text-2xl font-black text-slate-800">
                  {(user.name || "U").slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>

            <h3 className="mt-3 text-lg font-black text-slate-950">
              {user.name}
            </h3>
            <p className="text-xs font-black uppercase text-amber-700">
              {roleConfig.label}
            </p>
            <p className="font-mono text-xs font-bold text-slate-600 mt-0.5">
              PASS ID: {operatorCode}
            </p>
          </div>

          {/* Particulars Table */}
          <div className="mt-4 border-t border-b border-slate-200 py-3 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Department:</span>
              <span className="font-bold text-slate-900">
                {roleConfig.department}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Contact Phone:</span>
              <span className="font-mono font-bold text-slate-900">
                {user.phone || activeCompany?.phone || "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Assigned Depot:</span>
              <span className="font-bold text-slate-900">
                {activeCompany?.city
                  ? `${activeCompany.city} Central Depot (HQ)`
                  : "Central Fleet Depot (HQ)"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Emergency Desk:</span>
              <span className="font-mono font-bold text-slate-900">
                {activeCompany?.phone || "—"}
              </span>
            </div>
          </div>

          {/* Footer & Signature */}
          <div className="mt-6 flex items-end justify-between text-[9px] text-slate-500">
            <div>
              <p>{activeCompany?.address || "Central Operations Office"}</p>
              <p>
                {activeCompany?.city
                  ? `${activeCompany.city} Depot`
                  : "Main Transport Yard"}
              </p>
            </div>
            <div className="text-center border-t border-slate-400 pt-1">
              <span className="font-bold text-slate-900">
                Authorized Signatory
              </span>
              <p className="text-[8px]">Fleet Control Tower</p>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-5 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-indigo-50 text-indigo-700">
                  <Pencil className="h-4 w-4" />
                </span>
                <h3 className="text-lg font-black text-slate-900">
                  Edit Fleet Profile
                </h3>
              </div>
              <button
                onClick={() => setEditModal(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-600">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-700">
                {success}
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
              <div className="flex items-center gap-4 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="relative h-16 w-16 overflow-hidden rounded-2xl border-2 border-white shadow-sm shrink-0 bg-slate-900">
                  {profileImage ? (
                    <img
                      src={URL.createObjectURL(profileImage)}
                      alt="Preview"
                      className="h-full w-full object-cover"
                    />
                  ) : user.profileImage ? (
                    <img
                      src={`${BASE_URL}${user.profileImage}`}
                      alt={user.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-amber-400 font-bold">
                      {(user.name || "U").slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    <Upload className="h-3.5 w-3.5 text-indigo-600" /> Upload
                    New Photo
                  </button>
                  <p className="mt-1 text-[10px] text-slate-400">
                    PNG, JPG or WebP (max 3MB)
                  </p>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => setProfileImage(e.target.files?.[0])}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-700">
                  Full Name
                </label>
                <Input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ramesh Chandra Sharma"
                />
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-700">
                  Contact Phone Number
                </label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +91 98260-12345"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setEditModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-md cursor-pointer"
                >
                  {loading ? "Saving…" : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {passModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-5 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-amber-50 text-amber-700">
                  <KeyRound className="h-4 w-4" />
                </span>
                <h3 className="text-lg font-black text-slate-900">
                  Change Access Password
                </h3>
              </div>
              <button
                onClick={() => setPassModal(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-600">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-700">
                {success}
              </div>
            )}

            <form onSubmit={handleChangePass} className="space-y-4 text-xs">
              <div>
                <label className="mb-1 block font-bold text-slate-700">
                  Current Password
                </label>
                <Input
                  type="password"
                  required
                  value={currPass}
                  onChange={(e) => setCurrPass(e.target.value)}
                  placeholder="Enter current password..."
                />
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-700">
                  New Password
                </label>
                <Input
                  type="password"
                  required
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  placeholder="Enter new strong password..."
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setPassModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-black shadow-md cursor-pointer"
                >
                  {loading ? "Updating…" : "Update Password"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
