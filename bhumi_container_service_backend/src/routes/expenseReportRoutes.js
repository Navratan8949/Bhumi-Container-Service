const express = require("express");

const {
  getExpenseReport,
  getExpenseCategoryReport,
} = require("../controllers/expenseReportController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(authMiddleware);
router.use(roleMiddleware("super_admin", "admin", "manager", "accountant"));

router.get("/categories", getExpenseCategoryReport);
router.get("/", getExpenseReport);

module.exports = router;
