"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Printer,
  Truck,
  Route,
  Phone,
  Building2,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Filter,
  FileText,
  DollarSign,
  Layers,
  Edit2,
  Trash2,
  X,
  Loader2,
  Download,
  Banknote,
  Briefcase,
} from "lucide-react";
import api from "@/src/services/api";
import { toast } from "sonner";
import SearchableSelect from "./SearchableSelect";
import AdvanceMemoPrintModal from "./AdvanceMemoPrintModal";
import { exportToExcelProfessional } from "@/src/lib/excelExport";

export default function AdvanceMemoPage() {
  const router = useRouter();
  const [memos, setMemos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [ownerTypeFilter, setOwnerTypeFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingMemo, setEditingMemo] = useState(null);
  const [printMemo, setPrintMemo] = useState(null);
  const [saving, setSaving] = useState(false);

  // Dropdown options
  const [parties, setParties] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [cities, setCities] = useState([]);
  const [brokers, setBrokers] = useState([]);
  const [trips, setTrips] = useState([]);

  // Form state
  const [form, setForm] = useState({
    memoNumber: "",
    date: new Date().toISOString().split("T")[0],
    partyId: "",
    partyName: "",
    fromLocation: "",
    toLocation: "",
    vehicleId: "",
    truckNumber: "",
    driverId: "",
    driverName: "",
    driverPhone: "",
    guaranteeWeight: "20 Feet",
    totalFreight: "",
    advance: "",
    balance: 0,
    remarks: "",
    ownerType: "company",
    brokerName: "",
  });

  // Load Memos & Dropdown Data
  const loadData = async () => {
    setLoading(true);
    try {
      const [memosRes, vehiclesRes, driversRes, vendorsRes, tripsRes] =
        await Promise.all([
          api.get("/advance-memos").catch(() => ({ data: { data: [] } })),
          api.get("/vehicles").catch(() => ({ data: { data: [] } })),
          api.get("/drivers").catch(() => ({ data: { data: [] } })),
          api.get("/vendors").catch(() => ({ data: { data: [] } })),
          api.get("/trips").catch(() => ({ data: { data: [] } })),
        ]);

      setMemos(memosRes.data?.data || []);
      setParties([]);
      setVehicles(vehiclesRes.data?.data || []);
      setDrivers(driversRes.data?.data || []);
      setTrips(tripsRes.data?.data || []);
      setCities([
        { name: "Chennai Port", state: "Tamil Nadu" },
        { name: "Puzhal Terminal, Chennai", state: "Tamil Nadu" },
        { name: "Ennore Port", state: "Tamil Nadu" },
        { name: "Kattupalli Port", state: "Tamil Nadu" },
        { name: "Sri City", state: "Andhra Pradesh" },
        { name: "Bangalore", state: "Karnataka" },
        { name: "Ranipet", state: "Tamil Nadu" },
        { name: "Hosur", state: "Tamil Nadu" },
        { name: "Coimbatore", state: "Tamil Nadu" },
        { name: "Hyderabad", state: "Telangana" },
        { name: "Bhiwandi", state: "Maharashtra" },
        { name: "Pune", state: "Maharashtra" },
        { name: "Mumbai", state: "Maharashtra" },
      ]);
      setBrokers(vendorsRes.data?.data || []);
    } catch (err) {
      toast.error(err?.message || "Failed to load advance memos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Free / Available Vehicles: Exclude vehicles currently on active trips, under maintenance, or with pending advance memos
  const freeVehicles = useMemo(() => {
    const busyVehicleIds = new Set();
    const busyVehicleNumbers = new Set();

    // 1. Exclude vehicles on active trips (dispatched / in_transit / planned)
    (trips || []).forEach((t) => {
      if (t.status === "dispatched" || t.status === "in_transit" || t.status === "planned") {
        const vId = t.vehicleId?._id || t.vehicleId;
        if (vId) busyVehicleIds.add(String(vId));
        const num = (t.vehicleId?.vehicleNumber || t.truckNumber || "").trim().toUpperCase();
        if (num) busyVehicleNumbers.add(num);
      }
    });

    // 2. Exclude vehicles currently in active advance memos (not settled or cancelled)
    (memos || []).forEach((m) => {
      if (
        (m.status === "pending" || m.status === "issued" || m.status === "dispatched") &&
        (!editingMemo || String(m._id) !== String(editingMemo._id))
      ) {
        const vId = m.vehicleId?._id || m.vehicleId;
        if (vId) busyVehicleIds.add(String(vId));
        const num = (m.truckNumber || "").trim().toUpperCase();
        if (num) busyVehicleNumbers.add(num);
      }
    });

    return (vehicles || [])
      .filter((v) => {
        // If editing this memo, always keep currently assigned vehicle selectable
        if (editingMemo) {
          const editVId = editingMemo.vehicleId?._id || editingMemo.vehicleId;
          const editVNum = (editingMemo.truckNumber || "").trim().toUpperCase();
          if (
            (editVId && String(v._id) === String(editVId)) ||
            (v.vehicleNumber && v.vehicleNumber.trim().toUpperCase() === editVNum)
          ) {
            return true;
          }
        }

        // Exclude vehicles in maintenance or inactive
        if (
          v.status === "under_maintenance" ||
          v.status === "maintenance" ||
          v.status === "inactive"
        ) {
          return false;
        }

        const vId = String(v._id || v.id || "");
        const vNum = (v.vehicleNumber || "").trim().toUpperCase();
        if (busyVehicleIds.has(vId) || busyVehicleNumbers.has(vNum)) {
          return false;
        }

        return true;
      })
      .map((v) => ({
        ...v,
        subtext: `🟢 Free / Available • ${v.vehicleType || "Trailer"} (${
          v.ownerType === "market" ? "Market Truck" : "Own Fleet"
        })`,
      }));
  }, [vehicles, trips, memos, editingMemo]);

  // Free / Available Drivers: Exclude drivers on active trips or pending memos
  const freeDrivers = useMemo(() => {
    const busyDriverIds = new Set();
    const busyDriverPhones = new Set();

    (trips || []).forEach((t) => {
      if (t.status === "dispatched" || t.status === "in_transit" || t.status === "planned") {
        const dId = t.driverId?._id || t.driverId;
        if (dId) busyDriverIds.add(String(dId));
        const phone = (t.driverId?.phone || "").trim();
        if (phone) busyDriverPhones.add(phone);
      }
    });

    (memos || []).forEach((m) => {
      if (
        (m.status === "pending" || m.status === "issued" || m.status === "dispatched") &&
        (!editingMemo || String(m._id) !== String(editingMemo._id))
      ) {
        const dId = m.driverId?._id || m.driverId;
        if (dId) busyDriverIds.add(String(dId));
        const phone = (m.driverPhone || "").trim();
        if (phone) busyDriverPhones.add(phone);
      }
    });

    return (drivers || [])
      .filter((d) => {
        if (editingMemo) {
          const editDId = editingMemo.driverId?._id || editingMemo.driverId;
          if (editDId && String(d._id) === String(editDId)) return true;
        }

        if (d.status === "inactive" || d.status === "on_leave") return false;

        const dId = String(d._id || d.id || "");
        const phone = (d.phone || "").trim();
        if (busyDriverIds.has(dId) || (phone && busyDriverPhones.has(phone))) {
          return false;
        }

        return true;
      })
      .map((d) => ({
        ...d,
        subtext: `🟢 Free / Available • Mob: ${d.phone || "—"}`,
      }));
  }, [drivers, trips, memos, editingMemo]);

  // Auto calculate balance whenever totalFreight or advance changes
  const handleFreightChange = (freightVal, advanceVal) => {
    const f = Number(freightVal) || 0;
    const a = Number(advanceVal) || 0;
    setForm((prev) => ({
      ...prev,
      totalFreight: freightVal,
      advance: advanceVal,
      balance: f - a,
    }));
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    // Generate next sequential memo number
    let nextNo = "985";
    if (memos.length > 0) {
      const nums = memos
        .map((m) => parseInt(m.memoNumber, 10))
        .filter((n) => !isNaN(n));
      if (nums.length > 0) {
        nextNo = String(Math.max(...nums) + 1);
      }
    }

    setEditingMemo(null);
    setForm({
      memoNumber: nextNo,
      date: new Date().toISOString().split("T")[0],
      partyId: "",
      partyName: "",
      fromLocation: "",
      toLocation: "",
      vehicleId: "",
      truckNumber: "",
      driverId: "",
      driverName: "",
      driverPhone: "",
      guaranteeWeight: "20 Feet",
      totalFreight: "",
      advance: "",
      balance: 0,
      remarks: "",
      ownerType: "company",
      brokerName: "",
    });
    setShowModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (memo) => {
    setEditingMemo(memo);
    const linkedVeh = vehicles.find(
      (v) => (v._id || v.id) === (memo.vehicleId?._id || memo.vehicleId)
    );
    const isMarket =
      memo.ownerType === "market" ||
      Boolean(memo.brokerName) ||
      linkedVeh?.ownerType === "market" ||
      linkedVeh?.ownership === "market";

    setForm({
      memoNumber: memo.memoNumber || "",
      date: memo.date ? new Date(memo.date).toISOString().split("T")[0] : "",
      partyId: memo.partyId?._id || memo.partyId || "",
      partyName: memo.partyName || "",
      fromLocation: memo.fromLocation || "",
      toLocation: memo.toLocation || "",
      vehicleId: memo.vehicleId?._id || memo.vehicleId || "",
      truckNumber: memo.truckNumber || "",
      driverId: memo.driverId?._id || memo.driverId || "",
      driverName: memo.driverName || "",
      driverPhone: memo.driverPhone || "",
      guaranteeWeight: memo.guaranteeWeight || "20 Feet",
      totalFreight: memo.totalFreight || "",
      advance: memo.advance || "",
      balance: memo.balance || 0,
      remarks: memo.remarks || "",
      ownerType: isMarket ? "market" : "company",
      brokerName: memo.brokerName || linkedVeh?.brokerName || (isMarket ? linkedVeh?.ownerName : "") || "",
    });
    setShowModal(true);
  };

  // Submit Form (Create / Edit)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.truckNumber?.trim()) {
      toast.error("Please enter or select a Truck / Vehicle number");
      return;
    }
    if (!form.partyName?.trim()) {
      toast.error("Please enter or select a Party Name");
      return;
    }
    if (form.ownerType === "market" && !form.brokerName?.trim()) {
      toast.error("Please enter or select Broker / Transporter Name for Market Lorry");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        ownerType: form.ownerType === "market" ? "market" : "company",
      };
      if (editingMemo) {
        await api.put(`/advance-memos/${editingMemo._id}`, payload);
        toast.success(`Advance Memo #${form.memoNumber} updated successfully`);
      } else {
        await api.post("/advance-memos", payload);
        toast.success(`Advance Memo #${form.memoNumber} issued successfully!`);
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || "Failed to save memo");
    } finally {
      setSaving(false);
    }
  };

  // Delete Memo
  const handleDelete = async (id, num) => {
    if (!confirm(`Are you sure you want to delete Advance Memo #${num}?`)) return;
    try {
      await api.delete(`/advance-memos/${id}`);
      toast.success(`Memo #${num} deleted`);
      loadData();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete");
    }
  };

  // Open Trip Page with Autofilled Details from Advance Memo
  const handleCreateTripFromMemo = (m) => {
    let vId = m.vehicleId?._id || m.vehicleId || "";
    let dId = m.driverId?._id || m.driverId || "";
    const vNum = m.truckNumber || m.vehicleId?.vehicleNumber || "";
    const dName = m.driverName || m.driverId?.name || "";
    const dPhone = m.driverPhone || m.driverId?.phone || "";
    const party = m.partyName || "";
    const from = m.fromLocation || "";
    const to = m.toLocation || "";
    const size = m.guaranteeWeight || "20_ft";
    const rate = m.totalFreight || 0;
    const adv = m.advance || 0;
    const bal = m.balance || 0;
    const ownerType = m.ownerType === "market" ? "market" : "owned";
    const brokerName = m.brokerName || "";
    const ownerName = m.ownerType === "market" ? (m.brokerName || "Market Transporter") : "BHUMI CONTAINER SERVICE";
    const date = m.date ? new Date(m.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0];
    const remarks = m.remarks || `Advance Memo #${m.memoNumber} | Party: ${party} | Adv: ₹${adv}`;

    // Lookup vehicle if vId missing
    if (!vId && vNum && vehicles?.length) {
      const matchV = vehicles.find(
        (v) =>
          v.vehicleNumber?.replace(/\s+/g, "").toUpperCase() ===
          vNum?.replace(/\s+/g, "").toUpperCase(),
      );
      if (matchV) vId = matchV._id;
    }

    // Lookup driver if dId missing
    if (!dId && drivers?.length) {
      const cleanPhone = (dPhone || "").replace(/\D/g, "");
      const matchD = drivers.find((d) => {
        if (cleanPhone && (d.phone || "").replace(/\D/g, "") === cleanPhone) return true;
        if (dName && (d.name || "").trim().toLowerCase() === dName.trim().toLowerCase()) return true;
        return false;
      });
      if (matchD) dId = matchD._id;
    }

    const query = new URLSearchParams({
      autoOpenAdd: "true",
      fromAdvanceMemo: "true",
      advanceMemoId: String(m._id),
      advanceMemoNumber: String(m.memoNumber),
      tripNumber: `TRIP-${m.memoNumber}`,
      vehicleId: String(vId || ""),
      truckNumber: vNum,
      driverId: String(dId || ""),
      driverName: dName,
      driverPhone: dPhone,
      partyName: party,
      fromCity: from,
      toCity: to,
      containerSize: size,
      rate: String(rate),
      advanceAmount: String(adv),
      balanceAmount: String(bal),
      advanceDate: date,
      dispatchDate: date,
      ownerType,
      ownerName,
      brokerName,
      remarks,
    });

    router.push(`/trips?${query.toString()}`);
  };

  // Quick Action to open Hisab (Sheet 2 for Company Lorry, Sheet 3 for Market Lorry)
  const handleOpenLorryHisabFromMemo = (m) => {
    let vId = m.vehicleId?._id || m.vehicleId || "";
    const vNum = m.truckNumber || m.vehicleId?.vehicleNumber || "";
    if (!vId && vNum && vehicles?.length) {
      const matchV = vehicles.find(
        (v) =>
          v.vehicleNumber?.replace(/\s+/g, "").toUpperCase() ===
          vNum?.replace(/\s+/g, "").toUpperCase(),
      );
      if (matchV) vId = matchV._id;
    }

    const party = m.partyName || "";
    const from = m.fromLocation || "";
    const to = m.toLocation || "";
    const size = m.guaranteeWeight || "22F";
    const adv = m.advance || 0;
    const date = m.date
      ? new Date(m.date).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];
    const tripId = m.tripId
      ? typeof m.tripId === "object"
        ? m.tripId._id
        : m.tripId
      : "";

    // Market Lorry (Broker) -> Sheet 3 (Market Lorry Hisab / Vendor Bills)
    if (m.ownerType === "market") {
      let vendId = m.vendorId?._id || m.vendorId || "";
      if (!vendId && m.brokerName && brokers?.length) {
        const matchB = brokers.find(
          (b) =>
            (b.vendorName || b.name)?.toLowerCase().trim() ===
            m.brokerName?.toLowerCase().trim(),
        );
        if (matchB) vendId = matchB._id;
      }

      const query = new URLSearchParams({
        autoOpenAdd: "true",
        billDate: date,
        vehicleId: String(vId),
        partyName: party,
        vendorId: String(vendId),
        containerSize: size,
        fromLocation: from,
        toLocation: to,
        hireRate: String(m.totalFreight || 0),
        paidAmount: String(adv),
        advanceDate: date,
      });
      router.push(`/vendor-bills?${query.toString()}`);
      return;
    }

    // Company Lorry -> Sheet 2 (Company Lorry Hisab / Driver Trip Settlements)
    let dId = m.driverId?._id || m.driverId || "";
    const dPhone = m.driverPhone || m.driverId?.phone || "";
    if (!dId && dPhone && drivers?.length) {
      const matchD = drivers.find((d) => d.phone === dPhone);
      if (matchD) dId = matchD._id;
    }

    const query = new URLSearchParams({
      autoOpenAdd: "true",
      settlementDate: date,
      vehicleId: String(vId),
      driverId: String(dId),
      driverPhone: dPhone,
      partyName: party,
      containerSize: size,
      fromLocation: from,
      toLocation: to,
      advanceGiven: String(adv),
      advanceDate: date,
      rs: String(m.totalFreight || 0),
    });
    if (tripId) query.set("tripId", String(tripId));

    router.push(`/driver-trip-settlements?${query.toString()}`);
  };

  // Filtered Memos
  const filteredMemos = memos.filter((m) => {
    if (statusFilter && m.status !== statusFilter) return false;
    if (ownerTypeFilter) {
      const isMkt = m.ownerType === "market" || Boolean(m.brokerName);
      if (ownerTypeFilter === "market" && !isMkt) return false;
      if (ownerTypeFilter === "company" && isMkt) return false;
    }
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return (
      m.memoNumber?.toLowerCase().includes(q) ||
      m.partyName?.toLowerCase().includes(q) ||
      m.truckNumber?.toLowerCase().includes(q) ||
      m.driverPhone?.includes(q) ||
      m.driverName?.toLowerCase().includes(q) ||
      m.fromLocation?.toLowerCase().includes(q) ||
      m.toLocation?.toLowerCase().includes(q) ||
      m.brokerName?.toLowerCase().includes(q)
    );
  });

  // KPI calculations
  const totalFreightSum = memos.reduce((acc, m) => acc + (Number(m.totalFreight) || 0), 0);
  const totalAdvanceSum = memos.reduce((acc, m) => acc + (Number(m.advance) || 0), 0);
  const totalBalanceSum = memos.reduce((acc, m) => acc + (Number(m.balance) || 0), 0);
  const dispatchedCount = memos.filter((m) => m.status === "dispatched" || m.tripId).length;

  // Export to Excel
  const handleExportExcel = () => {
    const columns = [
      { key: "memoNumber", label: "Memo No" },
      { key: "date", label: "Date" },
      { key: "partyName", label: "Party Name (M/s)" },
      { key: "truckNumber", label: "Truck No" },
      { key: "driverPhone", label: "Driver Mobile" },
      { key: "driverName", label: "Driver Name" },
      { key: "guaranteeWeight", label: "Guarantee Weight / Size" },
      { key: "fromLocation", label: "From" },
      { key: "toLocation", label: "To" },
      { key: "ownerType", label: "Owner (Self/Market)" },
      { key: "brokerName", label: "Broker Name" },
      { key: "totalFreight", label: "Total Freight (₹)", type: "number" },
      { key: "advance", label: "Advance (₹)", type: "number" },
      { key: "balance", label: "Balance (₹)", type: "number" },
      { key: "status", label: "Status" },
    ];

    const rows = filteredMemos.map((m) => ({
      memoNumber: m.memoNumber,
      date: m.date ? new Date(m.date).toLocaleDateString("en-IN") : "—",
      partyName: m.partyName,
      truckNumber: m.truckNumber,
      driverPhone: m.driverPhone || "—",
      driverName: m.driverName || "—",
      guaranteeWeight: m.guaranteeWeight || "20 Feet",
      fromLocation: m.fromLocation,
      toLocation: m.toLocation,
      ownerType: m.ownerType === "market" ? "Market / Broker" : "Company (Self)",
      brokerName: m.brokerName || "—",
      totalFreight: Number(m.totalFreight || 0),
      advance: Number(m.advance || 0),
      balance: Number(m.balance || 0),
      status: String(m.status || "pending").toUpperCase(),
    }));

    exportToExcelProfessional({
      title: "Bhumi Container Service • Advance Memo Register",
      subtitle: "Official Pre-Trip Dispatch & Freight Voucher Register",
      filename: "Bhumi_Advance_Memo_Register",
      sheetName: "Advance Memos",
      columns,
      rows,
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="grid h-6 w-6 place-items-center rounded-lg bg-amber-500/15 text-amber-700">
              <FileText className="h-3.5 w-3.5" />
            </span>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-800">
              Pre-Trip Booking &amp; Dispatch Desk
            </p>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-950">
            Advance Memo Register
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Pre-dispatch trip vouchers, customer freight agreements, and advance recording.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            Export Excel
          </button>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-black text-slate-950 shadow-sm shadow-amber-500/20 hover:bg-amber-400 transition cursor-pointer"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            Issue Advance Memo
          </button>
        </div>
      </div>

      {/* KPI Stats Ribbon */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Total Memos
            </span>
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-slate-100 text-slate-800">
              <Layers className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="mt-1 font-mono text-2xl font-black text-slate-950">
            {memos.length}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">Issued slips</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Total Freight Billed
            </span>
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-amber-50 text-amber-700">
              <DollarSign className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="mt-1 font-mono text-2xl font-black text-slate-950">
            ₹{totalFreightSum.toLocaleString("en-IN")}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">Party agreed value</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Advances Recd
            </span>
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="mt-1 font-mono text-2xl font-black text-emerald-700">
            ₹{totalAdvanceSum.toLocaleString("en-IN")}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">Cash / Online Transfer</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Balance Receivable
            </span>
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-rose-50 text-rose-700">
              <Clock className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="mt-1 font-mono text-2xl font-black text-rose-700">
            ₹{totalBalanceSum.toLocaleString("en-IN")}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">To collect on POD</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Dispatched Lorries
            </span>
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-slate-100 text-slate-800">
              <Truck className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="mt-1 font-mono text-2xl font-black text-slate-950">
            {dispatchedCount}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">Converted to Trips</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-2xs">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Memo #, Party Name, Truck No, Driver Mobile (e.g. 98840...)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-10 pr-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-500/10"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setOwnerTypeFilter("")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                !ownerTypeFilter
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-200"
              }`}
            >
              All ({memos.length})
            </button>
            <button
              onClick={() => setOwnerTypeFilter("company")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                ownerTypeFilter === "company"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Building2 className="h-3 w-3" />
              <span>Fleet ({memos.filter((m) => m.ownerType !== "market" && !m.brokerName).length})</span>
            </button>
            <button
              onClick={() => setOwnerTypeFilter("market")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                ownerTypeFilter === "market"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "text-purple-700 hover:bg-purple-100"
              }`}
            >
              <Briefcase className="h-3 w-3" />
              <span>Market ({memos.filter((m) => m.ownerType === "market" || m.brokerName).length})</span>
            </button>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending Dispatch</option>
            <option value="dispatched">Dispatched (On Road)</option>
            <option value="delivered">Delivered</option>
            <option value="settled">Settled</option>
          </select>
        </div>
      </div>

      {/* Table Section */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          </div>
        ) : filteredMemos.length === 0 ? (
          <div className="py-20 text-center">
            <FileText className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-2 text-sm font-bold text-slate-900">No Advance Memos found</h3>
            <p className="mt-1 text-xs text-slate-400">
              Create an advance memo to record pre-trip freight and driver advances.
            </p>
            <button
              onClick={handleOpenCreate}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2 text-xs font-black text-slate-950 transition cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5 stroke-[3]" />
              Issue First Memo
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0b1220] text-slate-200">
                <tr>
                  <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-wider text-slate-300">Memo No.</th>
                  <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-wider text-slate-300">Date</th>
                  <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-wider text-slate-300">Customer / Party Name</th>
                  <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-wider text-slate-300">Vehicle / Truck No</th>
                  <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-wider text-slate-300">Driver & Mobile</th>
                  <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-wider text-slate-300">Container Size</th>
                  <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-wider text-slate-300">Route (Loading ➔ Unloading)</th>
                  <th className="px-4 py-3.5 text-right text-[10px] font-black uppercase tracking-wider text-slate-300">Total Freight (₹)</th>
                  <th className="px-4 py-3.5 text-right text-[10px] font-black uppercase tracking-wider text-slate-300">Advance (₹)</th>
                  <th className="px-4 py-3.5 text-right text-[10px] font-black uppercase tracking-wider text-slate-300">Balance (₹)</th>
                  <th className="px-4 py-3.5 text-center text-[10px] font-black uppercase tracking-wider text-slate-300">Status</th>
                  <th className="px-4 py-3.5 text-right text-[10px] font-black uppercase tracking-wider text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredMemos.map((m) => (
                  <tr key={m._id} className="hover:bg-amber-50/20 transition-colors">
                    {/* Memo No */}
                    <td className="px-4 py-3 font-mono">
                      <span className="inline-flex items-center rounded-md bg-amber-500/15 px-2.5 py-0.5 text-xs font-black text-amber-950 border border-amber-500/30">
                        #{m.memoNumber}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {m.date
                        ? new Date(m.date).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </td>

                    {/* Party */}
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-900 truncate max-w-[160px]">
                        {m.partyName}
                      </p>
                    </td>

                    {/* Truck No */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-mono font-black text-sm text-slate-900">
                        {m.truckNumber}
                      </div>
                      {m.ownerType === "market" ? (
                        <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black bg-purple-100 text-purple-900 border border-purple-200 mt-0.5">
                          🚚 Broker: {m.brokerName || "Market"}
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 mt-0.5">
                          🏢 Fleet (Own)
                        </div>
                      )}
                    </td>

                    {/* Driver Mobile */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {m.driverPhone ? (
                        <div className="flex items-center gap-1 font-mono font-bold text-amber-950">
                          <Phone className="h-3 w-3 text-amber-600" />
                          <span>{m.driverPhone}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                      {m.driverName && (
                        <p className="text-[10px] text-slate-500 truncate max-w-[120px]">
                          {m.driverName}
                        </p>
                      )}
                    </td>

                    {/* Size */}
                    <td className="px-4 py-3 font-bold text-slate-700 whitespace-nowrap">
                      {m.guaranteeWeight || "20 Feet"}
                    </td>

                    {/* Route */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1 font-semibold text-slate-800">
                        <span>{m.fromLocation || "—"}</span>
                        <ArrowRight className="h-3 w-3 text-slate-400" />
                        <span>{m.toLocation || "—"}</span>
                      </div>
                    </td>

                    {/* Freight */}
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                      ₹{Number(m.totalFreight || 0).toLocaleString("en-IN")}
                    </td>

                    {/* Advance */}
                    <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                      ₹{Number(m.advance || 0).toLocaleString("en-IN")}
                    </td>

                    {/* Balance */}
                    <td className="px-4 py-3 text-right font-mono font-black whitespace-nowrap">
                      <span
                        className={
                          Number(m.balance) > 0 ? "text-amber-700" : "text-emerald-700"
                        }
                      >
                        {Number(m.balance || 0) === 0 ? "₹0 (Paid)" : `₹${Number(m.balance || 0).toLocaleString("en-IN")}`}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      {m.status === "dispatched" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-0.5 text-[10px] font-black text-purple-700 border border-purple-200">
                          <Truck className="h-2.5 w-2.5" />
                          Dispatched
                        </span>
                      ) : m.status === "delivered" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-black text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="h-2.5 w-2.5" />
                          Delivered
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">
                          <Clock className="h-2.5 w-2.5" />
                          Pending
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Print Advance Memo */}
                        <button
                          onClick={() => setPrintMemo(m)}
                          title="Print Advance Memo Voucher"
                          className="inline-flex items-center gap-1 rounded-lg bg-amber-500/15 border border-amber-500/30 px-2 py-1 text-amber-900 hover:bg-amber-500 hover:text-slate-950 transition cursor-pointer"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          <span className="text-[10px] font-black uppercase">Print Slip</span>
                        </button>

                        {/* Company Lorry Hisab Quick Action */}
                        <button
                          onClick={() => handleOpenLorryHisabFromMemo(m)}
                          title="Open Company Lorry Hisab (Sheet 2) with Memo details"
                          className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 border border-indigo-200 px-2 py-1 text-indigo-700 hover:bg-indigo-600 hover:text-white transition cursor-pointer shadow-2xs font-bold"
                        >
                          <Banknote className="h-3.5 w-3.5" />
                          <span className="text-[10px] font-black uppercase">Hisab</span>
                        </button>

                        {/* Create Trip */}
                        {m.status === "pending" ? (
                          <button
                            onClick={() => handleCreateTripFromMemo(m)}
                            title="Open Trip form with Memo details autofilled"
                            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 border border-amber-600/40 px-2.5 py-1 text-slate-950 transition cursor-pointer shadow-xs font-bold"
                          >
                            <Truck className="h-3.5 w-3.5 fill-current" />
                            <span className="text-[10px] font-black uppercase">Create Trip</span>
                          </button>
                        ) : (
                          <Link
                            href="/trips"
                            title="View Live Trip in Trips Register (Sheet 1)"
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 border border-emerald-300 px-2 py-1 text-emerald-800 hover:bg-emerald-100 transition cursor-pointer"
                          >
                            <Route className="h-3.5 w-3.5 text-emerald-600" />
                            <span className="text-[10px] font-black uppercase">View Trip ➔</span>
                          </Link>
                        )}

                        {/* Edit */}
                        <button
                          onClick={() => handleOpenEdit(m)}
                          title="Edit Memo"
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-amber-50 hover:text-amber-800 transition cursor-pointer"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(m._id, m.memoNumber)}
                          title="Delete Memo"
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Table Tally Strip */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-800 bg-[#0b1220] px-5 py-3 text-white">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-300">
                  Advance Memo Tally ({filteredMemos.length} Records)
                </span>
              </div>
              <div className="flex items-center gap-6 font-mono text-xs font-bold">
                <div>
                  <span className="text-slate-400 mr-1.5">Total Freight:</span>
                  <span className="text-white font-black">
                    ₹{filteredMemos.reduce((s, m) => s + (Number(m.totalFreight) || 0), 0).toLocaleString("en-IN")}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 mr-1.5">Advance Recd:</span>
                  <span className="text-emerald-400 font-black">
                    ₹{filteredMemos.reduce((s, m) => s + (Number(m.advance) || 0), 0).toLocaleString("en-IN")}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 mr-1.5">Balance Pending:</span>
                  <span className="text-amber-400 font-black">
                    ₹{filteredMemos.reduce((s, m) => s + (Number(m.balance) || 0), 0).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 my-8 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 bg-[#0b1220] px-6 py-4 text-white">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-500 text-slate-950 font-black shadow-xs">
                  <FileText className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-lg font-black text-white">
                    {editingMemo ? `Edit Advance Memo #${form.memoNumber}` : "Issue New Advance Memo"}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Pre-trip driver advance voucher & agreement slip
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Row 1: Memo No & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Memo Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.memoNumber}
                    onChange={(e) => setForm({ ...form, memoNumber: e.target.value.toUpperCase() })}
                    placeholder="e.g. 985"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-mono font-bold text-slate-900 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10"
                  />
                </div>
              </div>

              {/* Row 2: Customer / Party Name - M/s. (Direct Input Field) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Customer / Party Name - M/s. (पार्टी का नाम) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. V-Trans Chennai / TCI Freight / Samsung India"
                  value={form.partyName}
                  onChange={(e) =>
                    setForm({ ...form, partyName: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 placeholder:text-slate-400"
                />
              </div>

              {/* Ownership Toggle (Company Fleet vs Market Lorry / Broker) */}
              <div className="rounded-2xl border border-amber-300/40 bg-gradient-to-r from-amber-50/70 via-slate-50 to-amber-50/70 p-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <Truck className="h-3.5 w-3.5 text-amber-600" />
                      Vehicle Ownership / गाड़ी का प्रकार
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {form.ownerType === "market"
                        ? "🚚 Market Lorry (Broker) — थर्ड-पार्टी / बाहर की गाड़ी (आगे Market Lorry AC ब्रोकर हिसाब बनेगा)"
                        : "🏢 Company Fleet (Own) — अपनी कंपनी की गाड़ी (आगे Company Lorry Hisab / Driver Trip बनेगा)"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          ownerType: "company",
                          brokerName: "",
                        })
                      }
                      className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                        form.ownerType !== "market"
                          ? "bg-slate-900 text-white shadow-xs"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <Building2 className="h-3 w-3" />
                      <span>🏢 Company Fleet</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          ownerType: "market",
                          brokerName: form.brokerName || "",
                        })
                      }
                      className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                        form.ownerType === "market"
                          ? "bg-amber-500 text-slate-950 shadow-xs"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <Truck className="h-3 w-3" />
                      <span>🚚 Market Lorry (Broker)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 3: Truck / Vehicle No (Searchable Free Vehicles + Inline Add) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <SearchableSelect
                  label="Vehicle / Truck No. (गाड़ी नंबर) - Only Free Vehicles"
                  required
                  entityType="vehicle"
                  entityLabel="Truck / Vehicle"
                  value={form.vehicleId}
                  options={freeVehicles}
                  placeholder="Select free truck or + Add..."
                  helperText={`${freeVehicles.length} vehicles currently free & ready for dispatch`}
                  onChange={(val, raw) => {
                    let dId = form.driverId;
                    let dName = form.driverName;
                    let dPhone = form.driverPhone;
                    if (raw?.driverId) {
                      const linkedDriver =
                        typeof raw.driverId === "object"
                          ? raw.driverId
                          : drivers.find(
                              (d) =>
                                (d._id || d.id || d.value) === raw.driverId,
                            );
                      if (linkedDriver) {
                        dId =
                          linkedDriver._id ||
                          linkedDriver.id ||
                          linkedDriver.value;
                        dName = linkedDriver.name || "";
                        dPhone = linkedDriver.phone || "";
                      }
                    }
                    const isMkt =
                      raw?.ownerType === "market" ||
                      raw?.ownership === "market" ||
                      Boolean(raw?.brokerName);
                    setForm({
                      ...form,
                      vehicleId: val,
                      truckNumber: raw?.vehicleNumber || form.truckNumber,
                      guaranteeWeight:
                        raw?.vehicleType || form.guaranteeWeight || "20 Feet",
                      ownerType: isMkt ? "market" : "company",
                      brokerName: isMkt
                        ? raw?.brokerName || raw?.ownerName || form.brokerName || ""
                        : "",
                      driverPhone:
                        isMkt && raw?.ownerPhone ? raw.ownerPhone : dPhone,
                      driverId: isMkt ? "" : dId,
                      driverName: dName,
                    });
                  }}
                />

                {/* Guarantee Weight / Size */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Container Size / Vehicle Type (कंटेनर साइज)
                  </label>
                  <select
                    value={form.guaranteeWeight}
                    onChange={(e) => setForm({ ...form, guaranteeWeight: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 cursor-pointer"
                  >
                    <option value="20 Feet">20 Feet Container (20F)</option>
                    <option value="22 Feet">22 Feet Container (22F)</option>
                    <option value="40 Feet">40 Feet Container (40F)</option>
                    <option value="32 Feet S">32 Feet Single Axle (32S)</option>
                    <option value="32 Feet Multi">32 Feet Multi Axle</option>
                    <option value="Trailer">Flatbed Trailer</option>
                  </select>
                </div>
              </div>

              {/* Market Lorry Broker Details Section */}
              {form.ownerType === "market" && (
                <div className="rounded-2xl border border-purple-200 bg-purple-50/60 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-purple-950 flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5 text-purple-700" />
                      Broker Details (ब्रोकर विवरण) <span className="text-rose-500">*</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-200 text-purple-900 border border-purple-300">
                      Market Truck
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-purple-950 mb-1">
                        Broker / Transporter Name (ब्रोकर नाम) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required={form.ownerType === "market"}
                        list="advance-memo-brokers"
                        placeholder="e.g. SYNDIKET TRP / Tarun Logistics"
                        value={form.brokerName}
                        onChange={(e) => {
                          const val = e.target.value;
                          const matchB = brokers.find(
                            (b) =>
                              (b.vendorName || b.name || "")
                                .trim()
                                .toLowerCase() === val.trim().toLowerCase(),
                          );
                          setForm({
                            ...form,
                            brokerName: val,
                            driverPhone: matchB?.phone || form.driverPhone,
                          });
                        }}
                        className="w-full rounded-xl border border-purple-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-500/10 placeholder:text-slate-400"
                      />
                      <datalist id="advance-memo-brokers">
                        {brokers.map((b) => (
                          <option
                            key={b._id}
                            value={b.vendorName || b.name}
                          />
                        ))}
                      </datalist>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-purple-950 mb-1">
                        Broker / Outside Driver Mobile (मोबाइल नंबर)
                      </label>
                      <input
                        type="tel"
                        placeholder="10-digit mobile"
                        value={form.driverPhone}
                        onChange={(e) =>
                          setForm({ ...form, driverPhone: e.target.value })
                        }
                        className="w-full rounded-xl border border-purple-200 bg-white px-3.5 py-2.5 text-sm font-mono font-bold text-slate-900 outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-500/10 placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Row 4: Driver */}
              {form.ownerType === "market" ? (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Outside / Broker Driver Name (मार्केट गाड़ी ड्राइवर का नाम)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Kumar / Driver Name"
                    value={form.driverName}
                    onChange={(e) =>
                      setForm({ ...form, driverName: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 placeholder:text-slate-400"
                  />
                </div>
              ) : (
                <div>
                  <SearchableSelect
                    label="Driver Name & Mobile (ड्राइवर नाम व मोबाइल) - Only Free Drivers"
                    entityType="driver"
                    entityLabel="Driver"
                    value={form.driverId}
                    options={freeDrivers}
                    placeholder="Search free driver by name or 10-digit mobile number..."
                    helperText={`${freeDrivers.length} drivers currently free & ready for route`}
                    onChange={(val, raw) => {
                      setForm({
                        ...form,
                        driverId: val,
                        driverName: raw?.name || "",
                        driverPhone: raw?.phone || "",
                      });
                    }}
                  />
                </div>
              )}

              {/* Row 5: From & To Locations (Direct text inputs with datalist suggestions) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Loading Point / From (कहाँ से / लोडिंग पॉइंट) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    list="common-loading-points"
                    placeholder="e.g. Pondicherry / Chennai Port / Puzhal"
                    value={form.fromLocation}
                    onChange={(e) =>
                      setForm({ ...form, fromLocation: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 placeholder:text-slate-400"
                  />
                  <datalist id="common-loading-points">
                    <option value="Chennai Port" />
                    <option value="Puzhal Terminal, Chennai" />
                    <option value="Ennore Port" />
                    <option value="Kattupalli Port" />
                    <option value="Pondicherry" />
                    <option value="Sri City" />
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Unloading Point / To (कहाँ तक / अनलोडिंग पॉइंट) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    list="common-unloading-points"
                    placeholder="e.g. Panvel / Sri City / Bangalore / Bhiwandi"
                    value={form.toLocation}
                    onChange={(e) =>
                      setForm({ ...form, toLocation: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 placeholder:text-slate-400"
                  />
                  <datalist id="common-unloading-points">
                    <option value="Panvel" />
                    <option value="Bhiwandi" />
                    <option value="Mumbai" />
                    <option value="Pune" />
                    <option value="Bangalore" />
                    <option value="Sri City" />
                    <option value="Hosur" />
                    <option value="Coimbatore" />
                  </datalist>
                </div>
              </div>

              {/* Row 6: Total Freight, Advance & Auto-calculated Balance */}
              <div className="grid grid-cols-3 gap-3 rounded-2xl bg-slate-50 p-4 border border-slate-200">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                    Total Trip Freight / कुल भाड़ा (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="e.g. 35000"
                    value={form.totalFreight}
                    onChange={(e) => handleFreightChange(e.target.value, form.advance)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-mono font-bold text-slate-900 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                    Advance Paid to Driver (एडवांस ₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 28000"
                    value={form.advance}
                    onChange={(e) => handleFreightChange(form.totalFreight, e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-mono font-bold text-emerald-800 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                    Balance Freight Payable (बाकी भाड़ा ₹)
                  </label>
                  <input
                    type="number"
                    readOnly
                    value={form.balance}
                    className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-mono font-black text-rose-800 outline-none cursor-not-allowed"
                  />
                </div>
              </div>


              {/* Row 8: Remarks */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Remarks / Loading Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Loading tonight at 10 PM / Direct delivery"
                  value={form.remarks}
                  onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-2.5 text-xs font-black text-slate-950 shadow-sm shadow-amber-500/20 hover:bg-amber-400 disabled:opacity-50 transition cursor-pointer"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingMemo ? "Update Memo" : "Save & Generate Memo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINT ADVANCE MEMO MODAL */}
      {printMemo && (
        <AdvanceMemoPrintModal
          memo={printMemo}
          onClose={() => setPrintMemo(null)}
        />
      )}
    </div>
  );
}
