const express = require("express");

const {
  createCustomerInvoice,
  getCustomerInvoices,
  getCustomerInvoiceById,
  updateCustomerInvoice,
  deleteCustomerInvoice,
} = require("../controllers/customerInvoiceController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.post(
  "/",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  createCustomerInvoice,
);

router.get(
  "/",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  getCustomerInvoices,
);

router.get(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  getCustomerInvoiceById,
);

router.put(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  updateCustomerInvoice,
);

router.delete(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  deleteCustomerInvoice,
);

module.exports = router;
