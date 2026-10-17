const express = require("express");
const router = express.Router();
const { trackPublicConsignment } = require("../controllers/publicController");

// Public consignment / vehicle tracking (no auth required)
router.get("/track", trackPublicConsignment);

module.exports = router;
