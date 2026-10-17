const express = require("express");

const {
  createTyre,
  getTyres,
  getTyreById,
  updateTyre,
  fitTyre,
  removeTyre,
  repairTyre,
  retreadTyre,
  returnToStock,
  scrapTyre,
  getTyreHistory,
} = require("../controllers/tyreController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(authMiddleware);

// Basic operations
router.post("/", roleMiddleware("super_admin", "admin", "manager"), createTyre);

router.get(
  "/",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  getTyres,
);

router.get(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  getTyreById,
);

router.put(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager"),
  updateTyre,
);

// Lifecycle
router.post(
  "/:id/fit",
  roleMiddleware("super_admin", "admin", "manager"),
  fitTyre,
);

router.post(
  "/:id/remove",
  roleMiddleware("super_admin", "admin", "manager"),
  removeTyre,
);

router.post(
  "/:id/repair",
  roleMiddleware("super_admin", "admin", "manager"),
  repairTyre,
);

router.post(
  "/:id/retread",
  roleMiddleware("super_admin", "admin", "manager"),
  retreadTyre,
);

router.post(
  "/:id/return-to-stock",
  roleMiddleware("super_admin", "admin", "manager"),
  returnToStock,
);

router.post(
  "/:id/scrap",
  roleMiddleware("super_admin", "admin", "manager"),
  scrapTyre,
);

// History
router.get(
  "/:id/history",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  getTyreHistory,
);

module.exports = router;
