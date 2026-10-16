const ActivityLog = require("../models/ActivityLog");

// Get all activity logs with pagination and filtering
exports.getActivityLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const startIndex = (page - 1) * limit;

    const query = {};

    if (req.user && req.user.companyId) {
      query.company = req.user.companyId;
    } else if (req.user && req.user.role !== "super_admin") {
      return res.status(403).json({ success: false, message: "Company ID is required" });
    }

    if (req.query.user) {
      query.user = req.query.user;
    }
    if (req.query.action) {
      query.action = req.query.action;
    }
    if (req.query.entity) {
      query.entity = req.query.entity;
    }
    if (req.query.entityId) {
      query.entityId = req.query.entityId;
    }
    if (req.query.startDate && req.query.endDate) {
      query.createdAt = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate),
      };
    }

    const total = await ActivityLog.countDocuments(query);
    const logs = await ActivityLog.find(query)
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit)
      .populate("user", "name username role email");

    res.status(200).json({
      success: true,
      count: logs.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: logs,
    });
  } catch (err) {
    console.error("Error fetching activity logs:", err);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};
