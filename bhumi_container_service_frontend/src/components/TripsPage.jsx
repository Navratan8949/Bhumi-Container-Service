"use client";
import { useEffect, useState, useMemo } from "react";
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

function id(x) {
  return x?._id || x?.id;
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

  useEffect(() => {
    const s = searchParams?.get("search");
    if (s) {
      setSearch(s);
      setStatusFilter("");
    }
    const st = searchParams?.get("status");
    if (st) {
      setStatusFilter(st);
    }
  }, [searchParams]);
  const [statusFilter, setStatusFilter] = useState(() => {
    const paramStatus = searchParams?.get("status");
    if (paramStatus) return paramStatus;
    const paramSearch = searchParams?.get("search");
    if (paramSearch) return "";
    return "active";
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [viewMode, setViewMode] = useState("cards");
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
        const [r, vh, dr] = await Promise.all([
          getTrips(),
          api.get("/vehicles").catch(() => ({ data: { data: [] } })),
          api.get("/drivers").catch(() => ({ data: { data: [] } })),
        ]);
        setRows(r?.data ?? []);
        setOptions({
          bookings: [],
          vehicles: vh.data?.data || [],
          drivers: dr.data?.data || [],
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
        ownerType: searchParams.get("ownerType") || "owned",
        ownerName: searchParams.get("ownerName") || "BHUMI CONTAINER SERVICE",
        brokerName: searchParams.get("brokerName") || "",
        rate: searchParams.get("rate") ? Number(searchParams.get("rate")) : 0,
        advanceAmount: searchParams.get("advanceAmount") ? Number(searchParams.get("advanceAmount")) : 0,
        advanceDate: searchParams.get("advanceDate") || today,
        balanceAmount: searchParams.get("balanceAmount") ? Number(searchParams.get("balanceAmount")) : 0,
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
          const [vhRes, drRes] = await Promise.all([
            api.get("/vehicles").catch(() => ({ data: { data: [] } })),
            api.get("/drivers").catch(() => ({ data: { data: [] } })),
          ]);
          const vList = vhRes.data?.data || [];
          const dList = drRes.data?.data || [];

          let resolvedVId = autoForm.vehicleId;
          let resolvedDId = autoForm.driverId;
          let changed = false;

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
      const query = new URLSearchParams({
        autoOpenAdd: "true",
        billDate: today,
        vehicleId: vId ? String(vId) : "",
        partyName: r.partyName || r.bookingId?.customerName || "",
        vendorId: vendId ? String(vendId) : "",
        containerSize: r.containerSize || "22F",
        fromLocation: r.fromCity || r.fromCityId?.name || "",
        toLocation: r.toCity || r.toCityId?.name || "",
        hireRate: String(r.rate || 0),
        paidAmount: String(r.advanceAmount || 0),
        advanceDate: r.advanceDate ? new Date(r.advanceDate).toISOString().split("T")[0] : today,
      });
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
      partyName: r.partyName || r.bookingId?.customerName || "",
      containerSize: r.containerSize || "22F",
      fromLocation: r.fromCity || r.fromCityId?.name || "",
      toLocation: r.toCity || r.toCityId?.name || "",
      startKm: sKm,
      returnKm: rKm,
      rs: String(r.rate || 0),
      advanceGiven: adv,
      advanceDate: advDate,
    });
    if (delDate) query.set("deliveryDate", delDate);

    router.push(`/driver-trip-settlements?${query.toString()}`);
  };

  // Free / Available Vehicles for Dispatch (exclude vehicles on active trips or maintenance)
  const freeVehicles = useMemo(() => {
    const liveTrips = (rows || []).filter(
      (t) =>
        (t.status === "dispatched" || t.status === "in_transit" || t.status === "planned") &&
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
        (t.status === "dispatched" || t.status === "in_transit" || t.status === "planned") &&
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
      partyName: "",
      containerSize: "20_ft",
      ownerType: "owned",
      ownerName: "BHUMI CONTAINER SERVICE",
      rate: 0,
      advanceAmount: 0,
      advanceDate: today,
      balanceAmount: 0,
      podDate: "",
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
      if (editing) {
        await updateTrip(id(form), { ...form });
        toast.success("Trip updated successfully");
      } else {
        let currentForm = { ...form };

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
    const s = String(r.status || "").toLowerCase();
    if (statusFilter === "active") {
      if (s === "completed" || s === "cancelled") return false;
    } else if (statusFilter === "delayed") {
      if (!isTripDelayed(r)) return false;
    } else if (
      statusFilter &&
      s !== statusFilter.toLowerCase()
    ) {
      return false;
    }
    if (!search) return true;
    return JSON.stringify(r).toLowerCase().includes(search.toLowerCase());
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  // Operational KPI calculations
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

  const handleExportExcel = () => {
    const columns = [
      { key: "tripNumber", label: "Trip / Challan No" },
      { key: "dispatchDate", label: "Dispatch Date", type: "date" },
      { key: "transitDays", label: "Transit Duration (Days)", type: "number" },
      { key: "expectedDeliveryDate", label: "Expected Delivery Date", type: "date" },
      { key: "delayStatus", label: "Delivery Delay Alert" },
      { key: "vehicleNumber", label: "Vehicle / Truck No" },
      { key: "driverName", label: "Driver Name" },
      { key: "driverPhone", label: "Driver Mobile" },
      { key: "partyName", label: "Customer / Party Name" },
      { key: "containerSize", label: "Container Size / Type" },
      { key: "fromCity", label: "Loading Point / From" },
      { key: "toCity", label: "Unloading Point / To" },
      { key: "ownerName", label: "Lorry Owner / Transporter" },
      { key: "rate", label: "Total Freight Rate (₹)", type: "number" },
      { key: "advanceAmount", label: "Advance Paid (₹)", type: "number" },
      { key: "advanceDate", label: "Advance Payment Date", type: "date" },
      { key: "balanceAmount", label: "Balance Freight Payable (₹)", type: "number" },
      { key: "podDate", label: "POD / Bilty Date", type: "date" },
      { key: "status", label: "Trip Status" },
      { key: "remarks", label: "Remarks" },
    ];

    const dataRows = filtered.map((r) => {
      const isLate = isTripDelayed(r);
      const lateD = getTripDelayDays(r);
      return {
        tripNumber: r.tripNumber,
        dispatchDate: r.dispatchDate,
        transitDays: r.transitDays || 0,
        expectedDeliveryDate: r.expectedDeliveryDate || "—",
        delayStatus: isLate ? `DELAYED / LATE BY ${lateD} DAYS` : "ON-TIME",
        vehicleNumber: r.vehicleId?.vehicleNumber || r.truckNumber || "—",
        driverName: r.driverId?.name || r.driverName || "—",
        driverPhone: r.driverId?.phone || r.driverPhone || "—",
        partyName: r.partyName || r.bookingId?.partyId?.name || "—",
        containerSize: r.containerSize || "20F",
        fromCity: r.fromCity || r.fromCityId?.name || "—",
        toCity: r.toCity || r.toCityId?.name || "—",
        ownerName: r.ownerName || (r.ownerType === "market" ? "Market" : "BHUMI CONTAINER SERVICE"),
        rate: Number(r.rate || r.bookingId?.billingRate || 0),
        advanceAmount: Number(r.advanceAmount || 0),
        advanceDate: r.advanceDate || "—",
        balanceAmount: Number(r.balanceAmount || 0),
        podDate: r.podDate || "—",
        status: String(r.status || "planned").toUpperCase(),
        remarks: r.remarks || "—",
      };
    });

    exportToExcelProfessional({
      title: "Fleet Dispatches & Trip Register (TOTAL LORRY)",
      subtitle: `${activeCompany?.name || "Bhumi Container Service"} • Central Logistics Control Tower`,
      filename: `${activeCompany?.code || "TMS"}_Total_Lorry_Register`,
      sheetName: "TOTAL LORRY",
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
              setStatusFilter(statusFilter === "delayed" ? "active" : "delayed");
              setPage(1);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2 text-xs font-black text-white shadow transition shrink-0 cursor-pointer"
          >
            <AlertCircle className="h-3.5 w-3.5" />
            {statusFilter === "delayed" ? "Show Active Trips" : `Filter Late Trips (${delayedCount})`}
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
            setStatusFilter(statusFilter === "in_transit" ? "active" : "in_transit");
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
            setStatusFilter(statusFilter === "dispatched" ? "active" : "dispatched");
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
            setStatusFilter(statusFilter === "delivered" ? "active" : "delivered");
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
            setStatusFilter(statusFilter === "completed" ? "active" : "completed");
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
            setStatusFilter(statusFilter === "delayed" ? "active" : "delayed");
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
                  setStatusFilter(active ? "active" : pill.value);
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
                onClick={() => setViewMode("cards")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  viewMode === "cards"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Fleet Cards
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  viewMode === "table"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <List className="h-3.5 w-3.5" />
                Transport Table
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
            {(search || statusFilter) && rows.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("");
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
                    className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs transition-all hover:border-amber-300 hover:shadow-md"
                  >
                    {/* Card Header: Truck No & Status */}
                    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`grid h-11 w-11 place-items-center rounded-xl font-bold shadow-xs ${
                            st === "in_transit"
                              ? "bg-emerald-500 text-white shadow-emerald-500/20"
                              : st === "dispatched"
                                ? "bg-blue-600 text-white shadow-blue-600/20"
                                : st === "delivered"
                                  ? "bg-amber-500 text-white shadow-amber-500/20"
                                  : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          <Truck className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="inline-flex items-center rounded border border-amber-400 bg-amber-100/90 px-2 py-0.5 font-mono text-xs font-black tracking-wider text-slate-900 shadow-2xs">
                            <span className="mr-1.5 rounded-xs bg-blue-700 px-1 py-0.2 text-[8px] font-black text-white uppercase tracking-tighter">
                              IND
                            </span>
                            {vehicleNum}
                          </div>
                          <p className="mt-1 text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                            {vehicleType} •{" "}
                            <span className="font-mono text-slate-800 font-black">
                              {r.tripNumber}
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

                      {st === "completed" && user?.role !== "driver" && (
                        <button
                          onClick={() => {
                            const today = new Date().toISOString().split("T")[0];
                            const query = new URLSearchParams({
                              autoOpenAdd: "true",
                              invoiceDate: today,
                              vehicleId: id(r.vehicleId) || "",
                              customerName: r.partyName || r.bookingId?.customerName || "",
                              containerSize: r.containerSize || "20F",
                              fromLocation: r.fromCity || r.fromCityId?.name || "",
                              toLocation: r.toCity || r.toCityId?.name || "",
                              freightRate: String(r.rate || 0),
                              advanceReceived: String(r.advanceAmount || 0),
                              advanceDate: r.advanceDate ? new Date(r.advanceDate).toISOString().split("T")[0] : today,
                              outstandingAmount: String(r.balanceAmount || Math.max(0, (r.rate || 0) - (r.advanceAmount || 0))),
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
                        <button
                          onClick={() => handleOpenLorrySettlementFromTrip(r)}
                          className="inline-flex items-center gap-1 rounded-xl border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-bold text-indigo-800 hover:bg-indigo-100 transition shadow-2xs cursor-pointer"
                          title="Open Company Lorry Settlement (Sheet 2 - Driver Settlement)"
                        >
                          <Banknote className="h-3.5 w-3.5 text-indigo-600" />
                          Settlement
                        </button>
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
                          onClick={() => {
                            setForm({
                              ...r,
                              bookingId: id(r.bookingId),
                              vehicleId: id(r.vehicleId),
                              driverId: id(r.driverId),
                              partyName: r.partyName || r.bookingId?.partyId?.name || "",
                              containerSize: r.containerSize || r.bookingId?.containerSize || "20_ft",
                              ownerType: r.ownerType || (r.vehicleId?.ownerType === "market" ? "market" : "owned"),
                              ownerName: r.ownerName || r.vehicleId?.ownerName || (r.ownerType === "market" ? "" : "BHUMI CONTAINER SERVICE"),
                              rate: r.rate || r.bookingId?.billingRate || 0,
                              advanceAmount: r.advanceAmount || 0,
                              advanceDate: r.advanceDate ? new Date(r.advanceDate).toISOString().split("T")[0] : "",
                              balanceAmount: r.balanceAmount || 0,
                              podDate: r.podDate ? new Date(r.podDate).toISOString().split("T")[0] : "",
                              fromCity: r.fromCity || r.fromCityId?.name || "",
                              toCity: r.toCity || r.toCityId?.name || "",
                              status: r.status,
                              transitDays: r.transitDays !== undefined ? r.transitDays : 0,
                              expectedDeliveryDate: r.expectedDeliveryDate
                                ? new Date(r.expectedDeliveryDate)
                                    .toISOString()
                                    .split("T")[0]
                                : "",
                              dispatchDate: r.dispatchDate
                                ? new Date(r.dispatchDate)
                                    .toISOString()
                                    .split("T")[0]
                                : "",
                            });
                            setEditing(true);
                            setShow(true);
                          }}
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
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-rose-50/90 text-slate-800 border-b-2 border-rose-200/80">
                <tr>
                  {[
                    "Trip / Challan No",
                    "Route (Loading ➔ Unloading)",
                    "Vehicle / Truck No",
                    "Driver & Mobile",
                    "Customer / Party",
                    "Container Size",
                    "Lorry Owner",
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
                    className={`${i % 2 === 0 ? "bg-white hover:bg-[#f8f8f8]" : "bg-amber-50/80 hover:bg-amber-100/70"} transition-colors`}
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
                      <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${r.ownerType === "market" ? "bg-amber-100 text-amber-800" : "bg-blue-50 text-blue-800"}`}>
                        {r.ownerName || (r.ownerType === "market" ? "Market Transporter" : "BHUMI")}
                      </span>
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

                            {r.status?.toLowerCase() === "completed" && (
                              <button
                                title="Generate Party Account (Freight Billing)"
                                className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 shadow-2xs transition-all hover:bg-emerald-100"
                                onClick={() => {
                                  const today = new Date().toISOString().split("T")[0];
                                  const query = new URLSearchParams({
                                    autoOpenAdd: "true",
                                    invoiceDate: today,
                                    vehicleId: id(r.vehicleId) || "",
                                    customerName: r.partyName || r.bookingId?.customerName || "",
                                    containerSize: r.containerSize || "20F",
                                    fromLocation: r.fromCity || r.fromCityId?.name || "",
                                    toLocation: r.toCity || r.toCityId?.name || "",
                                    freightRate: String(r.rate || 0),
                                    advanceReceived: String(r.advanceAmount || 0),
                                    advanceDate: r.advanceDate ? new Date(r.advanceDate).toISOString().split("T")[0] : today,
                                    outstandingAmount: String(r.balanceAmount || Math.max(0, (r.rate || 0) - (r.advanceAmount || 0))),
                                  });
                                  router.push(`/customer-invoices?${query.toString()}`);
                                }}
                              >
                                <Receipt className="h-3 w-3 text-emerald-600" />
                                Bill
                              </button>
                            )}

                            {/* Company Lorry Settlement Quick Action */}
                            {user?.role !== "driver" && (
                              <button
                                title="Company Lorry Settlement (Sheet 2 - Driver Settlement)"
                                className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-800 shadow-2xs transition-all hover:bg-indigo-100 cursor-pointer"
                                onClick={() => handleOpenLorrySettlementFromTrip(r)}
                              >
                                <Banknote className="h-3 w-3 text-indigo-600" />
                                Settlement
                              </button>
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
                              onClick={() => {
                                setForm({
                                  ...r,
                                  bookingId: id(r.bookingId),
                                  vehicleId: id(r.vehicleId),
                                  driverId: id(r.driverId),
                                  partyName: r.partyName || r.bookingId?.partyId?.name || "",
                                  containerSize: r.containerSize || r.bookingId?.containerSize || "20_ft",
                                  ownerType: r.ownerType || (r.vehicleId?.ownerType === "market" ? "market" : "owned"),
                                  ownerName: r.ownerName || r.vehicleId?.ownerName || (r.ownerType === "market" ? "" : "BHUMI CONTAINER SERVICE"),
                                  rate: r.rate || r.bookingId?.billingRate || 0,
                                  advanceAmount: r.advanceAmount || 0,
                                  advanceDate: r.advanceDate ? new Date(r.advanceDate).toISOString().split("T")[0] : "",
                                  balanceAmount: r.balanceAmount || 0,
                                  podDate: r.podDate ? new Date(r.podDate).toISOString().split("T")[0] : "",
                                  fromCity: r.fromCity || r.fromCityId?.name || "",
                                  toCity: r.toCity || r.toCityId?.name || "",
                                  status: r.status,
                                  transitDays: r.transitDays !== undefined ? r.transitDays : 0,
                                  expectedDeliveryDate: r.expectedDeliveryDate
                                    ? new Date(r.expectedDeliveryDate)
                                        .toISOString()
                                        .split("T")[0]
                                    : "",
                                  dispatchDate: r.dispatchDate
                                    ? new Date(r.dispatchDate)
                                        .toISOString()
                                        .split("T")[0]
                                    : "",
                                });
                                setEditing(true);
                                setShow(true);
                              }}
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
          const isOwnFleet =
            viewing.vehicleId?.ownerType === "owned" ||
            !viewing.bookingId?.transporterId;

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
                    {viewing.status === "completed" && (
                      <button
                        onClick={() => {
                          const today = new Date().toISOString().split("T")[0];
                          const query = new URLSearchParams({
                            autoOpenAdd: "true",
                            invoiceDate: today,
                            vehicleId: id(viewing.vehicleId) || "",
                            customerName: viewing.partyName || viewing.bookingId?.customerName || "",
                            containerSize: viewing.containerSize || "20F",
                            fromLocation: viewing.fromCity || viewing.fromCityId?.name || "",
                            toLocation: viewing.toCity || viewing.toCityId?.name || "",
                            freightRate: String(viewing.rate || 0),
                            advanceReceived: String(viewing.advanceAmount || 0),
                            advanceDate: viewing.advanceDate ? new Date(viewing.advanceDate).toISOString().split("T")[0] : today,
                            outstandingAmount: String(viewing.balanceAmount || Math.max(0, (viewing.rate || 0) - (viewing.advanceAmount || 0))),
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
            className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-[2rem] bg-white shadow-2xl border border-white/20"
          >
            {/* Modal Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-8 py-6">
              <div>
                <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  {editing ? "Edit Trip" : "Create Trip"}
                </h3>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  Provide the required details below. IDs must belong to the
                  active company.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShow(false)}
                className="rounded-full bg-slate-50 p-2.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <div className="overflow-y-auto p-8 grid gap-6 sm:grid-cols-2">
              {form.advanceMemoNumber && (
                <div className="sm:col-span-2 flex items-center justify-between rounded-xl bg-amber-500/10 border border-amber-500/30 px-4 py-2.5 text-xs font-bold text-amber-950">
                  <span className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>Autofilled from Advance Memo <strong>#{form.advanceMemoNumber}</strong> — Review details before dispatch</span>
                  </span>
                  <span className="text-[10px] uppercase font-black tracking-wider text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded">
                    Pre-Dispatch Review
                  </span>
                </div>
              )}

              <label>
                <span className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-600">
                  <span>
                    Trip / Challan Number <span className="text-red-500">*</span>
                  </span>
                  <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-700 border border-amber-500/30">
                    Auto-Generated • Editable
                  </span>
                </span>
                <input
                  type="text"
                  value={form.tripNumber || ""}
                  onChange={(e) =>
                    setForm({ ...form, tripNumber: e.target.value })
                  }
                  required
                  placeholder="e.g. TRIP-2026-002"
                  className="w-full rounded-xl border-2 border-slate-100 bg-slate-50/50 px-4 py-3 text-sm font-medium outline-none transition focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/20"
                />
              </label>

              <div>
                <SearchableSelect
                  label="Vehicle / Truck No. - Only Free Vehicles"
                  required
                  entityType="vehicle"
                  entityLabel="Vehicle"
                  value={form.vehicleId || ""}
                  options={freeVehicles}
                  placeholder="Select free vehicle or + Add Truck..."
                  helperText={`${freeVehicles.length} vehicles currently free & ready for dispatch`}
                  onChange={(v, raw) =>
                    setForm({
                      ...form,
                      vehicleId: v,
                      truckNumber: raw?.vehicleNumber || form.truckNumber,
                    })
                  }
                />
              </div>

              <div>
                <SearchableSelect
                  label="Driver Name & Mobile - Only Free Drivers"
                  required
                  entityType="driver"
                  entityLabel="Driver"
                  value={form.driverId || ""}
                  options={freeDrivers}
                  placeholder="Select free driver by name or mobile number..."
                  helperText={`${freeDrivers.length} drivers currently free & ready for route`}
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

              <label>
                <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Loading Point / From <span className="text-red-500">*</span>
                </span>
                <input
                  type="text"
                  required
                  list="origin-hubs"
                  placeholder="e.g. Chennai Port / Puzhal Yard / Mumbai / Delhi"
                  value={form.fromCity || ""}
                  onChange={(e) => setForm({ ...form, fromCity: e.target.value })}
                  className="w-full rounded-xl border-2 border-slate-100 bg-slate-50/50 px-4 py-3 text-sm font-medium outline-none transition focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/20"
                />
                <datalist id="origin-hubs">
                  <option value="Chennai Port" />
                  <option value="Puzhal Terminal, Chennai" />
                  <option value="Ennore Port" />
                  <option value="Kattupalli Port" />
                  <option value="Sri City, AP" />
                  <option value="Ranipet, TN" />
                  <option value="Hosur, TN" />
                </datalist>
              </label>

              <label>
                <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Unloading Point / To <span className="text-red-500">*</span>
                </span>
                <input
                  type="text"
                  required
                  list="dest-cities"
                  placeholder="e.g. Sri City / Bangalore / Pune / Bhiwandi"
                  value={form.toCity || ""}
                  onChange={(e) => setForm({ ...form, toCity: e.target.value })}
                  className="w-full rounded-xl border-2 border-slate-100 bg-slate-50/50 px-4 py-3 text-sm font-medium outline-none transition focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/20"
                />
                <datalist id="dest-cities">
                  <option value="Sri City, AP" />
                  <option value="Bangalore, Karnataka" />
                  <option value="Hosur, TN" />
                  <option value="Coimbatore, TN" />
                  <option value="Hyderabad, Telangana" />
                  <option value="Bhiwandi, Maharashtra" />
                  <option value="Pune, Maharashtra" />
                  <option value="Mumbai, Maharashtra" />
                </datalist>
              </label>

              <label>
                <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Dispatch / Loading Date <span className="text-red-500">*</span>
                </span>
                <input
                  type="date"
                  value={form.dispatchDate || ""}
                  onChange={(e) => {
                    const newDispatch = e.target.value;
                    let newExp = form.expectedDeliveryDate;
                    if (newDispatch && form.transitDays && !isNaN(form.transitDays) && Number(form.transitDays) > 0) {
                      const d = new Date(newDispatch);
                      d.setDate(d.getDate() + parseInt(form.transitDays, 10));
                      newExp = d.toISOString().split("T")[0];
                    }
                    setForm({ ...form, dispatchDate: newDispatch, expectedDeliveryDate: newExp });
                  }}
                  required
                  className="w-full rounded-xl border-2 border-slate-100 bg-slate-50/50 px-4 py-3 text-sm font-medium outline-none transition focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/20"
                />
              </label>

              <label>
                <span className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-600">
                  <span>
                    Transit Duration (Estimated Days) <span className="text-red-500">*</span>
                  </span>
                  <span className="text-[10px] text-amber-700 font-bold lowercase">
                    delivery timeline in days
                  </span>
                </span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="e.g. 2 or 3"
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
                  className="w-full rounded-xl border-2 border-slate-100 bg-slate-50/50 px-4 py-3 text-sm font-medium outline-none transition focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/20"
                />
              </label>

              <label>
                <span className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-600">
                  <span>Expected Delivery Date</span>
                  <span className="text-[10px] text-emerald-700 font-bold lowercase">
                    auto-calculated from days
                  </span>
                </span>
                <input
                  type="date"
                  value={form.expectedDeliveryDate || ""}
                  onChange={(e) => {
                    const expVal = e.target.value;
                    let days = form.transitDays;
                    if (form.dispatchDate && expVal) {
                      const d1 = new Date(form.dispatchDate);
                      const d2 = new Date(expVal);
                      if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
                        const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
                        days = Math.max(0, diff);
                      }
                    }
                    setForm({
                      ...form,
                      expectedDeliveryDate: expVal,
                      transitDays: days,
                    });
                  }}
                  className="w-full rounded-xl border-2 border-slate-100 bg-slate-50/50 px-4 py-3 text-sm font-medium outline-none transition focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/20"
                />
              </label>
              <label>
                <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Customer / Party Name
                </span>
                <input
                  type="text"
                  placeholder="e.g. V-Trans / TCI Freight / Reliance"
                  value={form.partyName || ""}
                  onChange={(e) => setForm({ ...form, partyName: e.target.value })}
                  className="w-full rounded-xl border-2 border-slate-100 bg-slate-50/50 px-4 py-3 text-sm font-medium outline-none transition focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/20"
                />
              </label>

              <label>
                <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Container Size / Type
                </span>
                <select
                  value={form.containerSize || "20_ft"}
                  onChange={(e) => setForm({ ...form, containerSize: e.target.value })}
                  className="w-full rounded-xl border-2 border-slate-100 bg-slate-50/50 px-4 py-3 text-sm font-medium outline-none transition focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/20"
                >
                  <option value="20_ft">20 Feet (20F)</option>
                  <option value="22_ft">22 Feet (22F)</option>
                  <option value="40_ft">40 Feet (40F)</option>
                  <option value="40_ft_hc">40 Feet High Cube (40HC)</option>
                  <option value="32_ft">32 Feet Single/Multi</option>
                  <option value="other">Other</option>
                </select>
              </label>

              <label>
                <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Lorry Ownership
                </span>
                <select
                  value={form.ownerType || "owned"}
                  onChange={(e) => {
                    const isMarket = e.target.value === "market";
                    setForm({
                      ...form,
                      ownerType: e.target.value,
                      ownerName: isMarket ? (form.ownerName === "BHUMI CONTAINER SERVICE" ? "" : form.ownerName) : "BHUMI CONTAINER SERVICE",
                    });
                  }}
                  className="w-full rounded-xl border-2 border-slate-100 bg-slate-50/50 px-4 py-3 text-sm font-medium outline-none transition focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/20"
                >
                  <option value="owned">Company Owned (BHUMI)</option>
                  <option value="market">Market / Attached Lorry</option>
                </select>
              </label>

              <label>
                <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Lorry Owner / Transporter Name
                </span>
                <input
                  type="text"
                  placeholder="e.g. BHUMI CONTAINER SERVICE or Transporter"
                  value={form.ownerName || ""}
                  onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
                  className="w-full rounded-xl border-2 border-slate-100 bg-slate-50/50 px-4 py-3 text-sm font-medium outline-none transition focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/20"
                />
              </label>

              <label>
                <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Total Trip Freight (₹)
                </span>
                <input
                  type="number"
                  placeholder="0"
                  value={form.rate ?? ""}
                  onChange={(e) => {
                    const r = Number(e.target.value) || 0;
                    const adv = Number(form.advanceAmount) || 0;
                    setForm({
                      ...form,
                      rate: e.target.value === "" ? "" : r,
                      balanceAmount: Math.max(r - adv, 0),
                    });
                  }}
                  className="w-full rounded-xl border-2 border-slate-100 bg-slate-50/50 px-4 py-3 text-sm font-medium outline-none transition focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/20"
                />
              </label>

              <label>
                <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Advance Paid to Driver (₹)
                </span>
                <input
                  type="number"
                  placeholder="0"
                  value={form.advanceAmount ?? ""}
                  onChange={(e) => {
                    const adv = Number(e.target.value) || 0;
                    const r = Number(form.rate) || 0;
                    setForm({
                      ...form,
                      advanceAmount: e.target.value === "" ? "" : adv,
                      balanceAmount: Math.max(r - adv, 0),
                    });
                  }}
                  className="w-full rounded-xl border-2 border-slate-100 bg-slate-50/50 px-4 py-3 text-sm font-medium outline-none transition focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/20"
                />
              </label>

              <label>
                <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Advance Payment Date
                </span>
                <input
                  type="date"
                  value={form.advanceDate || ""}
                  onChange={(e) => setForm({ ...form, advanceDate: e.target.value })}
                  className="w-full rounded-xl border-2 border-slate-100 bg-slate-50/50 px-4 py-3 text-sm font-medium outline-none transition focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/20"
                />
              </label>

              <label>
                <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Balance Freight Payable (₹)
                </span>
                <input
                  type="number"
                  readOnly
                  placeholder="0"
                  value={form.balanceAmount ?? ""}
                  className="w-full rounded-xl border-2 border-slate-200 bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 outline-none cursor-not-allowed"
                />
              </label>

              <label>
                <span className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-600">
                  <span>POD / Bilty Receiving Date</span>
                  <span className="text-[10px] font-bold text-slate-400 lowercase italic">
                    (Fill after delivery • leave empty for new dispatch)
                  </span>
                </span>
                <input
                  type="date"
                  value={form.podDate || ""}
                  onChange={(e) => setForm({ ...form, podDate: e.target.value })}
                  className="w-full rounded-xl border-2 border-slate-100 bg-slate-50/50 px-4 py-3 text-sm font-medium outline-none transition focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/20"
                />
              </label>

              <label>
                <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Remarks & Trip Instructions
                </span>
                <input
                  type="text"
                  value={form.remarks || ""}
                  onChange={(e) =>
                    setForm({ ...form, remarks: e.target.value })
                  }
                  className="w-full rounded-xl border-2 border-slate-100 bg-slate-50/50 px-4 py-3 text-sm font-medium outline-none transition focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/20"
                />
              </label>
              {editing && (
                <label className="sm:col-span-2">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Trip Status
                  </span>
                  <select
                    value={form.status || "planned"}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value })
                    }
                    className="w-full rounded-xl border-2 border-slate-100 bg-slate-50/50 px-4 py-3 text-sm font-bold outline-none transition focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/20 text-slate-900"
                  >
                    <option value="planned">Planned (Ready for loading)</option>
                    <option value="dispatched">
                      Dispatched (On Highway)
                    </option>
                    <option value="in_transit">In Transit</option>
                    <option value="delivered">
                      Delivered (Unloaded)
                    </option>
                    <option value="completed">
                      Completed & Settled
                    </option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </label>
              )}
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
    </div>
  );
}
