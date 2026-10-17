const express = require("express");

const {
  createAssignment,
  getAssignments,
  getAssignmentById,
  completeAssignment,
  cancelAssignment,
} = require("../controllers/vehicleDriverAssignmentController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.post(
  "/",
  roleMiddleware("super_admin", "admin", "manager"),
  createAssignment,
);

router.get(
  "/",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  getAssignments,
);

router.get(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  getAssignmentById,
);

router.put(
  "/:id/complete",
  roleMiddleware("super_admin", "admin", "manager"),
  completeAssignment,
);

router.delete(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager"),
  cancelAssignment,
);

module.exports = router;
