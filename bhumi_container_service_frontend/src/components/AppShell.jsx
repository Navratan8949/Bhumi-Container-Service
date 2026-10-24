"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { getActiveCompany, getStoredUser, getToken } from "@/src/lib/auth";
import api from "@/src/services/api";
import RouteAccessGuard from "./RouteAccessGuard";
import FleetComplianceAlertModal from "./FleetComplianceAlertModal";

export default function AppShell({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [complianceModalOpen, setComplianceModalOpen] = useState(false);

  // Restore collapsed state from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("nrl_sidebar_collapsed");
      if (saved !== null) setCollapsed(saved === "true");
    } catch {}
  }, []);

  const handleToggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("nrl_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  // Global keyboard shortcut Ctrl+B / Cmd+B to toggle sidebar collapse
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        handleToggleCollapse();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const t = getToken();
    const u = getStoredUser();
    if (!t || !u) {
      router.replace("/login");
      return;
    }
    // If super_admin has not selected an active operating company, enforce /select-company
    if (u.role === "super_admin") {
      const active = getActiveCompany();
      const storedCompanyId =
        typeof window !== "undefined"
          ? sessionStorage.getItem("nrl_company")
          : null;
      if (!active && !storedCompanyId) {
        router.replace("/select-company");
        return;
      }
    }
    setUser(u);

    // Sync fresh user details (e.g. role promotions) from backend
    api
      .get("/auth/me")
      .then((res) => {
        if (res.data?.success && res.data?.data) {
          const freshUser = res.data.data;
          sessionStorage.setItem("nrl_user", JSON.stringify(freshUser));
          setUser(freshUser);
        }
      })
      .catch(() => {});
  }, [router]);

  // Global listener for compliance popup alert (works across Dashboard, Header bell, and all pages for super_admin)
  useEffect(() => {
    const handleOpen = () => {
      if (user?.role === "super_admin") {
        setComplianceModalOpen(true);
      }
    };
    window.addEventListener("nrl-open-compliance-alert", handleOpen);
    return () =>
      window.removeEventListener("nrl-open-compliance-alert", handleOpen);
  }, [user?.role]);

  if (!user)
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
      </div>
    );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar
        user={user}
        open={open}
        onClose={() => setOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={handleToggleCollapse}
      />
      <div className="min-w-0 flex-1 flex flex-col h-screen overflow-hidden">
        <Header
          user={user}
          onMenu={() => setOpen((v) => !v)}
          collapsed={collapsed}
          onToggleCollapse={handleToggleCollapse}
        />
        <main className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 w-full pt-[88px] px-4 pb-4 sm:pt-[96px] sm:px-6 sm:pb-6 lg:p-8 custom-scrollbar">
          <RouteAccessGuard user={user}>{children}</RouteAccessGuard>
        </main>
      </div>
      {open && (
        <button
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Single global RTO Fleet Compliance Alert Modal (Portaled to document.body) */}
      <FleetComplianceAlertModal
        isOpen={complianceModalOpen}
        onClose={() => setComplianceModalOpen(false)}
      />
    </div>
  );
}
