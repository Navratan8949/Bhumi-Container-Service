"use client";

import { useState, useEffect } from "react";
import {
  MessageCircle,
  X,
  Copy,
  Check,
  Send,
  Download,
  Share2,
  Phone,
  Smartphone,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

export default function WhatsAppShareModal({
  isOpen,
  onClose,
  title = "Share on WhatsApp",
  subtitle = "Send formatted document and details directly to client or driver",
  defaultPhone = "",
  defaultMessage = "",
  contactOptions = [], // Array of { label: "Party", phone: "988..." }
  onDownloadPdf,
  downloadButtonLabel = "Download PDF",
}) {
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPhone(defaultPhone || "");
      setMessage(defaultMessage || "");
      setCopied(false);
      setCanNativeShare(
        typeof navigator !== "undefined" && typeof navigator.share === "function"
      );
    }
  }, [isOpen, defaultPhone, defaultMessage]);

  if (!isOpen) return null;

  // Clean phone number: remove non-numeric characters
  const getCleanPhone = (raw) => {
    if (!raw) return "";
    let cleaned = String(raw).replace(/[^\d]/g, "");
    // If 10 digits without country code, prepend 91 (India)
    if (cleaned.length === 10) {
      cleaned = "91" + cleaned;
    }
    return cleaned;
  };

  const handleSendWhatsApp = (isWebOnly = false) => {
    const cleanNum = getCleanPhone(phone);
    const encoded = encodeURIComponent(message);

    let url = "";
    if (isWebOnly) {
      url = cleanNum
        ? `https://web.whatsapp.com/send?phone=${cleanNum}&text=${encoded}`
        : `https://web.whatsapp.com/send?text=${encoded}`;
    } else {
      url = cleanNum
        ? `https://wa.me/${cleanNum}?text=${encoded}`
        : `https://wa.me/?text=${encoded}`;
    }

    window.open(url, "_blank", "noopener,noreferrer");
    toast.success("Opening WhatsApp...");
  };

  const handleCopy = () => {
    if (!message) return;
    navigator.clipboard.writeText(message);
    setCopied(true);
    toast.success("Message copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    if (!navigator.share) return;
    try {
      await navigator.share({
        title: title,
        text: message,
      });
      toast.success("Shared successfully!");
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Native share failed:", err);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-slate-950/80 p-3 sm:p-5 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-emerald-900/10 bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-700 px-6 py-4 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-emerald-700 shadow-md shadow-emerald-900/30">
              <MessageCircle className="h-6 w-6 fill-emerald-600 text-white" />
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                {title}
              </h3>
              <p className="text-xs text-emerald-100 font-medium">{subtitle}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-white/80 hover:bg-white/15 hover:text-white transition cursor-pointer"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Recipient Phone Field */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Smartphone className="h-4 w-4 text-emerald-600" />
                Recipient WhatsApp Number
              </span>
              <span className="text-[10px] text-slate-400 font-normal lowercase">
                (with country code or 10-digit mobile)
              </span>
            </label>

            <div className="relative">
              <div className="absolute left-3 top-2.5 flex items-center gap-1 text-slate-400 font-bold text-xs pointer-events-none">
                <span>+91</span>
                <span className="text-slate-300">|</span>
              </div>
              <input
                type="tel"
                placeholder="Enter 10-digit mobile number (e.g. 9884008698)"
                value={phone.startsWith("+91") ? phone.slice(3) : phone.startsWith("91") && phone.length === 12 ? phone.slice(2) : phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-14 pr-3 text-sm font-bold text-slate-900 outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition"
              />
            </div>

            {/* Quick Contact Chips if provided */}
            {contactOptions.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase text-slate-400 mr-1">
                  Quick Select:
                </span>
                {contactOptions.map((c, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPhone(c.phone || "")}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-bold text-slate-700 hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-800 transition cursor-pointer"
                  >
                    <Phone className="h-3 w-3 text-emerald-600" />
                    <span>{c.label}:</span>
                    <span className="font-mono text-slate-900">{c.phone}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* WhatsApp Message Preview */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                WhatsApp Message Preview &amp; Edit
              </label>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900 transition cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-[#efeae2] p-3 shadow-inner">
              <div className="rounded-xl bg-white p-3 shadow-xs border border-slate-100">
                <textarea
                  rows={9}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full text-xs font-sans text-slate-900 leading-relaxed outline-none resize-none bg-transparent"
                  placeholder="Type message..."
                />
              </div>
              <div className="mt-1 flex items-center justify-between px-1 text-[10px] text-slate-500">
                <span>WhatsApp formatting: *bold*, _italic_ supported</span>
                <span>Editable before sending</span>
              </div>
            </div>
          </div>

          {/* Download PDF Hint / Action */}
          {onDownloadPdf && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-600 text-white shrink-0">
                  <Download className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-blue-950">
                    Want to attach PDF file on WhatsApp?
                  </p>
                  <p className="text-[10px] text-blue-700">
                    Download PDF now, then attach it directly in WhatsApp chat
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onDownloadPdf}
                className="shrink-0 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                {downloadButtonLabel}
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 border-t border-slate-100 bg-slate-50 p-4 shrink-0">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {canNativeShare && (
              <button
                type="button"
                onClick={handleNativeShare}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer shadow-2xs"
              >
                <Share2 className="h-3.5 w-3.5" />
                Share Sheet
              </button>
            )}

            <button
              type="button"
              onClick={() => handleSendWhatsApp(true)}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer shadow-2xs"
              title="Open specifically in WhatsApp Web browser tab"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              WhatsApp Web
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => handleSendWhatsApp(false)}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-black text-white shadow-md shadow-emerald-600/30 hover:bg-emerald-500 transition cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
              Send on WhatsApp
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
