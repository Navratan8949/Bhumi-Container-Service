const express = require("express");

const {
  createTripExpense,
  getTripExpenses,
  getTripExpenseById,
  cancelTripExpense,
} = require("../controllers/tripExpenseController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.post(
  "/",
  roleMiddleware("super_admin", "admin", "manager"),
  createTripExpense,
);

router.get(
  "/",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  getTripExpenses,
);

router.get(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  getTripExpenseById,
);

router.delete(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager"),
  cancelTripExpense,
);

module.exports = router;
