"use client";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  Plus,
  Search,
  Play,
  PackageCheck,
  CheckCircle2,
  Ban,
  RefreshCcw,
  AlertCircle,
  Loader2,
  X,
  Eye,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Trash2,
  Truck,
  Printer,
  Fuel,
  Phone,
  LayoutGrid,
  List,
  ArrowRight,
  Navigation,
  MapPin,
  Route,
  Layers,
  ShieldCheck,
  Clock,
  Download,
  Receipt,
  Wallet,
  User,
  Banknote,
  FileText,
  Building2,
  FileSpreadsheet,
  TableProperties,
} from "lucide-react";
import {
  createTrip,
  getTrips,
  dispatchTrip,
  startTrip,
  deliverTrip,
  completeTrip,
  cancelTrip,
  updateTrip,
  deleteTrip,
} from "@/src/services/trip.service";
import api from "@/src/services/api";
import { getStoredUser, useActiveCompany } from "@/src/lib/auth";
import { Badge, Spinner, ToastMessage } from "./ui";
import { toast } from "sonner";
import { exportToExcelProfessional } from "@/src/lib/excelExport";
import SearchableSelect from "./SearchableSelect";
import InvoicePrintModal from "./InvoicePrintModal";

function id(x) {
  if (!x) return "";
  if (typeof x === "object") return String(x._id || x.id || "");
  return String(x);
}
function resolveDocUrl(path) {
  if (!path || typeof path !== "string") return "#";
  if (
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("data:") ||
    path.startsWith("blob:")
  ) {
    return path;
  }
  const baseUrl =
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, "") ||
    (typeof window !== "undefined" && window.location.hostname
      ? `http://${window.location.hostname}:8000`
      : "http://localhost:8000");
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${clean}`;
}

// Date formatter
function displayDate(x) {
  if (!x) return "—";
  const str = String(x);
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }
  return str;
}

// Check whether a trip belongs to Market Lorry (Broker Hired) vs Company Fleet (Own)
export function isMarketTrip(r) {
  if (!r) return false;
  const ot = String(r.ownerType || "").toLowerCase().trim();
  if (ot === "market") return true;
  if (ot === "company") return false;

  const vot = String(r.vehicleId?.ownerType || "").toLowerCase().trim();
  if (vot === "market") return true;
  if (vot === "company") return false;

  if (r.brokerName && r.brokerName.trim()) return true;
  if (r.vehicleId?.brokerName && r.vehicleId.brokerName.trim()) return true;

  const on = String(r.ownerName || r.vehicleId?.ownerName || "").trim();
  if (on && !on.toLowerCase().includes("bhumi")) return true;

  return false;
}

// Extract broker or transporter name for market lorries
export function getTripBrokerName(r) {
  if (!r) return "";
  if (r.brokerName && r.brokerName.trim()) return r.brokerName.trim();
  if (r.vehicleId?.brokerName && r.vehicleId.brokerName.trim()) return r.vehicleId.brokerName.trim();
  const on = String(r.ownerName || "").trim();
  if (on && !on.toLowerCase().includes("bhumi")) return on;
  const von = String(r.vehicleId?.ownerName || "").trim();
  if (von && !von.toLowerCase().includes("bhumi")) return von;
  return "";
}

// Check if a trip is late / delayed past its expected delivery date
export function isTripDelayed(r) {
  if (!r?.expectedDeliveryDate) return false;
  const status = String(r?.status || "").toLowerCase();
  if (["delivered", "completed", "cancelled"].includes(status)) return false;
  const exp = new Date(r.expectedDeliveryDate);
  if (isNaN(exp.getTime())) return false;
  const today = new Date();
  exp.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return today.getTime() > exp.getTime();
}

// Get number of days a trip is late
export function getTripDelayDays(r) {
  if (!isTripDelayed(r)) return 0;
  const exp = new Date(r.expectedDeliveryDate);
  const today = new Date();
  exp.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const diffTime = today.getTime() - exp.getTime();
  return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
}

export default function TripsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const activeCompany = useActiveCompany();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(() => searchParams?.get("search") || "");
  const [statusFilter, setStatusFilter] = useState(() => {
    const paramStatus = searchParams?.get("status");
    if (paramStatus && paramStatus !== "all") return paramStatus;
    return "";
  });
  const [ownershipFilter, setOwnershipFilter] = useState("all"); // "all" | "company" | "market"

  useEffect(() => {
    const s = searchParams?.get("search");
    if (s) {
      setSearch(s);
      setStatusFilter("");
    }
    const st = searchParams?.get("status");
    if (st !== undefined && st !== null) {
      setStatusFilter(st === "all" ? "" : st);
    }
  }, [searchParams]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [printInvoiceData, setPrintInvoiceData] = useState(null);
  const [printInvoiceId, setPrintInvoiceId] = useState(null);
  const [viewMode, setViewMode] = useState("master");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});
  const [options, setOptions] = useState({
    bookings: [],
    vehicles: [],
    drivers: [],
    cities: [],
  });

  const editingId = (editing && (form?._id || form?.id)) ? String(form._id || form.id) : null;

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const currentUser = getStoredUser();
      const isDriver = currentUser?.role === "driver";

      if (isDriver) {
        const r = await getTrips();
        setRows(r?.data ?? []);
      } else {
        const [r, vh, dr, cust] = await Promise.all([
          getTrips(),
          api.get("/vehicles").catch(() => ({ data: { data: [] } })),
          api.get("/drivers").catch(() => ({ data: { data: [] } })),
          api.get("/customers").catch(() => ({ data: { data: [] } })),
        ]);
        setRows(r?.data ?? []);
        setOptions({
          bookings: [],
          vehicles: vh.data?.data || [],
          drivers: dr.data?.data || [],
          customers: cust.data?.data || cust.data || [],
          cities: [],
        });
      }
    } catch (e) {
      toast.error(e?.message || "Failed to load trips");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Handle URL pre-fill for Trip
  useEffect(() => {
    if (searchParams && searchParams.get("autoOpenAdd") === "true") {
      const today = new Date().toISOString().split("T")[0];
      const isFromMemo = searchParams.get("fromAdvanceMemo") === "true";
      const memoNum = searchParams.get("advanceMemoNumber");

      const isMarket = searchParams.get("ownerType") === "market";
      const rawRate = searchParams.get("rate") ? Number(searchParams.get("rate")) : 0;
      const rawAdv = searchParams.get("advanceAmount") ? Number(searchParams.get("advanceAmount")) : 0;
      const rawBal = searchParams.get("balanceAmount") ? Number(searchParams.get("balanceAmount")) : Math.max(0, rawRate - rawAdv);

      const pRate = searchParams.get("partyRate")
        ? Number(searchParams.get("partyRate"))
        : (searchParams.get("rate") ? Number(searchParams.get("rate")) : 0);
      const pAdv = searchParams.get("partyAdvance")
        ? Number(searchParams.get("partyAdvance"))
        : (searchParams.get("advanceAmount") ? Number(searchParams.get("advanceAmount")) : 0);
      const pBal = searchParams.get("partyBalance")
        ? Number(searchParams.get("partyBalance"))
        : Math.max(0, pRate - pAdv);

      const autoForm = {
        tripNumber: searchParams.get("tripNumber") || `TRIP-${new Date().getFullYear()}-001`,
        dispatchDate: searchParams.get("dispatchDate") || today,
        transitDays: 2,
        expectedDeliveryDate: (() => {
          const baseDate = searchParams.get("dispatchDate") || today;
          const d = new Date(baseDate);
          d.setDate(d.getDate() + 2);
          return d.toISOString().split("T")[0];
        })(),
        partyName: searchParams.get("partyName") || "",
        containerSize: searchParams.get("containerSize") || "20_ft",
        ownerType: isMarket ? "market" : "company",
        ownerName: searchParams.get("ownerName") || "BHUMI CONTAINER SERVICE",
        brokerName: searchParams.get("brokerName") || "",

        // Lorry Settlement (Col 10-16): Only prefill if it's a Market Lorry (Broker Truck)
        // For Company Fleet (Own Truck), Bhumi is the owner, so Lorry Settlement is left clean (empty)
        rate: isMarket ? rawRate : 0,
        ownerRate: isMarket ? (searchParams.get("ownerRate") ? Number(searchParams.get("ownerRate")) : rawRate) : 0,
        advanceAmount: isMarket ? rawAdv : 0,
        advanceDate: isMarket ? (searchParams.get("advanceDate") || today) : "",
        balanceAmount: isMarket ? rawBal : 0,

        // Party Account (Block 4) prefill from Advance Memo
        partyRate: pRate,
        partyAdvance: pAdv,
        partyAdvanceDate: searchParams.get("partyAdvanceDate") || searchParams.get("advanceDate") || today,
        debitMamul: 0,
        debitTds: 0,
        partyBank: searchParams.get("partyBank") || "",
        partyBalance: pBal,
        extraExp: 0,
        totalBalance: pBal,
        balanceRevAmount: 0,
        balanceRevDate: "",
        debit: pBal,

        fromCity: searchParams.get("fromCity") || "",
        toCity: searchParams.get("toCity") || "",
        remarks: searchParams.get("remarks") || "",
        truckNumber: searchParams.get("truckNumber") || "",
        driverName: searchParams.get("driverName") || "",
        driverPhone: searchParams.get("driverPhone") || "",
        advanceMemoId: searchParams.get("advanceMemoId") || null,
        advanceMemoNumber: memoNum || "",
      };

      [
        "bookingId",
        "vehicleId",
        "driverId",
        "partyId",
        "fromCityId",
        "toCityId",
      ].forEach((k) => {
        const v = searchParams.get(k);
        if (v && v !== "undefined" && v !== "null") autoForm[k] = v;
      });

      setForm(autoForm);
      setEditing(false);
      setShow(true);
      router.replace(pathname);

      // Seamless Auto-resolve vehicleId and driverId if coming from Advance Memo
      (async () => {
        try {
          const [vhRes, drRes, custRes] = await Promise.all([
            api.get("/vehicles").catch(() => ({ data: { data: [] } })),
            api.get("/drivers").catch(() => ({ data: { data: [] } })),
            api.get("/customers").catch(() => ({ data: { data: [] } })),
          ]);
          const vList = vhRes.data?.data || [];
          const dList = drRes.data?.data || [];
          const cList = custRes.data?.data || custRes.data || [];

          let resolvedVId = autoForm.vehicleId;
          let resolvedDId = autoForm.driverId;
          let resolvedPId = autoForm.partyId;
          let resolvedBank = autoForm.partyBank;
          let changed = false;

          // Auto-resolve partyId and bankName from Customer Master
          if (autoForm.partyName || resolvedPId) {
            let matchedC = resolvedPId
              ? cList.find((c) => String(c._id || c.id) === String(resolvedPId))
              : null;
            if (!matchedC && autoForm.partyName) {
              matchedC = cList.find(
                (c) =>
                  (c.name || "").trim().toLowerCase() ===
                  autoForm.partyName.trim().toLowerCase(),
              );
            }
            if (matchedC) {
              if (!resolvedPId && (matchedC._id || matchedC.id)) {
                resolvedPId = matchedC._id || matchedC.id;
                changed = true;
              }
              if (!resolvedBank && (matchedC.bankName || matchedC.bank)) {
                resolvedBank = matchedC.bankName || matchedC.bank;
                changed = true;
              }
            }
          }

          if (!resolvedVId && autoForm.truckNumber) {
            const cleanNum = autoForm.truckNumber.replace(/\s+/g, "").toUpperCase();
            const matchedV = vList.find((v) => (v.vehicleNumber || "").replace(/\s+/g, "").toUpperCase() === cleanNum);
            if (matchedV) {
              resolvedVId = matchedV._id;
              changed = true;
            }
          }

          if (!resolvedDId && (autoForm.driverPhone || autoForm.driverName)) {
            const cleanPhone = (autoForm.driverPhone || "").replace(/\D/g, "");
            let matchedD = dList.find((d) => cleanPhone && (d.phone || "").replace(/\D/g, "") === cleanPhone);
            if (!matchedD && autoForm.driverName) {
              matchedD = dList.find((d) => (d.name || "").trim().toLowerCase() === autoForm.driverName.trim().toLowerCase());
            }
            if (matchedD) {
              resolvedDId = matchedD._id;
              changed = true;
            } else if (autoForm.driverName && autoForm.driverPhone) {
              // Auto-register driver in database so dispatch is 100% error-free
              try {
                const newD = await api.post("/drivers", {
                  name: autoForm.driverName.trim(),
                  phone: autoForm.driverPhone.trim(),
                  status: "active",
                });
                const createdId = newD.data?.data?._id || newD.data?._id;
                if (createdId) {
                  resolvedDId = createdId;
                  changed = true;
                  setOptions((prev) => ({
                    ...prev,
                    drivers: [...(prev.drivers || []), newD.data?.data || { _id: createdId, name: autoForm.driverName, phone: autoForm.driverPhone }],
                  }));
                }
              } catch (_) {}
            }
          }

          if (changed) {
            setForm((prev) => ({
              ...prev,
              ...(resolvedVId ? { vehicleId: resolvedVId } : {}),
              ...(resolvedDId ? { driverId: resolvedDId } : {}),
              ...(resolvedPId ? { partyId: resolvedPId } : {}),
              ...(resolvedBank ? { partyBank: resolvedBank } : {}),
            }));
          }
        } catch (_) {}
      })();

      if (isFromMemo && memoNum) {
        toast.info(`Advance Memo #${memoNum} details autofilled! Review and save trip.`);
      } else {
        api
          .get("/sequence/next?type=trips")
          .then((res) => {
            if (res.data?.data?.number) {
              setForm((prev) => ({
                ...prev,
                tripNumber: res.data.data.number,
              }));
            }
          })
          .catch(() => {});
      }
    }
  }, [searchParams, pathname, router]);

  const handlePrintBillForTrip = async (r) => {
    const tripId = id(r);
    try {
      const res = await api.get(`/customer-invoices?tripId=${tripId}`);
      const invList = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      if (invList && invList.length > 0) {
        setPrintInvoiceId(id(invList[0]));
        setPrintInvoiceData(invList[0]);
        return;
      }
    } catch {
      // ignore
    }

    const pRate = Number(r.partyRate || r.rate || 0);
    const pAdv = Number(r.partyAdvance || 0);
    const revAmt = Number(r.balanceRevAmount || 0);
    const mamul = Number(r.debitMamul || 0);
    const tds = Number(r.debitTds || 0);
    const extra = Number(r.extraExp || 0);
    const dbt = Number(r.debit || 0);

    const fallbackInvoice = {
      invoiceNumber: `INV-${r.tripNumber || "BILL"}`,
      invoiceDate: r.balanceRevDate || r.deliveryDate || r.dispatchDate || new Date(),
      partyId: r.partyId || {
        name: r.partyName || r.bookingId?.customerName || "Customer",
        phone: r.partyPhone || "",
      },
      customerName: r.partyName || r.bookingId?.customerName || "Customer",
      tripId: r,
      vehicleId: r.vehicleId || { vehicleNumber: r.truckNumber },
      containerSize: r.containerSize || "20F",
      fromLocation: r.fromCity || r.fromCityId?.name || "",
      toLocation: r.toCity || r.toCityId?.name || "",
      freightRate: pRate,
      advanceReceived: pAdv,
      munshiyanaML: mamul,
      tdsAmount: tds,
      otherCharges: extra,
      paidAmount: revAmt + pAdv,
      outstandingAmount: dbt,
      paymentStatus: dbt <= 0 ? "paid" : (pAdv > 0 || revAmt > 0 ? "partial" : "unpaid"),
      status: "issued",
    };
    setPrintInvoiceData(fallbackInvoice);
    setPrintInvoiceId(null);
  };

  const handleCreateBillForTrip = (r) => {
    const today = new Date().toISOString().split("T")[0];
    const pRate = Number(r.partyRate || r.rate || 0);
    const pAdv = Number(r.partyAdvance || 0);
    const pAdvDate = r.partyAdvanceDate
      ? new Date(r.partyAdvanceDate).toISOString().split("T")[0]
      : (r.advanceDate ? new Date(r.advanceDate).toISOString().split("T")[0] : today);
    const pDebit = r.debit !== undefined ? Number(r.debit) : (r.partyBalance !== undefined ? Number(r.partyBalance) : (Number(r.balanceAmount) || 0));

    const query = new URLSearchParams({
      autoOpenAdd: "true",
      invoiceDate: today,
      vehicleId: id(r.vehicleId) || "",
      partyId: id(r.partyId) || "",
      customerName: r.partyName || r.bookingId?.customerName || "",
      containerSize: r.containerSize || "20F",
      fromLocation: r.fromCity || r.fromCityId?.name || "",
      toLocation: r.toCity || r.toCityId?.name || "",
      freightRate: String(pRate),
      advanceReceived: String(pAdv),
      advanceDate: pAdvDate,
      bankAccountName: r.partyBank || "",
      munshiyanaML: String(r.debitMamul || 0),
      tdsAmount: String(r.debitTds || 0),
      otherCharges: String(r.extraExp || 0),
      paidAmount: String(r.balanceRevAmount || 0),
      paymentDate: r.balanceRevDate ? new Date(r.balanceRevDate).toISOString().split("T")[0] : "",
      outstandingAmount: String(pDebit),
      tripId: id(r) || "",
    });
    router.push(`/customer-invoices?${query.toString()}`);
  };

  // Quick Action to open Company Lorry Settlement (Sheet 2) with trip details
  const handleOpenLorrySettlementFromTrip = (r) => {
    if (!r) return;
    const today = new Date().toISOString().split("T")[0];
    let vId = id(r.vehicleId);
    if (!vId && r.truckNumber && options?.vehicles?.length) {
      const matchV = options.vehicles.find(
        (v) =>
          v.vehicleNumber?.replace(/\s+/g, "").toUpperCase() ===
          r.truckNumber?.replace(/\s+/g, "").toUpperCase(),
      );
      if (matchV) vId = id(matchV);
    }

    // Market Lorry (Broker) -> Sheet 3 (Market Lorry Account / Vendor Bills)
    if (r.ownerType === "market") {
      let vendId = id(r.transporterId || r.vendorId || r.brokerId);
      if (!vendId && r.brokerName && options?.vendors?.length) {
        const matchB = options.vendors.find(
          (b) =>
            (b.vendorName || b.name)?.toLowerCase().trim() ===
            r.brokerName?.toLowerCase().trim(),
        );
        if (matchB) vendId = id(matchB);
      }
      const pStatus =
        (Number(r.balanceAmount) || 0) <= 0
          ? "paid"
          : Number(r.advanceAmount) > 0
            ? "partial"
            : "unpaid";
      const query = new URLSearchParams({
        autoOpenAdd: "true",
        billDate: today,
        vehicleId: vId ? String(vId) : "",
        partyId: id(r.partyId) || "",
        partyName: r.partyName || r.bookingId?.customerName || "",
        vendorId: vendId ? String(vendId) : "",
        containerSize: r.containerSize || "22F",
        fromLocation: r.fromCity || r.fromCityId?.name || "",
        toLocation: r.toCity || r.toCityId?.name || "",
        hireRate: String(r.ownerRate || r.rate || 0),
        paidAmount: String(r.advanceAmount || 0),
        advanceDate: r.advanceDate ? new Date(r.advanceDate).toISOString().split("T")[0] : today,
        paymentStatus: pStatus,
        tripId: id(r) ? String(id(r)) : "",
      });
      if (r.deliveryDate) query.set("deliveryDate", new Date(r.deliveryDate).toISOString().split("T")[0]);
      if (r.podDate) query.set("podDate", r.podDate);
      if (r.advanceMemoId) query.set("advanceMemoId", String(id(r.advanceMemoId)));
      router.push(`/vendor-bills?${query.toString()}`);
      return;
    }

    // Company Lorry -> Sheet 2 (Company Lorry Settlement / Driver Trip Settlements)
    let dId = id(r.driverId);
    let dPhone = r.driverId?.phone || r.driverPhone || "";
    if (!dId && dPhone && options?.drivers?.length) {
      const matchD = options.drivers.find((d) => d.phone === dPhone);
      if (matchD) {
        dId = id(matchD);
        if (!dPhone) dPhone = matchD.phone;
      }
    }

    const sKm = String(r.startingOdometer || "");
    const rKm = String(r.endingOdometer || "");
    const adv = String(r.advanceAmount || 0);
    const advDate = r.advanceDate
      ? new Date(r.advanceDate).toISOString().split("T")[0]
      : today;
    const delDate = r.deliveryDate
      ? new Date(r.deliveryDate).toISOString().split("T")[0]
      : "";

    const query = new URLSearchParams({
      autoOpenAdd: "true",
      settlementDate: today,
      tripId: id(r) || "",
      vehicleId: vId ? String(vId) : "",
      driverId: dId ? String(dId) : "",
      driverPhone: dPhone,
      partyId: id(r.partyId) || "",
      partyName: r.partyName || r.bookingId?.customerName || "",
      containerSize: r.containerSize || "22F",
      fromLocation: r.fromCity || r.fromCityId?.name || "",
      toLocation: r.toCity || r.toCityId?.name || "",
      startKm: sKm,
      returnKm: rKm,
      rs: "0", // Driver rate per km / bata default is 0 for company lorry (NOT the freight rate)
      advanceGiven: adv,
      advanceDate: advDate,
    });
    if (delDate) query.set("deliveryDate", delDate);
    if (r.podDate) query.set("podDate", r.podDate);
    if (r.advanceMemoId) query.set("advanceMemoId", String(id(r.advanceMemoId)));

    router.push(`/driver-trip-settlements?${query.toString()}`);
  };

  // Free / Available Vehicles for Dispatch (exclude vehicles on active trips or maintenance)
  const freeVehicles = useMemo(() => {
    const liveTrips = (rows || []).filter(
      (t) =>
        (t.status === "dispatched" ||
          t.status === "in_transit" ||
          t.status === "planned" ||
          t.status === "delivered") &&
        (!editingId || String(t._id) !== String(editingId))
    );
    const busyVehicleIds = new Set(
      liveTrips.map((t) => String(t.vehicleId?._id || t.vehicleId)).filter(Boolean)
    );
    const busyVehicleNumbers = new Set(
      liveTrips.map((t) => (t.vehicleId?.vehicleNumber || t.truckNumber || "").trim().toUpperCase()).filter(Boolean)
    );

    return (options.vehicles || [])
      .filter((v) => {
        if (editingId) {
          const curTrip = rows.find((r) => String(r._id) === String(editingId));
          if (
            curTrip &&
            (String(v._id) === String(curTrip.vehicleId?._id || curTrip.vehicleId) ||
              v.vehicleNumber === curTrip.truckNumber)
          ) {
            return true;
          }
        }
        // If form has a pre-filled vehicle (e.g. from Advance Memo), keep it selectable
        if (form?.vehicleId && (String(v._id) === String(form.vehicleId) || (v.vehicleNumber && v.vehicleNumber === form.truckNumber))) {
          return true;
        }
        if (v.status === "under_maintenance" || v.status === "maintenance" || v.status === "inactive") {
          return false;
        }
        const vId = String(v._id || v.id || "");
        const vNum = (v.vehicleNumber || "").trim().toUpperCase();
        if (busyVehicleIds.has(vId) || busyVehicleNumbers.has(vNum)) return false;
        return true;
      })
      .map((v) => ({
        ...v,
        subtext: `🟢 Free / Available • ${v.vehicleType || "Trailer"}`,
      }));
  }, [options.vehicles, rows, editingId, form?.vehicleId, form?.truckNumber]);

  // Free / Available Drivers for Dispatch (exclude drivers on active trips)
  const freeDrivers = useMemo(() => {
    const liveTrips = (rows || []).filter(
      (t) =>
        (t.status === "dispatched" ||
          t.status === "in_transit" ||
          t.status === "planned" ||
          t.status === "delivered") &&
        (!editingId || String(t._id) !== String(editingId))
    );
    const busyDriverIds = new Set(
      liveTrips.map((t) => String(t.driverId?._id || t.driverId)).filter(Boolean)
    );

    return (options.drivers || [])
      .filter((d) => {
        if (editingId) {
          const curTrip = rows.find((r) => String(r._id) === String(editingId));
          if (curTrip && String(d._id) === String(curTrip.driverId?._id || curTrip.driverId)) {
            return true;
          }
        }
        // If form has a pre-filled driver (e.g. from Advance Memo), keep it selectable
        if (form?.driverId && String(d._id) === String(form.driverId)) {
          return true;
        }
        if (form?.driverPhone && d.phone && d.phone.replace(/\D/g, "") === form.driverPhone.replace(/\D/g, "")) {
          return true;
        }
        if (form?.driverName && d.name && d.name.trim().toLowerCase() === form.driverName.trim().toLowerCase()) {
          return true;
        }
        if (d.status === "inactive" || d.status === "on_leave") return false;
        const dId = String(d._id || d.id || "");
        if (busyDriverIds.has(dId)) return false;
        return true;
      })
      .map((d) => ({
        ...d,
        subtext: `🟢 Free / Available • Mob: ${d.phone || "—"}`,
      }));
  }, [options.drivers, rows, editingId, form?.driverId, form?.driverPhone, form?.driverName]);

  const updateLorryCalc = (updates) => {
    setForm((prev) => {
      const merged = { ...prev, ...updates };
      const oRate = Number(merged.ownerRate) || 0;
      const adv = Number(merged.advanceAmount) || 0;
      const cat = Number(merged.catting) || 0;
      const bal = Math.max(0, oRate - adv - cat);
      return {
        ...merged,
        rate: oRate,
        balanceAmount: bal,
      };
    });
  };

  const updatePartyCalc = (updates) => {
    setForm((prev) => {
      const merged = { ...prev, ...updates };
      const pRate = Number(merged.partyRate) || 0;
      const pAdv = Number(merged.partyAdvance) || 0;
      const mamul = Number(merged.debitMamul) || 0;
      const tds = Number(merged.debitTds) || 0;
      const pBal = Math.max(0, pRate - pAdv - mamul - tds);
      const extra = Number(merged.extraExp) || 0;
      const tBal = Math.max(0, pBal + extra);
      const revAmt = Number(merged.balanceRevAmount) || 0;
      const dbt = Math.max(0, tBal - revAmt);
      return {
        ...merged,
        partyBalance: pBal,
        totalBalance: tBal,
        debit: dbt,
      };
    });
  };

  const openEditModal = (r) => {
    const oRate = r.ownerRate !== undefined && r.ownerRate !== null ? r.ownerRate : (r.rate || 0);
    const adv = r.advanceAmount || 0;
    const cat = r.catting || 0;
    const lBal = r.balanceAmount !== undefined && r.balanceAmount !== null ? r.balanceAmount : Math.max(0, oRate - adv - cat);

    const pRate = r.partyRate !== undefined && r.partyRate !== null ? r.partyRate : (r.rate || 0);
    const pAdv = r.partyAdvance || 0;
    const mamul = r.debitMamul || 0;
    const tds = r.debitTds || 0;
    const pBal = r.partyBalance !== undefined && r.partyBalance !== null ? r.partyBalance : Math.max(0, pRate - pAdv - mamul - tds);
    const extra = r.extraExp || 0;
    const tBal = r.totalBalance !== undefined && r.totalBalance !== null ? r.totalBalance : (pBal + extra);
    const revAmt = r.balanceRevAmount || 0;
    const dbt = r.debit !== undefined && r.debit !== null ? r.debit : Math.max(0, tBal - revAmt);

    setForm({
      ...r,
      bookingId: id(r.bookingId),
      vehicleId: id(r.vehicleId),
      driverId: id(r.driverId),
      partyId: id(r.partyId) || id(r.bookingId?.partyId) || "",
      partyName: r.partyName || r.bookingId?.partyId?.name || "",
      containerSize: r.containerSize || r.bookingId?.containerSize || "20F",
      ownerType: r.ownerType === "market" || r.vehicleId?.ownerType === "market" ? "market" : "company",
      ownerName: r.ownerName || r.vehicleId?.ownerName || (r.ownerType === "market" ? "" : "BHUMI CONTAINER SERVICE"),
      rate: oRate,
      ownerRate: oRate,
      advanceAmount: adv,
      advanceBank: r.advanceBank || "",
      advanceDate: r.advanceDate ? new Date(r.advanceDate).toISOString().split("T")[0] : "",
      catting: cat,
      balanceAmount: lBal,
      balDate: r.balDate ? new Date(r.balDate).toISOString().split("T")[0] : "",
      deliveryDate: r.deliveryDate ? new Date(r.deliveryDate).toISOString().split("T")[0] : "",
      podDate: r.podDate ? new Date(r.podDate).toISOString().split("T")[0] : "",
      partyRate: pRate,
      partyAdvance: pAdv,
      partyAdvanceDate: r.partyAdvanceDate ? new Date(r.partyAdvanceDate).toISOString().split("T")[0] : "",
      debitMamul: mamul,
      debitTds: tds,
      partyBank: r.partyBank || "",
      partyBalance: pBal,
      extraExp: extra,
      totalBalance: tBal,
      balanceRevAmount: revAmt,
      balanceRevDate: r.balanceRevDate ? new Date(r.balanceRevDate).toISOString().split("T")[0] : "",
      debit: dbt,
      fromCity: r.fromCity || r.fromCityId?.name || "",
      toCity: r.toCity || r.toCityId?.name || "",
      status: r.status,
      transitDays: r.transitDays !== undefined ? r.transitDays : 0,
      expectedDeliveryDate: r.expectedDeliveryDate ? new Date(r.expectedDeliveryDate).toISOString().split("T")[0] : "",
      dispatchDate: r.dispatchDate ? new Date(r.dispatchDate).toISOString().split("T")[0] : "",
      remarks: r.remarks || "",
    });
    setEditing(true);
    setShow(true);
  };

  const handleOpenCreate = () => {
    setEditing(false);
    const today = new Date().toISOString().split("T")[0];
    setForm({
      tripNumber: "",
      dispatchDate: today,
      transitDays: 2,
      expectedDeliveryDate: (() => {
        const d = new Date(today);
        d.setDate(d.getDate() + 2);
        return d.toISOString().split("T")[0];
      })(),
      partyId: "",
      partyName: "",
      containerSize: "20F",
      ownerType: "company",
      ownerName: "BHUMI CONTAINER SERVICE",
      rate: 0,
      ownerRate: 0,
      advanceAmount: 0,
      advanceBank: "",
      advanceDate: today,
      catting: 0,
      balanceAmount: 0,
      balDate: "",
      deliveryDate: "",
      podDate: "",
      partyRate: 0,
      partyAdvance: 0,
      partyAdvanceDate: "",
      debitMamul: 0,
      debitTds: 0,
      partyBank: "",
      partyBalance: 0,
      extraExp: 0,
      totalBalance: 0,
      balanceRevAmount: 0,
      balanceRevDate: "",
      debit: 0,
      remarks: "",
    });
    setShow(true);

    api
      .get("/sequence/next?type=trips")
      .then((res) => {
        if (res.data?.data?.number) {
          setForm((prev) => ({
            ...prev,
            tripNumber: res.data.data.number,
          }));
        }
      })
      .catch(() => {
        setForm((prev) => ({
          ...prev,
          tripNumber: prev.tripNumber || `TRIP-${new Date().getFullYear()}-001`,
        }));
      });
  };

  const act = async (fn, row, actionName) => {
    try {
      await fn(id(row), {});
      toast.success(`Trip successfully ${actionName}`);
      load();
    } catch (e) {
      toast.error(e?.message || "Action failed");
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let currentForm = { ...form };

      // Ensure partyId and partyName are synced
      if (currentForm.partyId && !currentForm.partyName && options.customers?.length) {
        const matchedCust = options.customers.find((c) => String(c._id || c.id) === String(currentForm.partyId));
        if (matchedCust?.name) currentForm.partyName = matchedCust.name.trim();
      } else if (currentForm.partyName && !currentForm.partyId && options.customers?.length) {
        const matchedCust = options.customers.find((c) => String(c.name || "").trim().toLowerCase() === currentForm.partyName.trim().toLowerCase());
        if (matchedCust?._id) currentForm.partyId = matchedCust._id;
      }

      if (editing) {
        await updateTrip(id(form), currentForm);
        toast.success("Trip updated successfully");
      } else {

        // Ensure driver is created / resolved if needed
        if (!currentForm.driverId && (currentForm.driverPhone || currentForm.driverName)) {
          try {
            const cleanPhone = (currentForm.driverPhone || "").replace(/\D/g, "");
            const allD = await api.get("/drivers").catch(() => ({ data: { data: [] } }));
            let matchedD = (allD.data?.data || []).find((d) => cleanPhone && (d.phone || "").replace(/\D/g, "") === cleanPhone);
            if (!matchedD && currentForm.driverName) {
              matchedD = (allD.data?.data || []).find((d) => (d.name || "").trim().toLowerCase() === currentForm.driverName.trim().toLowerCase());
            }
            if (matchedD) {
              currentForm.driverId = matchedD._id;
            } else if (currentForm.driverName && currentForm.driverPhone) {
              const newD = await api.post("/drivers", {
                name: currentForm.driverName.trim(),
                phone: currentForm.driverPhone.trim(),
                status: "active",
              });
              const createdId = newD.data?.data?._id || newD.data?._id;
              if (createdId) currentForm.driverId = createdId;
            }
          } catch (_) {}
        }

        // Ensure vehicle is resolved if needed
        if (!currentForm.vehicleId && currentForm.truckNumber) {
          try {
            const allV = await api.get("/vehicles").catch(() => ({ data: { data: [] } }));
            const cleanNum = currentForm.truckNumber.replace(/\s+/g, "").toUpperCase();
            const matchedV = (allV.data?.data || []).find((v) => (v.vehicleNumber || "").replace(/\s+/g, "").toUpperCase() === cleanNum);
            if (matchedV) currentForm.vehicleId = matchedV._id;
          } catch (_) {}
        }

        const res = await createTrip({ ...currentForm });
        toast.success("Trip created and dispatched successfully!");
        if (currentForm.advanceMemoId) {
          api.put(`/advance-memos/${currentForm.advanceMemoId}`, {
            status: "dispatched",
            tripId: res?.data?._id || res?.data?.id || res?.data?.data?._id,
          }).catch(() => {});
        }
      }
      setShow(false);
      setEditing(false);
      setForm({});
      load();
    } catch (e) {
      toast.error(e?.message || (editing ? "Update failed" : "Create failed"));
    } finally {
      setSaving(false);
    }
  };

  const filtered = rows.filter((r) => {
    // Ownership Filter
    if (ownershipFilter === "company" && isMarketTrip(r)) return false;
    if (ownershipFilter === "market" && !isMarketTrip(r)) return false;

    // Search query matches across all trips and all columns
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      const match =
        String(r.tripNumber || "").toLowerCase().includes(q) ||
        String(r.truckNumber || "").toLowerCase().includes(q) ||
        String(r.partyName || "").toLowerCase().includes(q) ||
        String(r.driverName || "").toLowerCase().includes(q) ||
        String(r.fromCity || "").toLowerCase().includes(q) ||
        String(r.toCity || "").toLowerCase().includes(q) ||
        String(r.advanceMemoNumber || "").toLowerCase().includes(q) ||
        String(r.containerNumber || "").toLowerCase().includes(q) ||
        JSON.stringify(r).toLowerCase().includes(q);

      if (!match) return false;
      if (statusFilter && statusFilter !== "active") {
        const s = String(r.status || "").toLowerCase();
        if (statusFilter === "delayed") {
          if (!isTripDelayed(r)) return false;
        } else if (s !== statusFilter.toLowerCase()) {
          return false;
        }
      }
      return true;
    }

    const s = String(r.status || "").toLowerCase();
    if (statusFilter === "active") {
      if (["completed", "cancelled", "settled"].includes(s)) return false;
    } else if (statusFilter === "delayed") {
      if (!isTripDelayed(r)) return false;
    } else if (
      statusFilter &&
      s !== statusFilter.toLowerCase()
    ) {
      return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  // Operational KPI calculations
  const companyCount = rows.filter((r) => !isMarketTrip(r)).length;
  const marketCount = rows.filter((r) => isMarketTrip(r)).length;
  const delayedCount = rows.filter(isTripDelayed).length;
  const activeCount = rows.filter(
    (r) => !["completed", "cancelled"].includes(String(r.status || "").toLowerCase()),
  ).length;
  const inTransitCount = rows.filter(
    (r) => String(r.status).toLowerCase() === "in_transit",
  ).length;
  const dispatchedCount = rows.filter(
    (r) => String(r.status).toLowerCase() === "dispatched",
  ).length;
  const deliveredCount = rows.filter(
    (r) => String(r.status).toLowerCase() === "delivered",
  ).length;
  const completedCount = rows.filter(
    (r) => String(r.status).toLowerCase() === "completed",
  ).length;
  const plannedCount = rows.filter(
    (r) => String(r.status).toLowerCase() === "planned",
  ).length;
  const cancelledCount = rows.filter(
    (r) => String(r.status).toLowerCase() === "cancelled",
  ).length;

  // Master Register Table 1 Totals across filtered trips
  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, r) => {
        const oRate = Number(r.ownerRate !== undefined && r.ownerRate !== null ? r.ownerRate : (r.rate || 0)) || 0;
        const adv = Number(r.advanceAmount || 0);
        const cat = Number(r.catting || 0);
        const lBal = Number(r.balanceAmount !== undefined && r.balanceAmount !== null ? r.balanceAmount : (oRate - adv - cat)) || 0;

        const pRate = Number(r.partyRate !== undefined && r.partyRate !== null ? r.partyRate : (r.rate || 0)) || 0;
        const pAdv = Number(r.partyAdvance || 0);
        const mamul = Number(r.debitMamul || 0);
        const tds = Number(r.debitTds || 0);
        const pBal = Number(r.partyBalance !== undefined && r.partyBalance !== null ? r.partyBalance : (pRate - pAdv - mamul - tds)) || 0;
        const extra = Number(r.extraExp || 0);
        const tBal = Number(r.totalBalance !== undefined && r.totalBalance !== null ? r.totalBalance : (pBal + extra)) || 0;
        const revAmt = Number(r.balanceRevAmount || 0);
        const dbt = Number(r.debit !== undefined && r.debit !== null ? r.debit : (tBal - revAmt)) || 0;

        acc.ownerRate += oRate;
        acc.advanceAmount += adv;
        acc.catting += cat;
        acc.lorryBalance += lBal;

        acc.partyRate += pRate;
        acc.partyAdvance += pAdv;
        acc.debitMamul += mamul;
        acc.debitTds += tds;
        acc.partyBalance += pBal;
        acc.extraExp += extra;
        acc.totalBalance += tBal;
        acc.balanceRevAmount += revAmt;
        acc.debit += dbt;
        return acc;
      },
      {
        ownerRate: 0,
        advanceAmount: 0,
        catting: 0,
        lorryBalance: 0,
        partyRate: 0,
        partyAdvance: 0,
        debitMamul: 0,
        debitTds: 0,
        partyBalance: 0,
        extraExp: 0,
        totalBalance: 0,
        balanceRevAmount: 0,
        debit: 0,
      }
    );
  }, [filtered]);

  const handleExportExcel = () => {
    const columns = [
      { key: "tripNumber", label: "TRIP NO" },
      { key: "date", label: "DATE", type: "date" },
      { key: "lorryNo", label: "LORRY NO" },
      { key: "driverNo", label: "DRIVER NO" },
      { key: "partyName", label: "PARTY NAME" },
      { key: "size", label: "SIZE" },
      { key: "from", label: "FROM" },
      { key: "to", label: "TO" },
      { key: "ownerName", label: "OWNER NAME" },
      { key: "ownerRate", label: "OWNER RATE (₹)", type: "number" },
      { key: "advance", label: "ADVANCE (₹)", type: "number" },
      { key: "advBank", label: "ADV BANK" },
      { key: "advDate", label: "ADV DATE", type: "date" },
      { key: "catting", label: "CATTING (₹)", type: "number" },
      { key: "balance", label: "BALANCE (₹)", type: "number" },
      { key: "balDate", label: "BAL DATE", type: "date" },
      { key: "deliveryDate", label: "DELIVERY DATE", type: "date" },
      { key: "podRecvdDate", label: "POD RECVD DATE", type: "date" },
      { key: "partyRate", label: "PARRTY RATE (₹)", type: "number" },
      { key: "partyAdvance", label: "PARRTY ADVANCE (₹)", type: "number" },
      { key: "partyAdvDate", label: "PARRTY ADV DATE", type: "date" },
      { key: "debitMamul", label: "DEBIT MAMUL (₹)", type: "number" },
      { key: "debitTds", label: "DEBIT TDS (₹)", type: "number" },
      { key: "partyBank", label: "BANK" },
      { key: "partyBalance", label: "PARRTY BALANCE (₹)", type: "number" },
      { key: "extraExp", label: "EXTRA EXP (₹)", type: "number" },
      { key: "totalBalance", label: "TOTAL BALANCE (₹)", type: "number" },
      { key: "balanceRevAmount", label: "BALANCE REV AMOUNT (₹)", type: "number" },
      { key: "balanceRevDate", label: "BALANCE REV DATE", type: "date" },
      { key: "debit", label: "DEBIT (₹)", type: "number" },
    ];

    const dataRows = filtered.map((r) => {
      const oRate = Number(r.ownerRate !== undefined && r.ownerRate !== null ? r.ownerRate : (r.rate || 0)) || 0;
      const adv = Number(r.advanceAmount || 0);
      const cat = Number(r.catting || 0);
      const lBal = Number(r.balanceAmount !== undefined && r.balanceAmount !== null ? r.balanceAmount : (oRate - adv - cat)) || 0;

      const pRate = Number(r.partyRate !== undefined && r.partyRate !== null ? r.partyRate : (r.rate || 0)) || 0;
      const pAdv = Number(r.partyAdvance || 0);
      const mamul = Number(r.debitMamul || 0);
      const tds = Number(r.debitTds || 0);
      const pBal = Number(r.partyBalance !== undefined && r.partyBalance !== null ? r.partyBalance : (pRate - pAdv - mamul - tds)) || 0;
      const extra = Number(r.extraExp || 0);
      const tBal = Number(r.totalBalance !== undefined && r.totalBalance !== null ? r.totalBalance : (pBal + extra)) || 0;
      const revAmt = Number(r.balanceRevAmount || 0);
      const dbt = Number(r.debit !== undefined && r.debit !== null ? r.debit : (tBal - revAmt)) || 0;

      return {
        tripNumber: r.tripNumber,
        date: r.dispatchDate,
        lorryNo: r.vehicleId?.vehicleNumber || r.truckNumber || "—",
        driverNo: r.driverId?.phone || r.driverPhone || "—",
        partyName: r.partyName || r.bookingId?.customerName || "—",
        size: (r.containerSize || "20F").replace("_ft", "F").replace("_", " "),
        from: r.fromCity || r.fromCityId?.name || "—",
        to: r.toCity || r.toCityId?.name || "—",
        ownerName: r.ownerName || (r.ownerType === "market" ? (r.brokerName || "Market Broker") : "BHUMI CONTAINER SERVICE"),
        ownerRate: oRate,
        advance: adv,
        advBank: r.advanceBank || "—",
        advDate: r.advanceDate || "—",
        catting: cat,
        balance: lBal,
        balDate: r.balDate || "—",
        deliveryDate: r.deliveryDate || r.expectedDeliveryDate || "—",
        podRecvdDate: r.podDate || "—",
        partyRate: pRate,
        partyAdvance: pAdv,
        partyAdvDate: r.partyAdvanceDate || "—",
        debitMamul: mamul,
        debitTds: tds,
        partyBank: r.partyBank || "—",
        partyBalance: pBal,
        extraExp: extra,
        totalBalance: tBal,
        balanceRevAmount: revAmt,
        balanceRevDate: r.balanceRevDate || "—",
        debit: dbt,
      };
    });

    exportToExcelProfessional({
      title: "Table1 - Total Lorry Master Register",
      subtitle: `${activeCompany?.name || "Bhumi Container Service"} • Central Dispatch, Lorry Settlement & Party Account Register`,
      filename: `${activeCompany?.code || "TMS"}_Total_Lorry_Master_Register`,
      sheetName: "Total Lorry Master Register",
      columns,
      rows: dataRows,
    });
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="grid h-6 w-6 place-items-center rounded-lg bg-amber-500/10 text-amber-600">
              <Truck className="h-3.5 w-3.5" />
            </span>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-700">
              {user?.role === "driver"
                ? "Driver Portal • Assigned Consignments"
                : "Transport Operations • Fleet Dispatch Desk"}
            </p>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-950">
            {user?.role === "driver"
              ? "My Assigned Trips"
              : "Trips & Dispatch Register"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {user?.role === "driver"
              ? `You have ${rows.length} assigned trip(s). Update status when starting trip and when delivered.`
              : `Active fleet movement, highway journey tracking & lorry dispatch register · ${activeCompany?.city ? `${activeCompany.city} Central Yard` : "Central Fleet Yard"}`}
          </p>
        </div>
        {user?.role !== "driver" && (
          <button
            onClick={handleOpenCreate}
            className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2.5 text-sm font-black text-slate-950 shadow-sm shadow-amber-500/20 transition-all hover:from-amber-400 hover:to-amber-500"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            Create Trip Dispatch
          </button>
        )}
      </div>

      {/* Delivery Delay Alert Banner */}
      {delayedCount > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 rounded-2xl border-2 border-red-500 bg-gradient-to-r from-red-50 via-rose-50 to-orange-50 p-4 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-3.5">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-red-600 text-white shadow-md shadow-red-500/30 shrink-0 animate-pulse">
              <AlertCircle className="h-6 w-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-black text-red-950 uppercase tracking-tight">
                  CRITICAL ALERT: {delayedCount} {delayedCount === 1 ? "Trip is" : "Trips are"} Running Late!
                </h3>
                <span className="rounded-full bg-red-600 px-2.5 py-0.5 text-[10px] font-black uppercase text-white tracking-wider shadow-xs">
                  Transit Exceeded
                </span>
              </div>
              <p className="mt-0.5 text-xs text-red-800 font-medium">
                Estimated delivery date passed. Please contact assigned driver & verify highway transit location immediately.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setStatusFilter(statusFilter === "delayed" ? "" : "delayed");
              setPage(1);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2 text-xs font-black text-white shadow transition shrink-0 cursor-pointer"
          >
            <AlertCircle className="h-3.5 w-3.5" />
            {statusFilter === "delayed" ? "Show All Trips" : `Filter Late Trips (${delayedCount})`}
          </button>
        </div>
      )}

      {/* Transport Dispatch KPI Ribbon */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <button
          type="button"
          onClick={() => {
            setStatusFilter(statusFilter === "active" ? "" : "active");
            setPage(1);
          }}
          className={`rounded-2xl border p-4 shadow-2xs text-left transition cursor-pointer ${
            statusFilter === "active"
              ? "border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500/30"
              : "border-slate-200/80 bg-white hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Active Trips
            </span>
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
              <Layers className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="mt-1 font-mono text-2xl font-black text-emerald-600">
            {activeCount}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {rows.length} total registered
          </p>
        </button>

        <button
          type="button"
          onClick={() => {
            setStatusFilter(statusFilter === "in_transit" ? "" : "in_transit");
            setPage(1);
          }}
          className={`rounded-2xl border p-4 shadow-2xs text-left transition cursor-pointer ${
            statusFilter === "in_transit"
              ? "border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500/30"
              : "border-slate-200/80 bg-white hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              In Transit
            </span>
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
              <Truck className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="mt-1 font-mono text-2xl font-black text-emerald-600">
            {inTransitCount}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">Fleet on highway</p>
        </button>

        <button
          type="button"
          onClick={() => {
            setStatusFilter(statusFilter === "dispatched" ? "" : "dispatched");
            setPage(1);
          }}
          className={`rounded-2xl border p-4 shadow-2xs text-left transition cursor-pointer ${
            statusFilter === "dispatched"
              ? "border-purple-600 bg-purple-50/70 ring-2 ring-purple-500/30"
              : "border-slate-200/80 bg-white hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Dispatched
            </span>
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-purple-50 text-purple-700">
              <Navigation className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="mt-1 font-mono text-2xl font-black text-slate-950">
            {dispatchedCount}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">Departed from hub</p>
        </button>

        <button
          type="button"
          onClick={() => {
            setStatusFilter(statusFilter === "delivered" ? "" : "delivered");
            setPage(1);
          }}
          className={`rounded-2xl border p-4 shadow-2xs text-left transition cursor-pointer ${
            statusFilter === "delivered"
              ? "border-amber-600 bg-amber-50/70 ring-2 ring-amber-500/30"
              : "border-slate-200/80 bg-white hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Delivered
            </span>
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-amber-50 text-amber-600">
              <PackageCheck className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="mt-1 font-mono text-2xl font-black text-amber-600">
            {deliveredCount}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">Pending POD sign</p>
        </button>

        <button
          type="button"
          onClick={() => {
            setStatusFilter(statusFilter === "completed" ? "" : "completed");
            setPage(1);
          }}
          className={`rounded-2xl border p-4 shadow-2xs text-left transition cursor-pointer ${
            statusFilter === "completed"
              ? "border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/30"
              : "border-slate-200/80 bg-white hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Settled / Closed
            </span>
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-indigo-50 text-indigo-600">
              <ShieldCheck className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="mt-1 font-mono text-2xl font-black text-indigo-600">
            {completedCount}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">Completed journey</p>
        </button>

        {/* 6th Metric: Late / Delayed */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter(statusFilter === "delayed" ? "" : "delayed");
            setPage(1);
          }}
          className={`rounded-2xl border p-4 shadow-2xs text-left transition cursor-pointer ${
            statusFilter === "delayed"
              ? "border-red-600 bg-red-100/90 ring-2 ring-red-500/30"
              : delayedCount > 0
                ? "border-red-300 bg-red-50/70 hover:bg-red-100/70 animate-pulse"
                : "border-slate-200/80 bg-white hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-red-600">
              Late / Delayed
            </span>
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-red-100 text-red-600">
              <AlertCircle className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="mt-1 font-mono text-2xl font-black text-red-600">
            {delayedCount}
          </p>
          <p className="mt-0.5 text-[11px] text-red-600 font-bold">
            {delayedCount > 0 ? "Exceeded target days" : "All trips on time"}
          </p>
        </button>
      </div>

      {/* Main Container */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
        {/* Ownership Filter Bar: All Lorries vs Company Fleet vs Market Lorry */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500 mr-1">
              Filter by Lorry:
            </span>
            <button
              type="button"
              onClick={() => {
                setOwnershipFilter("all");
                setPage(1);
              }}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-black transition-all border cursor-pointer ${
                ownershipFilter === "all"
                  ? "bg-slate-900 border-slate-900 text-white shadow-xs"
                  : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <span>All Lorries</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                  ownershipFilter === "all"
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {rows.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setOwnershipFilter(ownershipFilter === "company" ? "all" : "company");
                setPage(1);
              }}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-black transition-all border cursor-pointer ${
                ownershipFilter === "company"
                  ? "bg-blue-600 border-blue-600 text-white shadow-sm ring-2 ring-blue-500/20"
                  : "bg-blue-50/70 border-blue-200 text-blue-900 hover:bg-blue-100/70"
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>🏢 Company Fleet (Own)</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                  ownershipFilter === "company"
                    ? "bg-white/20 text-white"
                    : "bg-blue-200 text-blue-950"
                }`}
              >
                {companyCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setOwnershipFilter(ownershipFilter === "market" ? "all" : "market");
                setPage(1);
              }}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-black transition-all border cursor-pointer ${
                ownershipFilter === "market"
                  ? "bg-purple-600 border-purple-600 text-white shadow-sm ring-2 ring-purple-500/20"
                  : "bg-purple-50/70 border-purple-200 text-purple-900 hover:bg-purple-100/70"
              }`}
            >
              <Truck className="h-3.5 w-3.5" />
              <span>🚚 Market Lorry (Broker)</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                  ownershipFilter === "market"
                    ? "bg-white/20 text-white"
                    : "bg-purple-200 text-purple-950"
                }`}
              >
                {marketCount}
              </span>
            </button>
          </div>

          {/* Mini Legend Indicator */}
          <div className="flex items-center gap-3 text-[11px] font-bold text-slate-500 shrink-0">
            <span className="flex items-center gap-1.5 text-blue-800">
              <span className="h-2.5 w-2.5 rounded-sm bg-blue-600 inline-block shadow-2xs" />
              Company Fleet (Own)
            </span>
            <span className="flex items-center gap-1.5 text-purple-800">
              <span className="h-2.5 w-2.5 rounded-sm bg-purple-600 inline-block shadow-2xs" />
              Market Lorry (Broker)
            </span>
          </div>
        </div>

        {/* Quick Status Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
          <button
            onClick={() => {
              setStatusFilter(statusFilter === "active" ? "" : "active");
              setPage(1);
            }}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-all whitespace-nowrap border ${
              statusFilter === "active"
                ? "bg-emerald-600 border-emerald-600 text-white shadow-xs"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span
                className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  statusFilter === "active"
                    ? "animate-ping bg-emerald-200"
                    : "bg-emerald-400"
                }`}
              ></span>
              <span
                className={`relative inline-flex h-2 w-2 rounded-full ${
                  statusFilter === "active" ? "bg-white" : "bg-emerald-500"
                }`}
              ></span>
            </span>
            <span>Active Trips</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                statusFilter === "active"
                  ? "bg-white/20 text-white"
                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
              }`}
            >
              {activeCount}
            </span>
          </button>

          {[
            {
              label: "🚨 Late / Delayed",
              value: "delayed",
              count: delayedCount,
            },
            {
              label: "In Transit",
              value: "in_transit",
              count: inTransitCount,
            },
            {
              label: "Dispatched",
              value: "dispatched",
              count: dispatchedCount,
            },
            {
              label: "Delivered",
              value: "delivered",
              count: deliveredCount,
            },
            {
              label: "Planned",
              value: "planned",
              count: plannedCount,
            },
            {
              label: "Completed",
              value: "completed",
              count: completedCount,
            },
            ...(cancelledCount > 0
              ? [
                  {
                    label: "Cancelled",
                    value: "cancelled",
                    count: cancelledCount,
                  },
                ]
              : []),
          ].map((pill) => {
            const active =
              statusFilter.toLowerCase() === pill.value.toLowerCase();
            return (
              <button
                key={pill.value}
                onClick={() => {
                  setStatusFilter(active ? "" : pill.value);
                  setPage(1);
                }}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-all whitespace-nowrap border ${
                  active
                    ? "bg-amber-500 border-amber-600 text-slate-950 shadow-xs"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <span>{pill.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                    active
                      ? "bg-slate-950 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {pill.count}
                </span>
              </button>
            );
          })}

          <button
            onClick={() => {
              setStatusFilter("");
              setPage(1);
            }}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-all whitespace-nowrap border ${
              !statusFilter
                ? "bg-slate-900 border-slate-900 text-white shadow-xs"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            <span>All Trips</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                !statusFilter
                  ? "bg-white/20 text-white"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {rows.length}
            </span>
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-slate-100 pt-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by trip, truck number, driver, route..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setViewMode("master")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                  viewMode === "master"
                    ? "bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-xs"
                    : "text-slate-700 hover:text-slate-900 hover:bg-slate-200/60"
                }`}
                title="Master Register (Table 1: 30 Columns with Lorry Settlement & Party Account)"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Table 1 (Master Register)
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                  viewMode === "table"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <TableProperties className="h-3.5 w-3.5" />
                Transport Table
              </button>
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                  viewMode === "cards"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Fleet Cards
              </button>
            </div>

            {user?.role !== "driver" && (
              <button
                onClick={handleExportExcel}
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800 shadow-2xs transition-all hover:bg-emerald-100 cursor-pointer"
                title="Export Trips to Excel (.xlsx)"
              >
                <Download className="h-3.5 w-3.5 text-emerald-600" />
                Export Excel
              </button>
            )}

            <button
              onClick={load}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs transition-all hover:bg-slate-50 cursor-pointer"
            >
              <RefreshCcw
                className={`h-3.5 w-3.5 ${loading ? "animate-spin text-amber-500" : ""}`}
              />
              Refresh
            </button>
          </div>
        </div>
        {/* Body */}
        {loading ? (
          <div className="flex items-center justify-center py-28 bg-slate-50/30">
            <div className="flex flex-col items-center gap-4 text-slate-400">
              <div className="rounded-full bg-white p-4 shadow-sm border border-slate-100">
                <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
              </div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                Loading Fleet Dispatches…
              </p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-slate-50/30">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-2xs text-slate-400 mb-4 border border-slate-100">
              <Search className="h-7 w-7 text-slate-300" />
            </div>
            <p className="text-base font-black text-slate-800">
              No trips found
            </p>
            <p className="mt-1 text-xs font-medium text-slate-400 max-w-sm text-center">
              {search || statusFilter
                ? "No trips match the active search or status filter."
                : "Get started by creating your first trip dispatch."}
            </p>
            {(search || statusFilter || ownershipFilter !== "all") && rows.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("");
                  setOwnershipFilter("all");
                  setPage(1);
                }}
                className="mt-3.5 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition cursor-pointer"
              >
                Clear Filters & Show All Trips ({rows.length})
              </button>
            )}
          </div>
        ) : viewMode === "cards" ? (
          /* Transport Fleet Journey Cards View */
          <div className="p-4 sm:p-6 bg-slate-50/50">
            <div className="grid gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-3">
              {pageRows.map((r) => {
                const isMarket = isMarketTrip(r);
                const brokerOrOwnerName = getTripBrokerName(r);
                const vehicleNum =
                  r.vehicleId?.vehicleNumber || r.truckNumber || id(r.vehicleId) || "—";
                const vehicleType = r.vehicleId?.vehicleType || r.containerSize || "Truck";
                const driverName =
                  r.driverId?.name || r.driverName || id(r.driverId) || "Driver Assigned";
                const driverPhone = r.driverId?.phone || r.driverPhone || "";
                const fromCity = r.fromCity || r.fromCityId?.name || "Origin";
                const toCity = r.toCity || r.toCityId?.name || "Destination";
                const st = r.status?.toLowerCase() || "planned";

                return (
                  <div
                    key={id(r)}
                    className={`flex flex-col rounded-2xl border bg-white p-4 sm:p-5 shadow-2xs transition-all hover:shadow-md ${
                      isMarket
                        ? "border-purple-200 border-l-[6px] border-l-purple-600 hover:border-purple-400"
                        : "border-blue-200 border-l-[6px] border-l-blue-600 hover:border-blue-400"
                    }`}
                  >
                    {/* Card Top Ownership Banner */}
                    <div
                      className={`flex items-center justify-between px-3.5 py-1.5 -mx-4 -mt-4 sm:-mx-5 sm:-mt-5 rounded-t-2xl mb-3 border-b ${
                        isMarket
                          ? "bg-purple-50/90 border-purple-200/80 text-purple-950"
                          : "bg-blue-50/90 border-blue-200/80 text-blue-950"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-xs font-black">
                        {isMarket ? (
                          <>
                            <Truck className="h-3.5 w-3.5 text-purple-700 shrink-0" />
                            <span>Market Lorry (Broker)</span>
                            {brokerOrOwnerName && (
                              <span className="font-bold text-purple-800 text-[11px] truncate max-w-[170px]" title={brokerOrOwnerName}>
                                • {brokerOrOwnerName}
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            <Building2 className="h-3.5 w-3.5 text-blue-700 shrink-0" />
                            <span>Company Fleet (Own)</span>
                            <span className="font-bold text-blue-800 text-[11px]">
                              • Bhumi Container Service
                            </span>
                          </>
                        )}
                      </div>
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider shadow-2xs border ${
                          isMarket
                            ? "bg-purple-200/90 border-purple-300 text-purple-900"
                            : "bg-blue-200/90 border-blue-300 text-blue-950"
                        }`}
                      >
                        {isMarket ? "Market Hired" : "Own Truck"}
                      </span>
                    </div>

                    {/* Card Header: Truck No & Status */}
                    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`grid h-11 w-11 place-items-center rounded-xl font-bold shadow-xs border ${
                            isMarket
                              ? "bg-purple-100 text-purple-700 border-purple-200"
                              : st === "in_transit"
                                ? "bg-emerald-500 text-white border-emerald-600 shadow-emerald-500/20"
                                : st === "dispatched"
                                  ? "bg-blue-600 text-white border-blue-700 shadow-blue-600/20"
                                  : st === "delivered"
                                    ? "bg-amber-500 text-white border-amber-600 shadow-amber-500/20"
                                    : "bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          {isMarket ? <Truck className="h-6 w-6 text-purple-700" /> : <Truck className="h-6 w-6" />}
                        </div>
                        <div>
                          <div className="inline-flex items-center rounded border border-amber-400 bg-amber-100/90 px-2 py-0.5 font-mono text-xs font-black tracking-wider text-slate-900 shadow-2xs">
                            <span className="mr-1.5 rounded-xs bg-blue-700 px-1 py-0.2 text-[8px] font-black text-white uppercase tracking-tighter">
                              IND
                            </span>
                            {vehicleNum}
                          </div>
                          <p className="mt-1 text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                            <span>{vehicleType}</span>
                            <span>•</span>
                            <span className="font-mono text-slate-800 font-black">
                              {r.tripNumber}
                            </span>
                            <span>•</span>
                            <span className={`text-[10px] font-black uppercase ${isMarket ? "text-purple-700" : "text-blue-700"}`}>
                              {isMarket ? "🚚 Market" : "🏢 Company"}
                            </span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        {isTripDelayed(r) && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-black uppercase text-white shadow-xs animate-pulse">
                            <AlertCircle className="h-3 w-3 stroke-[3]" />
                            Late ({getTripDelayDays(r)}d)
                          </span>
                        )}
                        <Badge value={r.status} />
                      </div>
                    </div>

                    {/* Route Journey Visualizer Track */}
                    <div className="my-3.5 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                        <span className="flex items-center gap-1 text-emerald-700" title="Loading Point / From">
                          <MapPin className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <span className="text-[10px] uppercase font-bold text-slate-400 mr-0.5">From:</span>
                          {fromCity}
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          {st === "in_transit"
                            ? "On Highway"
                            : st === "delivered"
                              ? "Delivered"
                              : "Route Flow"}
                        </span>
                        <span className="flex items-center gap-1 text-indigo-700" title="Unloading Point / To">
                          <Navigation className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                          <span className="text-[10px] uppercase font-bold text-slate-400 mr-0.5">To:</span>
                          {toCity}
                        </span>
                      </div>

                      {/* Visual Highway Track */}
                      <div className="relative mt-2 flex items-center">
                        <div className="h-1.5 w-full rounded-full bg-slate-200">
                          <div
                            className={`h-1.5 rounded-full transition-all ${
                              st === "completed" || st === "delivered"
                                ? "w-full bg-emerald-500"
                                : st === "in_transit"
                                  ? "w-3/5 bg-emerald-500 animate-pulse"
                                  : st === "dispatched"
                                    ? "w-1/4 bg-blue-500"
                                    : "w-0 bg-slate-300"
                            }`}
                          />
                        </div>
                      </div>

                      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                        <span>
                          Dispatch: <b>{displayDate(r.dispatchDate)}</b>
                        </span>
                        {r.expectedDeliveryDate ? (
                          <span className={isTripDelayed(r) ? "text-red-600 font-black" : "text-slate-700 font-semibold"}>
                            Exp: <b>{displayDate(r.expectedDeliveryDate)}</b>
                            {r.transitDays ? ` (${r.transitDays}d)` : ""}
                          </span>
                        ) : null}
                      </div>

                      {/* Prominent Delayed Alert Ribbon on Card */}
                      {isTripDelayed(r) && (
                        <div className="mt-2.5 flex items-center justify-between rounded-lg bg-red-100/90 border border-red-300 px-2.5 py-1 text-xs text-red-950 font-medium">
                          <span className="flex items-center gap-1 font-black text-red-700">
                            <AlertCircle className="h-3.5 w-3.5 text-red-600 shrink-0" />
                            Overdue by {getTripDelayDays(r)} Day{getTripDelayDays(r) > 1 ? "s" : ""}
                          </span>
                          <span className="text-[10px] font-bold text-red-600">
                            Target: {displayDate(r.expectedDeliveryDate)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Driver, Party & Financial Info */}
                    <div className="space-y-1.5 text-xs">
                      {/* Lorry Ownership Row */}
                      <div
                        className={`flex items-center justify-between rounded-lg px-3 py-1.5 border ${
                          isMarket
                            ? "bg-purple-50/70 border-purple-200"
                            : "bg-blue-50/70 border-blue-200"
                        }`}
                      >
                        <span
                          className={`font-bold text-[11px] uppercase tracking-wider ${
                            isMarket ? "text-purple-800" : "text-blue-800"
                          }`}
                        >
                          Lorry Type:
                        </span>
                        <span
                          className={`font-black flex items-center gap-1 ${
                            isMarket ? "text-purple-950" : "text-blue-950"
                          }`}
                        >
                          {isMarket ? (
                            <>
                              <span>🚚 Market Lorry</span>
                              {brokerOrOwnerName && (
                                <span className="font-bold text-purple-700 font-sans">
                                  (Broker: {brokerOrOwnerName})
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              <span>🏢 Bhumi Container Service (Own)</span>
                            </>
                          )}
                        </span>
                      </div>

                      <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5">
                        <span className="text-slate-500 font-medium">
                          Party / Customer:
                        </span>
                        <span className="font-bold text-slate-900 truncate max-w-[200px]" title={r.partyName || r.bookingId?.partyId?.name || r.bookingId?.customerName}>
                          {r.partyName || r.bookingId?.partyId?.name || r.bookingId?.customerName || "Direct Dispatch"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5">
                        <span className="text-slate-500 font-medium">
                          Assigned Driver:
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">
                            {driverName}
                          </span>
                          {driverPhone && (
                            <a
                              href={`tel:${driverPhone}`}
                              className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700 hover:bg-emerald-100 transition"
                              title="Call Driver"
                            >
                              <Phone className="h-3 w-3 text-emerald-600" />
                              {driverPhone}
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-0.5">
                        <div className="rounded-lg bg-emerald-50/70 border border-emerald-100 px-2.5 py-1">
                          <span className="text-[10px] uppercase font-bold text-emerald-700 block">Total Freight</span>
                          <span className="font-mono font-bold text-emerald-950 text-xs">
                            {r.rate ? `₹${Number(r.rate).toLocaleString("en-IN")}` : "—"}
                          </span>
                        </div>
                        <div className={`rounded-lg px-2.5 py-1 ${Number(r.balanceAmount || 0) === 0 ? "bg-emerald-50/70 border border-emerald-200" : "bg-amber-50/70 border border-amber-100"}`}>
                          <span className={`text-[10px] uppercase font-bold block ${Number(r.balanceAmount || 0) === 0 ? "text-emerald-700" : "text-amber-700"}`}>Adv / Bal</span>
                          <span className={`font-mono font-bold text-xs ${Number(r.balanceAmount || 0) === 0 ? "text-emerald-950" : "text-amber-950"}`}>
                            ₹{Number(r.advanceAmount || 0).toLocaleString("en-IN")} / {Number(r.balanceAmount || 0) === 0 ? (
                              <span className="text-emerald-700 font-sans font-black text-[11px]">₹0 (Paid ✅)</span>
                            ) : (
                              `₹${Number(r.balanceAmount || 0).toLocaleString("en-IN")}`
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Transport Actions Bar */}
                    <div className="mt-3.5 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3">
                      {st === "dispatched" && (
                        <button
                          onClick={() => act(startTrip, r, "started")}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition"
                        >
                          <Play className="h-3.5 w-3.5 fill-current" />
                          Start Trip
                        </button>
                      )}

                      {st === "in_transit" && (
                        <button
                          onClick={() => act(deliverTrip, r, "delivered")}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-600 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-700 transition"
                        >
                          <PackageCheck className="h-3.5 w-3.5" />
                          Mark Delivered
                        </button>
                      )}

                      {st === "delivered" && user?.role !== "driver" && (
                        <button
                          onClick={() => act(completeTrip, r, "completed")}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Complete Trip
                        </button>
                      )}

                      {st === "planned" && user?.role !== "driver" && (
                        <button
                          onClick={() => act(dispatchTrip, r, "dispatched")}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 px-3 py-2 text-xs font-bold text-slate-950 shadow-xs hover:bg-amber-400 transition"
                        >
                          <Play className="h-3.5 w-3.5 fill-current" />
                          Dispatch
                        </button>
                      )}

                      {(st === "completed" || st === "delivered") && user?.role !== "driver" && (
                        <button
                          onClick={() => {
                            const today = new Date().toISOString().split("T")[0];
                            const pRate = r.partyRate || r.rate || 0;
                            const pAdv = r.partyAdvance || r.advanceAmount || 0;
                            const pAdvDate = r.partyAdvanceDate ? new Date(r.partyAdvanceDate).toISOString().split("T")[0] : (r.advanceDate ? new Date(r.advanceDate).toISOString().split("T")[0] : today);
                            const pDebit = r.debit !== undefined ? r.debit : (r.partyBalance !== undefined ? r.partyBalance : (r.balanceAmount || 0));

                            const query = new URLSearchParams({
                              autoOpenAdd: "true",
                              invoiceDate: today,
                              vehicleId: id(r.vehicleId) || "",
                              partyId: id(r.partyId) || "",
                              customerName: r.partyName || r.bookingId?.customerName || "",
                              containerSize: r.containerSize || "20F",
                              fromLocation: r.fromCity || r.fromCityId?.name || "",
                              toLocation: r.toCity || r.toCityId?.name || "",
                              freightRate: String(pRate),
                              advanceReceived: String(pAdv),
                              advanceDate: pAdvDate,
                              bankAccountName: r.partyBank || "",
                              munshiyanaML: String(r.debitMamul || 0),
                              tdsAmount: String(r.debitTds || 0),
                              otherCharges: String(r.extraExp || 0),
                              paidAmount: String(r.balanceRevAmount || 0),
                              paymentDate: r.balanceRevDate ? new Date(r.balanceRevDate).toISOString().split("T")[0] : "",
                              outstandingAmount: String(pDebit),
                              tripId: id(r) || "",
                            });
                            router.push(`/customer-invoices?${query.toString()}`);
                          }}
                          className="inline-flex items-center gap-1 rounded-xl border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition shadow-2xs"
                          title="Generate Party Account (Freight Billing)"
                        >
                          <Receipt className="h-3.5 w-3.5 text-emerald-600" />
                          Bill
                        </button>
                      )}

                      {user?.role !== "driver" && (
                        r.status === "settled" ? (
                          <Link
                            href={isMarket ? "/vendor-bills" : "/driver-trip-settlements"}
                            className="inline-flex items-center gap-1 rounded-xl border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition shadow-2xs"
                            title="Settlement Completed - View in Account"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            Settled ✓
                          </Link>
                        ) : (
                          <button
                            onClick={() => handleOpenLorrySettlementFromTrip(r)}
                            className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-bold transition shadow-2xs cursor-pointer border ${
                              isMarket
                                ? "bg-purple-50 text-purple-900 border-purple-200 hover:bg-purple-100"
                                : "bg-blue-50 text-blue-900 border-blue-200 hover:bg-blue-100"
                            }`}
                            title={
                              isMarket
                                ? "Open Market Lorry Account (Vendor Bill) for hired lorry"
                                : "Open Company Lorry Settlement (Driver Settlement Sheet)"
                            }
                          >
                            <Banknote className={`h-3.5 w-3.5 ${isMarket ? "text-purple-600" : "text-blue-600"}`} />
                            <span>{isMarket ? "Market Settlement" : "Driver Settlement"}</span>
                          </button>
                        )
                      )}

                      {user?.role !== "driver" && r.vehicleId && (
                        <button
                          onClick={() =>
                            router.push(
                              `/fuels?autoOpenAdd=true&vehicleId=${id(r.vehicleId)}&driverId=${id(r.driverId)}&tripId=${id(r)}`,
                            )
                          }
                          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                          title="Add Diesel Voucher"
                        >
                          <Fuel className="h-3.5 w-3.5 text-slate-400" />
                          Fuel
                        </button>
                      )}

                      {user?.role !== "driver" && (
                        <button
                          onClick={() =>
                            router.push(
                              `/expenses?autoOpenAdd=true&tripId=${id(r)}&vehicleId=${id(r.vehicleId)}&driverId=${id(r.driverId)}`,
                            )
                          }
                          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                          title="Record Trip Expenses (Toll, Hamali, Driver Advance, Halting)"
                        >
                          <Wallet className="h-3.5 w-3.5 text-slate-400" />
                          Expense
                        </button>
                      )}

                      <button
                        onClick={() => setViewing(r)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition"
                        title="View Details"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>

                      {user?.role !== "driver" && (
                        <button
                          onClick={() => openEditModal(r)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-amber-50 hover:text-amber-700 transition"
                          title="Edit Trip"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls for Cards */}
            <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 bg-white px-4 py-3 rounded-xl sm:flex-row sm:items-center sm:justify-between shadow-2xs">
              <p className="text-xs font-medium text-slate-500">
                Showing{" "}
                <span className="font-bold text-slate-900">
                  {filtered.length ? (page - 1) * pageSize + 1 : 0}
                </span>{" "}
                to{" "}
                <span className="font-bold text-slate-900">
                  {Math.min(page * pageSize, filtered.length)}
                </span>{" "}
                of{" "}
                <span className="font-bold text-slate-900">
                  {filtered.length}
                </span>{" "}
                trips
              </p>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 disabled:pointer-events-none disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <div className="flex h-8 items-center justify-center px-2 text-xs font-bold text-slate-700">
                    {page} / {totalPages}
                  </div>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 disabled:pointer-events-none disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : viewMode === "master" ? (
          /* Table 1: Master Register (30 Columns with Lorry Settlement & Party Account) */
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-2xs">
            <table className="w-full text-left border-collapse min-w-[2400px]">
              <thead className="sticky top-0 z-20 shadow-xs">
                {/* Tier 1: Functional Sections matching Client Numbers Sheet */}
                <tr className="text-center font-black uppercase tracking-wider text-[11px] border-b">
                  <th colSpan={9} className="bg-rose-100 text-rose-950 py-2.5 border-r border-rose-300">
                    🔴 Trip & Lorry Basics
                  </th>
                  <th colSpan={7} className="bg-emerald-100 text-emerald-950 py-2.5 border-r border-emerald-300">
                    🟢 Lorry Settlement (Owner / Broker)
                  </th>
                  <th colSpan={2} className="bg-fuchsia-100 text-fuchsia-950 py-2.5 border-r border-fuchsia-300">
                    🟣 Delivery & POD
                  </th>
                  <th colSpan={11} className="bg-blue-600 text-white py-2.5 border-r border-blue-500">
                    🔵 Party Account (Customer Freight & Deductions)
                  </th>
                  <th colSpan={1} className="bg-orange-500 text-white py-2.5 border-r border-orange-400">
                    🟠 Pending Due
                  </th>
                  <th colSpan={1} className="bg-slate-800 text-white py-2.5">
                    Actions
                  </th>
                </tr>

                {/* Tier 2: Exact Column Headers matching Client Sheet */}
                <tr className="text-[10px] font-black uppercase tracking-wider whitespace-nowrap border-b-2 border-slate-300">
                  {/* Block 1 */}
                  <th className="bg-rose-50 px-3 py-2 text-rose-950 border-r border-rose-200">TRIP NO</th>
                  <th className="bg-rose-50 px-3 py-2 text-rose-950 border-r border-rose-200">DATE</th>
                  <th className="bg-rose-50 px-3 py-2 text-rose-950 border-r border-rose-200">LORRY NO</th>
                  <th className="bg-rose-50 px-3 py-2 text-rose-950 border-r border-rose-200">DRIVER NO</th>
                  <th className="bg-rose-50 px-3 py-2 text-rose-950 border-r border-rose-200">PARTY NAME</th>
                  <th className="bg-rose-50 px-2 py-2 text-rose-950 border-r border-rose-200 text-center">SIZE</th>
                  <th className="bg-rose-50 px-3 py-2 text-rose-950 border-r border-rose-200">FROM</th>
                  <th className="bg-rose-50 px-3 py-2 text-rose-950 border-r border-rose-200">TO</th>
                  <th className="bg-rose-50 px-3 py-2 text-rose-950 border-r-2 border-rose-300">OWNER NAME</th>

                  {/* Block 2 */}
                  <th className="bg-emerald-50 px-3 py-2 text-emerald-950 border-r border-emerald-200 text-right">OWNER RATE</th>
                  <th className="bg-emerald-50 px-3 py-2 text-emerald-950 border-r border-emerald-200 text-right">ADVANCE</th>
                  <th className="bg-emerald-50 px-2 py-2 text-emerald-950 border-r border-emerald-200 text-center">ADV BANK</th>
                  <th className="bg-emerald-50 px-3 py-2 text-emerald-950 border-r border-emerald-200 text-center">ADV DATE</th>
                  <th className="bg-emerald-50 px-2 py-2 text-emerald-950 border-r border-emerald-200 text-right">CATTING</th>
                  <th className="bg-emerald-50 px-3 py-2 text-emerald-950 border-r border-emerald-200 text-right font-black">BALANCE</th>
                  <th className="bg-emerald-50 px-3 py-2 text-emerald-950 border-r-2 border-emerald-300 text-center">BAL DATE</th>

                  {/* Block 3 */}
                  <th className="bg-fuchsia-50 px-3 py-2 text-fuchsia-950 border-r border-fuchsia-200 text-center">DELIVERY DATE</th>
                  <th className="bg-fuchsia-50 px-3 py-2 text-fuchsia-950 border-r-2 border-fuchsia-300 text-center">POD RECVD DATE</th>

                  {/* Block 4 */}
                  <th className="bg-blue-50 px-3 py-2 text-blue-950 border-r border-blue-200 text-right font-black">PARRTY RATE</th>
                  <th className="bg-blue-50 px-3 py-2 text-blue-950 border-r border-blue-200 text-right">PARRTY ADVANCE</th>
                  <th className="bg-blue-50 px-3 py-2 text-blue-950 border-r border-blue-200 text-center">PARRTY ADV DATE</th>
                  <th className="bg-blue-50 px-2 py-2 text-blue-950 border-r border-blue-200 text-right">DEBIT MAMUL</th>
                  <th className="bg-blue-50 px-2 py-2 text-blue-950 border-r border-blue-200 text-right">DEBIT TDS</th>
                  <th className="bg-blue-50 px-2 py-2 text-blue-950 border-r border-blue-200 text-center">BANK</th>
                  <th className="bg-blue-50 px-3 py-2 text-blue-950 border-r border-blue-200 text-right font-black">PARRTY BALANCE</th>
                  <th className="bg-blue-50 px-2 py-2 text-blue-950 border-r border-blue-200 text-right">EXTRA EXP</th>
                  <th className="bg-blue-50 px-3 py-2 text-blue-950 border-r border-blue-200 text-right font-black">TOTAL BALANCE</th>
                  <th className="bg-blue-50 px-3 py-2 text-blue-950 border-r border-blue-200 text-right">BALANCE REV AMOUNT</th>
                  <th className="bg-blue-50 px-3 py-2 text-blue-950 border-r-2 border-blue-300 text-center">BALANCE REV DATE</th>

                  {/* Block 5 */}
                  <th className="bg-orange-50 px-3 py-2 text-orange-950 border-r-2 border-orange-300 text-right font-black text-red-600">DEBIT</th>

                  {/* Actions */}
                  <th className="bg-slate-100 px-3 py-2 text-slate-800 text-center min-w-[240px]">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {pageRows.map((r, i) => {
                  const oRate = Number(r.ownerRate !== undefined && r.ownerRate !== null ? r.ownerRate : (r.rate || 0)) || 0;
                  const adv = Number(r.advanceAmount || 0);
                  const cat = Number(r.catting || 0);
                  const lBal = Number(r.balanceAmount !== undefined && r.balanceAmount !== null ? r.balanceAmount : (oRate - adv - cat)) || 0;

                  const pRate = Number(r.partyRate !== undefined && r.partyRate !== null ? r.partyRate : (r.rate || 0)) || 0;
                  const pAdv = Number(r.partyAdvance || 0);
                  const mamul = Number(r.debitMamul || 0);
                  const tds = Number(r.debitTds || 0);
                  const pBal = Number(r.partyBalance !== undefined && r.partyBalance !== null ? r.partyBalance : (pRate - pAdv - mamul - tds)) || 0;
                  const extra = Number(r.extraExp || 0);
                  const tBal = Number(r.totalBalance !== undefined && r.totalBalance !== null ? r.totalBalance : (pBal + extra)) || 0;
                  const revAmt = Number(r.balanceRevAmount || 0);
                  const dbt = Number(r.debit !== undefined && r.debit !== null ? r.debit : (tBal - revAmt)) || 0;

                  const isMarket = isMarketTrip(r);

                  return (
                    <tr
                      key={id(r)}
                      className={`${i % 2 === 0 ? "bg-white" : "bg-[#fffef5]"} hover:bg-amber-100/50 transition-colors text-xs`}
                    >
                      {/* 1. TRIP NO */}
                      <td className="whitespace-nowrap px-3 py-2 font-bold font-mono text-slate-900 border-r border-slate-200">
                        {r.tripNumber}
                      </td>

                      {/* 2. DATE */}
                      <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-700 border-r border-slate-200">
                        {displayDate(r.dispatchDate)}
                      </td>

                      {/* 3. LORRY NO */}
                      <td className="whitespace-nowrap px-3 py-2 font-bold font-mono text-slate-900 border-r border-slate-200">
                        {r.vehicleId?.vehicleNumber || r.truckNumber || "—"}
                      </td>

                      {/* 4. DRIVER NO */}
                      <td className="whitespace-nowrap px-3 py-2 font-mono text-slate-700 border-r border-slate-200">
                        {r.driverId?.phone || r.driverPhone ? (
                          <a
                            href={`tel:${r.driverId?.phone || r.driverPhone}`}
                            className="text-slate-800 hover:text-emerald-700 hover:underline font-semibold"
                          >
                            {r.driverId?.phone || r.driverPhone}
                          </a>
                        ) : "—"}
                      </td>

                      {/* 5. PARTY NAME */}
                      <td className="whitespace-nowrap px-3 py-2 font-bold text-slate-900 border-r border-slate-200">
                        {r.partyName || r.bookingId?.customerName || "—"}
                      </td>

                      {/* 6. SIZE */}
                      <td className="whitespace-nowrap px-2 py-2 font-black text-slate-800 text-center border-r border-slate-200">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px]">
                          {(r.containerSize || "20F").replace("_ft", "F").replace("_", " ")}
                        </span>
                      </td>

                      {/* 7. FROM */}
                      <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-800 border-r border-slate-200 uppercase">
                        {r.fromCity || r.fromCityId?.name || "—"}
                      </td>

                      {/* 8. TO */}
                      <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-800 border-r border-slate-200 uppercase">
                        {r.toCity || r.toCityId?.name || "—"}
                      </td>

                      {/* 9. OWNER NAME */}
                      <td className="whitespace-nowrap px-3 py-2 font-bold text-slate-900 border-r-2 border-rose-300">
                        {r.ownerName || (isMarket ? (r.brokerName || "Market Broker") : "BHUMI CONTAINER SERVICE")}
                      </td>

                      {/* 10. OWNER RATE */}
                      <td className="whitespace-nowrap px-3 py-2 font-bold font-mono text-slate-900 text-right border-r border-slate-200">
                        {oRate > 0 ? oRate.toLocaleString("en-IN") : "—"}
                      </td>

                      {/* 11. ADVANCE */}
                      <td className="whitespace-nowrap px-3 py-2 font-bold font-mono text-slate-800 text-right border-r border-slate-200">
                        {adv > 0 ? adv.toLocaleString("en-IN") : "—"}
                      </td>

                      {/* 12. ADV BANK */}
                      <td className="whitespace-nowrap px-2 py-2 font-semibold text-slate-700 text-center border-r border-slate-200">
                        {r.advanceBank || "—"}
                      </td>

                      {/* 13. ADV DATE */}
                      <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-700 text-center border-r border-slate-200">
                        {r.advanceDate ? displayDate(r.advanceDate) : "—"}
                      </td>

                      {/* 14. CATTING */}
                      <td className="whitespace-nowrap px-2 py-2 font-semibold font-mono text-slate-700 text-right border-r border-slate-200">
                        {cat > 0 ? cat.toLocaleString("en-IN") : "—"}
                      </td>

                      {/* 15. BALANCE */}
                      <td className="whitespace-nowrap px-3 py-2 font-black font-mono text-slate-950 text-right border-r border-slate-200">
                        {lBal.toLocaleString("en-IN")}
                      </td>

                      {/* 16. BAL DATE */}
                      <td className="whitespace-nowrap px-3 py-2 font-black font-mono text-blue-700 text-center border-r-2 border-emerald-300">
                        {r.balDate ? displayDate(r.balDate) : "—"}
                      </td>

                      {/* 17. DELIVERY DATE */}
                      <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-700 text-center border-r border-slate-200">
                        {r.deliveryDate ? displayDate(r.deliveryDate) : (r.expectedDeliveryDate ? displayDate(r.expectedDeliveryDate) : "—")}
                      </td>

                      {/* 18. POD RECVD DATE */}
                      <td className="whitespace-nowrap px-3 py-2 font-bold text-emerald-700 text-center border-r-2 border-fuchsia-300">
                        {r.podDate ? displayDate(r.podDate) : "—"}
                      </td>

                      {/* 19. PARRTY RATE */}
                      <td className="whitespace-nowrap px-3 py-2 font-bold font-mono text-slate-900 text-right border-r border-slate-200">
                        {pRate > 0 ? pRate.toLocaleString("en-IN") : "—"}
                      </td>

                      {/* 20. PARRTY ADVANCE */}
                      <td className="whitespace-nowrap px-3 py-2 font-bold font-mono text-slate-800 text-right border-r border-slate-200">
                        {pAdv > 0 ? pAdv.toLocaleString("en-IN") : "—"}
                      </td>

                      {/* 21. PARRTY ADV DATE */}
                      <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-700 text-center border-r border-slate-200">
                        {r.partyAdvanceDate ? displayDate(r.partyAdvanceDate) : "—"}
                      </td>

                      {/* 22. DEBIT MAMUL */}
                      <td className="whitespace-nowrap px-2 py-2 font-semibold font-mono text-slate-700 text-right border-r border-slate-200">
                        {mamul > 0 ? mamul.toLocaleString("en-IN") : "—"}
                      </td>

                      {/* 23. DEBIT TDS */}
                      <td className="whitespace-nowrap px-2 py-2 font-semibold font-mono text-slate-700 text-right border-r border-slate-200">
                        {tds > 0 ? tds.toLocaleString("en-IN") : "—"}
                      </td>

                      {/* 24. BANK */}
                      <td className="whitespace-nowrap px-2 py-2 font-semibold text-slate-700 text-center border-r border-slate-200">
                        {r.partyBank || "—"}
                      </td>

                      {/* 25. PARRTY BALANCE */}
                      <td className="whitespace-nowrap px-3 py-2 font-black font-mono text-slate-950 text-right border-r border-slate-200">
                        {pBal.toLocaleString("en-IN")}
                      </td>

                      {/* 26. EXTRA EXP */}
                      <td className="whitespace-nowrap px-2 py-2 font-semibold font-mono text-slate-700 text-right border-r border-slate-200">
                        {extra > 0 ? extra.toLocaleString("en-IN") : "—"}
                      </td>

                      {/* 27. TOTAL BALANCE */}
                      <td className="whitespace-nowrap px-3 py-2 font-black font-mono text-slate-950 text-right border-r border-slate-200">
                        {tBal.toLocaleString("en-IN")}
                      </td>

                      {/* 28. BALANCE REV AMOUNT */}
                      <td className="whitespace-nowrap px-3 py-2 font-bold font-mono text-emerald-700 text-right border-r border-slate-200">
                        {revAmt > 0 ? revAmt.toLocaleString("en-IN") : "—"}
                      </td>

                      {/* 29. BALANCE REV DATE */}
                      <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-700 text-center border-r-2 border-blue-300">
                        {r.balanceRevDate ? displayDate(r.balanceRevDate) : "—"}
                      </td>

                      {/* 30. DEBIT (Final Due in bold red) */}
                      <td className={`whitespace-nowrap px-3 py-2 font-black font-mono text-right border-r-2 border-orange-300 ${
                        dbt > 0 ? "text-red-600 bg-red-50/70" : "text-emerald-700"
                      }`}>
                        {dbt.toLocaleString("en-IN")}
                      </td>

                      {/* Actions */}
                      <td className="whitespace-nowrap px-2.5 py-2 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Settlement Quick Action */}
                          {user?.role !== "driver" && (
                            r.status === "settled" ? (
                              <Link
                                href={isMarket ? "/vendor-bills" : "/driver-trip-settlements"}
                                title="Settlement Completed - View in Account"
                                className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700 shadow-2xs transition-all hover:bg-emerald-100"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                <span>Settled ✓</span>
                              </Link>
                            ) : (
                              <button
                                type="button"
                                title={
                                  isMarket
                                    ? "Open Market Lorry Settlement (Vendor Bill / Sheet 3)"
                                    : "Open Company Lorry Settlement (Driver Settlement / Sheet 2)"
                                }
                                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition shadow-2xs cursor-pointer border ${
                                  isMarket
                                    ? "bg-purple-100 text-purple-900 border-purple-300 hover:bg-purple-200 ring-1 ring-purple-400/30"
                                    : "bg-indigo-100 text-indigo-900 border-indigo-300 hover:bg-indigo-200 ring-1 ring-indigo-400/30"
                                }`}
                                onClick={() => handleOpenLorrySettlementFromTrip(r)}
                              >
                                <Banknote className={`h-3.5 w-3.5 ${isMarket ? "text-purple-700" : "text-indigo-700"}`} />
                                <span>Settlement</span>
                              </button>
                            )
                          )}

                          {/* Party Bill / Print Quick Action */}
                          {user?.role !== "driver" && (
                            (dbt <= 0 && (revAmt > 0 || pAdv > 0 || pRate > 0 || r.status === "completed" || r.status === "settled")) ? (
                              <button
                                type="button"
                                onClick={() => handlePrintBillForTrip(r)}
                                className="inline-flex items-center gap-1 rounded-lg border border-blue-300 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-800 hover:bg-blue-100 transition shadow-2xs cursor-pointer"
                                title="Print / Download Customer Bill PDF (Payment Received / Settled)"
                              >
                                <Printer className="h-3.5 w-3.5 text-blue-600" />
                                <span>Print Bill</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleCreateBillForTrip(r)}
                                className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition shadow-2xs cursor-pointer"
                                title="Generate Customer Invoice / Party Account Bill (Sheet 4)"
                              >
                                <Receipt className="h-3.5 w-3.5 text-emerald-600" />
                                <span>Bill</span>
                              </button>
                            )
                          )}

                          {/* View Details */}
                          <button
                            type="button"
                            onClick={() => setViewing(r)}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition"
                            title="View Full Trip Details & Settlement"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>

                          {/* Edit Trip */}
                          <button
                            type="button"
                            onClick={() => openEditModal(r)}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-amber-50 hover:text-amber-700 transition"
                            title="Edit Trip / Master Register Row"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>

                          {/* Delete Trip */}
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm("Are you sure you want to delete this trip?")) {
                                act(deleteTrip, r, "deleted");
                              }
                            }}
                            className="p-1.5 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition"
                            title="Delete Trip"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Summary Footer */}
              <tfoot className="sticky bottom-0 z-10 bg-slate-900 text-white font-mono text-xs border-t-2 border-slate-400">
                <tr className="font-black">
                  <td colSpan={9} className="px-3 py-3 text-left tracking-wider uppercase border-r border-slate-700">
                    📊 TOTALS ({filtered.length} TRIPS)
                  </td>
                  {/* Block 2 totals */}
                  <td className="px-3 py-3 text-right border-r border-slate-700 text-amber-300">
                    ₹{totals.ownerRate.toLocaleString("en-IN")}
                  </td>
                  <td className="px-3 py-3 text-right border-r border-slate-700 text-emerald-300">
                    ₹{totals.advanceAmount.toLocaleString("en-IN")}
                  </td>
                  <td className="border-r border-slate-700 text-center">—</td>
                  <td className="border-r border-slate-700 text-center">—</td>
                  <td className="px-2 py-3 text-right border-r border-slate-700 text-slate-200">
                    ₹{totals.catting.toLocaleString("en-IN")}
                  </td>
                  <td className="px-3 py-3 text-right border-r border-slate-700 text-amber-400">
                    ₹{totals.lorryBalance.toLocaleString("en-IN")}
                  </td>
                  <td className="border-r-2 border-emerald-400 text-center">—</td>

                  {/* Block 3 delivery */}
                  <td className="border-r border-slate-700 text-center">—</td>
                  <td className="border-r-2 border-fuchsia-400 text-center">—</td>

                  {/* Block 4 totals */}
                  <td className="px-3 py-3 text-right border-r border-slate-700 text-blue-300">
                    ₹{totals.partyRate.toLocaleString("en-IN")}
                  </td>
                  <td className="px-3 py-3 text-right border-r border-slate-700 text-cyan-300">
                    ₹{totals.partyAdvance.toLocaleString("en-IN")}
                  </td>
                  <td className="border-r border-slate-700 text-center">—</td>
                  <td className="px-2 py-3 text-right border-r border-slate-700 text-slate-200">
                    ₹{totals.debitMamul.toLocaleString("en-IN")}
                  </td>
                  <td className="px-2 py-3 text-right border-r border-slate-700 text-slate-200">
                    ₹{totals.debitTds.toLocaleString("en-IN")}
                  </td>
                  <td className="border-r border-slate-700 text-center">—</td>
                  <td className="px-3 py-3 text-right border-r border-slate-700 text-blue-200">
                    ₹{totals.partyBalance.toLocaleString("en-IN")}
                  </td>
                  <td className="px-2 py-3 text-right border-r border-slate-700 text-slate-200">
                    ₹{totals.extraExp.toLocaleString("en-IN")}
                  </td>
                  <td className="px-3 py-3 text-right border-r border-slate-700 text-indigo-300">
                    ₹{totals.totalBalance.toLocaleString("en-IN")}
                  </td>
                  <td className="px-3 py-3 text-right border-r border-slate-700 text-emerald-300">
                    ₹{totals.balanceRevAmount.toLocaleString("en-IN")}
                  </td>
                  <td className="border-r-2 border-blue-400 text-center">—</td>

                  {/* Block 5 total debit */}
                  <td className="px-3 py-3 text-right border-r-2 border-orange-400 text-red-400 bg-red-950/60 font-black">
                    ₹{totals.debit.toLocaleString("en-IN")}
                  </td>
                  <td className="text-center">—</td>
                </tr>
              </tfoot>
            </table>

            {/* Pagination Controls for Master Register */}
            <div className="flex flex-col gap-4 border-t border-slate-200 bg-slate-50/80 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-semibold text-slate-600">
                Showing{" "}
                <span className="font-bold text-slate-900">
                  {filtered.length ? (page - 1) * pageSize + 1 : 0}
                </span>{" "}
                to{" "}
                <span className="font-bold text-slate-900">
                  {Math.min(page * pageSize, filtered.length)}
                </span>{" "}
                of{" "}
                <span className="font-bold text-slate-900">
                  {filtered.length}
                </span>{" "}
                master trips
              </p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">Rows per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    className="h-8 rounded-lg border border-slate-200 bg-white px-2 py-0 text-xs font-bold text-slate-700 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                  >
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:pointer-events-none disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <div className="flex h-8 items-center justify-center px-2 text-xs font-bold text-slate-700">
                    {page} / {totalPages}
                  </div>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:pointer-events-none disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-rose-50/90 text-slate-800 border-b-2 border-rose-200/80">
                <tr>
                  {[
                    "Trip / Challan No",
                    "Route (Loading ➔ Unloading)",
                    "Ownership / Fleet",
                    "Vehicle / Truck No",
                    "Driver & Mobile",
                    "Customer / Party",
                    "Container Size",
                    "Lorry Owner / Broker",
                    "Total Freight (₹)",
                    "Advance / Balance (₹)",
                    "Dispatch Date",
                    "Trip Status",
                  ].map((label) => (
                    <th
                      key={label}
                      className="whitespace-nowrap px-4 py-3.5 text-[11px] font-black uppercase tracking-wider text-slate-700"
                    >
                      {label}
                    </th>
                  ))}
                  <th className="px-4 py-3.5 text-[11px] font-black uppercase tracking-wider text-slate-700 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pageRows.map((r, i) => (
                  <tr
                    key={id(r)}
                    className={`${i % 2 === 0 ? "bg-white hover:bg-[#f8f8f8]" : "bg-amber-50/80 hover:bg-amber-100/70"} ${
                      isMarketTrip(r) ? "border-l-4 border-l-purple-600" : "border-l-4 border-l-blue-600"
                    } transition-colors`}
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-bold text-slate-900">
                      <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-mono text-xs font-bold text-emerald-800">
                        <Route className="h-3.5 w-3.5 text-emerald-600" />
                        {r.tripNumber}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs font-bold text-slate-800">
                      <div className="flex items-center gap-1.5">
                        <span className="flex items-center gap-1 text-emerald-700" title="Loading Point / From">
                          <MapPin className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <span className="text-[10px] text-slate-400 font-bold uppercase mr-0.5">From:</span>
                          {r.fromCity || r.fromCityId?.name || "Loading Point"}
                        </span>
                        <ArrowRight className="h-3 w-3 text-slate-400 shrink-0" />
                        <span className="flex items-center gap-1 text-indigo-700" title="Unloading Point / To">
                          <Navigation className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                          <span className="text-[10px] text-slate-400 font-bold uppercase mr-0.5">To:</span>
                          {r.toCity || r.toCityId?.name || "Unloading Point"}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs">
                      {isMarketTrip(r) ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-purple-100 border border-purple-300 px-2.5 py-1 text-xs font-black text-purple-900 shadow-2xs">
                          <Truck className="h-3 w-3 text-purple-700" />
                          Market (Broker)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md bg-blue-100 border border-blue-300 px-2.5 py-1 text-xs font-black text-blue-950 shadow-2xs">
                          <Building2 className="h-3 w-3 text-blue-700" />
                          Company (Own)
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-600">
                      {(r.vehicleId?.vehicleNumber || r.truckNumber) ? (
                        <span className="inline-flex items-center rounded border border-amber-400 bg-amber-100/90 px-2 py-0.5 font-mono text-xs font-black tracking-wider text-slate-900 shadow-2xs">
                          <span className="mr-1.5 rounded-xs bg-blue-700 px-1 py-0.2 text-[8px] font-black text-white uppercase tracking-tighter">
                            IND
                          </span>
                          {r.vehicleId?.vehicleNumber || r.truckNumber}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-700">
                      <div className="flex items-center gap-2">
                        {r.driverId?.photo ? (
                          <img
                            src={`${process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:8000"}${r.driverId.photo}`}
                            alt={r.driverId?.name || r.driverName || "Driver"}
                            className="h-7 w-7 rounded-full object-cover border border-slate-200 shadow-2xs shrink-0"
                          />
                        ) : (
                          <div className="grid h-7 w-7 place-items-center rounded-full bg-slate-100 text-slate-500 border border-slate-200 shrink-0">
                            <User className="h-3.5 w-3.5" />
                          </div>
                        )}
                        <div>
                          <span className="font-bold text-slate-800 block leading-tight">
                            {r.driverId?.name || r.driverName || id(r.driverId) || "—"}
                          </span>
                          {(r.driverId?.phone || r.driverPhone) && (
                            <a
                              href={`tel:${r.driverId?.phone || r.driverPhone}`}
                              className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.2 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 transition mt-0.5"
                              title={`Call Driver: ${r.driverId?.phone || r.driverPhone}`}
                            >
                              <Phone className="h-2.5 w-2.5 text-emerald-600" />
                              {r.driverId?.phone || r.driverPhone}
                            </a>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-bold text-slate-800">
                      {r.partyName || r.bookingId?.partyId?.name || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs font-semibold text-slate-600">
                      <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-700">
                        {r.containerSize?.replace("_ft", "F")?.replace("_", " ") || "20F"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs font-medium text-slate-700">
                      {isMarketTrip(r) ? (
                        <div className="flex flex-col">
                          <span className="font-black text-purple-950 flex items-center gap-1 text-xs">
                            <Truck className="h-3 w-3 text-purple-600 shrink-0" />
                            {getTripBrokerName(r) || r.ownerName || "Market Broker"}
                          </span>
                          <span className="text-[10px] text-purple-700 font-bold uppercase">Broker / Hired</span>
                        </div>
                      ) : (
                        <div className="flex flex-col">
                          <span className="font-black text-blue-950 flex items-center gap-1 text-xs">
                            <Building2 className="h-3 w-3 text-blue-600 shrink-0" />
                            BHUMI CONTAINER SERVICE
                          </span>
                          <span className="text-[10px] text-blue-700 font-bold uppercase">Company Fleet (Own)</span>
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-mono font-bold text-slate-900">
                      {r.rate ? `₹${Number(r.rate).toLocaleString("en-IN")}` : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs font-mono">
                      <div className="text-emerald-700 font-bold">Adv: ₹{Number(r.advanceAmount || 0).toLocaleString("en-IN")}</div>
                      {Number(r.balanceAmount || 0) === 0 ? (
                        <div className="text-emerald-700 font-black">Bal: ₹0 (Paid ✅)</div>
                      ) : (
                        <div className="text-amber-700 font-bold">Bal: ₹{Number(r.balanceAmount || 0).toLocaleString("en-IN")}</div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs font-mono">
                      <div className="text-slate-800 font-bold">
                        Dispatch: {displayDate(r.dispatchDate)}
                      </div>
                      {r.expectedDeliveryDate && (
                        <div className={isTripDelayed(r) ? "text-red-600 font-black" : "text-slate-500 font-semibold"}>
                          Exp: {displayDate(r.expectedDeliveryDate)} {r.transitDays ? `(${r.transitDays}d)` : ""}
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-600">
                      <div className="flex flex-col gap-1 items-start">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge value={r.status} />
                          {isTripDelayed(r) && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-black uppercase text-white shadow-xs animate-pulse">
                              <AlertCircle className="h-2.5 w-2.5 stroke-[3]" />
                              Late ({getTripDelayDays(r)}d)
                            </span>
                          )}
                        </div>
                        {r.podDate && (
                          <div className="text-[10px] text-emerald-600 font-bold">
                            POD: {displayDate(r.podDate)}
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setViewing(r)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition"
                          title="View Details"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>

                        {/* Driver / Staff Action: Start */}
                        {r.status?.toLowerCase() === "dispatched" && (
                          <button
                            title="Start Trip"
                            className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-bold text-white shadow-2xs transition-all hover:bg-blue-700"
                            onClick={() => act(startTrip, r, "started")}
                          >
                            <Play className="h-3 w-3 fill-current" />
                            Start
                          </button>
                        )}

                        {/* Driver / Staff Action: Deliver */}
                        {r.status?.toLowerCase() === "in_transit" && (
                          <button
                            title="Mark Delivered"
                            className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-2.5 py-1 text-xs font-bold text-white shadow-2xs transition-all hover:bg-amber-700"
                            onClick={() => act(deliverTrip, r, "delivered")}
                          >
                            <PackageCheck className="h-3 w-3" />
                            Deliver
                          </button>
                        )}

                        {/* Admin / Manager Only Actions */}
                        {user?.role !== "driver" && (
                          <>
                            {r.status?.toLowerCase() === "planned" && (
                              <button
                                title="Dispatch"
                                className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-2.5 py-1 text-xs font-black text-slate-950 shadow-2xs transition-all hover:bg-amber-400"
                                onClick={() =>
                                  act(dispatchTrip, r, "dispatched")
                                }
                              >
                                <Play className="h-3 w-3 fill-current" />
                                Dispatch
                              </button>
                            )}

                            {r.status?.toLowerCase() === "delivered" && (
                              <button
                                title="Complete"
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white shadow-2xs transition-all hover:bg-emerald-700"
                                onClick={() =>
                                  act(completeTrip, r, "completed")
                                }
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                Complete
                              </button>
                            )}

                            {((Number(r.debit) <= 0 && (Number(r.balanceRevAmount) > 0 || Number(r.partyAdvance) > 0 || Number(r.partyRate) > 0 || r.status === "completed" || r.status === "settled")) || r.paymentStatus === "paid") ? (
                              <button
                                title="Print / Download Customer Invoice PDF (Fully Paid)"
                                className="inline-flex items-center gap-1 rounded-lg border border-blue-300 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-800 shadow-2xs transition-all hover:bg-blue-100 cursor-pointer"
                                onClick={() => handlePrintBillForTrip(r)}
                              >
                                <Printer className="h-3 w-3 text-blue-600" />
                                Print Bill
                              </button>
                            ) : (
                              (r.status?.toLowerCase() === "completed" || r.status?.toLowerCase() === "delivered") && (
                                <button
                                  title="Generate Party Account (Freight Billing)"
                                  className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 shadow-2xs transition-all hover:bg-emerald-100 cursor-pointer"
                                  onClick={() => handleCreateBillForTrip(r)}
                                >
                                  <Receipt className="h-3 w-3 text-emerald-600" />
                                  Bill
                                </button>
                              )
                            )}

                            {/* Company / Market Lorry Settlement Quick Action */}
                            {user?.role !== "driver" && (
                              r.status === "settled" ? (
                                <Link
                                  href={r.ownerType === "market" ? "/vendor-bills" : "/driver-trip-settlements"}
                                  title="Settlement Completed - View in Account"
                                  className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 shadow-2xs transition-all hover:bg-emerald-100"
                                >
                                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                  Settled ✓
                                </Link>
                              ) : (
                                <button
                                  title={r.ownerType === "market" ? "Market Lorry Settlement (Vendor Bill)" : "Company Lorry Settlement (Sheet 2 - Driver Settlement)"}
                                  className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-800 shadow-2xs transition-all hover:bg-indigo-100 cursor-pointer"
                                  onClick={() => handleOpenLorrySettlementFromTrip(r)}
                                >
                                  <Banknote className="h-3 w-3 text-indigo-600" />
                                  Settlement
                                </button>
                              )
                            )}

                            {r.status &&
                              ["planned", "dispatched"].includes(
                                r.status.toLowerCase(),
                              ) && (
                                <button
                                  title="Cancel"
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition"
                                  onClick={() => {
                                    if (
                                      window.confirm(
                                        "Are you sure you want to cancel this trip?",
                                      )
                                    )
                                      act(cancelTrip, r, "cancelled");
                                  }}
                                >
                                  <Ban className="h-3.5 w-3.5" />
                                </button>
                              )}

                            <button
                              title="Edit"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-amber-50 hover:text-amber-700 transition"
                              onClick={() => openEditModal(r)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>

                            <button
                              title="Delete"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-red-50 border border-red-200 text-red-600 shadow-sm transition-all hover:bg-red-600 hover:text-white"
                              onClick={() => {
                                if (
                                  window.confirm(
                                    "Are you sure you want to DELETE this trip completely? This cannot be undone.",
                                  )
                                )
                                  act(deleteTrip, r, "deleted");
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Footer count */}
            <div className="flex flex-col gap-4 border-t border-slate-100 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                Showing{" "}
                <span className="font-semibold text-slate-900">
                  {filtered.length ? (page - 1) * pageSize + 1 : 0}
                </span>{" "}
                to{" "}
                <span className="font-semibold text-slate-900">
                  {Math.min(page * pageSize, filtered.length)}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-slate-900">
                  {filtered.length}
                </span>{" "}
                records
              </p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">Rows per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    className="h-8 rounded-lg border border-slate-200 bg-white px-2 py-0 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 disabled:pointer-events-none disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <div className="flex h-8 items-center justify-center px-2 text-sm font-semibold text-slate-700">
                    {page} / {totalPages}
                  </div>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 disabled:pointer-events-none disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* View Modal */}
      {viewing &&
        (() => {
          const consignor =
            viewing.bookingId?.supplyOrderId?.consignorId || null;

          const consignee =
            viewing.bookingId?.supplyOrderId?.consigneeId || null;

          const productName =
            viewing.bookingId?.productId?.name ||
            viewing.bookingId?.article ||
            "General Commercial Cargo";

          const qty = Number(viewing.bookingId?.quantity || 0);
          const unit = viewing.bookingId?.unit || "MT";
          const billingRate = Number(viewing.bookingId?.billingRate || 0);
          const totalFreight =
            qty > 0 && billingRate > 0
              ? (qty * billingRate).toLocaleString("en-IN")
              : null;
          const isViewingMarket = isMarketTrip(viewing);
          const viewingBrokerName = getTripBrokerName(viewing);
          const isOwnFleet = !isViewingMarket;

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6">
              <div className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-[2rem] bg-white shadow-2xl border border-slate-200 overflow-hidden">
                {/* Modal Header */}
                <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-8 py-5 bg-gradient-to-r from-slate-50 to-amber-50/30">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 border border-amber-200">
                      <Route className="h-6 w-6 text-amber-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">
                          {viewing.tripNumber || "Trip Overview"}
                        </h3>
                        <Badge value={viewing.status} />
                        {isViewingMarket ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-purple-100 border border-purple-300 px-2 py-0.5 text-xs font-black text-purple-900 shadow-2xs">
                            <Truck className="h-3 w-3 text-purple-700" />
                            Market Lorry (Broker)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-blue-100 border border-blue-300 px-2 py-0.5 text-xs font-black text-blue-950 shadow-2xs">
                            <Building2 className="h-3 w-3 text-blue-700" />
                            Company Fleet (Own)
                          </span>
                        )}
                        {isTripDelayed(viewing) && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-0.5 text-[10px] font-black uppercase text-white shadow-xs animate-pulse">
                            <AlertCircle className="h-3 w-3 stroke-[3]" />
                            Late by {getTripDelayDays(viewing)} Day(s)
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs font-semibold text-slate-500">
                        Indent:{" "}
                        <span className="font-mono text-slate-800 font-bold">
                          {viewing.bookingId?.bookingNumber ||
                            "Direct Dispatch"}
                        </span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setViewing(null)}
                    className="rounded-full bg-white p-2.5 text-slate-400 border border-slate-200 transition hover:bg-slate-100 hover:text-slate-700"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="overflow-y-auto p-6 sm:p-8 space-y-6">
                  {/* Delayed Delivery Critical Alert Banner */}
                  {isTripDelayed(viewing) && (
                    <div className="flex items-center gap-3.5 rounded-2xl border-2 border-red-500 bg-red-50 p-4 text-red-950 shadow-md shadow-red-500/10">
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-red-600 text-white shadow-sm shrink-0">
                        <AlertCircle className="h-5 w-5 stroke-[2.5]" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-sm uppercase tracking-wide text-red-700">
                            Consignment Delayed • {getTripDelayDays(viewing)} Day(s) Overdue
                          </h4>
                          <span className="rounded-full bg-red-600 px-2 py-0.2 text-[9px] font-black text-white uppercase">
                            Late Delivery Alert
                          </span>
                        </div>
                        <p className="text-xs text-red-800 mt-0.5">
                          Expected delivery was <strong>{displayDate(viewing.expectedDeliveryDate)}</strong> ({viewing.transitDays || 0} days estimated transit). Status is currently <strong className="uppercase">{viewing.status}</strong>. Please coordinate immediately with driver.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 1. Highway Route & Transit Bar */}
                  <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-5">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                      Highway Route & Journey Lifecycle
                    </span>
                    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 rounded-lg bg-emerald-100/80 px-3 py-1 font-bold text-emerald-900 text-xs" title="Loading Point (From)">
                          <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                          <span className="text-[10px] uppercase font-bold text-emerald-700 mr-1">From:</span>
                          {viewing.fromCity || viewing.fromCityId?.name || "Loading Point"}
                        </div>
                        <ArrowRight className="h-4 w-4 text-slate-400" />
                        <div className="flex items-center gap-1.5 rounded-lg bg-indigo-100/80 px-3 py-1 font-bold text-indigo-900 text-xs" title="Unloading Point (To)">
                          <Navigation className="h-3.5 w-3.5 text-indigo-600" />
                          <span className="text-[10px] uppercase font-bold text-indigo-700 mr-1">To:</span>
                          {viewing.toCity || viewing.toCityId?.name || "Unloading Point"}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs flex-wrap">
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">
                            Dispatch Date
                          </span>
                          <span className="font-bold text-slate-800">
                            {displayDate(
                              viewing.tripStartDate || viewing.dispatchDate,
                            )}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">
                            Expected Delivery
                          </span>
                          <span className={`font-bold ${isTripDelayed(viewing) ? "text-red-600" : "text-slate-800"}`}>
                            {viewing.expectedDeliveryDate ? displayDate(viewing.expectedDeliveryDate) : "—"}
                            {viewing.transitDays ? ` (${viewing.transitDays}d Transit)` : ""}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">
                            Actual Delivery
                          </span>
                          <span className="font-bold text-slate-800">
                            {viewing.deliveryDate
                              ? displayDate(viewing.deliveryDate)
                              : "In Transit / Pending"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">
                            POD / Bilty Date
                          </span>
                          <span className="font-bold text-slate-800">
                            {viewing.podDate ? displayDate(viewing.podDate) : "Pending POD"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2. Grid Sections matching Transport Operations */}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {/* Lorry Ownership & Category Card */}
                    <div
                      className={`flex flex-col gap-1.5 p-4 rounded-xl border shadow-2xs sm:col-span-2 lg:col-span-3 ${
                        isViewingMarket
                          ? "bg-purple-50/80 border-purple-200 text-purple-950"
                          : "bg-blue-50/80 border-blue-200 text-blue-950"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[10px] font-black uppercase tracking-wider ${
                            isViewingMarket ? "text-purple-800" : "text-blue-800"
                          }`}
                        >
                          Vehicle Ownership & Fleet Category
                        </span>
                        <span
                          className={`rounded-md px-2.5 py-0.5 text-xs font-black uppercase tracking-wider border shadow-2xs ${
                            isViewingMarket
                              ? "bg-purple-200 border-purple-300 text-purple-950"
                              : "bg-blue-200 border-blue-300 text-blue-950"
                          }`}
                        >
                          {isViewingMarket
                            ? "🚚 Market Lorry (Broker Hired)"
                            : "🏢 Company Fleet (Own Lorry)"}
                        </span>
                      </div>
                      <div className="text-base font-black flex items-center gap-2 mt-0.5">
                        {isViewingMarket ? (
                          <>
                            <Truck className="h-4 w-4 text-purple-700" />
                            <span>
                              Broker / Transporter:{" "}
                              {viewingBrokerName ||
                                viewing.ownerName ||
                                "Market Transporter"}
                            </span>
                          </>
                        ) : (
                          <>
                            <Building2 className="h-4 w-4 text-blue-700" />
                            <span>Bhumi Container Service (Own Lorry)</span>
                          </>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-slate-600">
                        {isViewingMarket
                          ? "This consignment is operated by a hired market lorry. Settlement is processed under Market Lorry Account (Vendor Bills)."
                          : "This consignment is operated by company-owned fleet. Settlement is processed under Company Lorry Settlement (Sheet 2 - Driver Settlement)."}
                      </p>
                    </div>

                    {/* Vehicle */}
                    <div className="flex flex-col gap-1.5 p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Vehicle / Truck No.
                      </span>
                      <div className="text-sm font-bold text-slate-900">
                        {viewing.vehicleId?.vehicleNumber || viewing.truckNumber || "—"}
                      </div>
                      <div className="text-xs font-semibold text-slate-500">
                        {viewing.vehicleId?.vehicleType || viewing.containerSize || "Commercial Truck"} •{" "}
                        {isOwnFleet ? "Company Owned Fleet" : "Market Hired"}
                      </div>
                      {viewing.vehicleId?.rcDocument && (
                        <a
                          href={resolveDocUrl(viewing.vehicleId.rcDocument)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline mt-0.5"
                        >
                          <FileText className="h-3 w-3" /> View Vehicle RC
                        </a>
                      )}
                    </div>

                    {/* Driver */}
                    <div className="flex flex-col gap-1.5 p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Assigned Driver (Name & Mobile)
                      </span>
                      <div className="text-sm font-bold text-slate-900">
                        {viewing.driverId?.name || viewing.driverName || "—"}
                      </div>
                      {(viewing.driverId?.phone || viewing.driverPhone) && (
                        <a
                          href={`tel:${viewing.driverId?.phone || viewing.driverPhone}`}
                          className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline"
                        >
                          <Phone className="h-3 w-3 text-emerald-600" />
                          {viewing.driverId?.phone || viewing.driverPhone}
                        </a>
                      )}
                    </div>

                    {/* Party Name & Container Size */}
                    <div className="flex flex-col gap-1.5 p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Customer / Party Name & Container
                      </span>
                      <div className="text-sm font-bold text-slate-900 break-words">
                        {viewing.partyName || viewing.bookingId?.partyId?.name || "—"}
                      </div>
                      <div className="text-xs font-semibold text-slate-600">
                        Container Size:{" "}
                        <span className="font-bold text-slate-800">
                          {viewing.containerSize?.replace("_ft", "F")?.replace("_", " ") || "20F"}
                        </span>
                      </div>
                    </div>

                    {/* Lorry Owner & Ownership Type */}
                    <div className="flex flex-col gap-1.5 p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Lorry Owner / Transporter Name
                      </span>
                      <div className="text-sm font-bold text-slate-900 break-words">
                        {viewing.ownerName || (viewing.ownerType === "market" ? "Market Transporter" : "BHUMI CONTAINER SERVICE")}
                      </div>
                      <div className="text-xs font-semibold text-slate-500">
                        {viewing.ownerType === "market" ? "Market Hired Lorry" : "Company Owned (BHUMI)"}
                      </div>
                    </div>

                    {/* Agreed Freight (Rate) */}
                    <div className="flex flex-col gap-1.5 p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 shadow-2xs">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
                        Total Freight Rate (₹)
                      </span>
                      <div className="text-base font-black text-emerald-950 font-mono">
                        ₹{Number(viewing.rate || 0).toLocaleString("en-IN")}
                      </div>
                      <div className="text-xs font-medium text-emerald-700">
                        Trip Agreed Rate
                      </div>
                    </div>

                    {/* Advance & Balance */}
                    <div className="flex flex-col gap-1.5 p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Advance & Balance Freight (₹)
                      </span>
                      <div className="text-xs font-bold text-emerald-700 font-mono">
                        Adv Paid: ₹{Number(viewing.advanceAmount || 0).toLocaleString("en-IN")}{" "}
                        {viewing.advanceDate ? `(${displayDate(viewing.advanceDate)})` : ""}
                      </div>
                      <div className="text-xs font-bold text-amber-700 font-mono">
                        Balance Payable: ₹{Number(viewing.balanceAmount || 0).toLocaleString("en-IN")}
                      </div>
                    </div>

                    {/* Remarks */}
                    <div className="flex flex-col gap-1.5 p-4 rounded-xl bg-white border border-slate-200 shadow-2xs sm:col-span-2 lg:col-span-3">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Trip Remarks & Instructions
                      </span>
                      <div className="text-xs font-medium text-slate-700">
                        {viewing.remarks || "No remarks entered for this trip."}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex shrink-0 items-center justify-between border-t border-slate-100 bg-white px-8 py-5 rounded-b-[2rem]">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenLorrySettlementFromTrip(viewing)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition shadow-xs cursor-pointer"
                    >
                      <Banknote className="h-4 w-4 text-indigo-600" />
                      Lorry Settlement (Sheet 2)
                    </button>
                    {(viewing.status === "completed" || viewing.status === "delivered") && (
                      <button
                        onClick={() => {
                          const today = new Date().toISOString().split("T")[0];
                          const pRate = viewing.partyRate || viewing.rate || 0;
                          const pAdv = viewing.partyAdvance || viewing.advanceAmount || 0;
                          const pAdvDate = viewing.partyAdvanceDate ? new Date(viewing.partyAdvanceDate).toISOString().split("T")[0] : (viewing.advanceDate ? new Date(viewing.advanceDate).toISOString().split("T")[0] : today);
                          const pDebit = viewing.debit !== undefined ? viewing.debit : (viewing.partyBalance !== undefined ? viewing.partyBalance : (viewing.balanceAmount || 0));

                          const query = new URLSearchParams({
                            autoOpenAdd: "true",
                            invoiceDate: today,
                            vehicleId: id(viewing.vehicleId) || "",
                            partyId: id(viewing.partyId) || "",
                            customerName: viewing.partyName || viewing.bookingId?.customerName || "",
                            containerSize: viewing.containerSize || "20F",
                            fromLocation: viewing.fromCity || viewing.fromCityId?.name || "",
                            toLocation: viewing.toCity || viewing.toCityId?.name || "",
                            freightRate: String(pRate),
                            advanceReceived: String(pAdv),
                            advanceDate: pAdvDate,
                            bankAccountName: viewing.partyBank || "",
                            munshiyanaML: String(viewing.debitMamul || 0),
                            tdsAmount: String(viewing.debitTds || 0),
                            otherCharges: String(viewing.extraExp || 0),
                            paidAmount: String(viewing.balanceRevAmount || 0),
                            paymentDate: viewing.balanceRevDate ? new Date(viewing.balanceRevDate).toISOString().split("T")[0] : "",
                            outstandingAmount: String(pDebit),
                            tripId: id(viewing) || "",
                          });
                          router.push(`/customer-invoices?${query.toString()}`);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition shadow-xs cursor-pointer"
                      >
                        <Receipt className="h-4 w-4 text-emerald-600" />
                        Generate Party Account Bill (Sheet 4)
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => setViewing(null)}
                    className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      {/* Form Modal */}
      {show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6">
          <form
            onSubmit={submit}
            className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-[2rem] bg-white shadow-2xl border border-white/20"
          >
            {/* Modal Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-8 py-5 bg-gradient-to-r from-slate-50 to-amber-50/30">
              <div>
                <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  {editing ? "Edit Trip & Master Register Entry" : "Create Trip Dispatch"}
                </h3>
                <p className="mt-0.5 text-xs font-semibold text-slate-500">
                  Full 30-column Master Register dispatch, Lorry Settlement & Party Account entry.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShow(false)}
                className="rounded-full bg-slate-100 p-2 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <div className="overflow-y-auto p-6 sm:p-8 space-y-6">
              {form.advanceMemoNumber && (
                <div className="flex items-center justify-between rounded-xl bg-amber-500/10 border border-amber-500/30 px-4 py-2.5 text-xs font-bold text-amber-950">
                  <span className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>Autofilled from Advance Memo <strong>#{form.advanceMemoNumber}</strong> — Review details before dispatch</span>
                  </span>
                  <span className="text-[10px] uppercase font-black tracking-wider text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded">
                    Pre-Dispatch Review
                  </span>
                </div>
              )}

              {/* Section 1: 🔴 TRIP & LORRY BASICS */}
              <div className="rounded-2xl border-2 border-rose-200 bg-rose-50/30 p-5 space-y-4">
                <div className="flex items-center gap-2 border-b border-rose-200 pb-2">
                  <span className="grid h-6 w-6 place-items-center rounded-lg bg-rose-600 text-white font-black text-xs">1</span>
                  <h4 className="text-xs font-black uppercase tracking-wider text-rose-950">
                    🔴 Trip & Lorry Basics (Col 1–9)
                  </h4>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <label>
                    <span className="mb-1.5 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-700">
                      <span>Trip / Challan No <span className="text-red-500">*</span></span>
                      <span className="text-[9px] text-amber-700 font-black">Editable</span>
                    </span>
                    <input
                      type="text"
                      value={form.tripNumber || ""}
                      onChange={(e) => setForm({ ...form, tripNumber: e.target.value })}
                      required
                      placeholder="e.g. 26-27/101"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                    />
                  </label>

                  <label>
                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Dispatch Date <span className="text-red-500">*</span>
                    </span>
                    <input
                      type="date"
                      value={form.dispatchDate || ""}
                      onChange={(e) => {
                        const newDispatch = e.target.value;
                        let newExp = form.expectedDeliveryDate;
                        if (newDispatch && form.transitDays && Number(form.transitDays) > 0) {
                          const d = new Date(newDispatch);
                          d.setDate(d.getDate() + parseInt(form.transitDays, 10));
                          newExp = d.toISOString().split("T")[0];
                        }
                        setForm({ ...form, dispatchDate: newDispatch, expectedDeliveryDate: newExp });
                      }}
                      required
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                    />
                  </label>

                  <div>
                    {form.advanceMemoId || form.advanceMemoNumber ? (
                      <div>
                        <div className="mb-1.5 flex items-center justify-between">
                          <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                            Vehicle / Lorry No <span className="text-red-500">*</span>
                          </label>
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700">
                            🔒 Memo #{form.advanceMemoNumber || form.advanceMemoId}
                          </span>
                        </div>
                        <div className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50/90 px-3.5 py-1.5 cursor-not-allowed">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                form.ownerType === "market"
                                  ? "bg-purple-100 text-purple-700"
                                  : "bg-emerald-100 text-emerald-700"
                              }`}
                            >
                              <Truck className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-mono font-black text-sm text-slate-950 tracking-wider">
                                {form.truckNumber || form.vehicleId}
                              </div>
                              <div
                                className={`text-[11px] font-bold ${
                                  form.ownerType === "market"
                                    ? "text-purple-700"
                                    : "text-emerald-700"
                                }`}
                              >
                                {form.ownerType === "market"
                                  ? `Market Lorry${
                                      form.ownerName &&
                                      form.ownerName !== "BHUMI CONTAINER SERVICE"
                                        ? ` (${form.ownerName})`
                                        : ""
                                    }`
                                  : "Company Fleet (Own Truck)"}
                              </div>
                            </div>
                          </div>
                          <span className="text-xs text-slate-400 shrink-0 ml-1">🔒</span>
                        </div>
                      </div>
                    ) : (
                      <SearchableSelect
                        label="Vehicle / Lorry No"
                        required
                        entityType="vehicle"
                        entityLabel="Vehicle"
                        vehicleTab="all"
                        dropdownAlign="right"
                        dropdownWidth="w-[500px] sm:w-[580px] max-w-[calc(100vw-24px)]"
                        value={form.vehicleId || ""}
                        options={freeVehicles}
                        placeholder="Select free truck or add..."
                        onChange={(v, raw) => {
                          const optRaw = raw?.raw || raw || {};
                          const isMkt =
                            optRaw.ownership === "market" ||
                            optRaw.ownerType === "market" ||
                            (Boolean(optRaw.ownerName) &&
                              optRaw.ownerName !== "SELF" &&
                              optRaw.ownerType !== "own") ||
                            Boolean(optRaw.brokerName);
                          setForm((prev) => ({
                            ...prev,
                            vehicleId: v,
                            truckNumber: optRaw.vehicleNumber || prev.truckNumber,
                            ownerType: isMkt ? "market" : "company",
                            ownerName: isMkt
                              ? optRaw.ownerName || optRaw.brokerName || prev.ownerName
                              : "BHUMI CONTAINER SERVICE",
                          }));
                        }}
                      />
                    )}
                  </div>

                  <div>
                    <SearchableSelect
                      label="Driver Name & Mobile"
                      required
                      entityType="driver"
                      entityLabel="Driver"
                      value={form.driverId || ""}
                      options={freeDrivers}
                      placeholder="Select driver or add..."
                      onChange={(v, raw) =>
                        setForm({
                          ...form,
                          driverId: v,
                          driverName: raw?.name || form.driverName,
                          driverPhone: raw?.phone || form.driverPhone,
                        })
                      }
                    />
                  </div>

                  <div>
                    <SearchableSelect
                      label="Customer / Party Name"
                      required
                      entityType="party"
                      entityLabel="Party"
                      value={form.partyId || form.partyName || ""}
                      options={options.customers || []}
                      placeholder="Select customer or add..."
                      onChange={(v, raw) => {
                        const p = raw?.raw || raw;
                        const cleanName = (
                          p?.name ||
                          raw?.label ||
                          (typeof v === "string" ? v : "") ||
                          ""
                        )
                          .replace(/\s*\(\+?\d[\d\s-]{8,}\)/g, "")
                          .trim();
                        setForm((prev) => ({
                          ...prev,
                          partyId: v,
                          partyName: cleanName || prev.partyName,
                          partyBank: p?.bankName || p?.bank || prev.partyBank || "",
                        }));
                      }}
                    />
                  </div>

                  <label>
                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Container Size
                    </span>
                    <select
                      value={form.containerSize || "20F"}
                      onChange={(e) => setForm({ ...form, containerSize: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                    >
                      <option value="20F">20F (20 Feet)</option>
                      <option value="22F">22F (22 Feet)</option>
                      <option value="40F">40F (40 Feet)</option>
                      <option value="40HC">40HC (High Cube)</option>
                      <option value="32F">32F Single/Multi</option>
                      <option value="Other">Other</option>
                    </select>
                  </label>

                  <label>
                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Loading Point / From <span className="text-red-500">*</span>
                    </span>
                    <input
                      type="text"
                      required
                      list="origin-hubs"
                      placeholder="e.g. CHENNAI / COIMTORE"
                      value={form.fromCity || ""}
                      onChange={(e) => setForm({ ...form, fromCity: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                    />
                    <datalist id="origin-hubs">
                      <option value="CHENNAI" />
                      <option value="COIMTORE" />
                      <option value="SURAT" />
                      <option value="BHIWANDI" />
                      <option value="PONDICHERRY" />
                      <option value="MUMBAI" />
                    </datalist>
                  </label>

                  <label>
                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Unloading Point / To <span className="text-red-500">*</span>
                    </span>
                    <input
                      type="text"
                      required
                      list="dest-cities"
                      placeholder="e.g. PUNE / JNPT / JALGAON"
                      value={form.toCity || ""}
                      onChange={(e) => setForm({ ...form, toCity: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                    />
                    <datalist id="dest-cities">
                      <option value="PUNE" />
                      <option value="JNPT" />
                      <option value="JALGAON" />
                      <option value="BHIWANDI" />
                      <option value="CHENNAI" />
                      <option value="MUMBAI" />
                    </datalist>
                  </label>

                  <label>
                    <span className="mb-1.5 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-700">
                      <span>Lorry Ownership</span>
                      <span className="text-[10px] text-slate-400 font-semibold">(Auto)</span>
                    </span>
                    <select
                      disabled
                      value={form.ownerType === "market" ? "market" : "company"}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-bold text-slate-700 outline-none cursor-not-allowed"
                    >
                      <option value="company">Company Fleet (Own Truck)</option>
                      <option value="market">Market Lorry (Broker Truck)</option>
                    </select>
                  </label>

                  <label>
                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Owner Name (Col 9)
                    </span>
                    <input
                      type="text"
                      placeholder="e.g. HARSH ROADLINCE PUNE / BHUMI CONTAINER SERVICE"
                      value={form.ownerName || ""}
                      onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
                      disabled={form.ownerType !== "market"}
                      className={`w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 ${
                        form.ownerType !== "market" ? "bg-slate-50 text-slate-700 cursor-not-allowed" : "bg-white"
                      }`}
                    />
                  </label>

                  <label>
                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Transit Duration (Days)
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="e.g. 2"
                      value={form.transitDays ?? ""}
                      onChange={(e) => {
                        const daysVal = e.target.value;
                        let newExp = form.expectedDeliveryDate;
                        if (form.dispatchDate && daysVal !== "" && !isNaN(daysVal)) {
                          const d = new Date(form.dispatchDate);
                          d.setDate(d.getDate() + parseInt(daysVal, 10));
                          newExp = d.toISOString().split("T")[0];
                        }
                        setForm({
                          ...form,
                          transitDays: daysVal === "" ? "" : Math.max(0, parseInt(daysVal, 10)),
                          expectedDeliveryDate: newExp,
                        });
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                    />
                  </label>

                  <label>
                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Expected Delivery Date
                    </span>
                    <input
                      type="date"
                      value={form.expectedDeliveryDate || ""}
                      onChange={(e) => setForm({ ...form, expectedDeliveryDate: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                    />
                  </label>
                </div>
              </div>

              {/* Section 2: 🟢 LORRY SETTLEMENT (OWNER / BROKER) */}
              <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/30 p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-emerald-200 pb-2 gap-1">
                  <div className="flex items-center gap-2">
                    <span className="grid h-6 w-6 place-items-center rounded-lg bg-emerald-600 text-white font-black text-xs">2</span>
                    <h4 className="text-xs font-black uppercase tracking-wider text-emerald-950">
                      {form.ownerType === "market"
                        ? "🚚 Market Lorry Settlement (Col 10–16)"
                        : "🏢 Company Lorry • Driver Advance (Col 10–16)"}
                    </h4>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    form.ownerType === "market"
                      ? "text-purple-800 bg-purple-100"
                      : "text-emerald-800 bg-emerald-100"
                  }`}>
                    {form.ownerType === "market"
                      ? "🚚 Settlement via: Market Lorry Account (Vendor Bills)"
                      : "🏢 Settlement via: Company Lorry Settlement (Driver Settlement)"}
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <label>
                    <span className="mb-1.5 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-700">
                      <span>{form.ownerType === "market" ? "Lorry Hire Rate (₹)" : "Owner Rate (₹)"}</span>
                      {form.ownerType !== "market" && (
                        <span className="text-[10px] text-slate-400 font-semibold">(0 for Own Fleet)</span>
                      )}
                    </span>
                    <input
                      type="number"
                      placeholder={form.ownerType === "market" ? "e.g. 28000" : "0 (Own Fleet)"}
                      value={form.ownerRate ?? form.rate ?? ""}
                      onChange={(e) => updateLorryCalc({ ownerRate: Number(e.target.value) || 0 })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </label>

                  <label>
                    <span className="mb-1.5 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-700">
                      <span>{form.ownerType === "market" ? "Broker Advance (₹)" : "Driver Advance (₹)"}</span>
                      <span className="text-[10px] text-emerald-700 font-bold">
                        {form.ownerType === "market" ? "To Broker" : "To Driver"}
                      </span>
                    </span>
                    <input
                      type="number"
                      placeholder={form.ownerType === "market" ? "e.g. 25000" : "e.g. 5000 (Diesel/Toll)"}
                      value={form.advanceAmount ?? ""}
                      onChange={(e) => updateLorryCalc({ advanceAmount: Number(e.target.value) || 0 })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </label>

                  <label>
                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Adv Bank
                    </span>
                    <input
                      type="text"
                      placeholder="e.g. AXIS / PNB / UNION"
                      value={form.advanceBank || ""}
                      onChange={(e) => setForm({ ...form, advanceBank: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </label>

                  <label>
                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Adv Date
                    </span>
                    <input
                      type="date"
                      value={form.advanceDate || ""}
                      onChange={(e) => setForm({ ...form, advanceDate: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </label>

                  <label>
                    <span className="mb-1.5 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-700">
                      <span>Catting (₹)</span>
                      {form.ownerType !== "market" && (
                        <span className="text-[10px] text-slate-400 font-semibold">(0 for Own)</span>
                      )}
                    </span>
                    <input
                      type="number"
                      placeholder="e.g. 300"
                      value={form.catting ?? ""}
                      onChange={(e) => updateLorryCalc({ catting: Number(e.target.value) || 0 })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </label>

                  <label>
                    <span className="mb-1.5 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-700">
                      <span>{form.ownerType === "market" ? "Broker Balance (₹)" : "Balance (₹)"}</span>
                      <span className="text-[10px] text-emerald-700 font-black">Auto-Calculated</span>
                    </span>
                    <input
                      type="number"
                      readOnly
                      value={form.balanceAmount ?? ""}
                      className="w-full rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2.5 text-sm font-black text-emerald-950 outline-none cursor-not-allowed"
                    />
                  </label>

                  <label>
                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Bal Date (Col 16)
                    </span>
                    <input
                      type="date"
                      value={form.balDate || ""}
                      onChange={(e) => setForm({ ...form, balDate: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </label>
                </div>
              </div>

              {/* Section 3: 🟣 DELIVERY & POD TRACKING */}
              <div className="rounded-2xl border-2 border-fuchsia-200 bg-fuchsia-50/30 p-5 space-y-4">
                <div className="flex items-center gap-2 border-b border-fuchsia-200 pb-2">
                  <span className="grid h-6 w-6 place-items-center rounded-lg bg-fuchsia-600 text-white font-black text-xs">3</span>
                  <h4 className="text-xs font-black uppercase tracking-wider text-fuchsia-950">
                    🟣 Delivery & POD (Col 17–18)
                  </h4>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label>
                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Delivery Date
                    </span>
                    <input
                      type="date"
                      value={form.deliveryDate || ""}
                      onChange={(e) => setForm({ ...form, deliveryDate: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/20"
                    />
                  </label>

                  <label>
                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
                      POD Recvd Date
                    </span>
                    <input
                      type="date"
                      value={form.podDate || ""}
                      onChange={(e) => setForm({ ...form, podDate: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/20"
                    />
                  </label>
                </div>
              </div>

              {/* Section 4: 🔵 PARTY ACCOUNT & SETTLEMENT */}
              <div className="rounded-2xl border-2 border-blue-200 bg-blue-50/30 p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-blue-200 pb-2 gap-1">
                  <div className="flex items-center gap-2">
                    <span className="grid h-6 w-6 place-items-center rounded-lg bg-blue-600 text-white font-black text-xs">4</span>
                    <h4 className="text-xs font-black uppercase tracking-wider text-blue-950">
                      🔵 Party Account & Revenue (Col 19–30)
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full">
                    Auto-Formula: Total Bal = (Rate - Adv - Mamul - TDS) + Extra Exp | DEBIT = Total Bal - Rev
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <label>
                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Parrty Rate (₹)
                    </span>
                    <input
                      type="number"
                      placeholder="e.g. 32000"
                      value={form.partyRate ?? ""}
                      onChange={(e) => updatePartyCalc({ partyRate: Number(e.target.value) || 0 })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </label>

                  <label>
                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Parrty Advance (₹)
                    </span>
                    <input
                      type="number"
                      placeholder="e.g. 25000"
                      value={form.partyAdvance ?? ""}
                      onChange={(e) => updatePartyCalc({ partyAdvance: Number(e.target.value) || 0 })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </label>

                  <label>
                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Parrty Adv Date
                    </span>
                    <input
                      type="date"
                      value={form.partyAdvanceDate || ""}
                      onChange={(e) => setForm({ ...form, partyAdvanceDate: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </label>

                  <label>
                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Debit Mamul (₹)
                    </span>
                    <input
                      type="number"
                      placeholder="e.g. 300"
                      value={form.debitMamul ?? ""}
                      onChange={(e) => updatePartyCalc({ debitMamul: Number(e.target.value) || 0 })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </label>

                  <label>
                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Debit TDS (₹)
                    </span>
                    <input
                      type="number"
                      placeholder="e.g. 320"
                      value={form.debitTds ?? ""}
                      onChange={(e) => updatePartyCalc({ debitTds: Number(e.target.value) || 0 })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </label>

                  <label>
                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Bank (Col 24)
                    </span>
                    <input
                      type="text"
                      placeholder="e.g. AXIS / PNB"
                      value={form.partyBank || ""}
                      onChange={(e) => setForm({ ...form, partyBank: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </label>

                  <label>
                    <span className="mb-1.5 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-700">
                      <span>Parrty Balance (₹)</span>
                      <span className="text-[10px] text-blue-700 font-black">Auto</span>
                    </span>
                    <input
                      type="number"
                      readOnly
                      value={form.partyBalance ?? ""}
                      className="w-full rounded-xl border border-blue-200 bg-blue-50/60 px-3.5 py-2.5 text-sm font-black text-blue-950 outline-none cursor-not-allowed"
                    />
                  </label>

                  <label>
                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Extra Exp (₹)
                    </span>
                    <input
                      type="number"
                      placeholder="0"
                      value={form.extraExp ?? ""}
                      onChange={(e) => updatePartyCalc({ extraExp: Number(e.target.value) || 0 })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </label>

                  <label>
                    <span className="mb-1.5 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-700">
                      <span>Total Balance (₹)</span>
                      <span className="text-[10px] text-blue-700 font-black">Auto</span>
                    </span>
                    <input
                      type="number"
                      readOnly
                      value={form.totalBalance ?? ""}
                      className="w-full rounded-xl border border-indigo-200 bg-indigo-50/70 px-3.5 py-2.5 text-sm font-black text-indigo-950 outline-none cursor-not-allowed"
                    />
                  </label>

                  <label>
                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Balance Rev Amount (₹)
                    </span>
                    <input
                      type="number"
                      placeholder="e.g. 6380"
                      value={form.balanceRevAmount ?? ""}
                      onChange={(e) => updatePartyCalc({ balanceRevAmount: Number(e.target.value) || 0 })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-emerald-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </label>

                  <label>
                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Balance Rev Date
                    </span>
                    <input
                      type="date"
                      value={form.balanceRevDate || ""}
                      onChange={(e) => setForm({ ...form, balanceRevDate: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </label>

                  {/* Block 5: DEBIT in bold red */}
                  <label>
                    <span className="mb-1.5 flex items-center justify-between text-xs font-black uppercase tracking-wider text-red-600">
                      <span>🟠 DEBIT / PENDING (₹)</span>
                      <span className="text-[10px] text-red-600 font-black">FINAL DUE</span>
                    </span>
                    <input
                      type="number"
                      readOnly
                      value={form.debit ?? ""}
                      className={`w-full rounded-xl border-2 px-3.5 py-2.5 text-sm font-black outline-none cursor-not-allowed ${
                        Number(form.debit) > 0 ? "border-red-400 bg-red-50 text-red-600" : "border-emerald-300 bg-emerald-50 text-emerald-800"
                      }`}
                    />
                  </label>
                </div>
              </div>

              {/* Remarks & Trip Status */}
              <div className="grid gap-4 sm:grid-cols-2">
                <label>
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Remarks & Trip Instructions
                  </span>
                  <input
                    type="text"
                    value={form.remarks || ""}
                    onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                    placeholder="e.g. Loading instructions, driver notes..."
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                  />
                </label>
                {editing && (
                  <label>
                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Trip Status
                    </span>
                    <select
                      value={form.status || "planned"}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-slate-900"
                    >
                      <option value="planned">Planned (Ready for loading)</option>
                      <option value="dispatched">Dispatched (On Highway)</option>
                      <option value="in_transit">In Transit</option>
                      <option value="delivered">Delivered (Unloaded)</option>
                      <option value="completed">Completed & Settled</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </label>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/50 px-8 py-6 rounded-b-[2rem]">
              <button
                type="button"
                onClick={() => setShow(false)}
                className="rounded-full border-2 border-slate-200 bg-white px-6 py-2.5 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 px-8 py-2.5 text-sm font-black text-slate-950 shadow-lg shadow-amber-500/25 transition hover:from-amber-400 hover:to-amber-500 hover:shadow-amber-500/35 focus:outline-none focus:ring-4 focus:ring-amber-500/30 disabled:opacity-60 cursor-pointer"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing
                  ? saving
                    ? "Updating..."
                    : "Save Changes"
                  : saving
                    ? "Creating..."
                    : "Create Trip"}
              </button>
            </div>
          </form>
        </div>
      )}

      {printInvoiceData && (
        <InvoicePrintModal
          invoiceData={printInvoiceData}
          invoiceId={printInvoiceId}
          onClose={() => {
            setPrintInvoiceData(null);
            setPrintInvoiceId(null);
          }}
        />
      )}
    </div>
  );
}
