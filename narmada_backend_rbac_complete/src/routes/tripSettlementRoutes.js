const express = require("express");

const {
  getTripSettlement,
} = require("../controllers/tripSettlementController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.get(
  "/:tripId",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  getTripSettlement,
);

module.exports = router;
