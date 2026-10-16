const express = require("express");

const {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
} = require("../controllers/userController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const { profileImageUpload } = require("../utils/multer");

const router = express.Router();

// All user APIs require authentication
router.use(authMiddleware);

// Super Admin + Company Admin can manage users
router.use(roleMiddleware("super_admin", "admin"));

// Create user
router.post("/", profileImageUpload.single("profileImage"), createUser);

// Get all users
router.get("/", getUsers);

// Get user by ID
router.get("/:id", getUserById);

// Update user
router.put("/:id", profileImageUpload.single("profileImage"), updateUser);

// Delete user
router.delete("/:id", deleteUser);

module.exports = router;
