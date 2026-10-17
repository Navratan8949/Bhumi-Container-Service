const express = require("express");

const {
  getMaintenanceReport,
  getVehicleMaintenanceReport,
} = require("../controllers/maintenanceReportController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(authMiddleware);
router.use(roleMiddleware("super_admin", "admin", "manager", "accountant"));

router.get("/vehicle-maintenance", getVehicleMaintenanceReport);
router.get("/", getMaintenanceReport);

module.exports = router;
