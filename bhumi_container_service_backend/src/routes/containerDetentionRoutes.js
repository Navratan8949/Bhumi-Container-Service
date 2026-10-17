const express = require("express");
const router = express.Router();
const {
  createDetention,
  getDetentions,
  getDetentionById,
  updateDetention,
  deleteDetention,
} = require("../controllers/containerDetentionController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

router.use(authMiddleware);

router.get(
  "/",
  roleMiddleware("super_admin", "admin", "manager", "accountant", "driver", "vendor"),
  getDetentions,
);

router.get(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager", "accountant", "driver", "vendor"),
  getDetentionById,
);

router.post(
  "/",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  createDetention,
);

router.put(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  updateDetention,
);

router.delete(
  "/:id",
  roleMiddleware("super_admin", "admin"),
  deleteDetention,
);

module.exports = router;
