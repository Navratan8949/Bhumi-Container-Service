"use client";
import React, { useState } from "react";
import {
  Plus,
  Trash2,
  Tag,
  IndianRupee,
  FileText,
  ChevronDown,
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

export default function ExpenseBreakdownEditor({
  label = "Extra Exp (₹)",
  amount = 0,
  expenses = [],
  onChange,
  placeholder = "0",
  helperText = "",
  theme = "emerald", // "emerald" | "blue" | "amber" | "rose"
  readOnly = false,
  gridCols = 3, // 1 | 2 | 3
}) {
  const items = Array.isArray(expenses) ? expenses : [];

  // Track which rows have the optional note input open
  const [openNotes, setOpenNotes] = useState({});

  // First item representation:
  // If items has at least 1 item, use items[0].
  // Otherwise, fallback to the direct amount with default category "Other / Misc".
  const firstCategory =
    items.length > 0 && items[0]?.category
      ? items[0].category
      : "Other / Misc";

  const firstAmount =
    items.length > 0
      ? (items[0]?.amount !== undefined && items[0]?.amount !== null ? items[0].amount : "")
      : (amount !== undefined && amount !== null && amount !== 0 && amount !== "" ? amount : "");

  // Update a field in a row (category, amount, or description)
  const handleUpdateItem = (index, field, value) => {
    let currentList = items.length > 0
      ? [...items]
      : [
          {
            category: firstCategory,
            amount: firstAmount,
            description: "",
            date: new Date().toISOString().split("T")[0],
          },
        ];

    // Ensure array has enough elements
    while (currentList.length <= index) {
      currentList.push({
        category: "Other / Misc",
        amount: "",
        description: "",
        date: new Date().toISOString().split("T")[0],
      });
    }

    const updated = currentList.map((item, idx) => {
      if (idx !== index) return item;
      return {
        ...item,
        [field]: field === "amount" ? (value === "" ? "" : value) : value,
      };
    });

    // Calculate total
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

  // Add a 2nd or 3rd expense row
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
            description: "",
            date: new Date().toISOString().split("T")[0],
          },
        ];

    const newRow = {
      category: "Loading / Hammali",
      amount: "",
      description: "",
      date: new Date().toISOString().split("T")[0],
    };

    const updated = [...currentList, newRow];
    const sum = updated.reduce(
      (acc, curr) => acc + (Number(curr?.amount) || 0),
      0,
    );

    if (typeof onChange === "function") {
      onChange(sum, updated);
    }
  };

  // Remove a row
  const handleRemoveRow = (index, e) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (readOnly) return;

    const updated = items.filter((_, idx) => idx !== index);
    const sum = updated.reduce(
      (acc, curr) => acc + (Number(curr?.amount) || 0),
      0,
    );

    if (typeof onChange === "function") {
      onChange(sum, updated);
    }
  };

  // Toggle optional note input for a row
  const toggleNote = (index, e) => {
    e?.preventDefault();
    e?.stopPropagation();
    setOpenNotes((prev) => ({ ...prev, [index]: !prev[index] }));
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
    },
    blue: {
      btn: "border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100",
      focusBorder: "focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20",
      totalBadge: "bg-blue-100 text-blue-950 border-blue-300",
    },
    amber: {
      btn: "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100",
      focusBorder: "focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20",
      totalBadge: "bg-amber-100 text-amber-950 border-amber-300",
    },
    rose: {
      btn: "border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100",
      focusBorder: "focus-within:border-rose-500 focus-within:ring-2 focus-within:ring-rose-500/20",
      totalBadge: "bg-rose-100 text-rose-950 border-rose-300",
    },
  }[theme] || {
    btn: "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
    focusBorder: "focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20",
    totalBadge: "bg-emerald-100 text-emerald-950 border-emerald-300",
  };

  // If there are multiple items, render all rows; otherwise render Row 1
  const rowsToRender = items.length > 1 ? items : [
    {
      category: firstCategory,
      amount: firstAmount,
      description: items[0]?.description || "",
      date: items[0]?.date || "",
    },
  ];

  return (
    <div className="w-full space-y-1.5">
      {/* Label and "+ Add Another Expense" Button Header */}
      <div className="flex items-center justify-between gap-1.5">
        <span
          className="block text-xs font-bold uppercase tracking-wider text-slate-700 truncate"
          title={label}
        >
          {label}
        </span>

        {!readOnly && (
          <button
            type="button"
            onClick={handleAddAnotherRow}
            className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[11px] font-black transition shadow-2xs cursor-pointer ${themeStyles.btn}`}
            title="Click to add another categorized expense (e.g. Toll, Loading, Detention)"
          >
            <Plus className="h-3 w-3 stroke-[2.5]" />
            <span>+ Add Another</span>
          </button>
        )}
      </div>

      {/* Rows List (Inline on the form: Category Dropdown + Money Input) */}
      <div
        className={
          gridCols === 1
            ? "space-y-1.5"
            : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2"
        }
      >
        {rowsToRender.map((rowItem, index) => {
          const cat = rowItem.category || "Other / Misc";
          const isMultiple = rowsToRender.length > 1;

          return (
            <div key={index} className="space-y-1">
              <div
                className={`flex items-stretch rounded-xl border border-slate-300 bg-white overflow-hidden shadow-2xs transition ${themeStyles.focusBorder}`}
              >
                {/* 1. Category Select Dropdown (Right on the left of input) */}
                <div className="w-[54%] sm:w-[56%] bg-slate-50/90 border-r border-slate-200 flex items-center shrink-0">
                  <select
                    value={cat}
                    onChange={(e) =>
                      handleUpdateItem(index, "category", e.target.value)
                    }
                    disabled={readOnly}
                    className="w-full bg-transparent px-2.5 py-2 text-xs font-bold text-slate-900 outline-none cursor-pointer hover:bg-slate-100 transition truncate"
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

                {/* 2. Money / Amount Numeric Input */}
                <div className="relative flex-1 flex items-center min-w-0 bg-white">
                  <span className="absolute left-2 text-xs font-black text-slate-400 select-none">
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
                    className="w-full py-2 pl-5 pr-1.5 text-xs font-black font-mono text-slate-950 outline-none bg-transparent"
                  />
                </div>

                {/* Optional Note toggle button */}
                <button
                  type="button"
                  onClick={(e) => toggleNote(index, e)}
                  className={`px-1.5 flex items-center justify-center border-l border-slate-200 transition cursor-pointer ${
                    rowItem.description || openNotes[index]
                      ? "bg-amber-50 text-amber-800"
                      : "bg-slate-50 text-slate-400 hover:text-slate-700"
                  }`}
                  title={
                    rowItem.description
                      ? `Note: ${rowItem.description}`
                      : "Add optional note / receipt"
                  }
                >
                  <FileText className="h-3.5 w-3.5" />
                </button>

                {/* Delete button (only if multiple rows exist) */}
                {isMultiple && !readOnly && (
                  <button
                    type="button"
                    onClick={(e) => handleRemoveRow(index, e)}
                    className="px-2 flex items-center justify-center border-l border-slate-200 bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
                    title="Delete this expense"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Expandable Note Input (if opened or has description) */}
              {(openNotes[index] || (rowItem.description && isMultiple)) && (
                <div className="flex items-center gap-1.5 pl-1 animate-in fade-in duration-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    Note:
                  </span>
                  <input
                    type="text"
                    placeholder="e.g. Vadodara Toll / Hammali Receipt"
                    value={rowItem.description || ""}
                    onChange={(e) =>
                      handleUpdateItem(index, "description", e.target.value)
                    }
                    className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 outline-none focus:border-amber-500"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Multiple Items Total Summary Bar */}
      {rowsToRender.length > 1 && (
        <div className="col-span-full flex items-center justify-between rounded-lg bg-slate-100 border border-slate-200 px-3 py-1.5 text-[11px] font-bold text-slate-700 shadow-2xs">
          <span className="flex items-center gap-1.5 text-slate-600">
            <Tag className="h-3.5 w-3.5 text-slate-500" />
            Total ({rowsToRender.length} expenses):
          </span>
          <span className="font-mono font-black text-slate-950 text-xs">
            ₹{currentTotal.toLocaleString("en-IN")}
          </span>
        </div>
      )}

      {helperText && rowsToRender.length === 1 && (
        <p className="text-[11px] font-medium text-slate-500 leading-tight">
          {helperText}
        </p>
      )}
    </div>
  );
}
