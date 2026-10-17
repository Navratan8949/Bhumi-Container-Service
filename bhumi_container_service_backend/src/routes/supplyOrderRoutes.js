const express = require("express");

const {
  createSupplyOrder,
  getSupplyOrders,
  getSupplyOrderById,
  updateSupplyOrder,
  deleteSupplyOrder,
} = require("../controllers/supplyOrderController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(authMiddleware);

// CREATE
router.post(
  "/",
  roleMiddleware("super_admin", "admin", "manager"),
  createSupplyOrder,
);

// GET ALL
router.get(
  "/",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  getSupplyOrders,
);

// GET ONE
router.get(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  getSupplyOrderById,
);

// UPDATE
router.put(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager"),
  updateSupplyOrder,
);

// DELETE / CANCEL
router.delete(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager"),
  deleteSupplyOrder,
);

module.exports = router;
