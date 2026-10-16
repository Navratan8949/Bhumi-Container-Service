const express = require("express");

const {
  createParty,
  getParties,
  getPartyById,
  updateParty,
  deleteParty,
} = require("../controllers/partyController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.post(
  "/",
  roleMiddleware("super_admin", "admin", "manager"),
  createParty,
);

router.get(
  "/",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  getParties,
);

router.get(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  getPartyById,
);

router.put(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager"),
  updateParty,
);

router.delete(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager"),
  deleteParty,
);

module.exports = router;
