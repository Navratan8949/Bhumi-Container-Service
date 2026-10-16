const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const Company = require("../models/Company");
const User = require("../models/User");

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Authorization token is required",
      });
    }

    const parts = authHeader.trim().split(/\s+/);

    if (parts.length !== 2 || parts[0] !== "Bearer" || !parts[1]) {
      return res.status(401).json({
        success: false,
        message: "Invalid authorization format",
      });
    }

    const decoded = jwt.verify(parts[1], process.env.JWT_SECRET);

    if (!decoded.userId || !decoded.role) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token",
      });
    }

    let companyId = decoded.companyId || null;

    // Super Admin can work inside a selected company context.
    // The header is validated against the Company collection so a client
    // cannot simply impersonate an arbitrary company by changing the header.
    if (decoded.role === "super_admin") {
      const requestedCompanyId = req.headers["x-company-id"];

      if (requestedCompanyId) {
        if (!mongoose.Types.ObjectId.isValid(requestedCompanyId)) {
          return res.status(400).json({
            success: false,
            message: "Invalid company context",
          });
        }

        const company = await Company.findOne({
          _id: requestedCompanyId,
          status: "active",
        }).select("_id name code");

        if (!company) {
          return res.status(403).json({
            success: false,
            message: "Selected company is not available",
          });
        }

        companyId = company._id;
      }

      // Also validate a companyId stored in a selected-company JWT.
      if (companyId && !requestedCompanyId) {
        if (!mongoose.Types.ObjectId.isValid(companyId)) {
          return res.status(400).json({
            success: false,
            message: "Invalid company context",
          });
        }

        const company = await Company.findOne({
          _id: companyId,
          status: "active",
        }).select("_id");

        if (!company) {
          return res.status(403).json({
            success: false,
            message: "Selected company is not available",
          });
        }
      }
    }

    const userDoc = await User.findById(decoded.userId).select(
      "name email phone status",
    );

    if (!userDoc || userDoc.status !== "active") {
      return res.status(401).json({
        success: false,
        message: "User account is inactive or not found",
      });
    }

    req.user = {
      userId: decoded.userId,
      name: userDoc.name,
      email: userDoc.email,
      phone: userDoc.phone,
      role: decoded.role,
      companyId: companyId ? companyId.toString() : null,
    };

    next();
  } catch (error) {
    console.error("Auth middleware error:", error.message);

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token has expired",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid or unauthorized token",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Authentication check failed",
    });
  }
};

module.exports = authMiddleware;
