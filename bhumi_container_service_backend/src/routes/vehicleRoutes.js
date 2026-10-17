const express = require("express");

const {
  createVehicle,
  getVehicles,
  getVehicleById,
  updateVehicle,
  deleteVehicle,
} = require("../controllers/vehicleController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.post(
  "/",
  roleMiddleware("super_admin", "admin", "manager"),
  createVehicle,
);

router.get(
  "/",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  getVehicles,
);

router.get(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  getVehicleById,
);

router.put(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager"),
  updateVehicle,
);

router.delete(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager"),
  deleteVehicle,
);

module.exports = router;
