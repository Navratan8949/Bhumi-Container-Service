const express = require("express");

const {
  createMaintenance,
  getMaintenances,
  getMaintenanceById,
  updateMaintenance,
  deleteMaintenance,
  getVehicleMaintenanceHistory,
} = require("../controllers/maintenanceController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.post(
  "/",
  roleMiddleware("super_admin", "admin", "manager"),
  createMaintenance,
);

router.get(
  "/",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  getMaintenances,
);

router.get(
  "/vehicle/:vehicleId",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  getVehicleMaintenanceHistory,
);

router.get(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  getMaintenanceById,
);

router.put(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager"),
  updateMaintenance,
);

router.delete(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager"),
  deleteMaintenance,
);

module.exports = router;
