"use client";
import { useEffect, useState } from "react";
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
import BiltyPrintModal from "./BiltyPrintModal";
import { exportToExcelProfessional } from "@/src/lib/excelExport";

function id(x) {
  return x?._id || x?.id;
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

export default function TripsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const activeCompany = useActiveCompany();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [viewMode, setViewMode] = useState("cards");
  const [printBiltyTrip, setPrintBiltyTrip] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});
  const [options, setOptions] = useState({
    bookings: [],
    vehicles: [],
    drivers: [],
    cities: [],
    lrs: [],
  });

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
        const [r, bk, vh, dr, ci, lr] = await Promise.all([
          getTrips(),
          api.get("/bookings").catch(() => ({ data: { data: [] } })),
          api.get("/vehicles").catch(() => ({ data: { data: [] } })),
          api.get("/drivers").catch(() => ({ data: { data: [] } })),
          api.get("/cities").catch(() => ({ data: { data: [] } })),
          api.get("/lr-bilties").catch(() => ({ data: { data: [] } })),
        ]);
        setRows(r?.data ?? []);
        setOptions({
          bookings: bk.data?.data || [],
          vehicles: vh.data?.data || [],
          drivers: dr.data?.data || [],
          cities: ci.data?.data || [],
          lrs: lr.data?.data || [],
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

  // Handle URL pre-fill from LR Bilty "Assign to Trip"
  useEffect(() => {
    if (searchParams && searchParams.get("autoOpenAdd") === "true") {
      const today = new Date().toISOString().split("T")[0];
      const autoForm = {
        tripNumber: `TRIP-${new Date().getFullYear()}-001`,
        dispatchDate: today,
      };
      [
        "bookingId",
        "lrBiltyId",
        "vehicleId",
        "driverId",
        "fromCityId",
        "toCityId",
      ].forEach((k) => {
        const v = searchParams.get(k);
        if (v) autoForm[k] = v;
      });
      setForm(autoForm);
      setEditing(false);
      setShow(true);
      router.replace(pathname);

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
  }, [searchParams, pathname, router]);

  const handleOpenCreate = () => {
    setEditing(false);
    const today = new Date().toISOString().split("T")[0];
    setForm({
      tripNumber: "",
      dispatchDate: today,
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

  const handleBookingChange = (bId) => {
    const b = options.bookings.find((x) => id(x) === bId);
    if (b) {
      setForm({
        ...form,
        bookingId: bId,
        vehicleId: id(b.vehicleId),
        driverId: id(b.driverId),
        fromCityId: id(b.fromCityId),
        toCityId: id(b.toCityId),
      });
    } else {
      setForm({ ...form, bookingId: bId });
    }
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
        await createTrip({ ...form });
        toast.success("Trip created successfully");
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
    if (
      statusFilter &&
      String(r.status || "").toLowerCase() !== statusFilter.toLowerCase()
    )
      return false;
    if (!search) return true;
    return JSON.stringify(r).toLowerCase().includes(search.toLowerCase());
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  // Operational KPI calculations
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

  const handleExportExcel = () => {
    const columns = [
      { key: "tripNumber", label: "Trip Number" },
      { key: "status", label: "Status" },
      { key: "dispatchDate", label: "Dispatch Date", type: "date" },
      { key: "vehicleNumber", label: "Vehicle Number" },
      { key: "vehicleType", label: "Vehicle Type" },
      { key: "driverName", label: "Driver Name" },
      { key: "driverPhone", label: "Driver Phone" },
      { key: "fromCity", label: "From City" },
      { key: "toCity", label: "To City" },
      { key: "bookingNumber", label: "Booking Ref" },
      { key: "lrNumber", label: "LR / Bilty No" },
      { key: "cargo", label: "Cargo / Weight" },
      { key: "customerFreight", label: "Customer Freight (₹)", type: "number" },
      { key: "vendorFreight", label: "Vendor Freight (₹)", type: "number" },
    ];

    const dataRows = filtered.map((r) => ({
      tripNumber: r.tripNumber,
      status: String(r.status || "planned").toUpperCase(),
      dispatchDate: r.dispatchDate,
      vehicleNumber: r.vehicleId?.vehicleNumber || "—",
      vehicleType: r.vehicleId?.vehicleType || "—",
      driverName: r.driverId?.name || "—",
      driverPhone: r.driverId?.phone || "—",
      fromCity: r.fromCityId?.name || r.fromCityId?.cityName || "—",
      toCity: r.toCityId?.name || r.toCityId?.cityName || "—",
      bookingNumber: r.bookingId?.bookingNumber || "—",
      lrNumber: r.lrBiltyId?.lrNumber || r.bookingId?.lrNumber || "—",
      cargo: r.bookingId?.quantity
        ? `${r.bookingId.quantity} ${r.bookingId.unit || "TON"}`
        : "—",
      customerFreight: Number(r.bookingId?.billingRate || 0),
      vendorFreight: Number(r.bookingId?.hireRate || 0),
    }));

    exportToExcelProfessional({
      title: "Fleet Dispatches & Trip Register",
      subtitle: `${activeCompany?.name || "Fleet Enterprise TMS"} • Central Logistics Control Tower`,
      filename: `${activeCompany?.code || "TMS"}_Trips_Register`,
      sheetName: "Trips",
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

      {/* Transport Dispatch KPI Ribbon */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Total Trips
            </span>
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-slate-100 text-slate-700">
              <Layers className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="mt-1 font-mono text-2xl font-black text-slate-900">
            {rows.length}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            All registered trips
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
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
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Dispatched
            </span>
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-blue-50 text-blue-600">
              <Navigation className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="mt-1 font-mono text-2xl font-black text-blue-600">
            {dispatchedCount}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">Departed from hub</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
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
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
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
        </div>
      </div>

      {/* Main Container */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
        {/* Quick Status Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
          <button
            onClick={() => {
              setStatusFilter("");
              setPage(1);
            }}
            className={`rounded-full px-3 py-1 text-xs font-bold transition-all whitespace-nowrap ${
              !statusFilter
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All Trips ({rows.length})
          </button>
          {[
            {
              label: "In Transit",
              value: "in_transit",
              count: inTransitCount,
              color: "emerald",
            },
            {
              label: "Dispatched",
              value: "dispatched",
              count: dispatchedCount,
              color: "blue",
            },
            {
              label: "Delivered",
              value: "delivered",
              count: deliveredCount,
              color: "amber",
            },
            {
              label: "Planned",
              value: "planned",
              count: plannedCount,
              color: "slate",
            },
            {
              label: "Completed",
              value: "completed",
              count: completedCount,
              color: "indigo",
            },
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
          </div>
        ) : viewMode === "cards" ? (
          /* Transport Fleet Journey Cards View */
          <div className="p-4 sm:p-6 bg-slate-50/50">
            <div className="grid gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-3">
              {pageRows.map((r) => {
                const vehicleNum =
                  r.vehicleId?.vehicleNumber || id(r.vehicleId) || "—";
                const vehicleType = r.vehicleId?.vehicleType || "Truck";
                const driverName =
                  r.driverId?.name || id(r.driverId) || "Driver Assigned";
                const driverPhone = r.driverId?.phone || "";
                const fromCity = r.fromCityId?.name || "Origin";
                const toCity = r.toCityId?.name || "Destination";
                const st = r.status?.toLowerCase() || "planned";
                const hasLR =
                  !!r.lrBiltyId ||
                  !!r.bookingId?.lrBiltyId ||
                  !!r.bookingId?.lrNumber;

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
                      <div>
                        <Badge value={r.status} />
                      </div>
                    </div>

                    {/* Route Journey Visualizer Track */}
                    <div className="my-3.5 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                        <span className="flex items-center gap-1 text-emerald-700">
                          <MapPin className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          {fromCity}
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          {st === "in_transit"
                            ? "On Highway"
                            : st === "delivered"
                              ? "Delivered"
                              : "Route Flow"}
                        </span>
                        <span className="flex items-center gap-1 text-indigo-700">
                          <Navigation className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
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
                        {r.startingOdometer ? (
                          <span>
                            Odo: <b>{r.startingOdometer} km</b>
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* Driver & Consignment Info */}
                    <div className="space-y-1.5 text-xs">
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

                      <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5">
                        <span className="text-slate-500 font-medium">
                          Consignment Indent:
                        </span>
                        <span className="font-mono font-bold text-slate-800">
                          {r.bookingId?.bookingNumber || "Direct Dispatch"}
                        </span>
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

                      {hasLR && user?.role !== "driver" && (
                        <button
                          onClick={() => setPrintBiltyTrip(r)}
                          className="inline-flex items-center gap-1 rounded-xl border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-amber-800 hover:bg-amber-100 transition"
                          title="Print Official Lorry Receipt (Bilty)"
                        >
                          <Printer className="h-3.5 w-3.5 text-amber-600" />
                          LR
                        </button>
                      )}

                      {st === "completed" && user?.role !== "driver" && (
                        <button
                          onClick={() => {
                            const bId = id(r.bookingId);
                            const lrId = id(r.lrBiltyId);
                            const pId =
                              id(r.bookingId?.billingPartyId) ||
                              id(r.lrBiltyId?.partyId) ||
                              "";
                            const rate = r.bookingId?.billingRate || 2500;
                            const qty = r.bookingId?.quantity || 15;
                            const unit = r.bookingId?.unit || "MT";
                            const freight = qty * rate;
                            const today = new Date()
                              .toISOString()
                              .split("T")[0];

                            router.push(
                              `/customer-invoices?autoOpenAdd=true&bookingId=${bId}&lrBiltyId=${lrId}&partyId=${pId}&freightRate=${rate}&quantity=${qty}&unit=${unit}&freightAmount=${freight}&taxableAmount=${freight}&taxPercent=5&taxAmount=${Math.round(freight * 0.05)}&paymentStatus=unpaid&invoiceDate=${today}`,
                            );
                          }}
                          className="inline-flex items-center gap-1 rounded-xl border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition shadow-2xs"
                          title="Generate Commercial Customer Invoice"
                        >
                          <Receipt className="h-3.5 w-3.5 text-emerald-600" />
                          Bill
                        </button>
                      )}

                      {user?.role !== "driver" && r.vehicleId && (
                        <button
                          onClick={() =>
                            router.push(
                              `/fuels?autoOpenAdd=true&vehicleId=${id(r.vehicleId)}&driverId=${id(r.driverId)}&bookingId=${id(r.bookingId)}`,
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
                              `/trip-expenses?autoOpenAdd=true&tripId=${id(r)}&vehicleId=${id(r.vehicleId)}&driverId=${id(r.driverId)}`,
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
                              lrBiltyId: id(r.lrBiltyId),
                              vehicleId: id(r.vehicleId),
                              driverId: id(r.driverId),
                              fromCityId: id(r.fromCityId),
                              toCityId: id(r.toCityId),
                              status: r.status,
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
              <thead className="bg-[#0b1220] text-slate-200">
                <tr>
                  {[
                    "Trip No",
                    "Highway Route (From ➔ To)",
                    "Truck No",
                    "Assigned Driver",
                    "Indent / LR",
                    "Dispatch Date",
                    "Status",
                  ].map((label) => (
                    <th
                      key={label}
                      className="whitespace-nowrap px-4 py-3.5 text-[11px] font-black uppercase tracking-wider text-slate-300"
                    >
                      {label}
                    </th>
                  ))}
                  <th className="px-4 py-3.5 text-[11px] font-black uppercase tracking-wider text-slate-300 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pageRows.map((r, i) => (
                  <tr
                    key={id(r)}
                    className="hover:bg-amber-50/30 transition-colors"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-bold text-slate-900">
                      <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-mono text-xs font-bold text-emerald-800">
                        <Route className="h-3.5 w-3.5 text-emerald-600" />
                        {r.tripNumber}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs font-bold text-slate-800">
                      <div className="flex items-center gap-1.5">
                        <span className="flex items-center gap-1 text-emerald-700">
                          <MapPin className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          {r.fromCityId?.name || "Origin Hub"}
                        </span>
                        <ArrowRight className="h-3 w-3 text-slate-400 shrink-0" />
                        <span className="flex items-center gap-1 text-indigo-700">
                          <Navigation className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                          {r.toCityId?.name || "Destination"}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-600">
                      {r.vehicleId?.vehicleNumber ? (
                        <span className="inline-flex items-center rounded border border-amber-400 bg-amber-100/90 px-2 py-0.5 font-mono text-xs font-black tracking-wider text-slate-900 shadow-2xs">
                          <span className="mr-1.5 rounded-xs bg-blue-700 px-1 py-0.2 text-[8px] font-black text-white uppercase tracking-tighter">
                            IND
                          </span>
                          {r.vehicleId.vehicleNumber}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-700">
                      <div className="flex items-center gap-2">
                        {r.driverId?.photo ? (
                          <img
                            src={`${process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "https://narmada-road-lines.onrender.com"}${r.driverId.photo}`}
                            alt={r.driverId?.name || "Driver"}
                            className="h-7 w-7 rounded-full object-cover border border-slate-200 shadow-2xs shrink-0"
                          />
                        ) : (
                          <div className="grid h-7 w-7 place-items-center rounded-full bg-slate-100 text-slate-500 border border-slate-200 shrink-0">
                            <User className="h-3.5 w-3.5" />
                          </div>
                        )}
                        <div>
                          <span className="font-bold text-slate-800 block leading-tight">
                            {r.driverId?.name || id(r.driverId) || "—"}
                          </span>
                          {r.driverId?.phone && (
                            <a
                              href={`tel:${r.driverId.phone}`}
                              className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.2 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 transition mt-0.5"
                              title={`Call Driver: ${r.driverId.phone}`}
                            >
                              <Phone className="h-2.5 w-2.5 text-emerald-600" />
                              {r.driverId.phone}
                            </a>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-600">
                      {r.bookingId?.bookingNumber ? (
                        <span className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 font-mono text-xs font-bold text-blue-700">
                          {r.bookingId.bookingNumber}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-mono text-slate-600">
                      {displayDate(r.dispatchDate)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-600">
                      <Badge value={r.status} />
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

                        {/* Print Bilty Button (Hidden for Driver) */}
                        {user?.role !== "driver" &&
                          (r.lrBiltyId ||
                            r.bookingId?.lrBiltyId ||
                            r.bookingId?.lrNumber) && (
                            <button
                              onClick={() => setPrintBiltyTrip(r)}
                              className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 shadow-2xs hover:bg-amber-100 transition cursor-pointer"
                              title="Print Official Lorry Receipt (LR / Bilty)"
                            >
                              <Printer className="h-3.5 w-3.5 text-amber-600" />
                              LR
                            </button>
                          )}

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
                                title="Generate Customer Invoice"
                                className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 shadow-2xs transition-all hover:bg-emerald-100"
                                onClick={() => {
                                  const bId = id(r.bookingId);
                                  const lrId = id(r.lrBiltyId);
                                  const pId =
                                    id(r.bookingId?.billingPartyId) ||
                                    id(r.lrBiltyId?.partyId) ||
                                    "";
                                  const rate = r.bookingId?.billingRate || 2500;
                                  const qty = r.bookingId?.quantity || 15;
                                  const unit = r.bookingId?.unit || "MT";
                                  const freight = qty * rate;
                                  const today = new Date()
                                    .toISOString()
                                    .split("T")[0];

                                  router.push(
                                    `/customer-invoices?autoOpenAdd=true&bookingId=${bId}&lrBiltyId=${lrId}&partyId=${pId}&freightRate=${rate}&quantity=${qty}&unit=${unit}&freightAmount=${freight}&taxableAmount=${freight}&taxPercent=5&taxAmount=${Math.round(freight * 0.05)}&paymentStatus=unpaid&invoiceDate=${today}`,
                                  );
                                }}
                              >
                                <Receipt className="h-3 w-3 text-emerald-600" />
                                Bill
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
                                  lrBiltyId: id(r.lrBiltyId),
                                  vehicleId: id(r.vehicleId),
                                  driverId: id(r.driverId),
                                  fromCityId: id(r.fromCityId),
                                  toCityId: id(r.toCityId),
                                  status: r.status,
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
            viewing.bookingId?.supplyOrderId?.consignorId ||
            viewing.lrBiltyId?.consignorId ||
            null;

          const consignee =
            viewing.bookingId?.supplyOrderId?.consigneeId ||
            viewing.lrBiltyId?.consigneeId ||
            null;

          const productName =
            viewing.bookingId?.productId?.name ||
            viewing.lrBiltyId?.productId?.name ||
            viewing.bookingId?.article ||
            "General Commercial Cargo";

          const qty = Number(
            viewing.bookingId?.quantity || viewing.lrBiltyId?.quantity || 0,
          );
          const unit =
            viewing.bookingId?.unit || viewing.lrBiltyId?.unit || "MT";
          const billingRate = Number(viewing.bookingId?.billingRate || 0);
          const totalFreight =
            qty > 0 && billingRate > 0
              ? (qty * billingRate).toLocaleString("en-IN")
              : null;
          const isOwnFleet =
            viewing.vehicleId?.ownerType === "owned" ||
            !viewing.bookingId?.transporterId;
          const tripKm =
            viewing.endingOdometer && viewing.startingOdometer
              ? `${viewing.endingOdometer - viewing.startingOdometer} km`
              : viewing.startingOdometer
                ? `${viewing.startingOdometer} km (Starting Odo)`
                : "N/A";

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
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">
                          {viewing.tripNumber || "Trip Overview"}
                        </h3>
                        <Badge value={viewing.status} />
                      </div>
                      <p className="mt-0.5 text-xs font-semibold text-slate-500">
                        Indent:{" "}
                        <span className="font-mono text-slate-800 font-bold">
                          {viewing.bookingId?.bookingNumber ||
                            "Direct Dispatch"}
                        </span>
                        {" • "}
                        LR / Bilty:{" "}
                        <span className="font-mono text-slate-800 font-bold">
                          {viewing.bookingId?.lrNumber ||
                            viewing.lrBiltyId?.lrNumber ||
                            "N/A"}
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
                  {/* 1. Highway Route & Transit Bar */}
                  <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-5">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                      Highway Route & Journey Lifecycle
                    </span>
                    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 rounded-lg bg-emerald-100/80 px-3 py-1 font-bold text-emerald-900 text-xs">
                          <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                          {viewing.fromCityId?.name || "Origin Hub"}
                        </div>
                        <ArrowRight className="h-4 w-4 text-slate-400" />
                        <div className="flex items-center gap-1.5 rounded-lg bg-indigo-100/80 px-3 py-1 font-bold text-indigo-900 text-xs">
                          <Navigation className="h-3.5 w-3.5 text-indigo-600" />
                          {viewing.toCityId?.name || "Destination Hub"}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
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
                            Delivery Date
                          </span>
                          <span className="font-bold text-slate-800">
                            {viewing.deliveryDate
                              ? displayDate(viewing.deliveryDate)
                              : "In Transit / Pending"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">
                            Total Run / Distance
                          </span>
                          <span className="font-mono font-bold text-slate-900">
                            {tripKm}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2. Grid Sections */}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {/* Vehicle */}
                    <div className="flex flex-col gap-1.5 p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Vehicle & Fleet
                      </span>
                      <div className="text-sm font-bold text-slate-900">
                        {viewing.vehicleId?.vehicleNumber || "—"}
                      </div>
                      <div className="text-xs font-semibold text-slate-500">
                        {viewing.vehicleId?.vehicleType || "Commercial Truck"} •{" "}
                        {isOwnFleet ? "Company Owned Fleet" : "Market Hired"}
                      </div>
                    </div>

                    {/* Driver */}
                    <div className="flex flex-col gap-1.5 p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Assigned Driver
                      </span>
                      <div className="text-sm font-bold text-slate-900">
                        {viewing.driverId?.name || "—"}
                      </div>
                      {viewing.driverId?.phone && (
                        <a
                          href={`tel:${viewing.driverId.phone}`}
                          className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline"
                        >
                          <Phone className="h-3 w-3 text-emerald-600" />
                          {viewing.driverId.phone}
                        </a>
                      )}
                    </div>

                    {/* Odometer Details */}
                    <div className="flex flex-col gap-1.5 p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Odometer Readings
                      </span>
                      <div className="text-xs font-bold text-slate-800">
                        Start:{" "}
                        <span className="font-mono font-bold">
                          {viewing.startingOdometer
                            ? `${viewing.startingOdometer} km`
                            : "—"}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-800">
                        End:{" "}
                        <span className="font-mono font-bold">
                          {viewing.endingOdometer
                            ? `${viewing.endingOdometer} km`
                            : "Pending Settlement"}
                        </span>
                      </div>
                    </div>

                    {/* Consignment & Cargo */}
                    <div className="flex flex-col gap-1.5 p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Commodity / Product
                      </span>
                      <div className="text-sm font-bold text-slate-900 break-words">
                        {productName}
                      </div>
                      <div className="text-xs font-semibold text-slate-500">
                        Cargo Weight:{" "}
                        <span className="font-bold text-slate-800">
                          {qty} {unit}
                        </span>
                        {viewing.bookingId?.unloadingWeight && (
                          <span>
                            {" • "}Unload:{" "}
                            <span className="font-bold text-emerald-700">
                              {viewing.bookingId.unloadingWeight} {unit}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Consignor (Shipper) */}
                    <div className="flex flex-col gap-1.5 p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Consignor (Shipper)
                      </span>
                      <div className="text-sm font-bold text-slate-900 break-words">
                        {consignor?.name || "Direct Party Pickup"}
                      </div>
                      {consignor?.phone && (
                        <div className="text-xs text-slate-500 font-medium">
                          Ph: {consignor.phone}
                        </div>
                      )}
                    </div>

                    {/* Consignee (Receiver) */}
                    <div className="flex flex-col gap-1.5 p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Consignee (Receiver)
                      </span>
                      <div className="text-sm font-bold text-slate-900 break-words">
                        {consignee?.name ||
                          viewing.bookingId?.billingPartyId?.name ||
                          "Destination Consignee"}
                      </div>
                      {consignee?.phone && (
                        <div className="text-xs text-slate-500 font-medium">
                          Ph: {consignee.phone}
                        </div>
                      )}
                    </div>

                    {/* Billing Party */}
                    <div className="flex flex-col gap-1.5 p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Billing Party (Customer)
                      </span>
                      <div className="text-sm font-bold text-slate-900 break-words">
                        {viewing.bookingId?.billingPartyId?.name || "N/A"}
                      </div>
                      {viewing.bookingId?.billingPartyId?.phone && (
                        <div className="text-xs text-slate-500 font-medium">
                          Ph: {viewing.bookingId.billingPartyId.phone}
                        </div>
                      )}
                    </div>

                    {/* Commercial Billing Freight */}
                    <div className="flex flex-col gap-1.5 p-4 rounded-xl bg-emerald-50/50 border border-emerald-200/80 shadow-2xs">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
                        Customer Freight
                      </span>
                      <div className="text-sm font-extrabold text-emerald-950">
                        {billingRate > 0
                          ? `₹${billingRate.toLocaleString("en-IN")} / ${unit}`
                          : "Rate Not Set"}
                      </div>
                      {totalFreight && (
                        <div className="text-xs font-bold text-emerald-700">
                          Total Est: ₹{totalFreight}
                        </div>
                      )}
                    </div>

                    {/* Transporter / Market Freight */}
                    <div className="flex flex-col gap-1.5 p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Transporter / Fleet Type
                      </span>
                      <div className="text-sm font-bold text-slate-900 break-words">
                        {isOwnFleet
                          ? "Company Owned Fleet"
                          : viewing.bookingId?.transporterId?.vendorName ||
                            "Market Transporter"}
                      </div>
                      <div className="text-xs font-medium text-slate-500">
                        {isOwnFleet
                          ? "Own Truck (No Vendor Hire Freight)"
                          : `Hire Rate: ₹${viewing.bookingId?.hireRate || 0}`}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex shrink-0 items-center justify-between border-t border-slate-100 bg-white px-8 py-5 rounded-b-[2rem]">
                  {user?.role !== "driver" &&
                  (viewing.lrBiltyId ||
                    viewing.bookingId?.lrBiltyId ||
                    viewing.bookingId?.lrNumber) ? (
                    <button
                      onClick={() => {
                        const targetTrip = viewing;
                        setViewing(null);
                        setPrintBiltyTrip(targetTrip);
                      }}
                      className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-black text-slate-950 shadow-md hover:bg-amber-400 transition cursor-pointer"
                    >
                      <Printer className="h-4 w-4" />
                      Print Official Lorry Receipt (Bilty)
                    </button>
                  ) : (
                    <div />
                  )}

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
              <label>
                <span className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-600">
                  <span>
                    Trip Number <span className="text-red-500">*</span>
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
              <label>
                <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Booking <span className="text-red-500">*</span>
                </span>
                <select
                  value={form.bookingId || ""}
                  onChange={(e) => handleBookingChange(e.target.value)}
                  required
                  className="w-full rounded-xl border-2 border-slate-100 bg-slate-50/50 px-4 py-3 text-sm font-medium outline-none transition focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/20"
                >
                  <option value="">Select Booking...</option>
                  {options.bookings.map((o) => (
                    <option key={id(o)} value={id(o)}>
                      {o.bookingNumber}{" "}
                      {o.billingPartyId?.name
                        ? `— ${o.billingPartyId.name}`
                        : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Vehicle <span className="text-red-500">*</span>
                </span>
                <select
                  value={form.vehicleId || ""}
                  onChange={(e) =>
                    setForm({ ...form, vehicleId: e.target.value })
                  }
                  required
                  className="w-full rounded-xl border-2 border-slate-100 bg-slate-50/50 px-4 py-3 text-sm font-medium outline-none transition focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/20"
                >
                  <option value="">Select Vehicle...</option>
                  {options.vehicles.map((o) => (
                    <option key={id(o)} value={id(o)}>
                      {o.vehicleNumber}{" "}
                      {o.vehicleType ? `(${o.vehicleType})` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Driver <span className="text-red-500">*</span>
                </span>
                <select
                  value={form.driverId || ""}
                  onChange={(e) =>
                    setForm({ ...form, driverId: e.target.value })
                  }
                  required
                  className="w-full rounded-xl border-2 border-slate-100 bg-slate-50/50 px-4 py-3 text-sm font-medium outline-none transition focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/20"
                >
                  <option value="">Select Driver...</option>
                  {options.drivers.map((o) => (
                    <option key={id(o)} value={id(o)}>
                      {o.name} {o.phone ? `(${o.phone})` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
                  From City <span className="text-red-500">*</span>
                </span>
                <select
                  value={form.fromCityId || ""}
                  onChange={(e) =>
                    setForm({ ...form, fromCityId: e.target.value })
                  }
                  required
                  className="w-full rounded-xl border-2 border-slate-100 bg-slate-50/50 px-4 py-3 text-sm font-medium outline-none transition focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/20"
                >
                  <option value="">Select City...</option>
                  {options.cities.map((o) => (
                    <option key={id(o)} value={id(o)}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
                  To City <span className="text-red-500">*</span>
                </span>
                <select
                  value={form.toCityId || ""}
                  onChange={(e) =>
                    setForm({ ...form, toCityId: e.target.value })
                  }
                  required
                  className="w-full rounded-xl border-2 border-slate-100 bg-slate-50/50 px-4 py-3 text-sm font-medium outline-none transition focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/20"
                >
                  <option value="">Select City...</option>
                  {options.cities.map((o) => (
                    <option key={id(o)} value={id(o)}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
                  LR / Bilty
                </span>
                <select
                  value={form.lrBiltyId || ""}
                  onChange={(e) =>
                    setForm({ ...form, lrBiltyId: e.target.value })
                  }
                  className="w-full rounded-xl border-2 border-slate-100 bg-slate-50/50 px-4 py-3 text-sm font-medium outline-none transition focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/20"
                >
                  <option value="">Select LR...</option>
                  {options.lrs.map((o) => (
                    <option key={id(o)} value={id(o)}>
                      {o.lrNumber}{" "}
                      {o.partyId?.name ? `— ${o.partyId.name}` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Dispatch Date <span className="text-red-500">*</span>
                </span>
                <input
                  type="date"
                  value={form.dispatchDate || ""}
                  onChange={(e) =>
                    setForm({ ...form, dispatchDate: e.target.value })
                  }
                  required
                  className="w-full rounded-xl border-2 border-slate-100 bg-slate-50/50 px-4 py-3 text-sm font-medium outline-none transition focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/20"
                />
              </label>
              <label>
                <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Starting Odometer
                </span>
                <input
                  type="number"
                  value={form.startingOdometer || ""}
                  onChange={(e) =>
                    setForm({ ...form, startingOdometer: e.target.value })
                  }
                  className="w-full rounded-xl border-2 border-slate-100 bg-slate-50/50 px-4 py-3 text-sm font-medium outline-none transition focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/20"
                />
              </label>
              <label>
                <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Remarks
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
                    Trip Status (Lifecycle)
                  </span>
                  <select
                    value={form.status || "planned"}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value })
                    }
                    className="w-full rounded-xl border-2 border-slate-100 bg-slate-50/50 px-4 py-3 text-sm font-bold outline-none transition focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/20 text-slate-900"
                  >
                    <option value="planned">Planned (Awaiting Dispatch)</option>
                    <option value="dispatched">
                      Dispatched (Departed Hub)
                    </option>
                    <option value="in_transit">In Transit (On Highway)</option>
                    <option value="delivered">
                      Delivered (Pending POD / Acknowledged)
                    </option>
                    <option value="completed">
                      Completed (Trip Settled & Closed)
                    </option>
                    <option value="cancelled">Cancelled (Trip Aborted)</option>
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
      {/* Bilty Print Modal */}
      {printBiltyTrip &&
        (() => {
          const rawLr =
            typeof printBiltyTrip.lrBiltyId === "object" &&
            printBiltyTrip.lrBiltyId
              ? printBiltyTrip.lrBiltyId
              : {};
          const booking =
            typeof printBiltyTrip.bookingId === "object" &&
            printBiltyTrip.bookingId
              ? printBiltyTrip.bookingId
              : {};

          const mergedBiltyData = {
            ...rawLr,
            lrNumber:
              rawLr.lrNumber ||
              booking.lrNumber ||
              printBiltyTrip.tripNumber ||
              "LR-2026-001",
            lrDate:
              rawLr.lrDate ||
              printBiltyTrip.dispatchDate ||
              printBiltyTrip.tripStartDate ||
              new Date(),
            invoiceNumber:
              rawLr.invoiceNumber ||
              booking.invoiceNumber ||
              printBiltyTrip.invoiceNumber ||
              "AT-INV-452",
            invoiceDate:
              rawLr.invoiceDate ||
              booking.invoiceDate ||
              printBiltyTrip.invoiceDate ||
              printBiltyTrip.dispatchDate ||
              "2026-10-12",
            article:
              rawLr.article ||
              booking.article ||
              printBiltyTrip.article ||
              booking.productId?.name ||
              "12 Wooden Crates",
            vehicleId:
              printBiltyTrip.vehicleId || rawLr.vehicleId || booking.vehicleId,
            driverId:
              printBiltyTrip.driverId || rawLr.driverId || booking.driverId,
            fromCityId:
              printBiltyTrip.fromCityId ||
              rawLr.fromCityId ||
              booking.fromCityId,
            toCityId:
              printBiltyTrip.toCityId || rawLr.toCityId || booking.toCityId,
            bookingId: booking || rawLr.bookingId,
            productId:
              booking.productId || rawLr.productId || printBiltyTrip.productId,
            consignorId:
              rawLr.consignorId ||
              booking.supplyOrderId?.consignorId ||
              booking.billingPartyId,
            consigneeId:
              rawLr.consigneeId || booking.supplyOrderId?.consigneeId,
            billingPartyId: booking.billingPartyId || rawLr.partyId,
            quantity: Number(booking.quantity || rawLr.quantity || 15),
            unit: booking.unit || rawLr.unit || "MT",
            loadingWeight: Number(
              rawLr.loadingWeight || booking.quantity || 15,
            ),
            billingRate: Number(
              booking.billingRate || rawLr.billingRate || 2500,
            ),
            freightRate: Number(
              booking.billingRate || rawLr.billingRate || 2500,
            ),
            freightAmount:
              Number(booking.billingRate || rawLr.billingRate || 2500) *
              Number(booking.quantity || rawLr.quantity || 15),
          };

          return (
            <BiltyPrintModal
              lrId={
                id(printBiltyTrip.lrBiltyId) ||
                id(printBiltyTrip.bookingId?.lrBiltyId) ||
                printBiltyTrip.bookingId?.lrNumber
              }
              biltyData={mergedBiltyData}
              onClose={() => setPrintBiltyTrip(null)}
            />
          );
        })()}
    </div>
  );
}
