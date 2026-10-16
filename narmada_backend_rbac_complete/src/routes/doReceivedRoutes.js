const express = require("express");

const {
  createDOReceived,
  getDOReceived,
  getDOReceivedById,
  updateDOReceived,
  deleteDOReceived,
} = require("../controllers/doReceivedController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(authMiddleware);

// CREATE
router.post(
  "/",
  roleMiddleware("super_admin", "admin", "manager"),
  createDOReceived,
);

// GET ALL
router.get(
  "/",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  getDOReceived,
);

// GET ONE
router.get(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  getDOReceivedById,
);

// UPDATE
router.put(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager"),
  updateDOReceived,
);

// DELETE / CANCEL
router.delete(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager"),
  deleteDOReceived,
);

module.exports = router;
