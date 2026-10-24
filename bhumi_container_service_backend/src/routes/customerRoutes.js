const express = require("express");
const {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  getCustomerStats,
} = require("../controllers/customerController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.get("/stats", roleMiddleware("super_admin", "admin", "manager", "accountant"), getCustomerStats);

router.post(
  "/",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  createCustomer
);

router.get(
  "/",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  getCustomers
);

router.get(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  getCustomerById
);

router.put(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  updateCustomer
);

router.delete(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager"),
  deleteCustomer
);

module.exports = router;
