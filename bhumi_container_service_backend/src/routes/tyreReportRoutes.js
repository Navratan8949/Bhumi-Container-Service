const express = require("express");

const {
  getTyreReport,
  getVehicleTyreReport,
  getTyreHistory,
} = require("../controllers/tyreReportController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(authMiddleware);
router.use(roleMiddleware("super_admin", "admin", "manager", "accountant"));

router.get("/vehicle-tyres", getVehicleTyreReport);
router.get("/history/:tyreId", getTyreHistory);
router.get("/", getTyreReport);

module.exports = router;
