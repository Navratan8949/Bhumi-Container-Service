const express = require("express");

const {
  getOfficeExpenses,
  createOfficeExpense,
  getOfficeExpenseById,
  updateOfficeExpense,
  cancelOfficeExpense,
} = require("../controllers/officeExpenseController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.post(
  "/",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  createOfficeExpense,
);

router.get(
  "/",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  getOfficeExpenses,
);

router.get(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  getOfficeExpenseById,
);

router.put(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  updateOfficeExpense,
);

router.delete(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  cancelOfficeExpense,
);

module.exports = router;
