const express = require("express");
const { getNextSequenceNumber } = require("../controllers/sequenceController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.get("/next", getNextSequenceNumber);

module.exports = router;
