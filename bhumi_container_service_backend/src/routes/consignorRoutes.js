const express = require("express");

const {
  createConsignor,
  getConsignors,
  getConsignorById,
  updateConsignor,
  deleteConsignor,
} = require("../controllers/consignorController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.post(
  "/",
  roleMiddleware("super_admin", "admin", "manager"),
  createConsignor,
);

router.get(
  "/",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  getConsignors,
);

router.get(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  getConsignorById,
);

router.put(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager"),
  updateConsignor,
);

router.delete(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager"),
  deleteConsignor,
);

module.exports = router;
