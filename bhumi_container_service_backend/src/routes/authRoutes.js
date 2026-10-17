const express = require("express");

const {
  login,
  getCurrentUser,
  selectCompany,
  changePassword,
  updateProfile,
  forgotPassword
} = require("../controllers/authController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const { profileImageUpload } = require("../utils/multer");

const router = express.Router();

router.post("/login", login);

router.get("/me", authMiddleware, getCurrentUser);

router.post(
  "/select-company",
  authMiddleware,
  roleMiddleware("super_admin"),
  selectCompany,
);

router.post("/change-password", authMiddleware, changePassword);
router.post("/update-profile", authMiddleware, profileImageUpload.single("profileImage"), updateProfile);
router.post("/forgot-password", forgotPassword);

module.exports = router;
