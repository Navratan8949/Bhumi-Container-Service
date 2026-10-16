const express = require("express");

const {
  createSalaryPayment,
  getSalaryPayments,
} = require("../controllers/salaryPaymentController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.post(
  "/",
  roleMiddleware("super_admin", "admin", "accountant"),
  createSalaryPayment,
);

router.get(
  "/",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  getSalaryPayments,
);

module.exports = router;
