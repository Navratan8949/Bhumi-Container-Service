"use client";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  History,
  Package,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  X,
  Wrench,
  Layers,
  Download,
  IndianRupee,
} from "lucide-react";
import {
  adjustInventoryStock,
  createInventoryItem,
  deleteInventoryItem,
  getInventoryItemHistory,
  getInventoryItems,
  getLowStockInventory,
  stockIn,
  stockOut,
  updateInventoryItem,
} from "@/src/services/inventory.service";
import api from "@/src/services/api";
import { getStoredUser, useActiveCompany } from "@/src/lib/auth";
import { Badge, Button, Empty, Input, Select, Spinner, Textarea } from "./ui";
import { exportToExcelProfessional } from "@/src/lib/excelExport";
const roles = ["super_admin", "admin", "manager"];
const categories = [
  "tyre",
  "lubricant",
  "electrical",
  "spare",
  "filter",
  "liquid",
  "other",
];
const units = [
  "pcs",
  "piece",
  "set",
  "liter",
  "kg",
  "meter",
  "box",
  "pair",
  "other",
];
const unwrap = (x) => x?.data?.data ?? x?.data ?? x ?? [];
const idOf = (x) => x?._id || x?.id || "";
const display = (x) => {
  if (x == null) return "—";
  if (typeof x === "object")
    return (
      x.name || x.code || x.vehicleNumber || x.vendorName || x._id || "Object"
    );
  return String(x);
};
export default function InventoryPage() {
  const user = getStoredUser();
  const activeCompany = useActiveCompany();
  const canWrite = roles.includes(user?.role || "");
  const [items, setItems] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [options, setOptions] = useState({
    vendors: [],
    vehicles: [],
    drivers: [],
  });
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [stockLevelFilter, setStockLevelFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [stockMode, setStockMode] = useState("in");
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [history, setHistory] = useState([]);

  const totalStockValue = useMemo(() => {
    return items.reduce(
      (sum, x) =>
        sum + Number(x.currentStock || 0) * Number(x.purchasePrice || 0),
      0,
    );
  }, [items]);

  const activeCategoriesCount = useMemo(() => {
    return new Set(items.map((x) => x.category).filter(Boolean)).size;
  }, [items]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [itemsResponse, lowResponse, vRes, vehRes, drRes] =
        await Promise.all([
          getInventoryItems(),
          getLowStockInventory(),
          api.get("/vendors").catch(() => ({ data: [] })),
          api.get("/vehicles").catch(() => ({ data: [] })),
          api.get("/drivers").catch(() => ({ data: [] })),
        ]);
      setItems(unwrap(itemsResponse));
      setLowStock(unwrap(lowResponse));
      setOptions({
        vendors: unwrap(vRes),
        vehicles: unwrap(vehRes),
        drivers: unwrap(drRes),
      });
    } catch (e) {
      setError(e?.message || "Failed to load inventory");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);
  const filtered = useMemo(
    () =>
      items.filter((item) => {
        const q = search.trim().toLowerCase();
        if (categoryFilter && item.category !== categoryFilter) return false;
        if (statusFilter && item.status !== statusFilter) return false;
        if (
          stockLevelFilter === "low" &&
          Number(item.currentStock || 0) > Number(item.minimumStock || 0)
        ) {
          return false;
        }
        if (!q) return true;
        const vendorName =
          item.vendorId?.vendorName || item.vendorId?.name || "";
        return [
          item.itemCode,
          item.itemName,
          item.category,
          item.unit,
          vendorName,
          item.description,
        ]
          .map(display)
          .join(" ")
          .toLowerCase()
          .includes(q);
      }),
    [items, search, categoryFilter, statusFilter, stockLevelFilter],
  );
  const saveItem = async (data) => {
    setSaving(true);
    setError("");
    try {
      if (selected) {
        await updateInventoryItem(idOf(selected), data);
        setSuccess("Inventory item updated successfully");
      } else {
        await createInventoryItem(data);
        setSuccess("Inventory item created successfully");
      }
      setModal(null);
      setSelected(null);
      await load();
    } catch (e) {
      setError(e?.message || "Failed to save inventory item");
    } finally {
      setSaving(false);
    }
  };
  const saveStock = async (data) => {
    setSaving(true);
    setError("");
    try {
      if (stockMode === "in") await stockIn(data);
      if (stockMode === "out") await stockOut(data);
      if (stockMode === "adjust") await adjustInventoryStock(data);
      setSuccess("Inventory stock updated successfully");
      setModal(null);
      await load();
    } catch (e) {
      setError(e?.message || "Failed to update stock");
    } finally {
      setSaving(false);
    }
  };
  const remove = async (item) => {
    if (!confirm(`Delete ${item.itemName}?`)) return;
    setError("");
    try {
      await deleteInventoryItem(idOf(item));
      setSuccess("Inventory item deleted successfully");
      await load();
    } catch (e) {
      setError(e?.message || "Failed to delete inventory item");
    }
  };
  const openHistory = async (item) => {
    setSelected(item);
    setModal("history");
    setHistory([]);
    try {
      const response = await getInventoryItemHistory(idOf(item));
      const raw = unwrap(response);
      const list = Array.isArray(raw)
        ? raw
        : raw?.transactions || raw?.history || raw?.data || [];
      setHistory(list);
    } catch (e) {
      setError(e?.message || "Failed to load item history");
    }
  };

  const handleExportExcel = () => {
    const columns = [
      { key: "itemCode", label: "Item Code" },
      { key: "itemName", label: "Item / Spare Name" },
      { key: "category", label: "Category" },
      { key: "unit", label: "Unit" },
      { key: "currentStock", label: "Current Stock", type: "number" },
      { key: "minimumStock", label: "Minimum Stock", type: "number" },
      { key: "purchasePrice", label: "Purchase Price (₹)", type: "number" },
      { key: "stockValue", label: "Stock Value (₹)", type: "number" },
      { key: "status", label: "Stock Status" },
    ];

    const dataRows = items.map((item) => ({
      itemCode: item.itemCode || "—",
      itemName: item.itemName || "—",
      category: String(item.category || "other").toUpperCase(),
      unit: item.unit || "PCS",
      currentStock: Number(item.currentStock || 0),
      minimumStock: Number(item.minimumStock || 0),
      purchasePrice: Number(item.purchasePrice || 0),
      stockValue:
        Number(item.currentStock || 0) * Number(item.purchasePrice || 0),
      status:
        Number(item.currentStock || 0) <= Number(item.minimumStock || 0)
          ? "LOW STOCK"
          : "NORMAL",
    }));

    exportToExcelProfessional({
      title: "Workshop Spares & Fleet Stores Inventory",
      subtitle: `${activeCompany?.name || "Fleet Enterprise TMS"} • Central Yard Stores`,
      filename: `${activeCompany?.code || "TMS"}_Spares_Inventory`,
      sheetName: "Inventory",
      columns,
      rows: dataRows,
    });
  };

  const handleVendorCreated = (newVendor) => {
    setOptions((prev) => ({
      ...prev,
      vendors: [newVendor, ...(prev.vendors || [])],
    }));
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">
            Fleet Yard & Workshop Spares
          </p>
          <h2 className="mt-1 text-2xl font-black text-slate-900">
            Fleet Inventory & Workshop Stores
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Commercial truck tyres, diesel engine oil, lubricants, brake liners,
            filters and hardware stock.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canWrite && (
            <>
              <button
                type="button"
                onClick={() => {
                  setSelected(null);
                  setStockMode("in");
                  setModal("stock");
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 shadow-xs cursor-pointer transition active:scale-95"
                title="Stock In: Receive Spares / Lubricants from Supplier"
              >
                <ArrowDownToLine className="h-4 w-4 text-emerald-600" />
                <span>Stock In</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelected(null);
                  setStockMode("out");
                  setModal("stock");
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-blue-300 bg-blue-50 px-3.5 py-2 text-xs font-bold text-blue-800 hover:bg-blue-100 shadow-xs cursor-pointer transition active:scale-95"
                title="Stock Out: Issue Spares / Lubricants to Truck"
              >
                <ArrowUpFromLine className="h-4 w-4 text-blue-600" />
                <span>Stock Out</span>
              </button>
            </>
          )}
          <Button
            onClick={handleExportExcel}
            className="border border-emerald-600 bg-emerald-700 text-white hover:bg-emerald-600 font-bold shadow-sm cursor-pointer"
            title="Export Spares Inventory to Excel (.xlsx)"
          >
            <Download className="mr-1.5 h-4 w-4 text-emerald-300" /> Export (.xlsx)
          </Button>
          {canWrite && (
            <Button
              onClick={() => {
                setSelected(null);
                setModal("item");
                setError("");
              }}
              className="bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black hover:from-amber-400 hover:to-amber-500 shadow-sm shadow-amber-500/20 cursor-pointer"
            >
              <Plus className="h-4 w-4 stroke-[3]" /> Add Spares Item
            </Button>
          )}
        </div>
      </div>

      {success && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <span>{success}</span>
          <button onClick={() => setSuccess("")}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {error && (
        <div className="flex items-center justify-between rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <button onClick={() => setError("")}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* KPI Stats Overview Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
              <Package className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              TOTAL SPARES
            </span>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900">{items.length}</p>
          <p className="mt-0.5 text-xs text-slate-500 font-medium">Active catalog items</p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
              <IndianRupee className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
              STOCK VALUATION
            </span>
          </div>
          <p className="mt-3 text-2xl font-black text-emerald-950">
            ₹{totalStockValue.toLocaleString("en-IN")}
          </p>
          <p className="mt-0.5 text-xs text-emerald-700 font-medium">Total stores valuation</p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-100 text-amber-700">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
              LOW STOCK
            </span>
          </div>
          <p className="mt-3 text-2xl font-black text-amber-900">{lowStock.length}</p>
          <p className="mt-0.5 text-xs text-amber-700 font-medium">Items below reorder limit</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-purple-50 text-purple-600">
              <Layers className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              CATEGORIES
            </span>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900">{activeCategoriesCount}</p>
          <p className="mt-0.5 text-xs text-slate-500 font-medium">Active spare groups</p>
        </div>
      </div>

      {lowStock.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 border-b border-amber-100 bg-amber-50 px-5 py-3.5">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <h3 className="font-bold text-amber-900 text-sm">Low Stock Alert — Reorder Recommended</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <tbody className="divide-y divide-slate-100">
                {lowStock.slice(0, 8).map((item) => (
                  <tr key={idOf(item)} className="hover:bg-amber-50/30">
                    <td className="px-5 py-2.5 font-semibold font-mono text-xs text-slate-700">{item.itemCode}</td>
                    <td className="px-5 py-2.5 font-bold text-slate-900">{item.itemName}</td>
                    <td className="px-5 py-2.5 text-xs font-semibold text-rose-700">Current: {item.currentStock} {item.unit}</td>
                    <td className="px-5 py-2.5 text-xs text-slate-600">Reorder Threshold: {item.minimumStock} {item.unit}</td>
                    <td className="px-5 py-2.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-black bg-rose-100 text-rose-800">
                        Critical
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Main Spares Card & Toolbar */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Filters Toolbar */}
        <div className="p-4 border-b border-slate-200/80 bg-slate-50/70">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Search & Select Filters */}
            <div className="flex flex-1 flex-wrap items-center gap-2.5">
              {/* Search */}
              <div className="relative flex-1 min-w-[240px] max-w-sm">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search code, item, category, vendor..."
                  className="w-full rounded-xl border border-slate-200 bg-white pl-9.5 pr-8 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 shadow-2xs font-medium"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Category */}
              <div className="w-40">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 shadow-2xs cursor-pointer capitalize"
                >
                  <option value="">All Categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div className="w-32">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 shadow-2xs cursor-pointer"
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              {/* Stock Level Quick Filter */}
              <div className="w-40">
                <select
                  value={stockLevelFilter}
                  onChange={(e) => setStockLevelFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 shadow-2xs cursor-pointer"
                >
                  <option value="all">All Stock Levels</option>
                  <option value="low">⚠️ Low Stock Only</option>
                </select>
              </div>

              {/* Clear button */}
              {(search || categoryFilter || statusFilter || stockLevelFilter !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setCategoryFilter("");
                    setStatusFilter("");
                    setStockLevelFilter("all");
                  }}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 px-2 py-1.5 rounded-lg hover:bg-rose-50 transition cursor-pointer flex items-center gap-1"
                >
                  <X className="h-3.5 w-3.5" />
                  Reset
                </button>
              )}
            </div>

            {/* Right: Counter & Refresh */}
            <div className="flex items-center gap-3 self-end lg:self-auto shrink-0">
              <span className="text-xs font-semibold text-slate-500">
                Showing <strong className="text-slate-800">{filtered.length}</strong> of {items.length} items
              </span>
              <button
                type="button"
                onClick={load}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 shadow-2xs cursor-pointer transition active:scale-95"
                title="Reload spares items"
              >
                <RefreshCcw className="h-3.5 w-3.5 text-slate-500" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid place-items-center py-20">
            <Spinner />
          </div>
        ) : filtered.length === 0 ? (
          <Empty />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#0b1220] text-slate-200">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-300">
                    Code
                  </th>
                  <th className="whitespace-nowrap px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-300">
                    Item Name & Supplier
                  </th>
                  <th className="whitespace-nowrap px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-300">
                    Category
                  </th>
                  <th className="whitespace-nowrap px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-300">
                    Unit
                  </th>
                  <th className="whitespace-nowrap px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-300">
                    Current Stock
                  </th>
                  <th className="whitespace-nowrap px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-300">
                    Price (₹)
                  </th>
                  <th className="whitespace-nowrap px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-300">
                    Total Value (₹)
                  </th>
                  <th className="whitespace-nowrap px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-300">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((item) => {
                  const isLow = Number(item.currentStock || 0) <= Number(item.minimumStock || 0);
                  const totalVal = Number(item.currentStock || 0) * Number(item.purchasePrice || 0);
                  const vendorLabel = item.vendorId?.vendorName || item.vendorId?.name;

                  return (
                    <tr key={idOf(item)} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-black text-slate-800 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                          {item.itemCode}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{item.itemName}</div>
                        {vendorLabel ? (
                          <div className="text-[11px] text-amber-700 font-semibold mt-0.5 flex items-center gap-1">
                            <span>Supplier:</span> {vendorLabel}
                          </div>
                        ) : item.description ? (
                          <div className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5">
                            {item.description}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 capitalize">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold uppercase text-slate-600">
                        {item.unit}
                      </td>
                      <td className="px-4 py-3">
                        {isLow ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-black">
                            <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                            <span>{item.currentStock}</span>
                            <span className="text-[10px] text-rose-500 font-normal">/ Min: {item.minimumStock}</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-black">
                            <span>{item.currentStock}</span>
                            <span className="text-[10px] text-emerald-600 font-normal">/ Min: {item.minimumStock}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-slate-700">
                        ₹{Number(item.purchasePrice || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3 text-xs font-black text-slate-900">
                        ₹{totalVal.toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3">
                        <Badge value={item.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end items-center gap-1">
                          {canWrite && (
                            <>
                              <button
                                title="Stock In: Receive new units"
                                onClick={() => {
                                  setSelected(item);
                                  setStockMode("in");
                                  setModal("stock");
                                }}
                                className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50 cursor-pointer transition"
                              >
                                <ArrowDownToLine className="h-4 w-4" />
                              </button>
                              <button
                                title="Stock Out: Issue to Truck / Driver"
                                onClick={() => {
                                  setSelected(item);
                                  setStockMode("out");
                                  setModal("stock");
                                }}
                                className="rounded-lg p-1.5 text-blue-600 hover:bg-blue-50 cursor-pointer transition"
                              >
                                <ArrowUpFromLine className="h-4 w-4" />
                              </button>
                              <button
                                title="Adjust Stock Quantity"
                                onClick={() => {
                                  setSelected(item);
                                  setStockMode("adjust");
                                  setModal("stock");
                                }}
                                className="rounded-lg p-1.5 text-purple-600 hover:bg-purple-50 cursor-pointer transition"
                              >
                                <RefreshCcw className="h-4 w-4" />
                              </button>
                              <button
                                title="Edit Item Details"
                                onClick={() => {
                                  setSelected(item);
                                  setModal("item");
                                }}
                                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 cursor-pointer transition"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                title="Delete Item"
                                onClick={() => remove(item)}
                                className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 cursor-pointer transition"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          <button
                            title="Stock History & Ledger"
                            onClick={() => openHistory(item)}
                            className="rounded-lg p-1.5 text-amber-700 hover:bg-amber-50 cursor-pointer transition"
                          >
                            <History className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal === "item" && (
        <ItemModal
          initial={selected}
          options={options}
          saving={saving}
          onClose={() => setModal(null)}
          onSave={saveItem}
          onVendorCreated={handleVendorCreated}
        />
      )}
      {modal === "stock" && (
        <StockModal
          mode={stockMode}
          item={selected}
          items={items}
          options={options}
          saving={saving}
          onClose={() => setModal(null)}
          onSave={saveStock}
          onVendorCreated={handleVendorCreated}
        />
      )}
      {modal === "history" && (
        <HistoryModal
          item={selected}
          history={history}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
function ItemModal({ initial, options, saving, onClose, onSave, onVendorCreated }) {
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [form, setForm] = useState(() => ({
    itemCode: initial?.itemCode || "",
    itemName: initial?.itemName || "",
    category: initial?.category || "other",
    unit: initial?.unit || "pcs",
    openingStock: initial?.openingStock ?? 0,
    minimumStock: initial?.minimumStock ?? 0,
    purchasePrice: initial?.purchasePrice ?? 0,
    vendorId: initial?.vendorId?._id || initial?.vendorId || "",
    description: initial?.description || "",
    status: initial?.status || "active",
  }));
  const set = (key, value) => setForm((x) => ({ ...x, [key]: value }));
  return (
    <>
      <Modal
        title={`${initial ? "Edit" : "Add"} Inventory Item`}
        onClose={onClose}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave({
              ...form,
              openingStock: Number(form.openingStock),
              minimumStock: Number(form.minimumStock),
              purchasePrice: Number(form.purchasePrice),
            });
          }}
          className="grid gap-4 sm:grid-cols-2"
        >
          <Field label="Item Code" required>
            <Input
              value={form.itemCode}
              onChange={(e) => set("itemCode", e.target.value)}
              required
              placeholder="LUBE-001"
            />
          </Field>
          <Field label="Item Name" required>
            <Input
              value={form.itemName}
              onChange={(e) => set("itemName", e.target.value)}
              required
              placeholder="Engine Oil"
            />
          </Field>
          <Field label="Category">
            <Select
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
            >
              {categories.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </Select>
          </Field>
          <Field label="Unit">
            <Select
              value={form.unit}
              onChange={(e) => set("unit", e.target.value)}
            >
              {units.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </Select>
          </Field>
          <Field label={initial ? "Opening Stock (unchanged)" : "Opening Stock"}>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.openingStock}
              onChange={(e) => set("openingStock", e.target.value)}
              disabled={!!initial}
            />
          </Field>
          <Field label="Minimum Stock">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.minimumStock}
              onChange={(e) => set("minimumStock", e.target.value)}
            />
          </Field>
          <Field label="Purchase Price">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.purchasePrice}
              onChange={(e) => set("purchasePrice", e.target.value)}
            />
          </Field>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-600">Vendor / Supplier</span>
              <button
                type="button"
                onClick={() => setShowAddVendor(true)}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-300 hover:bg-amber-100 font-bold text-xs cursor-pointer shadow-xs transition-colors"
                title="Create new vendor directly"
              >
                <Plus className="h-3.5 w-3.5" />
                + Add Vendor
              </button>
            </div>
            <Select
              value={form.vendorId}
              onChange={(e) => {
                if (e.target.value === "__add_new__") {
                  setShowAddVendor(true);
                  return;
                }
                set("vendorId", e.target.value);
              }}
            >
              <option value="">Select Vendor / Supplier</option>
              {options?.vendors?.map((v) => (
                <option key={idOf(v)} value={idOf(v)}>
                  {v.vendorName || v.name || idOf(v)}
                </option>
              ))}
              <option value="__add_new__" className="text-amber-700 font-semibold bg-amber-50">
                + Add New Vendor / Supplier...
              </option>
            </Select>
          </div>
          <Field label="Status">
            <Select
              value={form.status}
              onChange={(e) => set("status", e.target.value)}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Description">
              <Textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Optional description"
              />
            </Field>
          </div>
          <ModalActions saving={saving} initial={initial} onClose={onClose} />
        </form>
      </Modal>
      {showAddVendor && (
        <QuickAddVendorModal
          onClose={() => setShowAddVendor(false)}
          onSuccess={(newVendor) => {
            if (onVendorCreated) onVendorCreated(newVendor);
            set("vendorId", idOf(newVendor));
            setShowAddVendor(false);
          }}
        />
      )}
    </>
  );
}
function StockModal({ mode, item, items, options, saving, onClose, onSave, onVendorCreated }) {
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [form, setForm] = useState({
    itemId: item?._id || "",
    quantity: "",
    adjustmentType: "increase",
    transactionDate: new Date().toISOString().slice(0, 10),
    vendorId: "",
    vehicleId: "",
    driverId: "",
    referenceNumber: "",
    purpose: "",
    remarks: "",
  });
  const set = (key, value) => setForm((x) => ({ ...x, [key]: value }));
  const title =
    mode === "in" ? "Stock In" : mode === "out" ? "Stock Out" : "Adjust Stock";
  return (
    <>
      <Modal title={title} onClose={onClose}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const data = { ...form, quantity: Number(form.quantity) };
            if (mode === "adjust") data.adjustmentType = form.adjustmentType;
            onSave(data);
          }}
          className="grid gap-4 sm:grid-cols-2"
        >
          <Field label="Inventory Item" required>
            <Select
              value={form.itemId}
              onChange={(e) => set("itemId", e.target.value)}
              required
              disabled={!!item}
            >
              <option value="">Select item</option>
              {items.map((x) => (
                <option key={idOf(x)} value={idOf(x)}>
                  {x.itemCode} — {x.itemName}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Quantity" required>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={form.quantity}
              onChange={(e) => set("quantity", e.target.value)}
              required
            />
          </Field>
          {mode === "adjust" && (
            <Field label="Adjustment Type" required>
              <Select
                value={form.adjustmentType}
                onChange={(e) => set("adjustmentType", e.target.value)}
              >
                <option value="increase">Increase</option>
                <option value="decrease">Decrease</option>
              </Select>
            </Field>
          )}
          <Field label="Transaction Date">
            <Input
              type="date"
              value={form.transactionDate}
              onChange={(e) => set("transactionDate", e.target.value)}
            />
          </Field>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-600">Vendor / Supplier</span>
              {mode === "in" && (
                <button
                  type="button"
                  onClick={() => setShowAddVendor(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-300 hover:bg-amber-100 font-bold text-xs cursor-pointer shadow-xs transition-colors"
                  title="Create new vendor directly"
                >
                  <Plus className="h-3.5 w-3.5" />
                  + Add Vendor
                </button>
              )}
            </div>
            <Select
              value={form.vendorId}
              onChange={(e) => {
                if (e.target.value === "__add_new__") {
                  setShowAddVendor(true);
                  return;
                }
                set("vendorId", e.target.value);
              }}
            >
              <option value="">Optional Vendor</option>
              {options?.vendors?.map((v) => (
                <option key={idOf(v)} value={idOf(v)}>
                  {v.vendorName || v.name || idOf(v)}
                </option>
              ))}
              {mode === "in" && (
                <option value="__add_new__" className="text-amber-700 font-semibold bg-amber-50">
                  + Add New Vendor / Supplier...
                </option>
              )}
            </Select>
          </div>
          <Field label="Vehicle / Truck">
            <Select
              value={form.vehicleId}
              onChange={(e) => set("vehicleId", e.target.value)}
            >
              <option value="">Optional Truck</option>
              {options?.vehicles?.map((veh) => (
                <option key={idOf(veh)} value={idOf(veh)}>
                  {veh.vehicleNumber || idOf(veh)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Driver / Mechanic">
            <Select
              value={form.driverId}
              onChange={(e) => set("driverId", e.target.value)}
            >
              <option value="">Optional Driver</option>
              {options?.drivers?.map((dr) => (
                <option key={idOf(dr)} value={idOf(dr)}>
                  {dr.name || idOf(dr)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Reference Number">
            <Input
              value={form.referenceNumber}
              onChange={(e) => set("referenceNumber", e.target.value)}
              placeholder="Challan / Bill No"
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Purpose">
              <Input
                value={form.purpose}
                onChange={(e) => set("purpose", e.target.value)}
                placeholder="Maintenance, replacement, etc."
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Remarks">
              <Textarea
                value={form.remarks}
                onChange={(e) => set("remarks", e.target.value)}
              />
            </Field>
          </div>
          <ModalActions saving={saving} onClose={onClose} submitLabel={title} />
        </form>
      </Modal>
      {showAddVendor && (
        <QuickAddVendorModal
          onClose={() => setShowAddVendor(false)}
          onSuccess={(newVendor) => {
            if (onVendorCreated) onVendorCreated(newVendor);
            set("vendorId", idOf(newVendor));
            setShowAddVendor(false);
          }}
        />
      )}
    </>
  );
}
function HistoryModal({ item, history, onClose }) {
  const records = useMemo(() => {
    if (Array.isArray(history)) return history;
    if (Array.isArray(history?.transactions)) return history.transactions;
    if (Array.isArray(history?.history)) return history.history;
    if (Array.isArray(history?.data)) return history.data;
    return [];
  }, [history]);

  return (
    <Modal
      title={
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-700">
            <History className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-black uppercase text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                {item?.itemCode || "ITEM"}
              </span>
              <h3 className="text-base font-black text-slate-900">
                {item?.itemName || "Item"} — Stock Ledger
              </h3>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Current Balance: <strong className="text-slate-800">{item?.currentStock ?? 0} {item?.unit}</strong> • Reorder Limit: {item?.minimumStock ?? 0}
            </p>
          </div>
        </div>
      }
      onClose={onClose}
      wide
    >
      {records.length === 0 ? (
        <div className="text-center py-12 px-4">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
            <History className="h-6 w-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-800">No Transaction History Recorded</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            This item has not had any Stock In, Stock Out, or adjustment movements recorded yet.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#0b1220] text-slate-200 text-xs uppercase font-bold tracking-wider">
              <tr>
                <th className="px-3.5 py-3 whitespace-nowrap">Date</th>
                <th className="px-3.5 py-3 whitespace-nowrap">Type</th>
                <th className="px-3.5 py-3 text-right whitespace-nowrap">Qty</th>
                <th className="px-3.5 py-3 text-center whitespace-nowrap">Movement</th>
                <th className="px-3.5 py-3 whitespace-nowrap">Truck / Driver / Vendor</th>
                <th className="px-3.5 py-3">Purpose & Remarks</th>
                <th className="px-3.5 py-3 whitespace-nowrap">Entered By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {records.map((x, i) => {
                const isPositive =
                  x.transactionType === "stock_in" ||
                  (x.transactionType === "adjustment" &&
                    x.adjustmentType === "increase");
                return (
                  <tr
                    key={idOf(x) || i}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="px-3.5 py-3 text-xs font-semibold text-slate-700 whitespace-nowrap">
                      {x.transactionDate
                        ? new Date(x.transactionDate).toLocaleDateString(
                            "en-IN",
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            },
                          )
                        : "—"}
                    </td>
                    <td className="px-3.5 py-3 whitespace-nowrap">
                      {x.transactionType === "stock_in" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                          📥 Stock In
                        </span>
                      ) : x.transactionType === "stock_out" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-50 text-amber-800 border border-amber-200">
                          📤 Stock Out
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-blue-50 text-blue-700 border border-blue-200">
                          🔄 Adjust ({x.adjustmentType || "Stock"})
                        </span>
                      )}
                    </td>
                    <td className="px-3.5 py-3 text-right font-black whitespace-nowrap">
                      <span
                        className={
                          isPositive ? "text-emerald-700" : "text-amber-800"
                        }
                      >
                        {isPositive ? "+" : "-"}
                        {x.quantity} {item?.unit || ""}
                      </span>
                    </td>
                    <td className="px-3.5 py-3 text-center text-xs whitespace-nowrap">
                      <span className="text-slate-500 font-medium">
                        {x.previousStock}
                      </span>
                      <span className="mx-1.5 text-slate-300">➔</span>
                      <span className="font-black text-slate-900">
                        {x.newStock}
                      </span>
                    </td>
                    <td className="px-3.5 py-3 text-xs">
                      {x.vehicleId?.vehicleNumber && (
                        <span className="inline-flex items-center gap-1 font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded mr-1">
                          🚛 {x.vehicleId.vehicleNumber}
                        </span>
                      )}
                      {x.driverId?.name && (
                        <span className="text-slate-600 block text-[11px]">
                          Driver: {x.driverId.name}
                        </span>
                      )}
                      {x.vendorId?.vendorName && (
                        <span className="text-indigo-700 font-semibold block text-[11px]">
                          Supplier: {x.vendorId.vendorName}
                        </span>
                      )}
                      {!x.vehicleId && !x.driverId && !x.vendorId && (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td
                      className="px-3.5 py-3 text-xs text-slate-600 max-w-sm"
                      title={x.remarks || x.purpose || ""}
                    >
                      {x.purpose ? (
                        <strong className="text-slate-800 block">
                          {x.purpose}
                        </strong>
                      ) : null}
                      {x.remarks ? <span>{x.remarks}</span> : null}
                      {x.referenceNumber ? (
                        <span className="block text-[11px] font-mono text-slate-500 mt-0.5">
                          Bill/Ref: {x.referenceNumber}
                        </span>
                      ) : null}
                      {!x.purpose && !x.remarks && !x.referenceNumber && "—"}
                    </td>
                    <td className="px-3.5 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {x.enteredBy?.name || x.enteredBy?.email || "System"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
function Modal({ title, onClose, children, wide = false }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
      <div
        className={`max-h-[92vh] w-full overflow-y-auto rounded-2xl bg-white shadow-2xl ${wide ? "max-w-6xl" : "max-w-4xl"}`}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-5 py-4">
          <h3 className="font-bold text-slate-900">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
function Field({ label, required, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-slate-600">
        {label}
        {required ? " *" : ""}
      </span>
      {children}
    </label>
  );
}
function ModalActions({ saving, initial, onClose, submitLabel }) {
  return (
    <div className="col-span-full flex justify-end gap-2 border-t pt-4">
      <Button type="button" variant="secondary" onClick={onClose}>
        Cancel
      </Button>
      <Button disabled={saving}>
        {saving && <Spinner />}
        {submitLabel || (initial ? "Save Changes" : "Create Item")}
      </Button>
    </div>
  );
}

function QuickAddVendorModal({ onClose, onSuccess }) {
  const [vendorName, setVendorName] = useState("");
  const [vendorCode, setVendorCode] = useState(() => `VND-${Math.floor(100 + Math.random() * 900)}`);
  const [vendorType, setVendorType] = useState("supplier");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!vendorName.trim()) {
      setError("Vendor name is required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await api.post("/vendors", {
        vendorCode: vendorCode.trim().toUpperCase(),
        vendorName: vendorName.trim(),
        vendorType,
        phone: phone.trim() || undefined,
        city: city.trim() || undefined,
        status: "active",
      });
      const created = res.data?.data || res.data;
      onSuccess(created);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to create vendor");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between border-b bg-amber-500/10 px-5 py-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-700">Quick Setup</span>
            <h3 className="font-bold text-slate-900 text-base">Add New Vendor / Supplier</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          {error && (
            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold border border-rose-200">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Vendor / Supplier Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              placeholder="e.g. Sharma Auto Spares / Castrol Agency"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Vendor Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={vendorCode}
                onChange={(e) => setVendorCode(e.target.value)}
                placeholder="VND-001"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold uppercase focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Vendor Type <span className="text-red-500">*</span>
              </label>
              <select
                value={vendorType}
                onChange={(e) => setVendorType(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold focus:border-amber-500 focus:outline-none bg-white"
              >
                <option value="supplier">Parts Supplier</option>
                <option value="workshop">Workshop / Garage</option>
                <option value="fuel_station">Fuel Station</option>
                <option value="tyre_vendor">Tyre Vendor</option>
                <option value="transporter">Transporter</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 9826012345"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                City / Location
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Indore"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-3 border-t flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              {saving ? "Saving..." : "Save & Select Vendor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
