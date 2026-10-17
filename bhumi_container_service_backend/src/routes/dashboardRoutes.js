const express = require("express");

const { getDashboard, getAlerts, searchGlobal, sendDailyAlertsSummaryEmail } = require("../controllers/dashboardController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.get(
  "/search",
  roleMiddleware("super_admin", "admin", "manager", "accountant", "driver", "vendor"),
  searchGlobal,
);

router.get(
  "/",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  getDashboard,
);

router.get(
  "/alerts",
  roleMiddleware("super_admin", "admin", "manager", "accountant", "driver", "vendor"),
  getAlerts,
);

router.post(
  "/alerts/send-summary-email",
  roleMiddleware("super_admin", "admin", "manager"),
  sendDailyAlertsSummaryEmail,
);

module.exports = router;
