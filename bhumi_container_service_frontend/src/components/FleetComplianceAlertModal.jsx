"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  ShieldAlert,
  AlertTriangle,
  ArrowRight,
  X,
  Calendar,
  AlertOctagon,
  ExternalLink,
} from "lucide-react";
import api from "@/src/services/api";

/**
 * Format document type to formal Indian Commercial Fleet terminology
 */
function getDocTypeName(type) {
  if (!type) return "Vehicle Compliance Document";
  const map = {
    insurance: "Commercial Vehicle Insurance Policy",
    fitness: "RTO Fitness Certificate (Form 38)",
    permit: "National / State Goods Permit",
    national_permit: "All India National Goods Permit (Form 48)",
    puc: "Pollution Under Control (PUC)",
    road_tax: "Commercial MV Road Tax Token",
    rc: "Registration Certificate (RC Book)",
    tax: "Commercial Road Tax",
  };
  return map[type.toLowerCase()] || type.toUpperCase().replace(/_/g, " ");
}

/**
 * Format date in Indian Transport Standard: DD Mon YYYY
 */
function formatDate(val) {
  if (!val) return "—";
  const d = new Date(val);
  if (isNaN(d.getTime())) return String(val);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function FleetComplianceAlertModal({
  isOpen,
  onClose,
  alerts = [],
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [internalAlerts, setInternalAlerts] = useState(alerts);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (alerts && alerts.length > 0) {
      setInternalAlerts(alerts);
    } else if (isOpen) {
      api
        .get("/dashboard/alerts")
        .then((res) => {
          if (res.data?.success && Array.isArray(res.data.data)) {
            setInternalAlerts(res.data.data);
          }
        })
        .catch(() => {});
    }
  }, [alerts, isOpen]);

  if (!mounted || !isOpen) return null;

  // Filter only document compliance alerts (expired or expiring)
  const docAlerts = internalAlerts.filter(
    (a) =>
      a.category === "document" ||
      a.documentType ||
      a.vehicleNumber ||
      a.title?.toLowerCase().includes("document"),
  );

  const displayList = docAlerts.length > 0 ? docAlerts : internalAlerts;
  const expiredCount = displayList.filter(
    (a) =>
      (a.daysRemaining !== undefined && a.daysRemaining <= 0) ||
      a.type === "danger",
  ).length;

  const handleGoToDocuments = () => {
    onClose?.();
    router.push("/vehicle-documents");
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="relative w-full max-w-2xl my-auto flex flex-col max-h-[90vh] rounded-3xl border-2 border-rose-400/60 bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Top Transport Statutory Header (shrink-0 so it is NEVER clipped) */}
        <div className="relative shrink-0 overflow-hidden bg-gradient-to-r from-rose-950 via-rose-900 to-amber-950 px-5 py-4 text-white sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-rose-600 text-white shadow-lg shadow-rose-950/50 ring-2 ring-rose-400/50 animate-pulse">
                <ShieldAlert className="h-6 w-6 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-rose-500/30 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-rose-200 ring-1 ring-rose-400/40">
                    RTO & M.V. Act Statutory Notice
                  </span>
                  <span className="text-[11px] font-bold text-amber-300">
                    • Central Control Tower
                  </span>
                </div>
                <h3 className="mt-1 text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                  Commercial Fleet Document Expiry Alert
                </h3>
              </div>
            </div>

            <button
              onClick={onClose}
              className="rounded-xl p-2 text-rose-200 hover:bg-white/15 hover:text-white transition cursor-pointer"
              aria-label="Close alert"
            >
              <X className="h-5 w-5 stroke-[2.5]" />
            </button>
          </div>

          {/* Statutory warning banner */}
          <div className="mt-3 flex items-start gap-2.5 rounded-xl bg-black/40 px-3.5 py-2.5 text-[11px] leading-relaxed text-rose-100 ring-1 ring-white/10">
            <AlertOctagon className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
            <p>
              Operating highway trucks with expired Fitness, Insurance, or
              National Permits violates{" "}
              <span className="font-black text-amber-300">
                Motor Vehicles Act (Sec 192A/196)
              </span>
              . Vehicles risk immediate highway impounding, vehicle seizure, and
              heavy traffic challans.
            </p>
          </div>
        </div>

        {/* List of Affected Commercial Vehicles (flex-1 overflow-y-auto) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5 [scrollbar-width:thin]">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-rose-600 animate-ping" />
              <p className="text-xs font-black uppercase tracking-wider text-slate-700">
                Action Required On Fleet ({displayList.length})
              </p>
            </div>
            {expiredCount > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-[11px] font-black text-rose-800">
                🚨 {expiredCount} Document(s) Expired
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-[11px] font-black text-amber-900 border border-amber-300">
                ⚠️ Renewal Due Soon
              </span>
            )}
          </div>

          {displayList.map((alert, idx) => {
            const isExpired =
              (alert.daysRemaining !== undefined && alert.daysRemaining <= 0) ||
              alert.type === "danger";
            const daysLeft = alert.daysRemaining;

            return (
              <div
                key={alert.id || idx}
                className={`rounded-2xl border p-4 transition-all hover:shadow-md ${
                  isExpired
                    ? "border-rose-300 bg-rose-50/60"
                    : "border-amber-300 bg-amber-50/50"
                }`}
              >
                {/* Top row: Yellow Plate on Left, Status Badge on Right */}
                <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-200/60">
                  {/* Commercial Indian Yellow Number Plate */}
                  <div className="shrink-0 flex items-center overflow-hidden rounded-md border-2 border-slate-900 bg-amber-400 font-mono font-black text-slate-950 shadow-xs">
                    <div className="flex flex-col items-center justify-center bg-blue-700 px-1.5 py-1 text-[8px] font-bold text-white leading-none">
                      <span>IND</span>
                      <span className="text-[6px] opacity-90 mt-0.5">🇮🇳</span>
                    </div>
                    <div className="px-2.5 py-1 text-xs sm:text-sm tracking-wider font-extrabold uppercase">
                      {alert.vehicleNumber || "COMMERCIAL TRUCK"}
                    </div>
                  </div>

                  {/* Status Badge */}
                  {isExpired ? (
                    <span className="inline-flex items-center gap-1 rounded-xl bg-rose-600 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-white shadow-xs">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Immediate Grounding (Expired)
                    </span>
                  ) : daysLeft !== undefined ? (
                    <span className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-slate-950 shadow-xs">
                      ⏳ Due in {daysLeft} Day{daysLeft !== 1 ? "s" : ""}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-xl bg-amber-500 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-slate-950 shadow-xs">
                      ⚠️ Expiring Soon
                    </span>
                  )}
                </div>

                {/* Middle row: Document Details */}
                <div className="pt-3">
                  <h4 className="text-sm font-black text-slate-900 flex flex-wrap items-center gap-2">
                    <span>{getDocTypeName(alert.documentType)}</span>
                    {alert.documentNumber && (
                      <span className="font-mono text-[11px] font-bold text-slate-600 bg-white/90 border border-slate-200 px-2 py-0.5 rounded-md">
                        #{alert.documentNumber}
                      </span>
                    )}
                  </h4>

                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      Expiry Date:{" "}
                      <strong className="text-slate-900">
                        {formatDate(alert.date)}
                      </strong>
                    </span>
                    {alert.vehicleNumber && (
                      <span className="text-slate-500">
                        Fleet Vehicle:{" "}
                        <strong className="text-slate-800">
                          {alert.vehicleNumber}
                        </strong>
                      </span>
                    )}
                  </div>

                  {alert.message && (
                    <p className="mt-2 text-[11px] text-slate-600 leading-relaxed bg-white/70 rounded-lg p-2 border border-slate-200/80">
                      {alert.message}
                    </p>
                  )}
                </div>

                {/* Bottom row: Action Button */}
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={handleGoToDocuments}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-slate-300 px-3 py-1.5 text-xs font-black text-slate-800 hover:border-amber-400 hover:text-amber-800 hover:bg-amber-50/50 transition cursor-pointer shadow-2xs"
                  >
                    <span>Renew Document in Desk</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Action Footer (shrink-0 so buttons are NEVER clipped) */}
        <div className="shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3.5 sm:px-6">
          <div className="text-[11px] text-slate-600 text-center sm:text-left leading-tight">
            <span className="font-bold text-slate-900">Immediate Action:</span>{" "}
            Upload renewed paperwork to maintain uninterrupted highway transit.
          </div>

          <div className="flex w-full sm:w-auto items-center gap-2.5">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-100 transition cursor-pointer whitespace-nowrap"
            >
              Acknowledge & Close
            </button>

            <button
              onClick={handleGoToDocuments}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-xs font-black text-slate-950 shadow-md shadow-amber-500/30 hover:from-amber-400 hover:to-amber-500 transition cursor-pointer whitespace-nowrap"
            >
              <span>Renew Documents Now</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
