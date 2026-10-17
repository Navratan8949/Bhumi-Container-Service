const express = require("express");

const {
  createCompany,
  getCompanies,
  getCompanyById,
  updateCompany,
  deleteCompany,
} = require("../controllers/companyController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const { profileImageUpload } = require("../utils/multer");

const router = express.Router();

// All company APIs require authentication
router.use(authMiddleware);

// Get All Companies (super_admin sees all, admin sees their own)
router.get("/", roleMiddleware("super_admin", "admin"), getCompanies);

// Get Single Company
router.get("/:id", roleMiddleware("super_admin", "admin"), getCompanyById);

// Update Company (super_admin or admin for their own company)
router.put("/:id", roleMiddleware("super_admin", "admin"), profileImageUpload.single("logo"), updateCompany);

// Create Company (super_admin only)
router.post("/", roleMiddleware("super_admin"), profileImageUpload.single("logo"), createCompany);

// Delete Company (super_admin only)
router.delete("/:id", roleMiddleware("super_admin"), deleteCompany);

module.exports = router;
