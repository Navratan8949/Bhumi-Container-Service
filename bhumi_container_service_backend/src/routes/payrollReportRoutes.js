const express = require("express");

const {
  getPayrollReport,
  getEmployeePayrollReport,
} = require("../controllers/payrollReportController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(authMiddleware);
router.use(roleMiddleware("super_admin", "admin", "manager", "accountant"));

router.get("/employees", getEmployeePayrollReport);
router.get("/", getPayrollReport);

module.exports = router;
