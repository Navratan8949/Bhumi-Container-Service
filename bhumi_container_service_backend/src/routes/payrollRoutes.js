const express = require("express");

const {
  createPayroll,
  getPayrolls,
  getPayrollById,
} = require("../controllers/payrollController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.post(
  "/",
  roleMiddleware("super_admin", "admin", "accountant"),
  createPayroll,
);

router.get(
  "/",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  getPayrolls,
);

router.get(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  getPayrollById,
);

module.exports = router;
