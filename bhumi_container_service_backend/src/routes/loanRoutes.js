const express = require("express");

const {
  createLoan,
  getLoans,
  getLoanById,
  updateLoan,
  recordEmiPayment,
  deleteLoan,
  sendDailyAlertsEmail,
} = require("../controllers/loanController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.post(
  "/",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  createLoan
);

router.get(
  "/",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  getLoans
);

router.post(
  "/send-daily-alerts",
  roleMiddleware("super_admin", "admin"),
  sendDailyAlertsEmail
);

router.get(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  getLoanById
);

router.put(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  updateLoan
);

router.post(
  "/:id/pay-emi",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  recordEmiPayment
);

router.delete(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  deleteLoan
);

module.exports = router;
