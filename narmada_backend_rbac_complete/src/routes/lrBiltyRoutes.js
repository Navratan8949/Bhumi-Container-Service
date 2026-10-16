const express = require("express");

const {
  createLRBilty,
  getLRBilties,
  getLRBiltyById,
  updateLRBilty,
  cancelLRBilty,
  deleteLRBilty,
} = require("../controllers/lrBiltyController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

// All LR / Bilty APIs require login
router.use(authMiddleware);

// CREATE
router.post(
  "/",
  roleMiddleware("super_admin", "admin", "manager"),
  createLRBilty,
);

// GET ALL
router.get(
  "/",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  getLRBilties,
);

// GET ONE
router.get(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  getLRBiltyById,
);

// UPDATE
router.put(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager"),
  updateLRBilty,
);

// CANCEL
router.post(
  "/:id/cancel",
  roleMiddleware("super_admin", "admin", "manager"),
  cancelLRBilty,
);
router.put(
  "/:id/cancel",
  roleMiddleware("super_admin", "admin", "manager"),
  cancelLRBilty,
);

// DELETE (HARD DELETE)
router.delete(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager"),
  deleteLRBilty,
);

module.exports = router;
