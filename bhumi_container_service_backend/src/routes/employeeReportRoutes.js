const express = require("express");

const {
  getEmployeeReport,
  getEmployeeSummary,
} = require("../controllers/employeeReportController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(authMiddleware);
router.use(roleMiddleware("super_admin", "admin", "manager", "accountant"));

router.get("/summary", getEmployeeSummary);
router.get("/", getEmployeeReport);

module.exports = router;
