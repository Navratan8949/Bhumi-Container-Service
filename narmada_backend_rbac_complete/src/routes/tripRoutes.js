const express = require("express");

const {
  createTrip,
  getTrips,
  getTripById,
  dispatchTrip,
  startTrip,
  deliverTrip,
  completeTrip,
  cancelTrip,
  updateTrip,
  deleteTrip,
} = require("../controllers/tripController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.post("/", roleMiddleware("super_admin", "admin", "manager"), createTrip);

router.get(
  "/",
  roleMiddleware("super_admin", "admin", "manager", "accountant", "driver"),
  getTrips,
);

router.get(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager", "accountant", "driver"),
  getTripById,
);

router.put(
  "/:id/dispatch",
  roleMiddleware("super_admin", "admin", "manager"),
  dispatchTrip,
);

router.put(
  "/:id/start",
  roleMiddleware("super_admin", "admin", "manager", "driver"),
  startTrip,
);

router.put(
  "/:id/deliver",
  roleMiddleware("super_admin", "admin", "manager", "driver"),
  deliverTrip,
);

router.put(
  "/:id/complete",
  roleMiddleware("super_admin", "admin", "manager"),
  completeTrip,
);

router.put(
  "/:id/cancel",
  roleMiddleware("super_admin", "admin", "manager"),
  cancelTrip,
);

router.put(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager"),
  updateTrip,
);

router.delete(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager"),
  deleteTrip,
);

module.exports = router;
