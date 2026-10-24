import { resources, reportConfigs } from "./resources";

export const ROLES = {
  SUPER_ADMIN: "super_admin",
  ACCOUNTANT: "accountant",
};

const allRoles = Object.values(ROLES);
const companyAdmins = [ROLES.SUPER_ADMIN];
const operations = [ROLES.SUPER_ADMIN];
const finance = [...operations, ROLES.ACCOUNTANT];

// This is the FRONTEND UX access matrix.
export const moduleAccess = {
  dashboard: allRoles,
  settings: companyAdmins,
  reports: finance,
  companies: companyAdmins,
  users: companyAdmins,

  // Operations & Billing
  customers: finance,
  "advance-memos": finance,
  trips: operations,
  "driver-trip-settlements": finance,
  "vendor-bills": finance,
  "customer-invoices": finance,

  // Fleet & Maintenance
  vehicles: operations,
  drivers: operations,
  vendors: operations,
  fuels: operations,
  maintenances: operations,
  tyres: operations,
  "vehicle-documents": operations,

  // Accounts & Expenses
  "office-expenses": finance,
  expenses: finance,
  loans: finance,
  "profit-loss": finance,
};

export const roleHome = {
  [ROLES.SUPER_ADMIN]: "/dashboard",
  [ROLES.ACCOUNTANT]: "/dashboard",
};

export const roleMenu = {
  [ROLES.SUPER_ADMIN]: {
    Home: ["dashboard"],
    Operations: [
      "customers",
      "advance-memos",
      "trips",
      "driver-trip-settlements",
      "vendor-bills",
      "customer-invoices",
    ],
    Fleet: [
      "vehicles",
      "drivers",
      "vendors",
      "fuels",
      "maintenances",
      "tyres",
    ],
    "Accounts & Reports": [
      "office-expenses",
      "expenses",
      "loans",
      "profit-loss",
      "reports",
      "users",
      "settings",
    ],
  },
  [ROLES.ACCOUNTANT]: {
    "Accounts & Finance": [
      "dashboard",
      "customers",
      "advance-memos",
      "driver-trip-settlements",
      "vendor-bills",
      "customer-invoices",
      "office-expenses",
      "expenses",
      "loans",
      "profit-loss",
      "reports",
    ],
  },
};

const reportRoleAccess = {
  Accounts: [ROLES.SUPER_ADMIN, ROLES.ACCOUNTANT],
  Operations: [ROLES.SUPER_ADMIN, ROLES.ACCOUNTANT],
  Fleet: [ROLES.SUPER_ADMIN, ROLES.ACCOUNTANT],
  Expenses: [ROLES.SUPER_ADMIN, ROLES.ACCOUNTANT],
};

const accountantReportGroups = new Set([
  "Accounts",
  "Operations",
  "Fleet",
  "Expenses",
]);
const managerReportGroups = new Set([
  "Operations",
  "Fleet",
  "Expenses",
  "Accounts",
]);

export const canViewReport = (role, reportOrKey) => {
  if (role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN) return true;
  const cfg =
    typeof reportOrKey === "string"
      ? reportConfigs.find((r) => r.key === reportOrKey) || {
          group: reportOrKey,
        }
      : reportOrKey;
  if (!cfg?.group) return false;
  if (role === ROLES.MANAGER) return managerReportGroups.has(cfg.group);
  if (role === ROLES.ACCOUNTANT) return accountantReportGroups.has(cfg.group);
  return Boolean(reportRoleAccess[cfg.group]?.includes(role));
};

export const canViewModule = (role, moduleKey) => {
  if (!role || !moduleKey) return false;
  return Boolean(moduleAccess[moduleKey]?.includes(role));
};

export const canPerform = (role, roles = []) =>
  Boolean(role && Array.isArray(roles) && roles.includes(role));

export const isRole = (role, ...allowed) => allowed.includes(role);

export const getRoleMenu = (role) => roleMenu[role] || {};

export const getResourcePermission = (role, resource, action) => {
  if (!resource || !role) return false;
  if (action === "view") return canViewModule(role, resource.key);
  if (action === "create") return canPerform(role, resource.canCreate || []);
  if (action === "edit") return canPerform(role, resource.canEdit || []);
  if (action === "delete") return canPerform(role, resource.canDelete || []);
  return false;
};

export const isAllowedPath = (role, pathname) => {
  if (!role || !pathname) return false;
  if (
    ["/profile", "/help"].some(
      (p) => pathname === p || pathname.startsWith(`${p}/`),
    )
  )
    return true;
  if (pathname === "/dashboard") return true;
  if (pathname === "/select-company" || pathname.startsWith("/select-company/"))
    return role === ROLES.SUPER_ADMIN;
  if (pathname === "/settings" || pathname.startsWith("/settings/"))
    return canViewModule(role, "settings");
  if (pathname === "/reports") return canViewModule(role, "reports");
  if (pathname.startsWith("/reports/"))
    return canViewReport(role, pathname.split("/")[2]);

  const moduleKey = pathname.split("/").filter(Boolean)[0];
  if (!moduleKey) return true;
  if (Object.prototype.hasOwnProperty.call(moduleAccess, moduleKey)) {
    return canViewModule(role, moduleKey);
  }
  return false;
};

export const getVisibleGroupItems = (role, groups = []) => {
  if (role === ROLES.ACCOUNTANT) {
    return [
      {
        label: "Accounts & Finance",
        items: [
          ["dashboard", "Accounts Dashboard", "LayoutDashboard"],
          ["customers", "Customer Master", "Users"],
          ["advance-memos", "Advance Memo", "FileText"],
          ["driver-trip-settlements", "Company Lorry Settlement", "Banknote"],
          ["vendor-bills", "Market Lorry Account", "Building2"],
          ["customer-invoices", "Party Account", "ReceiptText"],
          ["office-expenses", "Office Expenses", "Building2"],
          ["expenses", "Driver Expenses", "ReceiptIndianRupee"],
          ["loans", "Loans & EMIs", "Landmark"],
          ["profit-loss", "Profit & Loss (P&L)", "TrendingUp"],
          ["reports", "Fleet & Audit Reports", "FileBarChart2"],
        ],
      },
    ];
  }
  return groups
    .map((group) => ({
      ...group,
      items: (group.items || []).filter(([key]) => canViewModule(role, key)),
    }))
    .filter((group) => group.items.length > 0);
};

export const getResourceRoles = (key) =>
  moduleAccess[key] || resources[key]?.roles || [];
