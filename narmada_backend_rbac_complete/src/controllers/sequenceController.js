const mongoose = require("mongoose");
const {
  SEQUENCE_CONFIGS,
  getNextSequence,
  getNextBookingAndLR,
} = require("../utils/sequenceService");

const getNextSequenceNumber = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company is required",
      });
    }

    const { type } = req.query;
    if (!type) {
      return res.status(400).json({
        success: false,
        message: "type query parameter is required",
      });
    }

    if (type === "bookings" || type === "booking") {
      const numbers = await getNextBookingAndLR(companyId);
      return res.status(200).json({
        success: true,
        data: {
          type,
          number: numbers.bookingNumber,
          bookingNumber: numbers.bookingNumber,
          lrNumber: numbers.lrNumber,
        },
      });
    }

    if (!SEQUENCE_CONFIGS[type]) {
      return res.status(400).json({
        success: false,
        message: `Unknown sequence type: ${type}`,
      });
    }

    const number = await getNextSequence(companyId, type);
    return res.status(200).json({
      success: true,
      data: {
        type,
        number,
      },
    });
  } catch (error) {
    console.error("getNextSequenceNumber error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to generate next sequence number",
    });
  }
};

module.exports = {
  getNextSequenceNumber,
};
