const express = require("express");

const { getDriverReport } = require("../controllers/driverReportController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.get(
  "/",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  getDriverReport,
);

module.exports = router;
