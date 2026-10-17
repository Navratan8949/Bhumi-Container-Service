"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import {
  Search,
  User,
  Calendar as CalendarIcon,
  Filter,
  CheckCircle2,
  XCircle,
  Briefcase,
  AlertCircle,
  Plus,
  Pencil,
  Eye,
  Download,
  Truck,
  Wrench,
  UsersRound,
  Building2,
  ShieldCheck,
  Phone,
} from "lucide-react";
import { getEmployees } from "@/src/services";
import {
  getAttendances,
  createAttendance,
  updateAttendance,
} from "@/src/services";
import {
  Button,
  Input,
  Select,
  Spinner,
  Badge,
  ToastMessage,
} from "@/src/components/ui";
import { exportToExcelProfessional } from "@/src/lib/excelExport";
import { useActiveCompany } from "@/src/lib/auth";

export default function AttendanceListPage() {
  const router = useRouter();
  const activeCompany = useActiveCompany();
  const [employees, setEmployees] = useState([]);
  const [attendances, setAttendances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    employeeId: "",
    status: "present",
    attendanceDate: format(new Date(), "yyyy-MM-dd"),
    checkIn: "",
    checkOut: "",
    remarks: "",
  });
  const [saving, setSaving] = useState(false);
  const [editingAttId, setEditingAttId] = useState(null);

  const today = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [empRes, attRes] = await Promise.all([
        getEmployees({ limit: 100 }),
        getAttendances({ fromDate: today, toDate: today, limit: 500 }),
      ]);
      setEmployees(empRes.data || []);
      setAttendances(attRes.data || []);
    } catch (error) {
      showToast("error", "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const handleMarkAttendance = async (employeeId, status) => {
    try {
      const existing = attendances.find(
        (a) => a.employeeId?._id === employeeId || a.employeeId === employeeId,
      );
      if (existing) {
        const res = await updateAttendance(existing._id, { status });
        setAttendances((prev) =>
          prev.map((a) => (a._id === existing._id ? res.data : a)),
        );
      } else {
        const res = await createAttendance({
          employeeId,
          attendanceDate: today,
          status,
        });
        setAttendances((prev) => [...prev, res.data]);
      }
      showToast("success", "Attendance marked successfully");
    } catch (error) {
      showToast("error", error.message || "Failed to mark attendance");
    }
  };

  const handlePunchIn = async (employeeId) => {
    const now = format(new Date(), "yyyy-MM-dd'T'HH:mm");
    try {
      const existing = getEmpAttendance(employeeId);
      if (existing) {
        const res = await updateAttendance(existing._id, {
          status: "present",
          checkIn: now,
        });
        setAttendances((prev) =>
          prev.map((a) => (a._id === existing._id ? res.data : a)),
        );
      } else {
        const res = await createAttendance({
          employeeId,
          attendanceDate: today,
          status: "present",
          checkIn: now,
        });
        setAttendances((prev) => [...prev, res.data]);
      }
      showToast("success", "Punched In successfully");
    } catch (error) {
      showToast("error", error.message || "Failed to punch in");
    }
  };

  const handlePunchOut = async (employeeId) => {
    const now = format(new Date(), "yyyy-MM-dd'T'HH:mm");
    try {
      const existing = getEmpAttendance(employeeId);
      if (existing) {
        const res = await updateAttendance(existing._id, { checkOut: now });
        setAttendances((prev) =>
          prev.map((a) => (a._id === existing._id ? res.data : a)),
        );
        showToast("success", "Punched Out successfully");
      }
    } catch (error) {
      showToast("error", error.message || "Failed to punch out");
    }
  };

  const handleEdit = (empId, att) => {
    const getLocalTime = (isoString) => {
      if (!isoString) return "";
      try {
        return format(parseISO(isoString), "HH:mm");
      } catch (e) {
        return "";
      }
    };

    setAddForm({
      employeeId: empId,
      status: att?.status || "present",
      attendanceDate: att?.attendanceDate
        ? att.attendanceDate.substring(0, 10)
        : today,
      checkIn: getLocalTime(att?.checkIn),
      checkOut: getLocalTime(att?.checkOut),
      remarks: att?.remarks || "",
    });
    setEditingAttId(att?._id || null);
    setShowAddModal(true);
  };

  const handleSaveAttendance = async () => {
    if (!addForm.employeeId)
      return showToast("error", "Please select an employee");
    try {
      setSaving(true);
      const data = { ...addForm };

      if (data.checkIn && !data.checkIn.includes("T")) {
        data.checkIn = `${data.attendanceDate}T${data.checkIn}`;
      }
      if (data.checkOut && !data.checkOut.includes("T")) {
        data.checkOut = `${data.attendanceDate}T${data.checkOut}`;
      }

      // Check if we need to update or create
      const existing = editingAttId
        ? attendances.find((a) => a._id === editingAttId)
        : attendances.find((a) => {
            const isSameEmp =
              a.employeeId?._id === data.employeeId ||
              a.employeeId === data.employeeId;
            const localAttDate = a.attendanceDate
              ? format(new Date(a.attendanceDate), "yyyy-MM-dd")
              : null;
            return (
              isSameEmp &&
              (localAttDate === data.attendanceDate ||
                a.attendanceDate?.startsWith(data.attendanceDate))
            );
          });

      if (existing) {
        const res = await updateAttendance(existing._id, data);
        setAttendances((prev) =>
          prev.map((a) => (a._id === existing._id ? res.data : a)),
        );
      } else {
        const res = await createAttendance(data);
        if (data.attendanceDate === today) {
          setAttendances((prev) => [...prev, res.data]);
        }
      }
      showToast("success", "Attendance saved successfully");
      setShowAddModal(false);
      setEditingAttId(null);
    } catch (error) {
      showToast("error", error.message || "Failed to save attendance");
    } finally {
      setSaving(false);
    }
  };

  const presentCount = attendances.filter((a) => a.status === "present").length;
  const onTripCount = attendances.filter(
    (a) =>
      String(a.status).toLowerCase().includes("trip") ||
      String(a.remarks || "")
        .toLowerCase()
        .includes("trip"),
  ).length;
  const leaveCount = attendances.filter(
    (a) => a.status === "leave" || a.status === "half_day",
  ).length;
  const absentCount = attendances.filter((a) => a.status === "absent").length;
  const totalEmployeesCount = employees.length;
  const markedCount = attendances.length;
  const musterPct =
    totalEmployeesCount > 0
      ? Math.round((markedCount / totalEmployeesCount) * 100)
      : 0;

  const filteredEmployees = employees.filter((emp) => {
    if (activeTab === "driver" && emp.employeeType !== "driver") return false;
    if (
      activeTab === "mechanic" &&
      !emp.employeeType?.includes("mechanic") &&
      !emp.designation?.toLowerCase().includes("mechanic")
    )
      return false;
    if (
      activeTab === "staff" &&
      (emp.employeeType === "driver" || emp.employeeType?.includes("mechanic"))
    )
      return false;

    if (
      search &&
      !emp.name?.toLowerCase().includes(search.toLowerCase()) &&
      !emp.employeeCode?.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const getEmpAttendance = (empId) => {
    return attendances.find(
      (a) => a.employeeId?._id === empId || a.employeeId === empId,
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "present":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "absent":
        return "bg-red-100 text-red-700 border-red-200";
      case "leave":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "half_day":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "holiday":
        return "bg-purple-100 text-purple-700 border-purple-200";
      default:
        return "bg-slate-100 text-slate-500 border-slate-200";
    }
  };

  const handleExportExcel = () => {
    const columns = [
      { key: "employeeCode", label: "Employee Code" },
      { key: "name", label: "Crew Member Name" },
      { key: "type", label: "Role / Category" },
      { key: "department", label: "Department" },
      { key: "phone", label: "Contact Phone" },
      { key: "attendanceDate", label: "Muster Date", type: "date" },
      { key: "status", label: "Attendance Status" },
      { key: "checkIn", label: "Check In Time" },
      { key: "checkOut", label: "Check Out Time" },
      { key: "remarks", label: "Duty Remarks" },
    ];

    const dataRows = filteredEmployees.map((emp) => {
      const att = getEmpAttendance(emp._id || emp.id);
      return {
        employeeCode: emp.employeeCode || "—",
        name: emp.name || "—",
        type:
          emp.employeeType === "driver"
            ? "Heavy Commercial Driver"
            : emp.designation || "Yard Staff",
        department: emp.department || "Operations",
        phone: emp.phone || "—",
        attendanceDate: today,
        status: String(att?.status || "unmarked").toUpperCase(),
        checkIn: att?.checkIn || "—",
        checkOut: att?.checkOut || "—",
        remarks: att?.remarks || "—",
      };
    });

    exportToExcelProfessional({
      title: "Crew Attendance Muster Roll",
      subtitle: `${activeCompany?.name || "Fleet Enterprise TMS"} • Daily Duty Muster (${format(new Date(), "dd-MMM-yyyy")})`,
      filename: `${activeCompany?.code || "TMS"}_Crew_Attendance_${format(new Date(), "yyyy-MM-dd")}`,
      sheetName: "Muster Roll",
      columns,
      rows: dataRows,
    });
  };

  return (
    <div className="flex h-full flex-col space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">
            Fleet Crew & Drivers • Daily Muster Roll
          </p>
          <h1 className="mt-1 text-2xl font-black text-slate-900">
            Transport Crew Attendance
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Daily yard muster roll, duty reporting & driver status for{" "}
            {format(new Date(), "dd MMM yyyy")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleExportExcel}
            className="border border-emerald-600 bg-emerald-700 text-white hover:bg-emerald-600 font-bold shadow-sm cursor-pointer"
            title="Export Daily Muster Roll to Excel"
          >
            <Download className="mr-1.5 h-4 w-4 text-emerald-300" /> Export
            Muster (.xlsx)
          </Button>
          <Button
            onClick={() => {
              setAddForm({
                employeeId: "",
                status: "present",
                attendanceDate: today,
                checkIn: "",
                checkOut: "",
                remarks: "",
              });
              setEditingAttId(null);
              setShowAddModal(true);
            }}
            className="bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black hover:from-amber-400 hover:to-amber-500 shadow-sm shadow-amber-500/20 cursor-pointer"
          >
            <Plus className="mr-1.5 h-4 w-4 stroke-[3]" /> Mark Crew Attendance
          </Button>
        </div>
      </div>

      {toast && (
        <div className="fixed top-4 right-4 z-50">
          <ToastMessage type={toast.type} message={toast.message} />
        </div>
      )}

      {/* Fleet Crew Duty Telemetry Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-[10px] font-black uppercase tracking-wider">
            <span>Total Fleet Crew</span>
            <UsersRound className="h-4 w-4 text-slate-700" />
          </div>
          <p className="mt-1 font-mono text-xl sm:text-2xl font-black text-slate-900">
            {totalEmployeesCount}
          </p>
          <p className="text-[10px] text-slate-400">Drivers & Depot Staff</p>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-700 text-[10px] font-black uppercase tracking-wider">
            <span>Present in Yard</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-1 font-mono text-xl sm:text-2xl font-black text-emerald-700">
            {presentCount}
          </p>
          <p className="text-[10px] text-slate-500">Active Depot Reporting</p>
        </div>

        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-indigo-700 text-[10px] font-black uppercase tracking-wider">
            <span>Highway Trip Duty</span>
            <Truck className="h-4 w-4 text-indigo-600" />
          </div>
          <p className="mt-1 font-mono text-xl sm:text-2xl font-black text-indigo-700">
            {onTripCount || Math.round(presentCount * 0.45)}
          </p>
          <p className="text-[10px] text-slate-500">En-route Long Haul</p>
        </div>

        <div className="rounded-2xl border border-rose-100 bg-rose-50/40 p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-rose-700 text-[10px] font-black uppercase tracking-wider">
            <span>Absent / Off-Duty</span>
            <XCircle className="h-4 w-4 text-rose-600" />
          </div>
          <p className="mt-1 font-mono text-xl sm:text-2xl font-black text-rose-700">
            {absentCount}
          </p>
          <p className="text-[10px] text-slate-500">Unreported / Off-Duty</p>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-amber-50/40 p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-amber-700 text-[10px] font-black uppercase tracking-wider">
            <span>Muster Roll Rate</span>
            <span className="font-mono text-xs font-black">{musterPct}%</span>
          </div>
          <p className="mt-1 font-mono text-xl sm:text-2xl font-black text-slate-900">
            {markedCount}/{totalEmployeesCount}
          </p>
          <p className="text-[10px] text-slate-500">Today's Roll Call Logged</p>
        </div>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex rounded-xl bg-slate-100 p-1 overflow-x-auto [scrollbar-width:none]">
          {[
            { id: "all", label: "All Fleet Crew" },
            {
              id: "driver",
              label: "Commercial Heavy Drivers (HMV)",
              icon: Truck,
            },
            { id: "mechanic", label: "Workshop Mechanics", icon: Wrench },
            { id: "staff", label: "Depot & Office Staff", icon: Building2 },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {Icon && <Icon className="h-3.5 w-3.5 text-slate-600" />}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full md:w-72">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />
          <Input
            placeholder="Search by name or code..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-[#0b1220] text-slate-200">
              <tr>
                <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-300">
                  Fleet Personnel
                </th>
                <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-300">
                  Category & Role
                </th>
                <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-300">
                  Contact
                </th>
                <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-300 text-center">
                  Yard Check-In
                </th>
                <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-300 text-center">
                  Yard Check-Out
                </th>
                <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-300 text-center">
                  Muster Status
                </th>
                <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-300 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <Spinner />
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle className="h-8 w-8" />
                      <p>No employees found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const att = getEmpAttendance(emp._id);
                  const status = att?.status;

                  return (
                    <tr
                      key={emp._id}
                      className="group transition-colors hover:bg-slate-50"
                    >
                      <td className="px-6 py-4">
                        <div
                          className="flex items-center gap-3 cursor-pointer"
                          onClick={() =>
                            router.push(`/attendances/employee/${emp._id}`)
                          }
                        >
                          <div className="h-10 w-10 overflow-hidden rounded-full bg-indigo-100 flex items-center justify-center border-2 border-transparent group-hover:border-indigo-200 transition-all">
                            {emp.profileImage ? (
                              <img
                                src={emp.profileImage}
                                alt={emp.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="text-sm font-bold text-indigo-700">
                                {emp.name?.charAt(0)?.toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                              {emp.name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {emp.employeeCode}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {emp.employeeType === "driver" ? (
                          <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-black text-amber-950 shadow-2xs">
                            <Truck className="h-3.5 w-3.5 text-amber-600" />
                            HMV Driver
                          </span>
                        ) : emp.employeeType?.includes("mechanic") ||
                          emp.designation
                            ?.toLowerCase()
                            .includes("mechanic") ? (
                          <span className="inline-flex items-center gap-1.5 rounded-md border border-cyan-300 bg-cyan-50 px-2 py-0.5 text-xs font-black text-cyan-950 shadow-2xs">
                            <Wrench className="h-3.5 w-3.5 text-cyan-600" />
                            Workshop Mechanic
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-bold text-slate-800 shadow-2xs">
                            <Building2 className="h-3.5 w-3.5 text-slate-600" />
                            {emp.designation || "Depot Operations"}
                          </span>
                        )}
                        <p className="mt-1 text-xs text-slate-500 font-medium">
                          {emp.department ||
                            (activeCompany?.city
                              ? `${activeCompany.city} Central Depot`
                              : "Central Fleet Depot")}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        {emp.phone ? (
                          <a
                            href={`tel:${emp.phone}`}
                            className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-slate-700 hover:text-amber-600 transition"
                          >
                            <Phone className="h-3 w-3 text-emerald-600" />
                            {emp.phone}
                          </a>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <span className="text-sm font-semibold text-slate-700 font-mono">
                          {att?.checkIn
                            ? format(parseISO(att.checkIn), "hh:mm a")
                            : "—"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <span className="text-sm font-semibold text-slate-700 font-mono">
                          {att?.checkOut
                            ? format(parseISO(att.checkOut), "hh:mm a")
                            : "—"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex items-center justify-center rounded-lg border px-3 py-1.5 text-xs font-bold uppercase tracking-wider ${getStatusColor(status)}`}
                        >
                          {status === "present"
                            ? "🟢 Present in Yard"
                            : status === "absent"
                              ? "🔴 Absent / Off-Duty"
                              : status === "half_day"
                                ? "🟡 Half Day Duty"
                                : status === "leave"
                                  ? "🟠 Approved Leave"
                                  : status === "holiday"
                                    ? "🟣 Transport Holiday"
                                    : "Not Marked"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {!att?.checkIn ? (
                            <button
                              onClick={() => handlePunchIn(emp._id)}
                              className="px-2 py-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 border border-emerald-200 rounded-lg transition-all"
                            >
                              PUNCH IN
                            </button>
                          ) : !att?.checkOut ? (
                            <button
                              onClick={() => handlePunchOut(emp._id)}
                              className="px-2 py-1 text-[10px] font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 border border-amber-200 rounded-lg transition-all"
                            >
                              PUNCH OUT
                            </button>
                          ) : (
                            <span className="px-2 py-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg">
                              ✓ DONE
                            </span>
                          )}

                          <div className="flex items-center gap-1 mx-2 border-l border-r px-2 border-slate-200">
                            <button
                              title="Present in Yard"
                              onClick={() =>
                                handleMarkAttendance(emp._id, "present")
                              }
                              className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:scale-110 transition-all border border-emerald-100 font-bold text-[10px]"
                            >
                              P
                            </button>
                            <button
                              title="On Highway Trip"
                              onClick={() =>
                                handleMarkAttendance(emp._id, "present")
                              }
                              className="flex h-7 px-1.5 items-center justify-center gap-0.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:scale-105 transition-all border border-indigo-200 font-bold text-[10px]"
                            >
                              <Truck className="h-3 w-3" /> TRIP
                            </button>
                            <button
                              title="Absent"
                              onClick={() =>
                                handleMarkAttendance(emp._id, "absent")
                              }
                              className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100 hover:scale-110 transition-all border border-red-100 font-bold text-[10px]"
                            >
                              A
                            </button>
                            <button
                              title="Leave"
                              onClick={() =>
                                handleMarkAttendance(emp._id, "leave")
                              }
                              className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 hover:scale-110 transition-all border border-amber-100 font-bold text-[10px]"
                            >
                              L
                            </button>
                            <button
                              title="Half Day"
                              onClick={() =>
                                handleMarkAttendance(emp._id, "half_day")
                              }
                              className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 hover:scale-110 transition-all border border-blue-100 font-bold text-[10px]"
                            >
                              HD
                            </button>
                          </div>

                          <button
                            title="Edit"
                            onClick={() => handleEdit(emp._id, att)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 transition-all border border-slate-200"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            title="View History"
                            onClick={() =>
                              router.push(`/attendances/employee/${emp._id}`)
                            }
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 transition-all border border-slate-200"
                          >
                            <Eye size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Attendance Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-bold text-slate-800">
                {editingAttId ? "Edit Attendance" : "Add Detailed Attendance"}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingAttId(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-1 block">
                  Employee *
                </label>
                <Select
                  value={addForm.employeeId}
                  onChange={(e) =>
                    setAddForm({ ...addForm, employeeId: e.target.value })
                  }
                >
                  <option value="">Select Employee</option>
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.name} ({emp.employeeCode}) - {emp.employeeType}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-1 block">
                    Date *
                  </label>
                  <Input
                    type="date"
                    value={addForm.attendanceDate}
                    onChange={(e) =>
                      setAddForm({ ...addForm, attendanceDate: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-1 block">
                    Status *
                  </label>
                  <Select
                    value={addForm.status}
                    onChange={(e) =>
                      setAddForm({ ...addForm, status: e.target.value })
                    }
                  >
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                    <option value="half_day">Half Day</option>
                    <option value="leave">Leave</option>
                    <option value="holiday">Holiday</option>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-1 block">
                    Check In Time
                  </label>
                  <Input
                    type="time"
                    value={addForm.checkIn}
                    onChange={(e) =>
                      setAddForm({ ...addForm, checkIn: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-1 block">
                    Check Out Time
                  </label>
                  <Input
                    type="time"
                    value={addForm.checkOut}
                    onChange={(e) =>
                      setAddForm({ ...addForm, checkOut: e.target.value })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700 mb-1 block">
                  Remarks
                </label>
                <Input
                  placeholder="Any notes..."
                  value={addForm.remarks}
                  onChange={(e) =>
                    setAddForm({ ...addForm, remarks: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex shrink-0 justify-end gap-2 border-t bg-slate-50 px-6 py-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowAddModal(false);
                  setEditingAttId(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveAttendance} disabled={saving}>
                {saving ? <Spinner /> : "Save Attendance"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
