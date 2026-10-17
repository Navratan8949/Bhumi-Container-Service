const express = require("express");

const {
  createVendorBill,
  getVendorBills,
  getVendorBillById,
  updateVendorBill,
  cancelVendorBill,
} = require("../controllers/vendorBillController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.post(
  "/",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  createVendorBill,
);

router.get(
  "/",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  getVendorBills,
);

router.get(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  getVendorBillById,
);

router.put(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  updateVendorBill,
);

router.delete(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  cancelVendorBill,
);

module.exports = router;
