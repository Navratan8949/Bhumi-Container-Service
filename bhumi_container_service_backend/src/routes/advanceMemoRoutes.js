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
  roleMiddleware("super_admin", "accountant"),
  createAdvanceMemo,
);

router.get(
  "/",
  roleMiddleware("super_admin", "accountant"),
  getAdvanceMemos,
);

router.get(
  "/:id",
  roleMiddleware("super_admin", "accountant"),
  getAdvanceMemoById,
);

router.put(
  "/:id",
  roleMiddleware("super_admin", "accountant"),
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
