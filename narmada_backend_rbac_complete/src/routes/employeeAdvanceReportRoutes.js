const express = require("express");

const {
  getEmployeeAdvanceReport,
  getEmployeeWiseAdvanceReport,
} = require("../controllers/employeeAdvanceReportController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(authMiddleware);
router.use(roleMiddleware("super_admin", "admin", "manager", "accountant"));

router.get("/employees", getEmployeeWiseAdvanceReport);
router.get("/", getEmployeeAdvanceReport);

module.exports = router;
