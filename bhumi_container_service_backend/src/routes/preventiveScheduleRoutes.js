const express = require("express");
const router = express.Router();
const {
  getSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
} = require("../controllers/preventiveScheduleController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

router.use(authMiddleware);

router.get(
  "/",
  roleMiddleware("super_admin", "admin", "manager", "accountant", "driver", "vendor"),
  getSchedules,
);

router.post(
  "/",
  roleMiddleware("super_admin", "admin", "manager"),
  createSchedule,
);

router.put(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager"),
  updateSchedule,
);

router.delete(
  "/:id",
  roleMiddleware("super_admin", "admin"),
  deleteSchedule,
);

module.exports = router;
