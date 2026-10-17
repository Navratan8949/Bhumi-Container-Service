const express = require("express");
const {
  getSettings,
  updateSettings,
  testSmtpConnection,
} = require("../controllers/settingController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(authMiddleware);

// Get global settings (admin and super_admin)
router.get("/", roleMiddleware("super_admin", "admin"), getSettings);

// Update global settings (admin and super_admin)
router.put("/", roleMiddleware("super_admin", "admin"), updateSettings);

// Test email connection
router.post("/test-email", roleMiddleware("super_admin", "admin"), testSmtpConnection);

module.exports = router;
