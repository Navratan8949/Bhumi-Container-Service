"use client";
import { useRef, useState } from "react";
import {
  Printer,
  X,
  Download,
  Palette,
  Sparkles,
  Check,
  MessageCircle,
  Loader2,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { downloadElementAsPdf } from "@/src/lib/pdfDownload";
import WhatsAppShareModal from "./WhatsAppShareModal";

export default function AdvanceMemoPrintModal({ memo, onClose }) {
  const printRef = useRef(null);
  const [pinkMode, setPinkMode] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [whatsAppOpen, setWhatsAppOpen] = useState(false);

  if (!memo) return null;

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (d) => {
    if (!d) return "—";
    const date = new Date(d);
    if (isNaN(date.getTime())) return d;
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatAmount = (val) => {
    if (val === null || val === undefined || val === "") return "";
    const num = Number(val);
    if (isNaN(num)) return String(val);
    return `${num.toLocaleString("en-IN")}/-`;
  };

  const partyName = memo.partyName || memo.partyId?.name || "Customer";
  const truckNo = memo.truckNumber || memo.vehicleId?.vehicleNumber || "—";
  const driverName = memo.driverName || "";
  const driverPhone = memo.driverPhone || "";
  const brokerPhone = memo.brokerPhone || "";
  const partyPhone = memo.partyPhone || memo.phone || memo.partyId?.phone || "";

  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    setDownloading(true);
    try {
      const safeMemoNo = String(memo.memoNumber || "Slip").replace(/[^a-zA-Z0-9_-]/g, "_");
      const safeTruck = String(truckNo).replace(/[^a-zA-Z0-9_-]/g, "_");
      const filename = `Advance_Memo_${safeMemoNo}_${safeTruck}.pdf`;
      await downloadElementAsPdf(printRef.current, filename, { orientation: "portrait" });
      toast.success("Advance Memo PDF downloaded successfully!");
    } catch (err) {
      console.error("PDF download error:", err);
      toast.error("Failed to generate PDF. Falling back to print dialog.");
    } finally {
      setDownloading(false);
    }
  };

  const whatsappMessage = `*BHUMI CONTAINER SERVICE*
_Transport Contractors & Commission Agent_
Vadodara, Gujarat | Ph: +91 98849 58698

*ADVANCE MEMO / LOADING SLIP*
----------------------------------------
📄 *Memo No:* #${memo.memoNumber || "—"}
📅 *Date:* ${formatDate(memo.date)}
🏢 *Party:* ${partyName}
🚛 *Truck No:* ${truckNo}
${driverName || driverPhone ? `👤 *Driver:* ${driverName} ${driverPhone ? `(${driverPhone})` : ""}\n` : ""}📍 *Route:* ${memo.fromLocation || "—"} ➔ ${memo.toLocation || "—"}
⚖️ *Guarantee Weight:* ${memo.guaranteeWeight || "20 Feet"}
----------------------------------------
💰 *Total Freight:* ₹${Number(memo.totalFreight || 0).toLocaleString("en-IN")}
💵 *Advance Paid/Agreed:* ₹${Number(memo.advance || 0).toLocaleString("en-IN")}
⚠️ *Balance to Pay:* ₹${Number(memo.balance || 0).toLocaleString("en-IN")}
${memo.remarks ? `📝 *Remarks:* ${memo.remarks}\n` : ""}----------------------------------------
*Bank Details for Transfer:*
Bank: AXIS BANK
A/C Name: BHUMI CONTAINER SERVICE
A/C No: 920020062626814
IFSC: UTIB0003260
----------------------------------------
_Please check all documents and chassis/engine details upon loading._`;

  const contactOptions = [];
  if (partyPhone) contactOptions.push({ label: "Party", phone: partyPhone });
  if (driverPhone) contactOptions.push({ label: "Driver", phone: driverPhone });
  if (brokerPhone) contactOptions.push({ label: "Broker", phone: brokerPhone });

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/85 p-2 sm:p-4 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white">
      {/* Container */}
      <div className="relative flex flex-col w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden print:shadow-none print:w-full print:max-w-none print:rounded-none">
        {/* Top Control Bar (Hidden on print) */}
        <div className="flex flex-wrap items-center justify-between px-5 py-3 border-b border-slate-800 bg-[#0b1220] text-white print:hidden gap-2">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-wider text-amber-300">
              Bhumi Advance Memo • Slip #{memo.memoNumber}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Pink Paper Mode Toggle */}
            <button
              type="button"
              onClick={() => setPinkMode(!pinkMode)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition cursor-pointer border ${
                pinkMode
                  ? "bg-pink-600/20 border-pink-400 text-pink-300"
                  : "bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
              }`}
              title="Toggle authentic pink slip paper background"
            >
              <Palette className="h-3.5 w-3.5" />
              <span>{pinkMode ? "Pink Slip: ON" : "Pink Slip: OFF"}</span>
            </button>

            {/* Download PDF Button */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-black text-white shadow hover:bg-blue-500 transition cursor-pointer disabled:opacity-50"
              title="Download Advance Memo as PDF"
            >
              {downloading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              <span>{downloading ? "Downloading..." : "Download PDF"}</span>
            </button>

            {/* WhatsApp Share Button */}
            <button
              type="button"
              onClick={() => setWhatsAppOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-black text-white shadow hover:bg-emerald-500 transition cursor-pointer"
              title="Share Advance Memo on WhatsApp"
            >
              <MessageCircle className="h-3.5 w-3.5 fill-white text-emerald-600" />
              <span>WhatsApp</span>
            </button>

            {/* Print Slip Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3.5 py-1.5 text-xs font-black text-slate-950 shadow hover:bg-amber-400 transition cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>


        {/* PRINTABLE ADVANCE VOUCHER BODY */}
        <div className="p-3 sm:p-6 overflow-y-auto max-h-[85vh] print:max-h-none print:p-0">
          <div
            ref={printRef}
            className={`w-full text-slate-950 p-6 sm:p-8 rounded-xl border-2 border-slate-900 shadow-lg font-sans print:border-none print:shadow-none print:p-6 print:w-full transition-colors ${
              pinkMode ? "bg-[#fed7e2] print:bg-[#fed7e2]" : "bg-white print:bg-white"
            }`}
            style={{
              fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
            }}
          >
            {/* Top Invocations & Mobile Header */}
            <div className="relative flex items-start justify-between border-b border-slate-900/40 pb-2">
              {/* Left: Globe & Trailer Logo */}
              <div className="flex items-center gap-2">
                <div className="h-14 w-14 shrink-0 rounded-full border-2 border-slate-950 flex flex-col items-center justify-center p-1 bg-white/40">
                  {/* Stylized Globe Wireframe with Trailer */}
                  <svg
                    viewBox="0 0 48 48"
                    className="h-10 w-10 text-slate-950 fill-none stroke-current stroke-2"
                  >
                    <circle cx="24" cy="24" r="20" strokeWidth="2.5" />
                    <ellipse cx="24" cy="24" rx="9" ry="20" strokeWidth="1.8" />
                    <line x1="4" y1="24" x2="44" y2="24" strokeWidth="1.8" />
                    <line x1="8" y1="14" x2="40" y2="14" strokeWidth="1.2" />
                    <line x1="8" y1="34" x2="40" y2="34" strokeWidth="1.2" />
                    {/* Small trailer wheels */}
                    <circle cx="16" cy="38" r="3" fill="#0f172a" />
                    <circle cx="32" cy="38" r="3" fill="#0f172a" />
                    <rect x="12" y="32" width="24" height="4" fill="#0f172a" />
                  </svg>
                </div>
              </div>

              {/* Center: Invocations */}
              <div className="text-center flex-1 px-2">
                <p className="text-[12px] font-black tracking-widest uppercase text-slate-900">
                  II Jai Shree Shyam Ji II
                </p>
                <p className="text-[11px] font-bold tracking-wider text-slate-800">
                  II Jai Baba Somnath Ji II
                </p>
              </div>

              {/* Right: Phone Numbers */}
              <div className="text-right shrink-0">
                <p className="text-xs font-black tracking-wide text-slate-950">
                  M.: 98849 58698
                </p>
                <p className="text-xs font-black tracking-wide text-slate-950">
                  &nbsp;&nbsp;&nbsp;&nbsp;98840 08698
                </p>
              </div>
            </div>

            {/* Company Title & Address */}
            <div className="text-center mt-2.5">
              <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-slate-950 font-serif leading-none">
                BHUMI CONTAINER SERVICE
              </h1>
              <div className="inline-block mt-1 px-5 py-0.5 rounded-full bg-slate-950 text-white text-[11px] sm:text-xs font-extrabold uppercase tracking-wider shadow-xs">
                Transport Contractors &amp; Commission Agent
              </div>
              <p className="mt-1.5 text-[10px] sm:text-[11px] font-bold text-slate-900 max-w-xl mx-auto leading-tight">
                SF/15, Siddheshwar Hill Square, Opp. APMC Market, Near Ajwa Chokdi,
                N.H.No. 8, Vadodara 390 019. E mail : bhumicontainerservice@gmail.com
              </p>
            </div>

            {/* ADVANCE MEMO HEADER BAR */}
            <div className="mt-3 flex items-center justify-between border-y-2 border-slate-950 py-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-slate-950">No.</span>
                <span className="text-xl font-black font-mono text-red-600 px-2 py-0.2 tracking-wider">
                  {memo.memoNumber || "984"}
                </span>
              </div>

              <div className="border-2 border-slate-950 bg-white/70 px-4 py-0.5 rounded text-xs sm:text-sm font-black uppercase tracking-widest text-slate-950 shadow-xs">
                ADVANCE MEMO
              </div>

              <div className="flex items-center gap-1">
                <span className="text-sm font-bold text-slate-950">Date</span>
                <span className="text-sm font-black text-slate-950 underline decoration-slate-900 decoration-1">
                  .. {formatDate(memo.date)}
                </span>
              </div>
            </div>

            {/* M/s Party Name Row */}
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-sm font-bold text-slate-950 shrink-0">M/s.</span>
              <div className="flex-1 border-b border-dotted border-slate-900 pb-0.5">
                <span className="text-base sm:text-lg font-black text-slate-950 tracking-wide uppercase">
                  {memo.partyName || memo.partyId?.name || "—"}
                </span>
              </div>
            </div>

            {/* Salutation & Formal Statement */}
            <div className="mt-2.5 text-xs sm:text-[12.5px] font-medium text-slate-950 leading-relaxed text-justify">
              <p>
                <span className="font-bold">Dear Sir,</span>
              </p>
              <p className="indent-6 mt-0.5">
                As per your telephone talks or date we are sending truck for loading of your cargo,
                the details of truck and other terms which have mutually been agreed upon are
                mentioned below :
              </p>
            </div>

            {/* Route & Truck Details with Dotted Underlines */}
            <div className="mt-3 space-y-2 text-xs sm:text-[13px]">
              {/* From & To Row */}
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-bold text-slate-950 shrink-0">From</span>
                <div className="flex-1 border-b border-dotted border-slate-900 pb-0.5 min-w-[120px]">
                  <span className="font-black text-slate-950 uppercase text-sm sm:text-base">
                    {memo.fromLocation || "—"}
                  </span>
                </div>

                <span className="font-bold text-slate-950 shrink-0 ml-2">To</span>
                <div className="flex-1 border-b border-dotted border-slate-900 pb-0.5 min-w-[120px]">
                  <span className="font-black text-slate-950 uppercase text-sm sm:text-base">
                    {memo.toLocation || "—"}
                  </span>
                </div>
              </div>

              {/* Truck Number Row */}
              <div className="flex items-baseline gap-2">
                <span className="font-bold text-slate-950 shrink-0">Truck No.</span>
                <div className="flex-1 border-b border-dotted border-slate-900 pb-0.5">
                  <span className="font-mono font-black text-slate-950 uppercase text-sm sm:text-base tracking-wider">
                    {memo.truckNumber || memo.vehicleId?.vehicleNumber || "—"}
                  </span>
                  {memo.driverPhone && (
                    <span className="ml-3 font-normal text-xs text-slate-800">
                      (Driver: {memo.driverName ? `${memo.driverName} - ` : ""}{memo.driverPhone})
                    </span>
                  )}
                </div>
              </div>

              {/* Guarantee Weight Row */}
              <div className="flex items-baseline gap-2">
                <span className="font-bold text-slate-950 shrink-0">Guarantee Weight</span>
                <div className="flex-1 border-b border-dotted border-slate-900 pb-0.5">
                  <span className="font-black text-slate-950 uppercase text-sm sm:text-base">
                    {memo.guaranteeWeight || "20 Feet"}
                  </span>
                </div>
              </div>
            </div>

            {/* 4 ROUNDED PILL / CAPSULE BOXES FOR FREIGHT & ADVANCE */}
            <div className="mt-4 space-y-2 max-w-lg mx-auto sm:mr-0 sm:ml-auto">
              {/* 1. Total Freight */}
              <div className="flex items-center justify-between gap-3">
                <span className="w-28 sm:w-32 text-xs sm:text-sm font-extrabold text-slate-950 shrink-0">
                  Total Freight
                </span>
                <div className="flex-1 h-9 sm:h-10 rounded-2xl border-2 border-slate-950 bg-white/60 flex items-center justify-center px-4 shadow-2xs">
                  <span className="font-mono text-base sm:text-lg font-black text-slate-950 tracking-wider">
                    {formatAmount(memo.totalFreight)}
                  </span>
                </div>
              </div>

              {/* 2. Advance */}
              <div className="flex items-center justify-between gap-3">
                <span className="w-28 sm:w-32 text-xs sm:text-sm font-extrabold text-slate-950 shrink-0">
                  Advance
                </span>
                <div className="flex-1 h-9 sm:h-10 rounded-2xl border-2 border-slate-950 bg-white/60 flex items-center justify-center px-4 shadow-2xs">
                  <span className="font-mono text-base sm:text-lg font-black text-slate-950 tracking-wider">
                    {formatAmount(memo.advance)}
                  </span>
                </div>
              </div>

              {/* 3. Balance */}
              <div className="flex items-center justify-between gap-3">
                <span className="w-28 sm:w-32 text-xs sm:text-sm font-extrabold text-slate-950 shrink-0">
                  Balance
                </span>
                <div className="flex-1 h-9 sm:h-10 rounded-2xl border-2 border-slate-950 bg-white/60 flex items-center justify-center px-4 shadow-2xs">
                  <span className="font-mono text-base sm:text-lg font-black text-slate-950 tracking-wider">
                    {formatAmount(memo.balance)}
                  </span>
                </div>
              </div>

              {/* 4. Remarks */}
              <div className="flex items-center justify-between gap-3">
                <span className="w-28 sm:w-32 text-xs sm:text-sm font-extrabold text-slate-950 shrink-0">
                  Remarks
                </span>
                <div className="flex-1 h-9 sm:h-10 rounded-2xl border-2 border-slate-950 bg-white/60 flex items-center px-4 shadow-2xs">
                  <span className="text-xs sm:text-sm font-bold text-slate-950 truncate">
                    {memo.remarks || ""}
                  </span>
                </div>
              </div>
            </div>

            {/* Note & Conditions */}
            <div className="mt-4 pt-2.5 border-t border-slate-900/60 text-[10px] sm:text-[10.5px] text-slate-950 leading-tight">
              <p className="font-black uppercase tracking-wider mb-0.5">NOTE,</p>
              <ol className="list-none space-y-0.5 font-bold">
                <li>1) No responsibility for Leakage, Breakage, Thefts, Riots &amp; Strike.</li>
                <li>
                  2) Please Check the Truck Documents properly with Chassis No., Engine No. Driver
                  Licence No., Entry in your challan.
                </li>
                <li>3) No Permission Allowed Other Account.</li>
              </ol>
              <p className="mt-2 text-center font-black tracking-widest uppercase text-slate-950 text-xs">
                THANKING YOU
              </p>
            </div>

            {/* Bottom Footer: Official Axis Bank Details (As per original printed memo) & Signature */}
            <div className="mt-3.5 flex items-end justify-between border-t-2 border-slate-950 pt-2 text-xs">
              {/* Left: Original Bank Details printed on pink slip */}
              <div className="leading-tight">
                <p className="font-black text-slate-950 uppercase tracking-wide text-[11px]">
                  BANK DETAILS :
                </p>
                <p className="font-black text-slate-950 text-xs mt-0.5">
                  BHUMI CONTAINER SERVICE
                </p>
                <p className="font-bold text-slate-950 text-[11px]">
                  BANK NAME : AXIS BANK
                </p>
                <p className="font-mono font-black text-slate-950 text-[11px]">
                  A/C. NO. : 920020062626814
                </p>
                <p className="font-mono font-black text-slate-950 text-[11px]">
                  IFSC CODE : UTIB0003260
                </p>
              </div>

              {/* Right: Authorized Signatory */}
              <div className="text-right leading-tight">
                <p className="text-[11px] font-bold text-slate-800">Yours faithfully</p>
                <p className="font-black text-slate-950 uppercase tracking-wide text-xs mt-0.5">
                  For BHUMI CONTAINER SERVICE
                </p>

                {/* Hand-signed Stamp Representation */}
                <div className="h-10 flex items-center justify-end pr-2">
                  <svg viewBox="0 0 120 40" className="h-8 w-24 text-blue-900 fill-none stroke-current stroke-2 opacity-80">
                    <path d="M 10 25 C 25 10, 45 35, 60 15 C 75 5, 80 30, 100 20 C 110 15, 115 25, 118 20" strokeWidth="2.2" strokeLinecap="round" />
                    <line x1="20" y1="32" x2="95" y2="30" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>

                <p className="border-t border-slate-900 pt-0.5 text-[10px] font-black text-slate-950 uppercase tracking-wider">
                  Authorised Signatory
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* WhatsApp Share Modal */}
        <WhatsAppShareModal
          isOpen={whatsAppOpen}
          onClose={() => setWhatsAppOpen(false)}
          title="Share Advance Memo on WhatsApp"
          subtitle={`Slip #${memo.memoNumber} • ${truckNo}`}
          defaultPhone={partyPhone || driverPhone || ""}
          defaultMessage={whatsappMessage}
          contactOptions={contactOptions}
          onDownloadPdf={handleDownloadPdf}
          downloadButtonLabel="Download PDF Slip"
        />
      </div>
    </div>
  );
}

