const express = require("express");

const {
  createVehicleDocument,
  getVehicleDocuments,
  getVehicleDocumentById,
  updateVehicleDocument,
  deleteVehicleDocument,
  getComplianceDashboard,
  getComplianceDocuments,
} = require("../controllers/vehicleDocumentController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const { vehicleDocumentUpload } = require("../utils/multer");

const router = express.Router();

router.use(authMiddleware);

router.post(
  "/",
  roleMiddleware("super_admin", "admin", "manager"),
  vehicleDocumentUpload.single("documentFile"),
  createVehicleDocument,
);

router.get(
  "/",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  getVehicleDocuments,
);

router.get(
  "/compliance/dashboard",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  getComplianceDashboard,
);

router.get(
  "/compliance/expiring",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  getComplianceDocuments,
);

router.get(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  getVehicleDocumentById,
);

router.put(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager"),
  vehicleDocumentUpload.single("documentFile"),
  updateVehicleDocument,
);

router.delete(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager"),
  deleteVehicleDocument,
);

module.exports = router;
