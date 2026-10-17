const express = require("express");

const {
  createInventoryItem,
  getInventoryItems,
  getInventoryItemById,
  updateInventoryItem,
  stockIn,
  stockOut,
  adjustStock,
  getInventoryTransactions,
  getItemHistory,
  getLowStockItems,
  deleteInventoryItem,
} = require("../controllers/inventoryController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(authMiddleware);

// ======================================================
// INVENTORY ITEMS
// ======================================================

router.post(
  "/items",
  roleMiddleware("super_admin", "admin", "manager"),
  createInventoryItem,
);

router.get(
  "/items",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  getInventoryItems,
);

router.get(
  "/items/:id",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  getInventoryItemById,
);

router.put(
  "/items/:id",
  roleMiddleware("super_admin", "admin", "manager"),
  updateInventoryItem,
);

router.delete(
  "/items/:id",
  roleMiddleware("super_admin", "admin", "manager"),
  deleteInventoryItem,
);

// ======================================================
// STOCK OPERATIONS
// ======================================================

router.post(
  "/stock-in",
  roleMiddleware("super_admin", "admin", "manager"),
  stockIn,
);

router.post(
  "/stock-out",
  roleMiddleware("super_admin", "admin", "manager"),
  stockOut,
);

router.post(
  "/adjust-stock",
  roleMiddleware("super_admin", "admin", "manager"),
  adjustStock,
);

// ======================================================
// HISTORY / REPORTS
// ======================================================

router.get(
  "/transactions",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  getInventoryTransactions,
);

router.get(
  "/items/:id/history",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  getItemHistory,
);

router.get(
  "/low-stock",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  getLowStockItems,
);

module.exports = router;
