const express = require("express");

const {
  createEmployee,
  getEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
} = require("../controllers/employeeController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const { profileImageUpload } = require("../utils/multer");

const router = express.Router();

router.use(authMiddleware);

router.post(
  "/",
  roleMiddleware("super_admin", "admin", "manager"),
  profileImageUpload.single("photo"),
  createEmployee,
);

router.get(
  "/",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  getEmployees,
);

router.get(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  getEmployeeById,
);

router.put(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager"),
  profileImageUpload.single("photo"),
  updateEmployee,
);

router.delete(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager"),
  deleteEmployee,
);

module.exports = router;
