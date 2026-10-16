const express = require("express");

const {
  getVehicleRunningCost,
} = require("../controllers/vehicleRunningCostController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.get(
  "/",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  getVehicleRunningCost,
);

module.exports = router;
