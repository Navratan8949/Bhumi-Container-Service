const express = require("express");

const {
  getAccountsDashboard,
  getCustomerOutstandingReport,
  getVendorOutstandingReport,
  getExpenseReport,
} = require("../controllers/accountsReportController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(authMiddleware);
router.use(roleMiddleware("super_admin", "admin", "manager", "accountant"));

router.get("/dashboard", getAccountsDashboard);
router.get("/customer-outstanding", getCustomerOutstandingReport);
router.get("/vendor-outstanding", getVendorOutstandingReport);
router.get("/expenses", getExpenseReport);

module.exports = router;
