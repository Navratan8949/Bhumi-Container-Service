import * as XLSX from "xlsx";
import { getActiveCompany } from "./auth";

/**
 * Resolves a field's display label from an object, ID, or reference using options lookup.
 * Completely eliminates raw MongoDB ObjectIds in exported Excel sheets.
 */
export function resolveLabel(val, fieldDef = null, options = null) {
  if (val == null || val === "") return "—";

  // If boolean
  if (typeof val === "boolean") {
    return val ? "Yes" : "No";
  }

  // If array of items
  if (Array.isArray(val)) {
    if (val.length === 0) return "—";
    return val
      .map((item) => resolveLabel(item, fieldDef, options))
      .filter((x) => x && x !== "—")
      .join(", ") || "—";
  }

  // If Date instance
  if (val instanceof Date) {
    if (Number.isNaN(val.getTime())) return "—";
    return val.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  // If populated object
  if (typeof val === "object") {
    // 1. Payroll Object
    if (val.payrollMonth) {
      let empName = "";
      if (val.employeeId) {
        if (typeof val.employeeId === "object" && val.employeeId.name) {
          empName = ` • ${val.employeeId.name}${val.employeeId.employeeCode ? ` [${val.employeeId.employeeCode}]` : ""}`;
        } else if (options?.employees) {
          const emp = options.employees.find(
            (e) => (e._id || e.id) === val.employeeId
          );
          if (emp?.name) {
            empName = ` • ${emp.name}${emp.employeeCode ? ` [${emp.employeeCode}]` : ""}`;
          }
        }
      }
      const net =
        val.netSalary !== undefined && val.netSalary !== null
          ? ` (Net: ₹${Number(val.netSalary).toLocaleString("en-IN")})`
          : "";
      return `Payroll: ${val.payrollMonth}${empName}${net}`;
    }

    // 2. Employee with code and name
    if (val.name && val.employeeCode) {
      return `${val.name} [${val.employeeCode}]`;
    }

    // 3. Vehicle with type
    if (val.vehicleNumber) {
      return val.vehicleType
        ? `${val.vehicleNumber} (${val.vehicleType})`
        : val.vehicleNumber;
    }

    // 4. Other transport & business master fields
    return (
      val.name ||
      val.cityName ||
      val.partyName ||
      val.vendorName ||
      val.registrationNumber ||
      val.employeeName ||
      val.employeeCode ||
      val.soNumber ||
      val.doNumber ||
      val.bookingNumber ||
      val.invoiceNumber ||
      val.billNumber ||
      val.paymentNumber ||
      val.tripNumber ||
      val.expenseNumber ||
      val.advanceNumber ||
      val.receiptNumber ||
      val.serialNumber ||
      val.itemName ||
      val.itemCode ||
      val.tyreNumber ||
      val.title ||
      val.code ||
      val.label ||
      (val._id ? "—" : "—")
    );
  }

  // If string ID referencing a master collection in options
  if (typeof val === "string") {
    const refKey = fieldDef?.ref;
    if (refKey && options) {
      const list =
        options[refKey] ||
        options[`${refKey}s`] ||
        (refKey.endsWith("s") ? options[refKey.slice(0, -1)] : null);

      if (Array.isArray(list)) {
        const found = list.find((x) => x && (x._id === val || x.id === val));
        if (found) return resolveLabel(found, fieldDef, options);
      }
    }

    // If 24-char MongoDB ObjectId without direct ref definition, search all option lists
    if (/^[0-9a-fA-F]{24}$/.test(val) && options) {
      for (const optList of Object.values(options)) {
        if (Array.isArray(optList)) {
          const found = optList.find((x) => x && (x._id === val || x.id === val));
          if (found) return resolveLabel(found, fieldDef, options);
        }
      }
      return "—";
    }

    // Clean up enums or uppercase codes with underscores
    if (val.includes("_")) {
      return val.replaceAll("_", " ");
    }
  }

  return val;
}

/**
 * Formats a raw value into an Excel-friendly data type (Number, formatted Date, or clean String).
 */
export function formatExcelValue(val, fieldDef = null, options = null) {
  if (val == null || val === "") return "";

  // Month fields (e.g. "2026-10" -> "Oct 2026")
  if (
    fieldDef?.type === "month" ||
    (typeof val === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(val))
  ) {
    const [y, m] = val.split("-");
    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    const monthIdx = parseInt(m, 10) - 1;
    if (monthIdx >= 0 && monthIdx < 12) {
      return `${monthNames[monthIdx]} ${y}`;
    }
    return val;
  }

  // Date and DateTime fields (e.g. "2026-10-15T..." -> "15-Oct-2026")
  if (
    fieldDef?.type === "date" ||
    fieldDef?.type === "datetime-local" ||
    (typeof val === "string" && /^\d{4}-\d{2}-\d{2}(T|$)/.test(val))
  ) {
    const d = new Date(val);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }
  }

  // Boolean fields
  if (fieldDef?.type === "boolean" || typeof val === "boolean") {
    return val ? "Yes" : "No";
  }

  // Numbers (keep numeric for Excel calculations/SUM)
  if (fieldDef?.type === "number" || typeof val === "number") {
    if (typeof val === "string") {
      const cleaned = val.replace(/[^0-9.-]+/g, "");
      const num = Number(cleaned);
      return Number.isNaN(num) ? val : num;
    }
    const num = Number(val);
    return Number.isNaN(num) ? val : num;
  }

  // Resolved label for objects & references
  return resolveLabel(val, fieldDef, options);
}

/**
 * Enterprise Excel Exporter with Corporate Header, Auto-Width, and Summary Totals.
 *
 * @param {Object} config
 * @param {string} config.title - e.g. "Commercial Customer Invoices"
 * @param {string} [config.subtitle] - e.g. "Fleet Operations TMS • Central Accounts Desk"
 * @param {string} [config.filename] - e.g. "Customer_Invoices"
 * @param {string} [config.sheetName] - e.g. "Invoices"
 * @param {Array<{ label: string, key?: string, name?: string, type?: string, ref?: string }>} config.columns
 * @param {Array<Object>} config.rows
 * @param {Object} [config.options] - Dictionary of master reference lists
 * @param {Array<string>} [config.totalKeys] - Column keys/names to explicitly calculate sums for
 */
export function exportToExcelProfessional({
  title = "Transport Report",
  subtitle,
  filename = "Export_Report",
  sheetName = "Report",
  columns = [],
  rows = [],
  options = {},
  totalKeys = [],
}) {
  if (!rows || rows.length === 0) {
    alert("No records to export.");
    return false;
  }

  const activeComp = getActiveCompany();
  const companyHeader = activeComp?.name?.toUpperCase() || "FLEET OPERATIONS TMS";
  const defaultSubtitle = `${activeComp?.name || "Fleet Operations TMS"} • Fleet Operations & Commercial Logistics`;
  const resolvedSubtitle = subtitle || defaultSubtitle;

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // 1. Build Header Block (Rows 1-4)
  const sheetData = [
    [companyHeader],
    [`${title.toUpperCase()} — ${resolvedSubtitle}`],
    [
      `Generated On: ${dateStr} at ${timeStr} | Total Records: ${rows.length}`,
    ],
    [], // Blank separator row
  ];

  // 2. Build Table Column Headers (Row 5)
  const headerLabels = ["S.No.", ...columns.map((c) => c.label || c.name || c.key)];
  sheetData.push(headerLabels);

  // 3. Process Data Rows & Determine Aggregable Columns
  const columnTotals = {};
  const isNumericCol = {};

  // Non-aggregable keywords (rates, percentages, phone numbers, odometer, days)
  const nonSummablePattern =
    /rate|percent|percentage|gst|taxpercent|odometer|reading|days|hours|year|month|phone|mobile|pincode|code|id|serial|account|aadhar|pan|psi|depth/i;

  columns.forEach((col, idx) => {
    const colKey = col.name || col.key || "";
    const isExplicitTotal = totalKeys && totalKeys.includes(colKey);

    const isSummable =
      isExplicitTotal ||
      (!nonSummablePattern.test(colKey) &&
        (col.type === "number" ||
          /amount|balance|salary|total|toll|billamount|paidamount|cost|litres|stockvalue|hammali|detention|freight/i.test(
            colKey
          )));

    isNumericCol[idx] = isSummable;
    if (isSummable) {
      columnTotals[idx] = 0;
    }
  });

  rows.forEach((row, rowIdx) => {
    const rowValues = [rowIdx + 1]; // S.No

    columns.forEach((col, cIdx) => {
      const colKey = col.name || col.key;
      const rawVal = row[colKey];
      const formattedVal = formatExcelValue(rawVal, col, options);

      rowValues.push(formattedVal);

      // Accumulate numeric totals only for aggregable columns
      if (
        isNumericCol[cIdx] &&
        typeof formattedVal === "number" &&
        !Number.isNaN(formattedVal)
      ) {
        columnTotals[cIdx] = (columnTotals[cIdx] || 0) + formattedVal;
      }
    });

    sheetData.push(rowValues);
  });

  // 4. Build Summary / Total Row
  const hasTotals = Object.values(isNumericCol).some(Boolean);
  if (hasTotals) {
    const totalRow = ["TOTAL / SUMMARY"];
    columns.forEach((col, cIdx) => {
      if (isNumericCol[cIdx] && columnTotals[cIdx] !== undefined) {
        // Round to 2 decimals
        totalRow.push(Math.round(columnTotals[cIdx] * 100) / 100);
      } else {
        totalRow.push("");
      }
    });
    sheetData.push([]); // blank separator
    sheetData.push(totalRow);
  }

  // 5. Convert Array to Worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

  // 6. Calculate Optimal Column Widths (!cols)
  const colWidths = headerLabels.map((header, colIdx) => {
    let maxLen = String(header || "").length;

    // Check data row lengths
    sheetData.slice(4).forEach((r) => {
      if (r && r[colIdx] != null) {
        const valLen = String(r[colIdx]).length;
        if (valLen > maxLen) maxLen = valLen;
      }
    });

    // Provide comfortable padding
    return { wch: Math.min(Math.max(maxLen + 3, 14), 50) };
  });

  // S.No. column width
  colWidths[0] = { wch: 8 };
  worksheet["!cols"] = colWidths;

  // 7. Create Workbook & Append Sheet
  const workbook = XLSX.utils.book_new();
  const cleanSheetName = (sheetName || "Sheet1")
    .replace(/[\\/?*[\]]/g, "")
    .slice(0, 31);

  XLSX.utils.book_append_sheet(workbook, worksheet, cleanSheetName);

  // 8. Generate Clean Timestamped File Name
  const cleanFilename = `${filename.replace(/\s+/g, "_")}_${now
    .toISOString()
    .slice(0, 10)}.xlsx`;

  XLSX.writeFile(workbook, cleanFilename);
  return true;
}
