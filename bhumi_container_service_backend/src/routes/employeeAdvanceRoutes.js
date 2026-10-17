const express = require("express");

const {
  createEmployeeAdvance,
  getEmployeeAdvances,
  getEmployeeAdvanceById,
  updateEmployeeAdvance,
  deleteEmployeeAdvance,
  recoverEmployeeAdvance,
} = require("../controllers/employeeAdvanceController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.post(
  "/",
  roleMiddleware("super_admin", "admin", "accountant"),
  createEmployeeAdvance,
);

router.get(
  "/",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  getEmployeeAdvances,
);

router.get(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  getEmployeeAdvanceById,
);

router.put(
  "/:id",
  roleMiddleware("super_admin", "admin", "accountant"),
  updateEmployeeAdvance,
);

router.post(
  "/:id/recover",
  roleMiddleware("super_admin", "admin", "accountant"),
  recoverEmployeeAdvance,
);

router.delete(
  "/:id",
  roleMiddleware("super_admin", "admin", "accountant"),
  deleteEmployeeAdvance,
);

module.exports = router;
