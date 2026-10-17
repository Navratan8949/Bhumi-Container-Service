const express = require("express");
const router = express.Router();
const {
  createDriverSettlement,
  getDriverSettlements,
  getDriverSettlementById,
  updateDriverSettlement,
  deleteDriverSettlement,
} = require("../controllers/driverTripSettlementController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

router.use(authMiddleware);

router.get(
  "/",
  roleMiddleware("super_admin", "admin", "manager", "accountant", "driver"),
  getDriverSettlements,
);

router.get(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager", "accountant", "driver"),
  getDriverSettlementById,
);

router.post(
  "/",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  createDriverSettlement,
);

router.put(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  updateDriverSettlement,
);

router.delete(
  "/:id",
  roleMiddleware("super_admin", "admin"),
  deleteDriverSettlement,
);

module.exports = router;
