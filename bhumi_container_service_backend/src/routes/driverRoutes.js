const express = require("express");

const {
  createDriver,
  getDrivers,
  getDriverById,
  updateDriver,
  deleteDriver,
} = require("../controllers/driverController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const { driverDocumentUpload } = require("../utils/multer");

const router = express.Router();

router.use(authMiddleware);

router.post(
  "/",
  roleMiddleware("super_admin", "admin", "manager"),
  driverDocumentUpload.any(),
  createDriver,
);

router.get(
  "/",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  getDrivers,
);

router.get(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  getDriverById,
);

router.put(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager"),
  driverDocumentUpload.any(),
  updateDriver,
);

router.delete(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager"),
  deleteDriver,
);

module.exports = router;
