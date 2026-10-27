"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import * as Icons from "lucide-react";
import { toast } from "sonner";
import { useActiveCompany } from "@/src/lib/auth";
import {
  getCustomers,
  getCustomerById,
  getCustomerStats,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from "@/src/services/customer.service";
import WhatsAppShareModal from "@/src/components/WhatsAppShareModal";

// Indian States List for easy dropdown selection
const INDIAN_STATES = [
  "Gujarat",
  "Maharashtra",
  "Tamil Nadu",
  "Rajasthan",
  "Madhya Pradesh",
  "Delhi",
  "Haryana",
  "Punjab",
  "Karnataka",
  "Andhra Pradesh",
  "Telangana",
  "Uttar Pradesh",
  "West Bengal",
  "Kerala",
  "Odisha",
  "Bihar",
  "Assam",
  "Goa",
  "Other",
];

export default function CustomerMasterPage() {
  const activeCompany = useActiveCompany();
  const [customers, setCustomers] = useState([]);
  const [stats, setStats] = useState({
    totalCustomers: 0,
    activeCustomers: 0,
    gstRegistered: 0,
  });
  const [loading, setLoading] = useState(true);

  // Search & Filter State
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [gstFilter, setGstFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name_asc");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Modals & Drawers State
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [viewCustomer, setViewCustomer] = useState(null);
  const [viewCustomerLoading, setViewCustomerLoading] = useState(false);
  const [deleteConfirmCustomer, setDeleteConfirmCustomer] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // WhatsApp Share State
  const [whatsAppCustomer, setWhatsAppCustomer] = useState(null);

  // Load Customers & Stats
  const loadData = async () => {
    setLoading(true);
    try {
      const [custRes, statsRes] = await Promise.all([
        getCustomers(),
        getCustomerStats().catch(() => ({ data: {} })),
      ]);

      const list = custRes?.data || [];
      setCustomers(list);

      if (statsRes?.data) {
        setStats({
          totalCustomers: statsRes.data.totalCustomers ?? list.length,
          activeCustomers:
            statsRes.data.activeCustomers ??
            list.filter((c) => c.status === "active").length,
          gstRegistered:
            statsRes.data.gstRegistered ??
            list.filter((c) => !!c.gstNumber?.trim()).length,
        });
      }
    } catch (err) {
      console.error("Failed to load customer master data:", err);
      toast.error(err.message || "Failed to load customers list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeCompany?._id]);

  // Extract distinct cities for City filter
  const distinctCities = useMemo(() => {
    const set = new Set();
    customers.forEach((c) => {
      if (c.city && c.city.trim()) {
        set.add(c.city.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [customers]);

  // Client-Side Filtered & Sorted Customers
  const filteredCustomers = useMemo(() => {
    let result = [...customers];

    // Search query filter
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (c) =>
          c.name?.toLowerCase().includes(q) ||
          c.customerCode?.toLowerCase().includes(q) ||
          c.phone?.toLowerCase().includes(q) ||
          c.contactPerson?.toLowerCase().includes(q) ||
          c.gstNumber?.toLowerCase().includes(q) ||
          c.panNumber?.toLowerCase().includes(q) ||
          c.city?.toLowerCase().includes(q) ||
          c.state?.toLowerCase().includes(q),
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((c) => c.status === statusFilter);
    }

    // City filter
    if (cityFilter !== "all") {
      result = result.filter(
        (c) => (c.city || "").toLowerCase() === cityFilter.toLowerCase(),
      );
    }

    // GST filter
    if (gstFilter === "gst") {
      result = result.filter((c) => !!c.gstNumber?.trim());
    } else if (gstFilter === "non_gst") {
      result = result.filter((c) => !c.gstNumber?.trim());
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === "name_asc") {
        return (a.name || "").localeCompare(b.name || "");
      }
      if (sortBy === "name_desc") {
        return (b.name || "").localeCompare(a.name || "");
      }
      if (sortBy === "code_asc") {
        return (a.customerCode || "").localeCompare(b.customerCode || "");
      }
      if (sortBy === "recent") {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
      return 0;
    });

    return result;
  }, [
    customers,
    search,
    statusFilter,
    cityFilter,
    gstFilter,
    sortBy,
  ]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, cityFilter, gstFilter, rowsPerPage]);

  // Pagination calculation
  const totalItems = filteredCustomers.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / rowsPerPage));
  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredCustomers.slice(start, start + rowsPerPage);
  }, [filteredCustomers, currentPage, rowsPerPage]);

  // Active filters count
  const activeFiltersCount =
    (search ? 1 : 0) +
    (statusFilter !== "all" ? 1 : 0) +
    (cityFilter !== "all" ? 1 : 0) +
    (gstFilter !== "all" ? 1 : 0);

  const resetAllFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setCityFilter("all");
    setGstFilter("all");
    setSortBy("name_asc");
  };

  // Open Detailed Profile Drawer
  const handleOpenView = async (customer) => {
    setViewCustomer(customer);
    setViewCustomerLoading(true);
    try {
      const detailed = await getCustomerById(customer._id);
      if (detailed?.data) {
        setViewCustomer(detailed.data);
      }
    } catch (err) {
      console.warn("Could not fetch detailed stats for customer:", err);
    } finally {
      setViewCustomerLoading(false);
    }
  };

  // Toggle Customer Status (Active <-> Inactive)
  const handleToggleStatus = async (customer) => {
    const newStatus = customer.status === "active" ? "inactive" : "active";
    try {
      await updateCustomer(customer._id, { status: newStatus });
      setCustomers((prev) =>
        prev.map((c) =>
          c._id === customer._id ? { ...c, status: newStatus } : c,
        ),
      );
      toast.success(
        `Customer "${customer.name}" marked as ${newStatus.toUpperCase()}`,
      );
    } catch (err) {
      toast.error(err.message || "Failed to update status");
    }
  };

  // Handle Delete
  const handleDeleteCustomer = async (force = false) => {
    if (!deleteConfirmCustomer) return;
    setDeleteLoading(true);
    try {
      await deleteCustomer(deleteConfirmCustomer._id, force);
      toast.success(`Customer "${deleteConfirmCustomer.name}" deleted successfully`);
      setCustomers((prev) =>
        prev.filter((c) => c._id !== deleteConfirmCustomer._id),
      );
      setDeleteConfirmCustomer(null);
    } catch (err) {
      const resp = err.response?.data;
      if (resp?.canDeactivate) {
        toast.error(resp.message, {
          action: {
            label: "Deactivate Instead",
            onClick: () => {
              handleToggleStatus(deleteConfirmCustomer);
              setDeleteConfirmCustomer(null);
            },
          },
          duration: 7000,
        });
      } else {
        toast.error(err.message || "Failed to delete customer");
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  // Export to CSV
  const handleExportCsv = () => {
    if (!filteredCustomers.length) {
      toast.error("No customer records to export");
      return;
    }
    const headers = [
      "Customer Code",
      "Customer Name",
      "Contact Person",
      "Phone",
      "Alternate Phone",
      "Email",
      "City",
      "State",
      "Pincode",
      "Full Address",
      "GSTIN",
      "PAN",
      "Opening Balance (INR)",
      "Balance Type",
      "Status",
    ];

    const rows = filteredCustomers.map((c) => [
      `"${c.customerCode || ""}"`,
      `"${(c.name || "").replace(/"/g, '""')}"`,
      `"${(c.contactPerson || "").replace(/"/g, '""')}"`,
      `"${c.phone || ""}"`,
      `"${c.alternatePhone || ""}"`,
      `"${c.email || ""}"`,
      `"${c.city || ""}"`,
      `"${c.state || ""}"`,
      `"${c.pincode || ""}"`,
      `"${(c.address || "").replace(/"/g, '""')}"`,
      `"${c.gstNumber || ""}"`,
      `"${c.panNumber || ""}"`,
      c.openingBalance ?? 0,
      c.balanceType || "debit",
      c.status || "active",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Customer_Master_${activeCompany?.code || "Bhumi"}_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Customer Master CSV downloaded successfully!");
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="grid h-6 w-6 place-items-center rounded-lg bg-amber-500/15 text-amber-700">
              <Icons.Users className="h-3.5 w-3.5" />
            </span>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-800">
              Master Data &amp; Party Directory
            </p>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-950">
            Customer Master
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage clients, consignors, consignees, GSTIN records, contacts &amp; credit ledger terms.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            title="Refresh Customer Data"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer"
          >
            <Icons.RotateCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            title="Export filtered customer list to CSV"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer"
          >
            <Icons.Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingCustomer(null);
              setFormModalOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-black text-slate-950 shadow-sm shadow-amber-500/20 hover:bg-amber-400 transition cursor-pointer"
          >
            <Icons.Plus className="h-4 w-4 stroke-[3]" />
            <span>Add New Customer</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Total Customers */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Total Clients
            </span>
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-slate-100 text-slate-800">
              <Icons.Building2 className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="mt-1 font-mono text-2xl font-black text-slate-950">
            {stats.totalCustomers}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Registered parties &amp; consignors
          </p>
        </div>

        {/* GST Registered */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              GST Registered
            </span>
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-purple-50 text-purple-700">
              <Icons.ShieldCheck className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="mt-1 font-mono text-2xl font-black text-purple-700">
            {stats.gstRegistered}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Valid GSTIN for tax invoices
          </p>
        </div>

        {/* Operating Hubs / Cities */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Cities Covered
            </span>
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-amber-50 text-amber-700">
              <Icons.MapPin className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="mt-1 font-mono text-2xl font-black text-slate-950">
            {distinctCities.length}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Operating regions across India
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-2xs">
        <div className="relative flex-1">
          <Icons.Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by party name, contact person, phone, GSTIN, city..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-10 pr-10 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-500/10"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <Icons.X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setGstFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                gstFilter === "all"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-200"
              }`}
            >
              All Parties ({customers.length})
            </button>
            <button
              type="button"
              onClick={() => setGstFilter(gstFilter === "gst" ? "all" : "gst")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                gstFilter === "gst"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "text-purple-700 hover:bg-purple-100"
              }`}
            >
              <Icons.ShieldCheck className="h-3 w-3" />
              <span>
                GST ({customers.filter((c) => !!c.gstNumber?.trim()).length})
              </span>
            </button>
          </div>

          {/* City Filter */}
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 cursor-pointer"
          >
            <option value="all">All Cities ({distinctCities.length})</option>
            {distinctCities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>

          {/* Sort Order */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 cursor-pointer"
          >
            <option value="name_asc">Name (A ➔ Z)</option>
            <option value="name_desc">Name (Z ➔ A)</option>
            <option value="recent">Recently Added</option>
          </select>

          {/* Clear Filters Button */}
          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={resetAllFilters}
              className="inline-flex items-center gap-1 rounded-xl bg-rose-50 border border-rose-200 px-2.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition cursor-pointer"
              title="Reset all search & filter options"
            >
              <Icons.RotateCcw className="h-3 w-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Customers Table Container */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Icons.Loader2 className="h-8 w-8 animate-spin text-amber-500 mb-3" />
            <p className="text-sm font-bold text-slate-600">
              Loading Customer Master Directory...
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Fetching parties, contacts &amp; GST records
            </p>
          </div>
        ) : paginatedCustomers.length === 0 ? (
          <div className="py-20 text-center">
            <Icons.Users className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-2 text-sm font-bold text-slate-900">
              {activeFiltersCount > 0
                ? "No Matching Customers Found"
                : "No Customers Added Yet"}
            </h3>
            <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
              {activeFiltersCount > 0
                ? "Try adjusting your search keywords, city or payment terms filter to find your client."
                : "Add your first client / party to start managing freight invoices, advances and commercial contracts."}
            </p>
            {activeFiltersCount > 0 ? (
              <button
                type="button"
                onClick={resetAllFilters}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer"
              >
                <Icons.RotateCcw className="h-3.5 w-3.5" />
                <span>Reset Filters</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setEditingCustomer(null);
                  setFormModalOpen(true);
                }}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2 text-xs font-black text-slate-950 transition cursor-pointer"
              >
                <Icons.Plus className="h-3.5 w-3.5 stroke-[3]" />
                <span>Add Customer Now</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-rose-50/90 text-slate-800 border-b-2 border-rose-200/80">
                <tr>
                  <th className="px-4 py-3.5 text-center text-[10px] font-black uppercase tracking-wider text-slate-700 w-12">
                    #
                  </th>
                  <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-wider text-slate-700">
                    Customer / Party Name
                  </th>
                  <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-wider text-slate-700">
                    Contact Person &amp; Phone
                  </th>
                  <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-wider text-slate-700">
                    City &amp; State
                  </th>
                  <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-wider text-slate-700">
                    GSTIN / PAN
                  </th>
                  <th className="px-4 py-3.5 text-right text-[10px] font-black uppercase tracking-wider text-slate-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {paginatedCustomers.map((cust, idx) => {
                  const hasGst = !!cust.gstNumber?.trim();
                  const rowNumber = (currentPage - 1) * rowsPerPage + idx + 1;

                  return (
                    <tr
                      key={cust._id}
                      className={`${
                        idx % 2 === 0
                          ? "bg-white hover:bg-[#f8f8f8]"
                          : "bg-amber-50/80 hover:bg-amber-100/70"
                      } transition-colors border-b border-slate-100`}
                    >
                      {/* S.No */}
                      <td className="px-4 py-3 text-center font-mono text-xs font-bold text-slate-500 whitespace-nowrap">
                        {rowNumber}
                      </td>

                      {/* Customer / Party Name */}
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleOpenView(cust)}
                          className="font-bold text-slate-900 hover:text-amber-600 text-left truncate max-w-[280px] block transition cursor-pointer text-sm"
                          title="Click to view full customer profile & ledger"
                        >
                          {cust.name}
                        </button>
                        {cust.email && (
                          <p className="text-[11px] text-slate-400 truncate max-w-[240px] mt-0.5">
                            {cust.email}
                          </p>
                        )}
                      </td>

                      {/* Contact Person & Phone */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {cust.phone ? (
                          <div className="flex items-center gap-1.5 font-mono font-bold text-amber-950">
                            <Icons.Phone className="h-3 w-3 text-amber-600" />
                            <a
                              href={`tel:${cust.phone}`}
                              className="hover:underline hover:text-amber-700"
                              title="Click to call"
                            >
                              {cust.phone}
                            </a>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                        {cust.contactPerson && (
                          <p className="text-[11px] text-slate-500 truncate max-w-[170px] mt-0.5">
                            {cust.contactPerson}
                          </p>
                        )}
                      </td>

                      {/* City & State */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1 font-semibold text-slate-800">
                          <Icons.MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                          <span>{cust.city || "—"}</span>
                          {cust.state && (
                            <span className="text-slate-400">
                              , {cust.state}
                            </span>
                          )}
                        </div>
                        {cust.address && (
                          <p
                            className="text-[10px] text-slate-400 truncate max-w-[220px] mt-0.5"
                            title={cust.address}
                          >
                            {cust.address}
                          </p>
                        )}
                      </td>

                      {/* Tax Credentials (GSTIN / PAN) */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {hasGst ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 font-mono font-bold text-purple-900 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 text-[11px]">
                              <Icons.ShieldCheck className="h-2.5 w-2.5 text-purple-600" />
                              {cust.gstNumber}
                            </span>
                            {cust.panNumber && (
                              <p className="font-mono text-[10px] text-slate-500">
                                PAN: {cust.panNumber}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 font-bold text-slate-400 text-[10px]">
                              Non-GST
                            </span>
                            {cust.panNumber && (
                              <p className="font-mono text-[10px] text-slate-500">
                                PAN: {cust.panNumber}
                              </p>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Ledger / Profile */}
                          <button
                            type="button"
                            onClick={() => handleOpenView(cust)}
                            title="View Customer Details & Ledger"
                            className="inline-flex items-center gap-1 rounded-lg bg-blue-50 border border-blue-200 px-2 py-1 text-blue-800 hover:bg-blue-600 hover:text-white transition cursor-pointer shadow-2xs font-bold text-[10px] uppercase"
                          >
                            <Icons.Eye className="h-3 w-3" />
                            <span>View</span>
                          </button>

                          {/* WhatsApp Share Button */}
                          <button
                            type="button"
                            onClick={() => setWhatsAppCustomer(cust)}
                            title="Message party on WhatsApp"
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 border border-emerald-300 px-2 py-1 text-emerald-800 hover:bg-emerald-600 hover:text-white transition cursor-pointer shadow-2xs font-bold text-[10px] uppercase"
                          >
                            <Icons.MessageCircle className="h-3 w-3 fill-current" />
                            <span>WhatsApp</span>
                          </button>

                          {/* Edit Customer */}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCustomer(cust);
                              setFormModalOpen(true);
                            }}
                            title="Edit Customer Information"
                            className="inline-flex items-center gap-1 rounded-lg bg-amber-500/15 border border-amber-500/30 px-2 py-1 text-amber-900 hover:bg-amber-500 hover:text-slate-950 transition cursor-pointer font-bold text-[10px] uppercase"
                          >
                            <Icons.Edit2 className="h-3 w-3" />
                            <span>Edit</span>
                          </button>

                          {/* Delete Customer */}
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmCustomer(cust)}
                            title="Delete Customer"
                            className="inline-flex items-center justify-center h-6 w-6 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
                          >
                            <Icons.Trash2 className="h-3.5 w-3.5" />
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

        {/* Pagination Bar */}
        {totalItems > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/70 px-4 py-3 text-xs text-slate-600">
            <div>
              Showing{" "}
              <span className="font-bold text-slate-900">
                {(currentPage - 1) * rowsPerPage + 1}
              </span>{" "}
              to{" "}
              <span className="font-bold text-slate-900">
                {Math.min(currentPage * rowsPerPage, totalItems)}
              </span>{" "}
              of <span className="font-bold text-slate-900">{totalItems}</span> customers
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer"
              >
                <Icons.ChevronLeft className="h-3.5 w-3.5" />
                <span>Prev</span>
              </button>

              {/* Page Numbers */}
              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(
                    (p) =>
                      p === 1 ||
                      p === totalPages ||
                      Math.abs(p - currentPage) <= 1,
                  )
                  .map((p, idx, arr) => {
                    const prevP = arr[idx - 1];
                    const showEllipsis = prevP && p - prevP > 1;

                    return (
                      <div key={p} className="flex items-center gap-1">
                        {showEllipsis && <span className="px-1 text-slate-400">...</span>}
                        <button
                          type="button"
                          onClick={() => setCurrentPage(p)}
                          className={`h-7 w-7 rounded-lg text-xs font-black transition cursor-pointer ${
                            currentPage === p
                              ? "bg-amber-500 text-slate-950 shadow-xs"
                              : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          {p}
                        </button>
                      </div>
                    );
                  })}
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer"
              >
                <span>Next</span>
                <Icons.ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CREATE / EDIT CUSTOMER MODAL */}
      {formModalOpen && (
        <CustomerFormModal
          isOpen={formModalOpen}
          customer={editingCustomer}
          onClose={() => {
            setFormModalOpen(false);
            setEditingCustomer(null);
          }}
          onSaved={(savedCustomer) => {
            if (editingCustomer) {
              setCustomers((prev) =>
                prev.map((c) =>
                  c._id === savedCustomer._id ? savedCustomer : c,
                ),
              );
              toast.success(`Customer "${savedCustomer.name}" updated successfully`);
            } else {
              setCustomers((prev) => [savedCustomer, ...prev]);
              toast.success(`Customer "${savedCustomer.name}" added successfully`);
            }
            setFormModalOpen(false);
            setEditingCustomer(null);
            loadData();
          }}
        />
      )}

      {/* VIEW CUSTOMER PROFILE / LEDGER DRAWER */}
      {viewCustomer && (
        <CustomerViewModal
          customer={viewCustomer}
          loading={viewCustomerLoading}
          onClose={() => setViewCustomer(null)}
          onEdit={() => {
            setEditingCustomer(viewCustomer);
            setViewCustomer(null);
            setFormModalOpen(true);
          }}
          onWhatsApp={() => {
            setWhatsAppCustomer(viewCustomer);
          }}
        />
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmCustomer && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 mb-4">
              <Icons.AlertTriangle className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-black text-slate-900">
              Delete Customer / Party?
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-slate-600">
              Are you sure you want to delete{" "}
              <span className="font-bold text-slate-900">
                &ldquo;{deleteConfirmCustomer.name}&rdquo;
              </span>
              ?
            </p>
            <p className="mt-2 text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              Note: If this customer has existing Customer Invoices or Advance Memos, deletion is prevented to protect financial audit history. You can mark them as <b>Inactive</b> instead.
            </p>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteConfirmCustomer(null)}
                disabled={deleteLoading}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteCustomer(false)}
                disabled={deleteLoading}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-rose-500 disabled:opacity-50 cursor-pointer"
              >
                {deleteLoading && <Icons.Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Delete Customer</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WHATSAPP SHARE MODAL */}
      {whatsAppCustomer && (
        <WhatsAppShareModal
          isOpen={!!whatsAppCustomer}
          onClose={() => setWhatsAppCustomer(null)}
          title="Message Client on WhatsApp"
          subtitle={`${whatsAppCustomer.name}`}
          defaultPhone={whatsAppCustomer.phone || whatsAppCustomer.alternatePhone || ""}
          defaultMessage={`*BHUMI CONTAINER SERVICE*
_Transport Contractors & Commission Agent_
Vadodara, Gujarat | Ph: +91 98849 58698

Dear *${whatsAppCustomer.name}*,
Greetings from Bhumi Container Service.

We value your partnership for containerized road logistics and commercial freight movement across India.

📞 *Direct Support / Dispatch:* +91 98849 58698
🏢 *Registered Office:* Vadodara, Gujarat

Please feel free to reach out to us for vehicle placement, rates or billing updates. Thank you!`}
          contactOptions={[
            ...(whatsAppCustomer.phone
              ? [{ label: "Primary Mobile", phone: whatsAppCustomer.phone }]
              : []),
            ...(whatsAppCustomer.alternatePhone
              ? [{ label: "Alternate Phone", phone: whatsAppCustomer.alternatePhone }]
              : []),
          ]}
        />
      )}
    </div>
  );
}

// ========================================================
// CUSTOMER FORM MODAL (CREATE / EDIT)
// ========================================================
function CustomerFormModal({ isOpen, customer, onClose, onSaved }) {
  const isEditing = !!customer;
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: customer?.name || "",
    contactPerson: customer?.contactPerson || "",
    phone: customer?.phone || "",
    alternatePhone: customer?.alternatePhone || "",
    email: customer?.email || "",
    address: customer?.address || "",
    city: customer?.city || "",
    state: customer?.state || "",
    pincode: customer?.pincode || "",
    gstNumber: customer?.gstNumber || "",
    panNumber: customer?.panNumber || "",
    bankName: customer?.bankName || "",
    accountNumber: customer?.accountNumber || "",
    ifscCode: customer?.ifscCode || "",
    notes: customer?.notes || "",
  });

  const handleChange = (field, val) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Customer / Party Name is required");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        customerCode: customer?.customerCode || "",
        openingBalance: Number(customer?.openingBalance) || 0,
        balanceType: customer?.balanceType || "debit",
        status: customer?.status || "active",
      };
      let res;
      if (isEditing) {
        res = await updateCustomer(customer._id, payload);
      } else {
        res = await createCustomer(payload);
      }

      if (res?.data) {
        onSaved(res.data);
      }
    } catch (err) {
      toast.error(err.message || "Failed to save customer");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-110 flex items-center justify-center bg-slate-950/70 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-6 py-4 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-slate-950 font-black">
              <Icons.Building2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight">
                {isEditing ? `Edit Customer: ${customer.name}` : "Add New Customer / Party"}
              </h2>
              <p className="text-xs text-slate-400">
                Enter client contact details, address, tax credentials and bank info
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition cursor-pointer"
          >
            <Icons.X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto flex flex-col">
          <div className="p-6 space-y-6 flex-1">
          {/* Section 1: Basic Information */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
              <Icons.Briefcase className="h-3.5 w-3.5" />
              <span>1. Basic Profile & Identity</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Party Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Customer / Party Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="e.g. Reliance Industries Ltd / Adani Logistics"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-900 focus:border-amber-500 focus:outline-hidden"
                />
              </div>

              {/* Contact Person */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Contact Person / Manager
                </label>
                <input
                  type="text"
                  value={formData.contactPerson}
                  onChange={(e) => handleChange("contactPerson", e.target.value)}
                  placeholder="e.g. Rajesh Shah (Dispatch Lead)"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-900 focus:border-amber-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Contact & Address */}
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <h3 className="text-xs font-black uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
              <Icons.MapPin className="h-3.5 w-3.5" />
              <span>2. Contact Details & Billing Address</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Phone */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mobile Number (WhatsApp)
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="10-digit mobile number"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-mono font-bold text-slate-900 focus:border-amber-500 focus:outline-hidden"
                />
              </div>

              {/* Alternate Phone */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Alternate Phone / Office Landline
                </label>
                <input
                  type="tel"
                  value={formData.alternatePhone}
                  onChange={(e) => handleChange("alternatePhone", e.target.value)}
                  placeholder="Office number / dispatch landline"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-mono text-slate-900 focus:border-amber-500 focus:outline-hidden"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Official Billing Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="accounts@company.com"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Full Registered Billing Address
              </label>
              <textarea
                rows={2}
                value={formData.address}
                onChange={(e) => handleChange("address", e.target.value)}
                placeholder="Plot/Survey No, Industrial Area, Landmark..."
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* City */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleChange("city", e.target.value)}
                  placeholder="e.g. Vadodara / Ahmedabad"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-900 focus:border-amber-500 focus:outline-hidden"
                />
              </div>

              {/* State */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  State
                </label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => handleChange("state", e.target.value)}
                  placeholder="e.g. Rajasthan / Gujarat / Tamil Nadu"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-900 focus:border-amber-500 focus:outline-hidden"
                />
              </div>

              {/* Pincode */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pincode
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={formData.pincode}
                  onChange={(e) => handleChange("pincode", e.target.value)}
                  placeholder="e.g. 390001"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-mono text-slate-900 focus:border-amber-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Tax Credentials */}
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <h3 className="text-xs font-black uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
              <Icons.ShieldCheck className="h-3.5 w-3.5" />
              <span>3. Tax Credentials & Compliance</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* GSTIN */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  GSTIN Number (15 Digits)
                </label>
                <input
                  type="text"
                  maxLength={15}
                  value={formData.gstNumber}
                  onChange={(e) => handleChange("gstNumber", e.target.value.toUpperCase())}
                  placeholder="e.g. 24ABCDE1234F1Z5"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-mono font-bold uppercase text-slate-900 focus:border-amber-500 focus:outline-hidden"
                />
              </div>

              {/* PAN */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  PAN Number (10 Digits)
                </label>
                <input
                  type="text"
                  maxLength={10}
                  value={formData.panNumber}
                  onChange={(e) => handleChange("panNumber", e.target.value.toUpperCase())}
                  placeholder="e.g. ABCDE1234F"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-mono font-bold uppercase text-slate-900 focus:border-amber-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Bank Details */}
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <h3 className="text-xs font-black uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
              <Icons.Landmark className="h-3.5 w-3.5" />
              <span>4. Bank Account Details (For Refunds / RTGS)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Bank Name
                </label>
                <input
                  type="text"
                  value={formData.bankName}
                  onChange={(e) => handleChange("bankName", e.target.value)}
                  placeholder="e.g. HDFC Bank / ICICI Bank"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-900 focus:border-amber-500 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Account Number
                </label>
                <input
                  type="text"
                  value={formData.accountNumber}
                  onChange={(e) => handleChange("accountNumber", e.target.value)}
                  placeholder="Account number"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-mono font-bold text-slate-900 focus:border-amber-500 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  IFSC Code
                </label>
                <input
                  type="text"
                  value={formData.ifscCode}
                  onChange={(e) => handleChange("ifscCode", e.target.value.toUpperCase())}
                  placeholder="e.g. HDFC0001234"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-mono font-bold uppercase text-slate-900 focus:border-amber-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Section 6: Internal Notes */}
          <div className="space-y-2 pt-4 border-t border-slate-200">
            <label className="block text-xs font-bold text-slate-700">
              Operational Notes / Special Instructions
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              placeholder="e.g. Container weight limit 26 MT, requires original hardcopy POD for payment clearance..."
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
            />
          </div>

          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-2.5 text-xs font-black text-slate-950 shadow-md hover:bg-amber-400 disabled:opacity-50 cursor-pointer"
            >
              {submitting && <Icons.Loader2 className="h-4 w-4 animate-spin" />}
              <span>{isEditing ? "Save Changes" : "Create Customer"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ========================================================
// CUSTOMER VIEW / LEDGER DETAIL MODAL
// ========================================================
function CustomerViewModal({ customer, loading, onClose, onEdit, onWhatsApp }) {
  const stats = customer.stats || {};
  const recentInvoices = stats.recentInvoices || [];

  return (
    <div className="fixed inset-0 z-110 flex items-center justify-center bg-slate-950/70 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-[#0b1220] px-6 py-4 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-slate-950 font-black text-base uppercase">
              {(customer.name || "C").slice(0, 2)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  {customer.name}
                </h2>
              </div>
              <p className="text-xs text-slate-400">
                {customer.city ? `${customer.city}, ${customer.state || "India"}` : "Customer Profile & Account"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onWhatsApp}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-emerald-500 transition cursor-pointer"
            >
              <Icons.MessageCircle className="h-3.5 w-3.5 fill-white text-emerald-600" />
              <span>WhatsApp</span>
            </button>
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-slate-950 shadow hover:bg-amber-400 transition cursor-pointer"
            >
              <Icons.Edit2 className="h-3.5 w-3.5" />
              <span>Edit</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition cursor-pointer"
            >
              <Icons.X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          {/* Real-time Ledger Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase">
                Total Freight Billed
              </span>
              <p className="mt-1 text-xl font-black text-slate-900 font-mono">
                ₹{Number(stats.totalBilled || 0).toLocaleString("en-IN")}
              </p>
              <span className="text-[10px] text-slate-400">
                {stats.totalInvoices || 0} commercial invoices
              </span>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5">
              <span className="text-[11px] font-bold text-emerald-700 uppercase">
                Payment Received
              </span>
              <p className="mt-1 text-xl font-black text-emerald-800 font-mono">
                ₹{Number(stats.totalReceived || 0).toLocaleString("en-IN")}
              </p>
              <span className="text-[10px] text-emerald-600">
                Settled to date
              </span>
            </div>

            <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3.5">
              <span className="text-[11px] font-bold text-rose-700 uppercase">
                Outstanding Balance
              </span>
              <p className="mt-1 text-xl font-black text-rose-800 font-mono">
                ₹{Number(stats.totalOutstanding || 0).toLocaleString("en-IN")}
              </p>
              <span className="text-[10px] text-rose-600">
                Pending collection
              </span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
            {/* Contact Information */}
            <div className="space-y-3 rounded-xl border border-slate-200 p-4 bg-white shadow-2xs">
              <h4 className="font-black text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5 text-amber-700">
                <Icons.PhoneCall className="h-3.5 w-3.5" />
                <span>Contact & Communication</span>
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Contact Person:</span>
                  <span className="font-bold text-slate-900">{customer.contactPerson || "—"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Phone (Primary):</span>
                  <span className="font-mono font-bold text-slate-900">{customer.phone || "—"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Alternate Phone:</span>
                  <span className="font-mono text-slate-700">{customer.alternatePhone || "—"}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Billing Email:</span>
                  <span className="font-semibold text-slate-900">{customer.email || "—"}</span>
                </div>
              </div>
            </div>

            {/* Tax & GST Details */}
            <div className="space-y-3 rounded-xl border border-slate-200 p-4 bg-white shadow-2xs">
              <h4 className="font-black text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5 text-purple-700">
                <Icons.FileCheck className="h-3.5 w-3.5" />
                <span>Tax & GST Details</span>
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">GSTIN Number:</span>
                  <span className="font-mono font-bold text-purple-900">{customer.gstNumber || "Non-GST"}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">PAN Number:</span>
                  <span className="font-mono font-bold text-slate-900">{customer.panNumber || "—"}</span>
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-2 rounded-xl border border-slate-200 p-4 bg-white shadow-2xs">
              <h4 className="font-black text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5 text-blue-700">
                <Icons.MapPin className="h-3.5 w-3.5" />
                <span>Registered Address</span>
              </h4>
              <p className="text-slate-700 leading-relaxed">
                {customer.address || "No complete street address provided"}
              </p>
              <div className="pt-2 text-slate-500 text-[11px]">
                <span>City: <b>{customer.city || "—"}</b></span> •{" "}
                <span>State: <b>{customer.state || "—"}</b></span> •{" "}
                <span>Pincode: <b>{customer.pincode || "—"}</b></span>
              </div>
            </div>

            {/* Bank Information */}
            <div className="space-y-2 rounded-xl border border-slate-200 p-4 bg-white shadow-2xs">
              <h4 className="font-black text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5 text-emerald-700">
                <Icons.Landmark className="h-3.5 w-3.5" />
                <span>Customer Bank Account</span>
              </h4>
              <div className="space-y-1.5 text-slate-700">
                <p>Bank: <b>{customer.bankName || "—"}</b></p>
                <p>Account No: <b className="font-mono">{customer.accountNumber || "—"}</b></p>
                <p>IFSC: <b className="font-mono uppercase">{customer.ifscCode || "—"}</b></p>
              </div>
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200">
            <span className="text-xs text-slate-500">
              Quick Actions for this Party:
            </span>
            <div className="flex items-center gap-2">
              <Link
                href={`/customer-invoices?search=${encodeURIComponent(customer.name)}`}
                className="inline-flex items-center gap-1 rounded-lg bg-slate-100 hover:bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-800 transition"
              >
                <Icons.Receipt className="h-3.5 w-3.5" />
                <span>View Party Invoices</span>
              </Link>
              <Link
                href={`/advance-memos?search=${encodeURIComponent(customer.name)}`}
                className="inline-flex items-center gap-1 rounded-lg bg-slate-100 hover:bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-800 transition"
              >
                <Icons.FileText className="h-3.5 w-3.5" />
                <span>View Advance Memos</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
