import { resources, reportConfigs } from "./resources";

export const ROLES = {
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  MANAGER: "manager",
  ACCOUNTANT: "accountant",
  DRIVER: "driver",
  VENDOR: "vendor",
};

const allRoles = Object.values(ROLES);
const companyAdmins = [ROLES.SUPER_ADMIN, ROLES.ADMIN];
const operations = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER];
const finance = [...operations, ROLES.ACCOUNTANT];
const peopleRead = [...operations, ROLES.ACCOUNTANT];

// This is the FRONTEND UX access matrix. Backend middleware remains the final security layer.
// Keep this intentionally tighter than raw API GET permissions so each role gets a focused app.
export const moduleAccess = {
  dashboard: allRoles,
  settings: operations,
  reports: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.ACCOUNTANT],
  companies: companyAdmins,
  users: companyAdmins,

  // Daily operations
  "do-received": operations,
  "supply-orders": operations,
  bookings: operations,
  "lr-bilties": operations,
  trips: [...operations, ROLES.DRIVER],
  "trip-expenses": operations,
  "driver-trip-settlements": [...operations, ROLES.DRIVER],
  "container-detentions": operations,

  // Fleet
  vehicles: operations,
  drivers: operations,
  "vehicle-driver-assignments": operations,
  fuels: operations,
  maintenances: operations,
  "job-cards": operations,
  "preventive-schedules": operations,
  tyres: operations,
  inventory: operations,
  "vehicle-documents": operations,

  // Money
  "customer-invoices": finance,
  "customer-payments": finance,
  "vendor-bills": finance,
  "vendor-payments": finance,
  expenses: finance,

  // People / HR
  employees: peopleRead,
  attendances: peopleRead,
  "employee-advances": [
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES.MANAGER,
    ROLES.ACCOUNTANT,
  ],
  payrolls: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.ACCOUNTANT],
  "salary-payments": [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.ACCOUNTANT],

  // Supporting masters
  parties: finance,
  vendors: finance,
  products: operations,
  cities: operations,
  consignors: operations,
  consignees: operations,
};

export const roleHome = {
  [ROLES.SUPER_ADMIN]: "/dashboard",
  [ROLES.ADMIN]: "/dashboard",
  [ROLES.MANAGER]: "/dashboard",
  [ROLES.ACCOUNTANT]: "/dashboard",
  [ROLES.DRIVER]: "/dashboard",
  [ROLES.VENDOR]: "/dashboard",
};

export const roleMenu = {
  [ROLES.SUPER_ADMIN]: {
    Home: ["dashboard"],
    "Daily Work": [
      "do-received",
      "supply-orders",
      "bookings",
      "lr-bilties",
      "trips",
      "trip-expenses",
      "driver-trip-settlements",
      "container-detentions",
    ],
    Fleet: [
      "vehicles",
      "drivers",
      "vehicle-driver-assignments",
      "fuels",
      "maintenances",
      "job-cards",
      "preventive-schedules",
      "tyres",
      "inventory",
      "vehicle-documents",
    ],
    Money: [
      "customer-invoices",
      "customer-payments",
      "vendor-bills",
      "vendor-payments",
      "expenses",
    ],
    People: [
      "employees",
      "attendances",
      "employee-advances",
      "payrolls",
      "salary-payments",
    ],
    Reports: ["reports"],
    "Setup & Admin": [
      "settings",
      "parties",
      "vendors",
      "products",
      "cities",
      "consignors",
      "consignees",
      "users",
      "companies",
    ],
  },
  [ROLES.ADMIN]: {
    Home: ["dashboard"],
    "Daily Work": [
      "do-received",
      "supply-orders",
      "bookings",
      "lr-bilties",
      "trips",
      "trip-expenses",
      "driver-trip-settlements",
      "container-detentions",
    ],
    Fleet: [
      "vehicles",
      "drivers",
      "vehicle-driver-assignments",
      "fuels",
      "maintenances",
      "job-cards",
      "preventive-schedules",
      "tyres",
      "inventory",
      "vehicle-documents",
    ],
    Money: [
      "customer-invoices",
      "customer-payments",
      "vendor-bills",
      "vendor-payments",
      "expenses",
    ],
    People: [
      "employees",
      "attendances",
      "employee-advances",
      "payrolls",
      "salary-payments",
    ],
    Reports: ["reports"],
    "Setup & Admin": [
      "settings",
      "parties",
      "vendors",
      "products",
      "cities",
      "consignors",
      "consignees",
      "users",
    ],
  },
  [ROLES.MANAGER]: {
    Home: ["dashboard"],
    "Daily Work": [
      "do-received",
      "supply-orders",
      "bookings",
      "lr-bilties",
      "trips",
      "trip-expenses",
      "driver-trip-settlements",
      "container-detentions",
    ],
    Fleet: [
      "vehicles",
      "drivers",
      "vehicle-driver-assignments",
      "fuels",
      "maintenances",
      "job-cards",
      "preventive-schedules",
      "tyres",
      "inventory",
      "vehicle-documents",
    ],
    Money: [
      "customer-invoices",
      "customer-payments",
      "vendor-bills",
      "vendor-payments",
      "expenses",
    ],
    People: ["employees", "attendances", "employee-advances"],
    Reports: ["reports"],
    Setup: [
      "settings",
      "parties",
      "vendors",
      "products",
      "cities",
      "consignors",
      "consignees",
    ],
  },
  [ROLES.ACCOUNTANT]: {
    Home: ["dashboard"],
    Money: [
      "customer-invoices",
      "customer-payments",
      "vendor-bills",
      "vendor-payments",
      "expenses",
    ],
    "People & Payroll": [
      "employees",
      "attendances",
      "employee-advances",
      "payrolls",
      "salary-payments",
    ],
    Reports: ["reports"],
    Setup: ["parties", "vendors"],
  },
  [ROLES.DRIVER]: {
    Home: ["dashboard"],
    "My Trips": ["trips", "driver-trip-settlements"],
  },
  [ROLES.VENDOR]: {
    Home: ["dashboard"],
  },
};

const reportRoleAccess = {
  Accounts: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.ACCOUNTANT],
  Operations: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.ACCOUNTANT],
  Fleet: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.ACCOUNTANT],
  HR: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.ACCOUNTANT],
  Expenses: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.ACCOUNTANT],
};

const accountantReportGroups = new Set(["Accounts", "HR", "Expenses"]);
const managerReportGroups = new Set(["Operations", "Fleet", "Expenses"]);

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

export const getVisibleGroupItems = (role, groups) => {
  const configured = getRoleMenu(role);
  return groups
    .map((group) => {
      const allowedKeys =
        configured[group.label] ||
        (group.label === "Setup & Admin" ? configured["Setup"] : null) ||
        (group.label === "People" ? configured["People & Payroll"] : null) ||
        (group.label === "Daily Work" ? configured["My Trips"] : null) ||
        [];
      return {
        ...group,
        items: group.items.filter(
          ([key]) => allowedKeys.includes(key) && canViewModule(role, key),
        ),
      };
    })
    .filter((group) => group.items.length);
};

export const getResourceRoles = (key) =>
  moduleAccess[key] || resources[key]?.roles || [];
