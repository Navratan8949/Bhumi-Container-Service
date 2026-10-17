const express = require("express");

const {
  createConsignee,
  getConsignees,
  getConsigneeById,
  updateConsignee,
  deleteConsignee,
} = require("../controllers/consigneeController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.post(
  "/",
  roleMiddleware("super_admin", "admin", "manager"),
  createConsignee,
);

router.get(
  "/",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  getConsignees,
);

router.get(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  getConsigneeById,
);

router.put(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager"),
  updateConsignee,
);

router.delete(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager"),
  deleteConsignee,
);

module.exports = router;
