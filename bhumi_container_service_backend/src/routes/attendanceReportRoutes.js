const express = require("express");

const {
  getAttendanceReport,
  getEmployeeAttendanceReport,
} = require("../controllers/attendanceReportController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(authMiddleware);
router.use(roleMiddleware("super_admin", "admin", "manager", "accountant"));

router.get("/employees", getEmployeeAttendanceReport);
router.get("/", getAttendanceReport);

module.exports = router;
