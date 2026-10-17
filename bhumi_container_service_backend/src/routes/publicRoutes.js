const express = require("express");
const router = express.Router();
const {
  trackPublicConsignment,
  getPublicCompanyProfile,
} = require("../controllers/publicController");

// Public consignment / vehicle tracking (no auth required)
router.get("/track", trackPublicConsignment);

// Public company profile for website header, footer, and contact info
router.get("/company", getPublicCompanyProfile);

module.exports = router;
