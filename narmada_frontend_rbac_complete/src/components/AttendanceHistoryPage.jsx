"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  startOfWeek,
  endOfWeek,
  isToday,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  CalendarDays,
  Loader2,
  Star,
  Umbrella,
  User,
  LogIn,
  LogOut,
  Timer,
  Download,
  Truck,
  Wrench,
  Building2,
  Phone,
  LayoutGrid,
  List,
  Plus,
  Edit3,
  Coffee,
  X,
  FileSpreadsheet,
  AlertCircle,
  Calendar,
} from "lucide-react";
import {
  getEmployeeById,
  getAttendances,
  createAttendance,
  updateAttendance,
} from "@/src/services";
import { Badge } from "@/src/components/ui";
import { exportToExcelProfessional } from "@/src/lib/excelExport";
import { useActiveCompany } from "@/src/lib/auth";
import { toast } from "sonner";

export default function AttendanceHistoryPage() {
  const router = useRouter();
  const { id } = useParams();
  const activeCompany = useActiveCompany();

  const [employee, setEmployee] = useState(null);
  const [attendances, setAttendances] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("calendar"); // "calendar" | "table"

  // Modal State for viewing or editing attendance
  const [dutyModalOpen, setDutyModalOpen] = useState(false);
  const [modalDay, setModalDay] = useState(null);
  const [modalAttId, setModalAttId] = useState(null);
  const [modalForm, setModalForm] = useState({
    status: "present",
    checkIn: "",
    checkOut: "",
    overtimeHours: 0,
    remarks: "",
  });
  const [savingDuty, setSavingDuty] = useState(false);

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id, currentDate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);

      // Expand query range slightly to avoid UTC/IST boundary clipping
      const queryStart = new Date(start.getTime() - 2 * 24 * 60 * 60 * 1000);
      const queryEnd = new Date(end.getTime() + 2 * 24 * 60 * 60 * 1000);

      const [empRes, attRes] = await Promise.all([
        employee ? Promise.resolve({ data: employee }) : getEmployeeById(id),
        getAttendances({
          employeeId: id,
          fromDate: format(queryStart, "yyyy-MM-dd"),
          toDate: format(queryEnd, "yyyy-MM-dd"),
          limit: 120,
        }),
      ]);

      if (!employee && empRes?.data) setEmployee(empRes.data);
      setAttendances(attRes?.data || []);
    } catch (error) {
      console.error("Attendance fetch error:", error);
      toast.error("Failed to load attendance records");
    } finally {
      setLoading(false);
    }
  };

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  // Timezone-safe date matching
  const getAttendanceForDay = (day) => {
    return attendances.find((att) => {
      if (!att.attendanceDate) return false;
      const d = new Date(att.attendanceDate);
      return (
        d.getFullYear() === day.getFullYear() &&
        d.getMonth() === day.getMonth() &&
        d.getDate() === day.getDate()
      );
    });
  };

  // Time Formatter (hh:mm a)
  const formatTime = (timeVal) => {
    if (!timeVal) return null;
    try {
      const d = new Date(timeVal);
      if (isNaN(d.getTime())) return null;
      return format(d, "hh:mm a");
    } catch {
      return null;
    }
  };

  // Convert Date to Local datetime-local input string (YYYY-MM-DDTHH:mm)
  const toDateTimeLocalString = (dateVal) => {
    if (!dateVal) return "";
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return "";
      const pad = (n) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
      return "";
    }
  };

  // Calendar Days Logic
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  // Month days for Table / Muster Roll view (1 to 28/29/30/31)
  const daysInCurrentMonth = useMemo(() => {
    return eachDayOfInterval({ start: monthStart, end: monthEnd });
  }, [currentDate]);

  // Monthly KPI Statistics
  const stats = useMemo(() => {
    const s = {
      present: 0,
      absent: 0,
      leave: 0,
      half_day: 0,
      holiday: 0,
      totalHours: 0,
      totalOvertime: 0,
    };

    attendances.forEach((att) => {
      if (att.attendanceDate) {
        const d = new Date(att.attendanceDate);
        if (
          d.getFullYear() === currentDate.getFullYear() &&
          d.getMonth() === currentDate.getMonth()
        ) {
          if (s[att.status] !== undefined) s[att.status]++;
          s.totalHours += Number(att.workingHours || 0);
          s.totalOvertime += Number(att.overtimeHours || 0);
        }
      }
    });

    return s;
  }, [attendances, currentDate]);

  // Open modal to mark/edit duty
  const handleOpenDutyModal = (day, existingAtt = null) => {
    setModalDay(day);
    setModalAttId(existingAtt?._id || existingAtt?.id || null);

    if (existingAtt) {
      setModalForm({
        status: existingAtt.status || "present",
        checkIn: toDateTimeLocalString(existingAtt.checkIn),
        checkOut: toDateTimeLocalString(existingAtt.checkOut),
        overtimeHours: existingAtt.overtimeHours || 0,
        remarks: existingAtt.remarks || "",
      });
    } else {
      // Defaults for a new punch in
      const defaultIn = new Date(day);
      defaultIn.setHours(9, 0, 0, 0);
      const defaultOut = new Date(day);
      defaultOut.setHours(18, 0, 0, 0);

      setModalForm({
        status: "present",
        checkIn: toDateTimeLocalString(defaultIn),
        checkOut: toDateTimeLocalString(defaultOut),
        overtimeHours: 0,
        remarks: "",
      });
    }

    setDutyModalOpen(true);
  };

  // Save Duty changes
  const handleSaveDuty = async (e) => {
    e.preventDefault();
    if (!modalDay || !id) return;

    try {
      setSavingDuty(true);

      const payload = {
        employeeId: id,
        attendanceDate: format(modalDay, "yyyy-MM-dd"),
        status: modalForm.status,
        checkIn: modalForm.checkIn
          ? new Date(modalForm.checkIn).toISOString()
          : null,
        checkOut: modalForm.checkOut
          ? new Date(modalForm.checkOut).toISOString()
          : null,
        overtimeHours: Number(modalForm.overtimeHours || 0),
        remarks: modalForm.remarks || "",
      };

      if (modalAttId) {
        await updateAttendance(modalAttId, payload);
        toast.success(`Duty updated for ${format(modalDay, "dd MMM yyyy")}`);
      } else {
        await createAttendance(payload);
        toast.success(`Duty marked for ${format(modalDay, "dd MMM yyyy")}`);
      }

      setDutyModalOpen(false);
      await fetchData();
    } catch (err) {
      console.error("Save duty error:", err);
      toast.error(err?.message || "Failed to save duty log");
    } finally {
      setSavingDuty(false);
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    const columns = [
      { key: "date", label: "Date", type: "date" },
      { key: "day", label: "Day of Week" },
      { key: "status", label: "Duty Status" },
      { key: "checkIn", label: "Punch In Time" },
      { key: "checkOut", label: "Punch Out Time" },
      { key: "workingHours", label: "Duty Hours (Hrs)" },
      { key: "overtime", label: "Overtime (Hrs)" },
      { key: "remarks", label: "Duty Remarks" },
    ];

    const dataRows = daysInCurrentMonth.map((day) => {
      const att = getAttendanceForDay(day);
      return {
        date: format(day, "yyyy-MM-dd"),
        day: format(day, "EEEE"),
        status: att
          ? String(att.status || "").toUpperCase()
          : day.getDay() === 0
            ? "SUNDAY OFF"
            : "UNMARKED",
        checkIn: att?.checkIn ? formatTime(att.checkIn) : "—",
        checkOut: att?.checkOut ? formatTime(att.checkOut) : "—",
        workingHours: att?.workingHours ? `${att.workingHours} hrs` : "—",
        overtime: att?.overtimeHours ? `${att.overtimeHours} hrs` : "—",
        remarks: att?.remarks || "—",
      };
    });

    exportToExcelProfessional({
      title: `${employee?.name || "Fleet Staff"} Monthly Duty Log`,
      subtitle: `${activeCompany?.name || "Narmada Road Lines"} • Muster Roll (${format(currentDate, "MMMM yyyy")})`,
      filename: `${activeCompany?.code || "TMS"}_Muster_${employee?.employeeCode || "emp"}_${format(currentDate, "yyyy-MM")}`,
      sheetName: "Duty Log",
      columns,
      rows: dataRows,
    });
    toast.success("Muster roll exported to Excel");
  };

  const baseUrl =
    process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") ||
    "https://narmada-road-lines.onrender.com";

  const photoUrl = employee?.photo
    ? employee.photo.startsWith("http")
      ? employee.photo
      : `${baseUrl}${employee.photo}`
    : employee?.profileImage
      ? employee.profileImage.startsWith("http")
        ? employee.profileImage
        : `${baseUrl}${employee.profileImage}`
      : null;

  return (
    <div className="flex flex-col min-h-full bg-slate-50/60 p-4 md:p-6 space-y-6 pb-24 text-slate-800">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div className="flex items-start gap-3.5">
          <button
            onClick={() => router.push("/attendances")}
            className="mt-1 p-2 bg-white border border-slate-200/90 rounded-xl hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700 transition shadow-2xs cursor-pointer"
            title="Back to Fleet Attendance"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-black uppercase tracking-wider text-amber-900 shadow-2xs">
                <Truck className="h-3.5 w-3.5 text-amber-600" />
                Fleet Crew Muster Roll • Monthly Duty Log
              </span>
              <span className="rounded-full bg-emerald-100 border border-emerald-300 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                Live Roster
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-black text-slate-900 leading-tight">
              {employee?.name || "Driver"} • Monthly Duty & Attendance Log
            </h1>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
              <span
                className="cursor-pointer hover:text-amber-600 transition"
                onClick={() => router.push("/dashboard")}
              >
                Dashboard
              </span>
              <span className="text-slate-300">/</span>
              <span
                className="cursor-pointer hover:text-amber-600 transition"
                onClick={() => router.push("/employees")}
              >
                Employees
              </span>
              <span className="text-slate-300">/</span>
              <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                {employee?.employeeCode || "DRV-CREW"}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-600 font-medium">
                {activeCompany?.city
                  ? `${activeCompany.city} Central Depot`
                  : "Jaipur Hub Active"}
              </span>
            </div>
          </div>
        </div>

        {/* Top Header Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleOpenDutyModal(new Date())}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-3.5 py-2 text-xs font-black text-slate-950 shadow-md hover:from-amber-400 hover:to-amber-500 transition cursor-pointer"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            Log Duty / Punch In
          </button>
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition cursor-pointer"
            title="Download Excel Sheet"
          >
            <Download className="h-4 w-4 text-emerald-600" /> Export Excel
            (.xlsx)
          </button>
        </div>
      </div>

      {/* Main 2-Card Top Section: Profile Card & Monthly KPI Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Card: Driver / Crew Member Profile (4 cols) */}
        <div className="lg:col-span-4 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-4">
              <div className="relative h-20 w-20 shrink-0 rounded-2xl border-2 border-amber-400/80 bg-slate-100 shadow-md overflow-hidden">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt={employee?.name || "Driver"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="grid h-full w-full place-items-center bg-slate-100 text-slate-400">
                    <User className="h-9 w-9 text-slate-400" />
                  </div>
                )}
                {employee?.status === "active" && (
                  <span
                    className="absolute bottom-1.5 right-1.5 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-white shadow-xs"
                    title="Active on Duty Roster"
                  />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-black px-2 py-0.5 bg-slate-100 border border-slate-300 rounded text-slate-900 shadow-2xs">
                    {employee?.employeeCode || "DRV-8575"}
                  </span>
                  <Badge value={employee?.status || "active"} />
                </div>
                <h2 className="mt-1 text-lg font-black text-slate-900 truncate">
                  {employee?.name || "Ramesh Kumar"}
                </h2>
                {employee?.phone ? (
                  <a
                    href={`tel:${employee.phone}`}
                    className="mt-1 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 transition bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/70"
                  >
                    <Phone className="h-3 w-3 text-emerald-600" />
                    {employee.phone}
                  </a>
                ) : (
                  <span className="text-xs text-slate-400 font-medium">
                    No Phone
                  </span>
                )}
              </div>
            </div>

            {/* Crew Details List */}
            <div className="mt-5 space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">
                  Crew Role:
                </span>
                {employee?.employeeType === "driver" ? (
                  <span className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 font-black text-amber-950">
                    <Truck className="h-3 w-3 text-amber-600" />
                    Commercial Driver (HMV)
                  </span>
                ) : employee?.employeeType?.includes("mechanic") ? (
                  <span className="inline-flex items-center gap-1 rounded-md border border-sky-300 bg-sky-50 px-2 py-0.5 font-black text-sky-950">
                    <Wrench className="h-3 w-3 text-sky-600" />
                    Workshop Mechanic
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 font-bold text-slate-800">
                    <Building2 className="h-3 w-3 text-slate-600" />
                    {employee?.designation || "Operations Staff"}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">
                  Department:
                </span>
                <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50/70 px-2 py-0.5 font-bold text-amber-950">
                  <Truck className="h-3 w-3 text-amber-600" />
                  {employee?.department || "Fleet Operations"}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">
                  Base Salary / Wage:
                </span>
                <span className="font-bold text-emerald-800 font-mono">
                  {employee?.basicSalary
                    ? `₹ ${Number(employee.basicSalary).toLocaleString("en-IN")}/mo`
                    : "Standard Monthly"}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Roster Shift: Regular 10h</span>
            <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              Assigned: All Heavy Haul
            </span>
          </div>
        </div>

        {/* Right Card: Monthly Duty Statistics & Breakdown (8 cols) */}
        <div className="lg:col-span-8 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
                  <CalendarDays className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                    Monthly Duty Performance •{" "}
                    {format(currentDate, "MMMM yyyy")}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Live tally of duty attendance, leaves, and driver shifts
                  </p>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-xs font-mono">
                <span className="text-slate-500">Total Hours Logged:</span>
                <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  ⏱ {stats.totalHours.toFixed(1)} hrs
                </span>
              </div>
            </div>

            {/* 5 Transport Theme KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {/* 1. Present */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 flex flex-col items-center justify-center text-center shadow-2xs hover:bg-emerald-50 transition">
                <div className="flex items-center gap-1 text-emerald-800 font-bold text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Present
                </div>
                <span className="mt-1 text-2xl font-black text-emerald-900">
                  {stats.present}
                </span>
                <span className="text-[10px] text-emerald-700 font-medium">
                  Days on Duty
                </span>
              </div>

              {/* 2. Absent */}
              <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3 flex flex-col items-center justify-center text-center shadow-2xs hover:bg-rose-50 transition">
                <div className="flex items-center gap-1 text-rose-800 font-bold text-xs">
                  <XCircle className="h-3.5 w-3.5 text-rose-600" />
                  Absent
                </div>
                <span className="mt-1 text-2xl font-black text-rose-900">
                  {stats.absent}
                </span>
                <span className="text-[10px] text-rose-700 font-medium">
                  Unreported
                </span>
              </div>

              {/* 3. Leave */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 flex flex-col items-center justify-center text-center shadow-2xs hover:bg-amber-50 transition">
                <div className="flex items-center gap-1 text-amber-800 font-bold text-xs">
                  <Umbrella className="h-3.5 w-3.5 text-amber-600" />
                  Leave
                </div>
                <span className="mt-1 text-2xl font-black text-amber-900">
                  {stats.leave}
                </span>
                <span className="text-[10px] text-amber-700 font-medium">
                  Approved Leave
                </span>
              </div>

              {/* 4. Half Day */}
              <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3 flex flex-col items-center justify-center text-center shadow-2xs hover:bg-sky-50 transition">
                <div className="flex items-center gap-1 text-sky-800 font-bold text-xs">
                  <Clock className="h-3.5 w-3.5 text-sky-600" />
                  Half Day
                </div>
                <span className="mt-1 text-2xl font-black text-sky-900">
                  {stats.half_day}
                </span>
                <span className="text-[10px] text-sky-700 font-medium">
                  4h Shifts
                </span>
              </div>

              {/* 5. Holiday */}
              <div className="rounded-xl border border-purple-200 bg-purple-50/70 p-3 flex flex-col items-center justify-center text-center shadow-2xs hover:bg-purple-50 transition">
                <div className="flex items-center gap-1 text-purple-800 font-bold text-xs">
                  <Star className="h-3.5 w-3.5 text-purple-600 fill-purple-300" />
                  Holiday
                </div>
                <span className="mt-1 text-2xl font-black text-purple-900">
                  {stats.holiday}
                </span>
                <span className="text-[10px] text-purple-700 font-medium">
                  Gazetted & Off
                </span>
              </div>
            </div>
          </div>

          {/* Progress / Duty Summary Bar */}
          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs mb-1.5 font-bold">
              <span className="text-slate-600">
                Duty Compliance:{" "}
                <span className="text-slate-900 font-black">
                  {stats.present + stats.half_day * 0.5} /{" "}
                  {daysInCurrentMonth.length} Days
                </span>
              </span>
              <span className="text-emerald-700 font-black">
                {Math.round(
                  ((stats.present + stats.half_day * 0.5) /
                    (daysInCurrentMonth.length || 1)) *
                    100,
                )}
                % Fulfilled
              </span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden border border-slate-200/80">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-amber-500 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(
                    100,
                    Math.round(
                      ((stats.present + stats.half_day * 0.5) /
                        (daysInCurrentMonth.length || 1)) *
                        100,
                    ),
                  )}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Roster Section: Toolbar with Month Selector & View Toggle */}
      <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
        {/* Navigation Toolbar */}
        <div className="p-4 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
          <div className="flex items-center gap-2">
            {/* Month Navigator */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
              <button
                onClick={prevMonth}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <input
                type="month"
                value={format(currentDate, "yyyy-MM")}
                onChange={(e) => {
                  if (e.target.value) {
                    const [year, month] = e.target.value.split("-");
                    const newDate = new Date(currentDate);
                    newDate.setFullYear(year);
                    newDate.setMonth(month - 1);
                    setCurrentDate(newDate);
                  }
                }}
                className="font-black text-slate-900 text-xs sm:text-sm px-2 text-center bg-transparent border-none outline-none cursor-pointer hover:bg-slate-50 rounded"
              />
              <button
                onClick={nextMonth}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition cursor-pointer"
                title="Next Month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <button
              onClick={goToToday}
              className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition shadow-2xs cursor-pointer"
            >
              Today
            </button>
          </div>

          {/* View Mode Toggle: Calendar Grid vs Muster Sheet Table */}
          <div className="flex items-center gap-1.5">
            <div className="inline-flex rounded-xl bg-slate-200/70 p-1 border border-slate-300/80 text-xs font-bold">
              <button
                onClick={() => setViewMode("calendar")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  viewMode === "calendar"
                    ? "bg-white text-slate-900 shadow-xs font-black"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Duty Calendar
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  viewMode === "table"
                    ? "bg-white text-slate-900 shadow-xs font-black"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <List className="h-3.5 w-3.5" />
                Muster Roll Ledger
              </button>
            </div>
          </div>
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Loading Muster Roll & Duty Shifts...
            </p>
          </div>
        ) : viewMode === "calendar" ? (
          /* ============================================================ */
          /* 1. DUTY CALENDAR VIEW WITH PUNCH IN / OUT DIRECTLY ON CELLS  */
          /* ============================================================ */
          <div className="p-4 md:p-6 overflow-x-auto">
            <div className="min-w-[850px]">
              {/* Day Name Headers */}
              <div className="grid grid-cols-7 gap-2.5 mb-2.5">
                {[
                  { name: "SUN", isWeekend: true },
                  { name: "MON" },
                  { name: "TUE" },
                  { name: "WED" },
                  { name: "THU" },
                  { name: "FRI" },
                  { name: "SAT" },
                ].map((d) => (
                  <div
                    key={d.name}
                    className={`py-2 text-center text-xs font-black tracking-wider rounded-lg border ${
                      d.isWeekend
                        ? "bg-rose-50/80 text-rose-700 border-rose-200"
                        : "bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                  >
                    {d.name}
                  </div>
                ))}
              </div>

              {/* Calendar Grid of Duty Day Cards */}
              <div className="grid grid-cols-7 gap-2.5">
                {calendarDays.map((day, i) => {
                  const attendance = getAttendanceForDay(day);
                  const isCurrentMonth = isSameMonth(day, monthStart);
                  const isCurrentToday = isToday(day);
                  const isSunday = day.getDay() === 0;
                  const status = attendance?.status;

                  const inTime = formatTime(attendance?.checkIn);
                  const outTime = formatTime(attendance?.checkOut);
                  const hours = attendance?.workingHours;

                  return (
                    <div
                      key={i}
                      onClick={() => {
                        if (isCurrentMonth) {
                          handleOpenDutyModal(day, attendance);
                        }
                      }}
                      className={`
                        group relative flex flex-col justify-between p-2.5 rounded-xl border transition-all duration-200 min-h-[135px] text-left
                        ${!isCurrentMonth ? "bg-slate-50/40 text-slate-300 border-slate-100 pointer-events-none select-none opacity-40" : "cursor-pointer hover:shadow-md hover:-translate-y-0.5"}
                        ${
                          isCurrentMonth && status === "present"
                            ? "bg-emerald-50/40 border-emerald-300/90 hover:border-emerald-500"
                            : isCurrentMonth && status === "absent"
                              ? "bg-rose-50/40 border-rose-300/90 hover:border-rose-500"
                              : isCurrentMonth && status === "leave"
                                ? "bg-amber-50/40 border-amber-300/90 hover:border-amber-500"
                                : isCurrentMonth && status === "half_day"
                                  ? "bg-sky-50/40 border-sky-300/90 hover:border-sky-500"
                                  : isCurrentMonth && status === "holiday"
                                    ? "bg-purple-50/40 border-purple-300/90 hover:border-purple-500"
                                    : isCurrentMonth && isSunday
                                      ? "bg-slate-50/70 border-slate-200 text-slate-500"
                                      : isCurrentMonth
                                        ? "bg-white border-slate-200 hover:border-amber-400"
                                        : ""
                        }
                        ${isCurrentToday ? "ring-2 ring-amber-500 ring-offset-1 font-bold" : ""}
                      `}
                    >
                      {/* Cell Top Header: Date number + Day + Today Badge */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-sm font-black font-mono ${
                              isCurrentToday
                                ? "text-amber-800 bg-amber-100 px-1.5 rounded"
                                : isSunday && isCurrentMonth
                                  ? "text-rose-600"
                                  : isCurrentMonth
                                    ? "text-slate-800"
                                    : "text-slate-400"
                            }`}
                          >
                            {format(day, "d")}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-400 uppercase">
                            {format(day, "EEE")}
                          </span>
                        </div>

                        {isCurrentToday && (
                          <span className="rounded bg-amber-500 px-1 py-0.2 text-[8px] font-black uppercase text-slate-950">
                            Today
                          </span>
                        )}

                        {/* Quick edit icon indicator on hover */}
                        <span className="hidden group-hover:inline-flex p-0.5 rounded bg-white text-slate-500 shadow-2xs">
                          <Edit3 className="h-3 w-3 text-amber-600" />
                        </span>
                      </div>

                      {/* Cell Middle: Status Pill & Duty Information */}
                      <div className="my-1.5 space-y-1">
                        {isCurrentMonth && status ? (
                          <>
                            {/* Status Badge */}
                            <div>
                              {status === "present" && (
                                <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-black text-emerald-800 border border-emerald-300">
                                  <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                                  Present
                                </span>
                              )}
                              {status === "absent" && (
                                <span className="inline-flex items-center gap-1 rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-black text-rose-800 border border-rose-300">
                                  <XCircle className="h-3 w-3 text-rose-600 shrink-0" />
                                  Absent
                                </span>
                              )}
                              {status === "leave" && (
                                <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-black text-amber-900 border border-amber-300">
                                  <Umbrella className="h-3 w-3 text-amber-600 shrink-0" />
                                  On Leave
                                </span>
                              )}
                              {status === "half_day" && (
                                <span className="inline-flex items-center gap-1 rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-black text-sky-800 border border-sky-300">
                                  <Clock className="h-3 w-3 text-sky-600 shrink-0" />
                                  Half Day
                                </span>
                              )}
                              {status === "holiday" && (
                                <span className="inline-flex items-center gap-1 rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-black text-purple-900 border border-purple-300">
                                  <Star className="h-3 w-3 text-purple-600 fill-purple-400 shrink-0" />
                                  Holiday
                                </span>
                              )}
                            </div>

                            {/* Punch In / Out times */}
                            {(status === "present" ||
                              status === "half_day") && (
                              <div className="space-y-0.5 text-[10px] font-mono leading-tight">
                                {inTime && (
                                  <div className="flex items-center gap-1 text-emerald-800 font-semibold truncate">
                                    <LogIn className="h-2.5 w-2.5 text-emerald-600 shrink-0" />
                                    <span>IN: {inTime}</span>
                                  </div>
                                )}
                                {outTime && (
                                  <div className="flex items-center gap-1 text-amber-800 font-semibold truncate">
                                    <LogOut className="h-2.5 w-2.5 text-amber-600 shrink-0" />
                                    <span>OUT: {outTime}</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Leave / Holiday / Absent remarks */}
                            {attendance?.remarks && (
                              <p className="text-[9px] text-slate-500 truncate italic">
                                &quot;{attendance.remarks}&quot;
                              </p>
                            )}
                          </>
                        ) : isCurrentMonth ? (
                          isSunday ? (
                            <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500 border border-slate-200">
                              <Coffee className="h-3 w-3 text-slate-400" />
                              Sunday Off
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-300 italic group-hover:text-amber-600 group-hover:font-semibold">
                              + Click to Mark
                            </span>
                          )
                        ) : null}
                      </div>

                      {/* Cell Bottom: Working Hours & Overtime */}
                      <div className="pt-1 border-t border-slate-100/80 flex items-center justify-between text-[9px] font-mono">
                        {isCurrentMonth && hours > 0 ? (
                          <span className="text-emerald-800 font-bold bg-emerald-100/60 px-1 rounded">
                            ⏱ {hours} hrs
                          </span>
                        ) : (
                          <span />
                        )}

                        {isCurrentMonth && attendance?.overtimeHours > 0 && (
                          <span className="text-indigo-700 font-bold bg-indigo-50 px-1 rounded">
                            +{attendance.overtimeHours}h OT
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* ============================================================ */
          /* 2. MUSTER ROLL SHEET TABLE VIEW (CONTINUOUS 1-31 DAY LIST)   */
          /* ============================================================ */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/80 text-slate-700 font-black uppercase tracking-wider text-[11px]">
                  <th className="px-4 py-3 w-14 text-center">#</th>
                  <th className="px-4 py-3">Date & Day</th>
                  <th className="px-4 py-3">Duty Status</th>
                  <th className="px-4 py-3">Punch In</th>
                  <th className="px-4 py-3">Punch Out</th>
                  <th className="px-4 py-3">Duty Hours</th>
                  <th className="px-4 py-3">Overtime</th>
                  <th className="px-4 py-3">Remarks</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {daysInCurrentMonth.map((day, idx) => {
                  const att = getAttendanceForDay(day);
                  const isCurrentToday = isToday(day);
                  const isSunday = day.getDay() === 0;
                  const inTime = formatTime(att?.checkIn);
                  const outTime = formatTime(att?.checkOut);

                  return (
                    <tr
                      key={idx}
                      className={`hover:bg-amber-50/30 transition-colors ${
                        isCurrentToday
                          ? "bg-amber-50/40 font-semibold"
                          : isSunday
                            ? "bg-slate-50/50"
                            : ""
                      }`}
                    >
                      <td className="px-4 py-2.5 text-center font-mono text-slate-400">
                        {idx + 1}
                      </td>

                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 font-mono">
                            {format(day, "dd MMM yyyy")}
                          </span>
                          <span
                            className={`rounded px-1.5 py-0.2 text-[10px] font-bold uppercase ${
                              isSunday
                                ? "bg-rose-100 text-rose-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {format(day, "EEEE")}
                          </span>
                          {isCurrentToday && (
                            <span className="rounded bg-amber-500 px-1.5 py-0.2 text-[9px] font-black uppercase text-slate-950">
                              Today
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-2.5 whitespace-nowrap">
                        {att ? (
                          att.status === "present" ? (
                            <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-xs font-black text-emerald-800 border border-emerald-300">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              Present
                            </span>
                          ) : att.status === "absent" ? (
                            <span className="inline-flex items-center gap-1 rounded bg-rose-100 px-2 py-0.5 text-xs font-black text-rose-800 border border-rose-300">
                              <XCircle className="h-3 w-3 text-rose-600" />
                              Absent
                            </span>
                          ) : att.status === "leave" ? (
                            <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-xs font-black text-amber-900 border border-amber-300">
                              <Umbrella className="h-3 w-3 text-amber-600" />
                              On Leave
                            </span>
                          ) : att.status === "half_day" ? (
                            <span className="inline-flex items-center gap-1 rounded bg-sky-100 px-2 py-0.5 text-xs font-black text-sky-800 border border-sky-300">
                              <Clock className="h-3 w-3 text-sky-600" />
                              Half Day
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded bg-purple-100 px-2 py-0.5 text-xs font-black text-purple-900 border border-purple-300">
                              <Star className="h-3 w-3 text-purple-600 fill-purple-400" />
                              Holiday
                            </span>
                          )
                        ) : isSunday ? (
                          <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500 border border-slate-200">
                            <Coffee className="h-3 w-3 text-slate-400" />
                            Sunday Off
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium italic">
                            — Not Marked
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-2.5 whitespace-nowrap font-mono font-bold text-slate-700">
                        {inTime ? (
                          <span className="inline-flex items-center gap-1 text-emerald-800">
                            <LogIn className="h-3 w-3 text-emerald-600" />
                            {inTime}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>

                      <td className="px-4 py-2.5 whitespace-nowrap font-mono font-bold text-slate-700">
                        {outTime ? (
                          <span className="inline-flex items-center gap-1 text-amber-800">
                            <LogOut className="h-3 w-3 text-amber-600" />
                            {outTime}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>

                      <td className="px-4 py-2.5 whitespace-nowrap font-mono font-bold text-slate-900">
                        {att?.workingHours ? `${att.workingHours} hrs` : "—"}
                      </td>

                      <td className="px-4 py-2.5 whitespace-nowrap font-mono text-slate-700">
                        {att?.overtimeHours ? `+${att.overtimeHours} hrs` : "—"}
                      </td>

                      <td className="px-4 py-2.5 text-slate-600 max-w-[200px] truncate">
                        {att?.remarks || "—"}
                      </td>

                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleOpenDutyModal(day, att)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:border-amber-400 hover:bg-amber-50 hover:text-amber-900 transition shadow-2xs cursor-pointer"
                        >
                          <Edit3 className="h-3 w-3 text-amber-600" />
                          {att ? "Edit" : "Mark"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 3. MARK / EDIT DUTY MODAL                                    */}
      {/* ============================================================ */}
      {dutyModalOpen && modalDay && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onClick={() => setDutyModalOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-4 text-slate-950 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-wider text-amber-950">
                  Duty Roster Shift Entry
                </p>
                <h3 className="text-lg font-black mt-0.5">
                  {format(modalDay, "EEEE, dd MMMM yyyy")}
                </h3>
                <p className="text-xs font-bold text-amber-950/80">
                  Crew: {employee?.name || "Driver"} (
                  {employee?.employeeCode || "DRV-CREW"})
                </p>
              </div>
              <button
                onClick={() => setDutyModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-black/10 transition cursor-pointer text-slate-950"
              >
                <X className="h-5 w-5 stroke-[2.5]" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveDuty} className="p-6 space-y-4">
              {/* Status Radio Pills */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-2">
                  Select Duty Status <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {[
                    {
                      val: "present",
                      label: "Present",
                      color: "emerald",
                      icon: CheckCircle2,
                    },
                    {
                      val: "absent",
                      label: "Absent",
                      color: "rose",
                      icon: XCircle,
                    },
                    {
                      val: "leave",
                      label: "Leave",
                      color: "amber",
                      icon: Umbrella,
                    },
                    {
                      val: "half_day",
                      label: "Half Day",
                      color: "sky",
                      icon: Clock,
                    },
                    {
                      val: "holiday",
                      label: "Holiday",
                      color: "purple",
                      icon: Star,
                    },
                  ].map((s) => {
                    const active = modalForm.status === s.val;
                    const Icon = s.icon;
                    return (
                      <button
                        key={s.val}
                        type="button"
                        onClick={() =>
                          setModalForm({ ...modalForm, status: s.val })
                        }
                        className={`flex flex-col items-center justify-center p-2 rounded-xl border text-xs font-black transition cursor-pointer ${
                          active
                            ? "bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-amber-400"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <Icon className="h-4 w-4 mb-1" />
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Punch In / Out Timing Fields (Only for present / half_day) */}
              {(modalForm.status === "present" ||
                modalForm.status === "half_day") && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-amber-50/50 border border-amber-200/80">
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1">
                      <LogIn className="h-3 w-3 text-emerald-600" /> Punch In
                      Time
                    </label>
                    <input
                      type="datetime-local"
                      value={modalForm.checkIn}
                      onChange={(e) =>
                        setModalForm({ ...modalForm, checkIn: e.target.value })
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1">
                      <LogOut className="h-3 w-3 text-amber-600" /> Punch Out
                      Time
                    </label>
                    <input
                      type="datetime-local"
                      value={modalForm.checkOut}
                      onChange={(e) =>
                        setModalForm({ ...modalForm, checkOut: e.target.value })
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Overtime Hours */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                  Overtime (Hours)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={modalForm.overtimeHours}
                  onChange={(e) =>
                    setModalForm({
                      ...modalForm,
                      overtimeHours: e.target.value,
                    })
                  }
                  placeholder="0"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* Duty Remarks */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                  Duty Remarks / Shift Notes
                </label>
                <input
                  type="text"
                  value={modalForm.remarks}
                  onChange={(e) =>
                    setModalForm({ ...modalForm, remarks: e.target.value })
                  }
                  placeholder="e.g. Long-haul Jaipur to Ahmedabad route / Approved Leave"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* Modal Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDutyModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingDuty}
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-black text-slate-950 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 rounded-xl shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  {savingDuty && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  Save Duty Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
