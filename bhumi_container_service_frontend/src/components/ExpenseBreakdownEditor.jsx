"use client";
import React, { useState } from "react";
import {
  Plus,
  Trash2,
  Tag,
  IndianRupee,
  FileText,
  Calendar,
  Layers,
} from "lucide-react";

export const EXPENSE_CATEGORIES = [
  "Other / Misc",
  "Loading / Hammali",
  "Unloading / Hammali",
  "Toll / FASTag",
  "Diesel / Fuel",
  "Detention / Halting Charges",
  "Driver Allowance / Bhatta (AC)",
  "Weighbridge / Kanta",
  "Police / RTO / Border",
  "Repair / Maintenance / Puncture",
  "Parking Charges",
  "Catting / Commission",
  "Tea & Refreshment",
  "Office / Misc",
  "Other / Extra Charges",
];

const safeDateStr = (val, defaultVal = "") => {
  if (!val) {
    return defaultVal || new Date().toISOString().split("T")[0];
  }
  if (typeof val === "string") {
    if (val.includes("T")) return val.split("T")[0];
    return val;
  }
  if (val instanceof Date && !isNaN(val)) {
    return val.toISOString().split("T")[0];
  }
  return defaultVal || new Date().toISOString().split("T")[0];
};

export default function ExpenseBreakdownEditor({
  label = "Extra Exp (₹)",
  amount = 0,
  expenses = [],
  onChange,
  placeholder = "0",
  helperText = "",
  theme = "emerald", // "emerald" | "blue" | "amber" | "rose"
  readOnly = false,
  defaultDate = "",
}) {
  const items = Array.isArray(expenses) ? expenses : [];
  const todayStr = safeDateStr(defaultDate, new Date().toISOString().split("T")[0]);

  // Fallback for row 1 if items array is empty but amount exists
  const firstCategory =
    items.length > 0 && items[0]?.category
      ? items[0].category
      : "Other / Misc";

  const firstAmount =
    items.length > 0
      ? (items[0]?.amount !== undefined && items[0]?.amount !== null ? items[0].amount : "")
      : (amount !== undefined && amount !== null && amount !== 0 && amount !== "" ? amount : "");

  const firstDate =
    items.length > 0 && items[0]?.date
      ? safeDateStr(items[0].date, todayStr)
      : todayStr;

  const firstDescription =
    items.length > 0 && items[0]?.description
      ? items[0].description
      : "";

  // The list of rows to actually render
  const rowsToRender =
    items.length > 0
      ? items
      : [
          {
            category: firstCategory,
            amount: firstAmount,
            date: firstDate,
            description: firstDescription,
          },
        ];

  // Helper to trigger onChange callback
  const triggerChange = (updated) => {
    const sum = updated.reduce(
      (acc, curr) => acc + (parseFloat(curr?.amount) || 0),
      0,
    );

    // Keep rows that have an amount, description, or custom category
    const validItems = updated.filter(
      (it) =>
        (parseFloat(it.amount) || 0) > 0 ||
        (it.description && it.description.trim()) ||
        (it.category && it.category !== "Other / Misc"),
    );

    if (typeof onChange === "function") {
      onChange(sum, validItems.length > 0 ? validItems : updated);
    }
  };

  // Update a field in a row (category, amount, date, description)
  const handleUpdateItem = (index, field, value) => {
    let currentList = items.length > 0
      ? [...items]
      : [
          {
            category: firstCategory,
            amount: firstAmount,
            date: firstDate,
            description: firstDescription,
          },
        ];

    while (currentList.length <= index) {
      currentList.push({
        category: "Other / Misc",
        amount: "",
        date: todayStr,
        description: "",
      });
    }

    const updated = currentList.map((item, idx) => {
      if (idx !== index) return item;
      return {
        ...item,
        [field]: field === "amount" ? (value === "" ? "" : value) : value,
      };
    });

    triggerChange(updated);
  };

  // Add another expense row
  const handleAddAnotherRow = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (readOnly) return;

    let currentList = items.length > 0
      ? [...items]
      : [
          {
            category: firstCategory,
            amount: firstAmount,
            date: firstDate,
            description: firstDescription,
          },
        ];

    const newRow = {
      category: "Loading / Hammali",
      amount: "",
      date: todayStr,
      description: "",
    };

    const updated = [...currentList, newRow];
    triggerChange(updated);
  };

  // Remove a row
  const handleRemoveRow = (index, e) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (readOnly) return;

    const updated = items.filter((_, idx) => idx !== index);
    triggerChange(updated.length > 0 ? updated : []);
  };

  const currentTotal =
    items.length > 0
      ? items.reduce((acc, curr) => acc + (Number(curr?.amount) || 0), 0)
      : Number(amount) || 0;

  const themeStyles = {
    emerald: {
      btn: "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
      focusBorder: "focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20",
      totalBadge: "bg-emerald-100 text-emerald-950 border-emerald-300",
      accent: "text-emerald-700",
    },
    blue: {
      btn: "border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100",
      focusBorder: "focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20",
      totalBadge: "bg-blue-100 text-blue-950 border-blue-300",
      accent: "text-blue-700",
    },
    amber: {
      btn: "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100",
      focusBorder: "focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20",
      totalBadge: "bg-amber-100 text-amber-950 border-amber-300",
      accent: "text-amber-700",
    },
    rose: {
      btn: "border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100",
      focusBorder: "focus-within:border-rose-500 focus-within:ring-2 focus-within:ring-rose-500/20",
      totalBadge: "bg-rose-100 text-rose-950 border-rose-300",
      accent: "text-rose-700",
    },
  }[theme] || {
    btn: "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
    focusBorder: "focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20",
    totalBadge: "bg-emerald-100 text-emerald-950 border-emerald-300",
    accent: "text-emerald-700",
  };

  const isMultiple = rowsToRender.length > 1;

  return (
    <div className="w-full space-y-2 rounded-2xl border border-slate-200/90 bg-slate-50/50 p-3 sm:p-3.5 shadow-2xs">
      {/* 1. Header Bar: Label, Item Count, Total Sum & "+ Add Another Expense" */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/70 pb-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 font-black text-xs uppercase tracking-wider text-slate-800">
            <Layers className="h-4 w-4 text-slate-500" />
            <span>{label}</span>
          </div>

          {currentTotal > 0 && (
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-black ${themeStyles.totalBadge}`}>
              ₹{Number(currentTotal).toLocaleString("en-IN")}
              {rowsToRender.length > 1 && (
                <span className="text-[10px] opacity-75 font-normal">
                  ({rowsToRender.length} items)
                </span>
              )}
            </span>
          )}
        </div>

        {!readOnly && (
          <button
            type="button"
            onClick={handleAddAnotherRow}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-black transition shadow-2xs cursor-pointer ${themeStyles.btn}`}
            title="Click to add another categorized expense with date and receipt"
          >
            <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>+ Add Another Expense</span>
          </button>
        )}
      </div>

      {/* 2. Column Headers for Desktop (md:) */}
      <div className="hidden md:grid md:grid-cols-12 gap-2 px-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
        <div className="md:col-span-3 flex items-center gap-1">
          <Tag className="h-3 w-3 text-slate-400" />
          <span>Expense Category *</span>
        </div>
        <div className="md:col-span-2 flex items-center gap-1">
          <IndianRupee className="h-3 w-3 text-slate-400" />
          <span>Amount (₹) *</span>
        </div>
        <div className="md:col-span-3 flex items-center gap-1">
          <Calendar className="h-3 w-3 text-slate-400" />
          <span>Expense Date 📅 *</span>
        </div>
        <div className={isMultiple && !readOnly ? "md:col-span-3 flex items-center gap-1" : "md:col-span-4 flex items-center gap-1"}>
          <FileText className="h-3 w-3 text-slate-400" />
          <span>Note / Receipt / Slip No. 📝</span>
        </div>
        {isMultiple && !readOnly && (
          <div className="md:col-span-1 text-center">
            <span>Del</span>
          </div>
        )}
      </div>

      {/* 3. Expense Rows List */}
      <div className="space-y-2">
        {rowsToRender.map((rowItem, index) => {
          const cat = rowItem.category || "Other / Misc";
          const rowDate = safeDateStr(rowItem.date, todayStr);

          return (
            <div
              key={index}
              className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center rounded-xl border border-slate-200 bg-white p-2 sm:p-2.5 shadow-2xs transition hover:border-slate-300"
            >
              {/* Field 1: Category Dropdown (3 cols on desktop) */}
              <div className="col-span-12 md:col-span-3">
                <label className="block md:hidden text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                  Category
                </label>
                <div className="relative flex items-center rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-slate-100/90 transition">
                  <Tag className="absolute left-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  <select
                    value={cat}
                    onChange={(e) =>
                      handleUpdateItem(index, "category", e.target.value)
                    }
                    disabled={readOnly}
                    className="w-full bg-transparent pl-8 pr-3 py-2 text-xs font-bold text-slate-900 outline-none cursor-pointer truncate"
                    title="Select Expense Category"
                  >
                    {!EXPENSE_CATEGORIES.includes(cat) && cat && (
                      <option value={cat}>{cat}</option>
                    )}
                    {EXPENSE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Field 2: Amount Numeric Input (2 cols on desktop) */}
              <div className="col-span-12 sm:col-span-6 md:col-span-2">
                <label className="block md:hidden text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                  Amount (₹)
                </label>
                <div className="relative flex items-center rounded-xl border border-slate-200 bg-white focus-within:border-emerald-500">
                  <span className="absolute left-2.5 text-xs font-black text-slate-400 select-none">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder={placeholder || "0"}
                    value={
                      rowItem.amount !== undefined &&
                      rowItem.amount !== null &&
                      rowItem.amount !== ""
                        ? rowItem.amount
                        : ""
                    }
                    onChange={(e) =>
                      handleUpdateItem(index, "amount", e.target.value)
                    }
                    readOnly={readOnly}
                    className="w-full py-2 pl-6 pr-2 text-xs font-black font-mono text-slate-950 outline-none bg-transparent"
                  />
                </div>
              </div>

              {/* Field 3: Expense Date Input (3 cols on desktop) */}
              <div className="col-span-12 sm:col-span-6 md:col-span-3">
                <label className="block md:hidden text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                  Expense Date 📅
                </label>
                <div className="relative flex items-center rounded-xl border border-slate-200 bg-white focus-within:border-emerald-500">
                  <Calendar className="absolute left-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="date"
                    value={rowDate}
                    onChange={(e) =>
                      handleUpdateItem(index, "date", e.target.value)
                    }
                    readOnly={readOnly}
                    className="w-full py-2 pl-8 pr-2 text-xs font-bold text-slate-800 outline-none bg-transparent cursor-pointer"
                    title="Select the date when this expense was incurred"
                  />
                </div>
              </div>

              {/* Field 4: Note / Receipt / Slip No. (3 or 4 cols on desktop) */}
              <div
                className={`col-span-12 ${
                  isMultiple && !readOnly
                    ? "sm:col-span-10 md:col-span-3"
                    : "sm:col-span-12 md:col-span-4"
                }`}
              >
                <label className="block md:hidden text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                  Note / Receipt
                </label>
                <div className="relative flex items-center rounded-xl border border-slate-200 bg-white focus-within:border-emerald-500">
                  <FileText className="absolute left-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="e.g. Vadodara Toll / Slip #104"
                    value={rowItem.description || ""}
                    onChange={(e) =>
                      handleUpdateItem(index, "description", e.target.value)
                    }
                    readOnly={readOnly}
                    className="w-full py-2 pl-8 pr-2 text-xs font-medium text-slate-700 outline-none bg-transparent"
                  />
                </div>
              </div>

              {/* Field 5: Delete Button (1 col on desktop) */}
              {isMultiple && !readOnly && (
                <div className="col-span-12 sm:col-span-2 md:col-span-1 flex items-center justify-end md:justify-center">
                  <button
                    type="button"
                    onClick={(e) => handleRemoveRow(index, e)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                    title="Delete this expense"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 4. Footer Summary & Bottom Quick Add Button */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        {helperText ? (
          <p className="text-[11px] font-medium text-slate-500 leading-tight">
            💡 {helperText}
          </p>
        ) : (
          <div />
        )}

        {isMultiple && !readOnly && (
          <button
            type="button"
            onClick={handleAddAnotherRow}
            className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[11px] font-bold transition cursor-pointer ${themeStyles.btn}`}
          >
            <Plus className="h-3 w-3" />
            <span>+ Add Another</span>
          </button>
        )}
      </div>
    </div>
  );
}
