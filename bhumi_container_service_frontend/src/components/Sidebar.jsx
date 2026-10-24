"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as Icons from "lucide-react";
import { groups } from "@/src/lib/resources";
import { getVisibleGroupItems } from "@/src/lib/rbac";
import { clearSession, useActiveCompany } from "@/src/lib/auth";
import { useState, useEffect } from "react";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") ||
  "http://localhost:8000";

export default function Sidebar({
  user,
  open,
  onClose,
  collapsed = false,
  onToggleCollapse,
}) {
  const activeCompany = useActiveCompany();
  const pathname = usePathname();
  const router = useRouter();
  const role = user?.role || "";
  const visibleGroups = getVisibleGroupItems(role, groups);
  const [setupOpen, setSetupOpen] = useState(true);

  useEffect(() => {
    const isSetupActive = visibleGroups
      .filter((g) => isSetupGroup(g.label))
      .some((g) =>
        g.items.some(
          ([key]) => pathname === `/${key}` || pathname.startsWith(`/${key}/`),
        ),
      );
    if (isSetupActive) setSetupOpen(true);
  }, [pathname, visibleGroups]);

  const logout = () => {
    clearSession();
    router.replace("/login");
  };

  const initials = (user?.name || "BC")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const roleLabel =
    {
      super_admin: "Super Admin",
      accountant: "Accountant",
    }[role] || "Super Admin";

  const isSetupGroup = (label) =>
    label === "Setup & Admin" || label === "Setup";

  return (
    <>
      {/* Mobile Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Main Sidebar Aside */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-800/80 bg-[#0b1220] text-white transition-[width,transform] duration-300 ease-in-out lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        } ${collapsed ? "w-[280px] lg:w-[74px] lg:items-center" : "w-[280px]"}`}
      >
        {/* Brand Header */}
        <div
          className={`relative flex h-[76px] shrink-0 items-center border-b border-white/[0.08] bg-[#080d17] transition-all duration-300 ${
            collapsed
              ? "w-full justify-center px-2"
              : "w-full justify-between gap-3 px-4 sm:px-5"
          }`}
        >
          {/* Logo & Info */}
          <Link
            href="/dashboard"
            onClick={onClose}
            className="flex items-center gap-3 min-w-0 group"
            title={activeCompany?.name || "Fleet Operations TMS"}
          >
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-white border border-white/20 p-0.5 shadow-md font-black group-hover:scale-105 transition flex items-center justify-center">
              <img
                src="/images/logo.png"
                alt="Bhumi Container Service Logo"
                className="h-full w-full object-contain"
              />
            </div>

            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-[13px] font-black tracking-tight text-white uppercase">
                  {activeCompany?.name || "Fleet Operations TMS"}
                </p>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <p className="text-[9px] font-black uppercase tracking-[0.14em] text-amber-400 truncate">
                    {activeCompany?.code
                      ? `${activeCompany.code} • ${activeCompany.city || "Hub"}`
                      : "Fleet TMS • Operations Hub"}
                  </p>
                </div>
              </div>
            )}
          </Link>

          {/* Header Action Buttons */}
          {!collapsed ? (
            <div className="flex items-center gap-1">
              {/* Desktop Collapse Toggle */}
              {onToggleCollapse && (
                <button
                  onClick={onToggleCollapse}
                  title="Collapse sidebar (Ctrl+B)"
                  className="hidden lg:flex items-center justify-center rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition cursor-pointer"
                >
                  <Icons.PanelLeftClose className="h-4 w-4" />
                </button>
              )}
              {/* Mobile Close Button */}
              <button
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden cursor-pointer"
                onClick={onClose}
                title="Close Navigation"
              >
                <Icons.X className="h-5 w-5" />
              </button>
            </div>
          ) : (
            /* Floating Rail Expand Toggle on Right Border */
            onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                title="Expand sidebar (Ctrl+B)"
                className="absolute -right-3 top-6.5 z-50 hidden lg:flex h-6 w-6 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-300 shadow-lg hover:bg-amber-500 hover:text-slate-950 hover:border-amber-400 transition-colors cursor-pointer"
              >
                <Icons.ChevronRight className="h-3.5 w-3.5 stroke-[2.5]" />
              </button>
            )
          )}
        </div>

        {/* Live Control Tower Status Strip */}
        <div
          className={`border-b border-white/[0.06] bg-slate-900/60 transition-all ${
            collapsed
              ? "w-full py-2 flex items-center justify-center"
              : "px-4 py-2 flex items-center justify-between text-[11px]"
          }`}
          title="Dispatch Operations: ONLINE"
        >
          {collapsed ? (
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
          ) : (
            <>
              <span className="flex items-center gap-1.5 text-slate-300 font-semibold">
                <Icons.Activity className="h-3.5 w-3.5 text-emerald-400" />
                Dispatch Operations
              </span>
              <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 font-mono text-[9px] font-bold text-emerald-300">
                ONLINE
              </span>
            </>
          )}
        </div>

        {/* TMS Standard SOP Link (Hidden for Drivers) */}
        {user?.role !== "driver" && (
          <div
            className={`border-b border-white/[0.06] transition-all ${
              collapsed ? "w-full py-2.5 flex justify-center" : "px-3.5 py-2.5"
            }`}
          >
            {collapsed ? (
              <div className="relative group">
                <Link
                  href="/help"
                  onClick={onClose}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl border transition ${
                    pathname.startsWith("/help")
                      ? "border-amber-400/40 bg-amber-500/20 text-amber-300 shadow-md shadow-amber-500/20"
                      : "border-white/[0.08] bg-white/[0.03] text-amber-400 hover:bg-white/[0.08] hover:border-amber-400/30"
                  }`}
                >
                  <Icons.BookOpen className="h-4 w-4" />
                </Link>
                <div className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 hidden group-hover:flex items-center whitespace-nowrap rounded-lg border border-slate-700/80 bg-[#0d1627]/98 px-2.5 py-1.5 text-xs font-semibold text-white shadow-xl backdrop-blur-md">
                  <span>TMS Standard SOPs</span>
                </div>
              </div>
            ) : (
              <Link
                href="/help"
                onClick={onClose}
                className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 transition ${
                  pathname.startsWith("/help")
                    ? "border-amber-400/30 bg-amber-500/15 text-white"
                    : "border-white/[0.06] bg-white/[0.02] text-slate-300 hover:bg-white/[0.05]"
                }`}
              >
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-amber-500/15 text-amber-300">
                  <Icons.BookOpen className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-bold text-slate-200">
                    TMS Standard SOPs
                  </span>
                  <span className="block text-[10px] text-slate-400">
                    How to use & workflows
                  </span>
                </span>
              </Link>
            )}
          </div>
        )}

        {/* Navigation Modules */}
        <nav
          className={`flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden transition-all ${
            collapsed
              ? "w-full px-2 py-3 space-y-2"
              : "w-full px-3 py-4 space-y-4"
          }`}
        >
          {visibleGroups.map((g) => {
            // Setup & Masters Group Accordion
            if (isSetupGroup(g.label)) {
              const items = g.items;
              if (!items.length) return null;
              const isPrivilegedAdmin =
                role === "super_admin" || role === "admin";
              const displayLabel =
                g.label === "Setup & Admin" && !isPrivilegedAdmin
                  ? "Masters & Setup"
                  : g.label;
              const activeSetup = items.some(
                ([key]) =>
                  pathname === `/${key}` || pathname.startsWith(`/${key}/`),
              );

              // Collapsed View for Setup Group
              if (collapsed) {
                return (
                  <div
                    key={g.label}
                    className="pt-2 border-t border-white/[0.08]"
                  >
                    <div className="relative group flex justify-center py-0.5">
                      <button
                        onClick={() =>
                          onToggleCollapse
                            ? onToggleCollapse()
                            : setSetupOpen((v) => !v)
                        }
                        className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${
                          activeSetup
                            ? "bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/30"
                            : "text-slate-400 hover:bg-white/[0.07] hover:text-white"
                        }`}
                        title={displayLabel}
                      >
                        <Icons.Settings2 className="h-4 w-4" />
                      </button>

                      {/* Collapsed Flyout Popover for Setup Masters */}
                      <div className="pointer-events-none group-hover:pointer-events-auto absolute left-full ml-3 top-0 z-50 hidden group-hover:flex flex-col min-w-[200px] rounded-2xl border border-slate-700/80 bg-[#0d1627]/98 p-2 text-xs shadow-2xl backdrop-blur-md">
                        <div className="px-2.5 py-1.5 border-b border-white/[0.08] mb-1">
                          <p className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                            {displayLabel}
                          </p>
                        </div>
                        <div className="max-h-[300px] overflow-y-auto space-y-0.5 custom-scrollbar">
                          {items.map(([key, label, icon]) => {
                            const Icon = Icons[icon] || Icons.Circle;
                            const href = `/${key}`;
                            const active =
                              pathname === href ||
                              pathname.startsWith(href + "/");
                            return (
                              <Link
                                key={key}
                                href={href}
                                onClick={onClose}
                                className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                                  active
                                    ? "bg-amber-500 text-slate-950 font-bold"
                                    : "text-slate-300 hover:bg-white/[0.07] hover:text-white"
                                }`}
                              >
                                <Icon className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate flex-1">{label}</span>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              // Expanded View for Setup Group
              return (
                <div
                  key={g.label}
                  className="pt-2 border-t border-white/[0.08]"
                >
                  <button
                    onClick={() => setSetupOpen((v) => !v)}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-bold uppercase tracking-wider transition ${
                      activeSetup
                        ? "bg-white/[0.08] text-white"
                        : "text-slate-400 hover:bg-white/[0.04] hover:text-white"
                    }`}
                  >
                    <span className="grid h-6 w-6 place-items-center rounded-lg bg-white/[0.05]">
                      <Icons.Settings2 className="h-3.5 w-3.5" />
                    </span>
                    <span className="flex-1 truncate">{displayLabel}</span>
                    <Icons.ChevronDown
                      className={`h-3.5 w-3.5 transition-transform ${
                        setupOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {setupOpen && (
                    <ul className="mt-1 space-y-0.5 border-l border-amber-500/30 pl-3 ml-3">
                      {items.map(([key, label, icon]) => {
                        const Icon = Icons[icon] || Icons.Circle;
                        const href = `/${key}`;
                        const active =
                          pathname === href || pathname.startsWith(href + "/");
                        return (
                          <li key={key}>
                            <Link
                              href={href}
                              onClick={onClose}
                              className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                                active
                                  ? "bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20"
                                  : "text-slate-400 hover:bg-white/[0.04] hover:text-white"
                              }`}
                            >
                              <Icon className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate flex-1">{label}</span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            }

            // Normal Navigation Groups
            const items = g.items;
            if (!items.length) return null;

            // Collapsed View for Normal Group
            if (collapsed) {
              return (
                <div key={g.label} className="space-y-1">
                  <div className="my-1.5 border-t border-white/[0.08] mx-1" />
                  {items.map(([key, label, icon]) => {
                    const Icon = Icons[icon] || Icons.Circle;
                    const href =
                      key === "dashboard"
                        ? "/dashboard"
                        : key === "reports"
                          ? "/reports"
                          : `/${key}`;
                    const active =
                      pathname === href || pathname.startsWith(href + "/");
                    return (
                      <div
                        key={key}
                        className="relative group flex justify-center py-0.5"
                      >
                        <Link
                          href={href}
                          onClick={onClose}
                          className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${
                            active
                              ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold shadow-lg shadow-amber-500/30 scale-105"
                              : "text-slate-400 hover:bg-white/[0.07] hover:text-white"
                          }`}
                        >
                          <Icon
                            className="h-4 w-4"
                            strokeWidth={active ? 2.5 : 2}
                          />
                        </Link>

                        {/* Tooltip on Hover */}
                        <div className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 hidden group-hover:flex items-center whitespace-nowrap rounded-lg border border-slate-700/80 bg-[#0d1627]/98 px-2.5 py-1.5 text-xs font-semibold text-white shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-100">
                          <span>{label}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            }

            // Expanded View for Normal Group
            return (
              <div key={g.label}>
                <div className="mb-1.5 flex items-center justify-between px-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                    {g.label}
                  </p>
                </div>
                <ul className="space-y-0.5">
                  {items.map(([key, label, icon]) => {
                    const Icon = Icons[icon] || Icons.Circle;
                    const href =
                      key === "dashboard"
                        ? "/dashboard"
                        : key === "reports"
                          ? "/reports"
                          : `/${key}`;
                    const active =
                      pathname === href || pathname.startsWith(href + "/");
                    return (
                      <li key={key}>
                        <Link
                          href={href}
                          onClick={onClose}
                          className={`group flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                            active
                              ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold shadow-md shadow-amber-500/20"
                              : "text-slate-400 hover:bg-white/[0.045] hover:text-slate-100"
                          }`}
                        >
                          <span
                            className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg transition-colors ${
                              active
                                ? "bg-slate-950/15 text-slate-950"
                                : "bg-white/[0.03] text-slate-400 group-hover:text-slate-200"
                            }`}
                          >
                            <Icon
                              className="h-3.5 w-3.5"
                              strokeWidth={active ? 2.5 : 2}
                            />
                          </span>
                          <span
                            className={`truncate flex-1 ${active ? "font-bold text-slate-950" : ""}`}
                          >
                            {label}
                          </span>
                          {active && (
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-950/80 shadow-xs" />
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>



        {/* User Operator Card & Session Controls */}
        <div
          className={`shrink-0 border-t border-slate-800/80 bg-[#080d17]/95 transition-all backdrop-blur-md ${
            collapsed ? "w-full p-2 flex flex-col items-center gap-2" : "p-3"
          }`}
        >
          {collapsed ? (
            <>
              {/* Collapsed Avatar with Hover Tooltip */}
              <div className="relative group">
                <Link href="/profile" onClick={onClose} className="block">
                  <div className="relative">
                    {user?.profileImage ? (
                      <img
                        src={`${BASE_URL}${user.profileImage}`}
                        alt={user.name || "User"}
                        className="h-10 w-10 rounded-xl object-cover border border-amber-400/40 shadow-sm"
                      />
                    ) : (
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 border border-amber-300/40">
                        {initials}
                      </div>
                    )}
                    <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center">
                      <span className="absolute h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                      <span className="relative h-2 w-2 rounded-full border-2 border-[#0b1220] bg-emerald-500" />
                    </span>
                  </div>
                </Link>

                <div className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 hidden group-hover:flex flex-col whitespace-nowrap rounded-lg border border-slate-700/80 bg-[#0d1627]/98 px-2.5 py-1.5 text-xs font-semibold text-white shadow-xl backdrop-blur-md">
                  <span className="text-xs font-bold text-white">
                    {user?.name || "Dispatch Operator"}
                  </span>
                  <span className="text-[10px] text-amber-400 uppercase font-semibold">
                    {roleLabel}
                  </span>
                </div>
              </div>

              {/* Collapsed Logout Button */}
              <button
                onClick={logout}
                title="Logout Session"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800/80 bg-slate-900/80 text-slate-400 hover:border-rose-500/40 hover:bg-rose-500/15 hover:text-rose-400 transition cursor-pointer"
              >
                <Icons.LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <div className="group relative flex items-center justify-between gap-2.5 rounded-2xl border border-slate-800/90 bg-gradient-to-br from-slate-900/95 via-[#0e1726] to-slate-900/95 p-2 transition-all duration-200 hover:border-amber-500/40 hover:bg-slate-800/70 shadow-lg shadow-black/30">
              {/* Clickable Profile Navigation Area */}
              <Link
                href="/profile"
                onClick={onClose}
                className="flex min-w-0 flex-1 items-center gap-2.5 transition group-hover:opacity-95"
                title="View Transport Personnel Profile"
              >
                {/* Avatar with Live Duty Indicator */}
                <div className="relative shrink-0">
                  {user?.profileImage ? (
                    <img
                      src={`${BASE_URL}${user.profileImage}`}
                      alt={user.name || "User"}
                      className="h-10 w-10 rounded-xl object-cover border border-amber-400/40 shadow-sm"
                    />
                  ) : (
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 border border-amber-300/40">
                      {initials}
                    </div>
                  )}
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center">
                    <span className="absolute h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                    <span className="relative h-2 w-2 rounded-full border-2 border-[#0b1220] bg-emerald-500" />
                  </span>
                </div>

                {/* Name & Role Badge */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-black text-slate-100 group-hover:text-amber-400 transition-colors">
                    {user?.name || "Dispatch Operator"}
                  </p>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <span className="inline-flex items-center rounded-md bg-amber-400/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-400 border border-amber-400/20">
                      {roleLabel}
                    </span>
                  </div>
                </div>
              </Link>

              {/* Logout Action Button */}
              <div className="h-6 w-px bg-slate-800/90 shrink-0" />
              <button
                onClick={logout}
                title="Logout Session"
                aria-label="Logout"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-800/80 bg-slate-900/80 text-slate-400 transition-all duration-150 hover:border-rose-500/40 hover:bg-rose-500/15 hover:text-rose-400 hover:scale-105 active:scale-95 cursor-pointer shadow-xs"
              >
                <Icons.LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
