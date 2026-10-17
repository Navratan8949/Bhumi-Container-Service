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

// Only super admin can manage companies
router.use(roleMiddleware("super_admin"));

// Create Company
router.post("/", profileImageUpload.single("logo"), createCompany);

// Get All Companies
router.get("/", getCompanies);

// Get Single Company
router.get("/:id", getCompanyById);

// Update Company
router.put("/:id", profileImageUpload.single("logo"), updateCompany);

// Delete Company
router.delete("/:id", deleteCompany);

module.exports = router;
