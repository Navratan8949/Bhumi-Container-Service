const express = require("express");

const {
  createVendorPayment,
  getVendorPayments,
  getVendorPaymentById,
  cancelVendorPayment,
} = require("../controllers/vendorPaymentController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.post(
  "/",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  createVendorPayment,
);

router.get(
  "/",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  getVendorPayments,
);

router.get(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  getVendorPaymentById,
);

router.delete(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  cancelVendorPayment,
);

module.exports = router;
