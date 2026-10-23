const express = require("express");
const {
  createAdvanceMemo,
  getAdvanceMemos,
  getAdvanceMemoById,
  updateAdvanceMemo,
  deleteAdvanceMemo,
  convertToTrip,
} = require("../controllers/advanceMemoController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.post(
  "/",
  roleMiddleware("super_admin", "admin", "manager"),
  createAdvanceMemo,
);

router.get(
  "/",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  getAdvanceMemos,
);

router.get(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  getAdvanceMemoById,
);

router.put(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager"),
  updateAdvanceMemo,
);

router.delete(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager"),
  deleteAdvanceMemo,
);

router.post(
  "/:id/convert-to-trip",
  roleMiddleware("super_admin", "admin", "manager"),
  convertToTrip,
);

module.exports = router;
