const express = require("express");

const {
  getFuelReport,
  getVehicleFuelEfficiency,
} = require("../controllers/fuelReportController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(authMiddleware);
router.use(roleMiddleware("super_admin", "admin", "manager", "accountant"));

router.get("/", getFuelReport);
router.get("/vehicle-efficiency", getVehicleFuelEfficiency);

module.exports = router;
