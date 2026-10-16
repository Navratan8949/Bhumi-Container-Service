const express = require("express");

const {
  getTripDashboard,
  getTripProfitability,
  getVehicleReport,
} = require("../controllers/tripReportController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(authMiddleware);
router.use(roleMiddleware("super_admin", "admin", "manager", "accountant"));

router.get("/dashboard", getTripDashboard);
router.get("/profitability", getTripProfitability);
router.get("/vehicles", getVehicleReport);

module.exports = router;
