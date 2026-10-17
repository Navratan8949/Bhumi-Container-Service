const express = require("express");

const {
  getSupplyOrderFulfillment,
  getAllSupplyOrderFulfillment,
  getDOFulfillment,
} = require("../controllers/orderFulfillmentController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(authMiddleware);
router.use(roleMiddleware("super_admin", "admin", "manager", "accountant"));

router.get("/supply-orders", getAllSupplyOrderFulfillment);
router.get("/supply-orders/:id", getSupplyOrderFulfillment);
router.get("/do-received", getDOFulfillment);

module.exports = router;
