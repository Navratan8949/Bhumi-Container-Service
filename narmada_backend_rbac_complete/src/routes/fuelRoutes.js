const express = require("express");

const {
  createFuel,
  getFuels,
  getFuelById,
  updateFuel,
  deleteFuel,
} = require("../controllers/fuelController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.post(
  "/",
  roleMiddleware("super_admin", "admin", "manager"),
  createFuel,
);

router.get(
  "/",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  getFuels,
);

router.get(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  getFuelById,
);

router.put(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager"),
  updateFuel,
);

router.delete(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager"),
  deleteFuel,
);

module.exports = router;
