const mongoose = require("mongoose");
const Attendance = require("../models/Attendance");
const Employee = require("../models/Employee");

// =====================================================
// CREATE ATTENDANCE
// =====================================================
const createAttendance = async (req, res) => {
  try {
    const {
      employeeId,
      attendanceDate,
      status,
      checkIn,
      checkOut,
      overtimeHours,
      remarks,
    } = req.body;

    const companyId = req.user.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company is required",
      });
    }

    if (!employeeId || !attendanceDate || !status) {
      return res.status(400).json({
        success: false,
        message: "employeeId, attendanceDate and status are required",
      });
    }

    // Validate employee
    const employee = await Employee.findOne({
      _id: employeeId,
      companyId,
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found in this company",
      });
    }

    if (employee.status !== "active") {
      return res.status(400).json({
        success: false,
        message: "Inactive employee attendance cannot be marked",
      });
    }

    // Normalize date
    const date = new Date(attendanceDate);

    if (isNaN(date.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid attendance date",
      });
    }

    date.setHours(0, 0, 0, 0);

    // Duplicate attendance check
    const existingAttendance = await Attendance.findOne({
      companyId,
      employeeId,
      attendanceDate: date,
    });

    if (existingAttendance) {
      return res.status(409).json({
        success: false,
        message: "Attendance already exists for this employee on this date",
      });
    }

    let workingHours = 0;

    // Calculate working hours
    if (checkIn && checkOut) {
      const checkInTime = new Date(checkIn);
      const checkOutTime = new Date(checkOut);

      if (isNaN(checkInTime.getTime()) || isNaN(checkOutTime.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid check-in or check-out time",
        });
      }

      if (checkOutTime <= checkInTime) {
        return res.status(400).json({
          success: false,
          message: "Check-out time must be after check-in time",
        });
      }

      const difference = checkOutTime.getTime() - checkInTime.getTime();

      workingHours = Number((difference / (1000 * 60 * 60)).toFixed(2));
    }

    const attendance = await Attendance.create({
      companyId,
      employeeId,
      attendanceDate: date,
      status,
      checkIn: checkIn || null,
      checkOut: checkOut || null,
      workingHours,
      overtimeHours: Number(overtimeHours || 0),
      remarks: remarks || "",
      markedBy: req.user.userId,
    });

    const populatedAttendance = await Attendance.findById(attendance._id)
      .populate(
        "employeeId",
        "employeeCode name phone designation department employeeType",
      )
      .populate("markedBy", "name email");

    return res.status(201).json({
      success: true,
      message: "Attendance created successfully",
      data: populatedAttendance,
    });
  } catch (error) {
    console.error("Create attendance error:", error.message);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Attendance already exists for this employee on this date",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create attendance",
      error: error.message,
    });
  }
};

// =====================================================
// GET ALL ATTENDANCE
// =====================================================
const getAttendances = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const { employeeId, status, fromDate, toDate } = req.query;

    const filter = {
      companyId,
    };

    if (employeeId) {
      filter.employeeId = employeeId;
    }

    if (status) {
      filter.status = status;
    }

    if (fromDate || toDate) {
      filter.attendanceDate = {};

      if (fromDate) {
        const startDate = new Date(fromDate);
        startDate.setHours(0, 0, 0, 0);

        filter.attendanceDate.$gte = startDate;
      }

      if (toDate) {
        const endDate = new Date(toDate);
        endDate.setHours(23, 59, 59, 999);

        filter.attendanceDate.$lte = endDate;
      }
    }

    const attendances = await Attendance.find(filter)
      .populate(
        "employeeId",
        "employeeCode name phone designation department employeeType",
      )
      .populate("markedBy", "name email")
      .sort({
        attendanceDate: -1,
      });

    return res.status(200).json({
      success: true,
      count: attendances.length,
      data: attendances,
    });
  } catch (error) {
    console.error("Get attendance error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch attendance",
      error: error.message,
    });
  }
};

// =====================================================
// GET SINGLE ATTENDANCE
// =====================================================
const getAttendanceById = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid attendance ID",
      });
    }

    const attendance = await Attendance.findOne({
      _id: id,
      companyId,
    })
      .populate(
        "employeeId",
        "employeeCode name phone designation department employeeType",
      )
      .populate("markedBy", "name email");

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "Attendance not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: attendance,
    });
  } catch (error) {
    console.error("Get attendance by ID error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch attendance",
      error: error.message,
    });
  }
};

// =====================================================
// UPDATE ATTENDANCE
// =====================================================
const updateAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid attendance ID",
      });
    }

    const attendance = await Attendance.findOne({
      _id: id,
      companyId,
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "Attendance not found",
      });
    }

    const { status, checkIn, checkOut, overtimeHours, remarks } = req.body;

    if (status !== undefined) {
      attendance.status = status;
    }

    if (checkIn !== undefined) {
      attendance.checkIn = checkIn || null;
    }

    if (checkOut !== undefined) {
      attendance.checkOut = checkOut || null;
    }

    if (overtimeHours !== undefined) {
      attendance.overtimeHours = Number(overtimeHours || 0);
    }

    if (remarks !== undefined) {
      attendance.remarks = remarks;
    }

    // Recalculate working hours
    if (attendance.checkIn && attendance.checkOut) {
      const checkInTime = new Date(attendance.checkIn);

      const checkOutTime = new Date(attendance.checkOut);

      if (isNaN(checkInTime.getTime()) || isNaN(checkOutTime.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid check-in or check-out time",
        });
      }

      if (checkOutTime <= checkInTime) {
        return res.status(400).json({
          success: false,
          message: "Check-out time must be after check-in time",
        });
      }

      const difference = checkOutTime.getTime() - checkInTime.getTime();

      attendance.workingHours = Number(
        (difference / (1000 * 60 * 60)).toFixed(2),
      );
    } else {
      attendance.workingHours = 0;
    }

    await attendance.save();

    const updatedAttendance = await Attendance.findById(attendance._id)
      .populate(
        "employeeId",
        "employeeCode name phone designation department employeeType",
      )
      .populate("markedBy", "name email");

    return res.status(200).json({
      success: true,
      message: "Attendance updated successfully",
      data: updatedAttendance,
    });
  } catch (error) {
    console.error("Update attendance error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to update attendance",
      error: error.message,
    });
  }
};

// =====================================================
// DELETE ATTENDANCE
// =====================================================
const deleteAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid attendance ID",
      });
    }

    const attendance = await Attendance.findOneAndDelete({
      _id: id,
      companyId,
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "Attendance not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Attendance deleted successfully",
    });
  } catch (error) {
    console.error("Delete attendance error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to delete attendance",
      error: error.message,
    });
  }
};

module.exports = {
  createAttendance,
  getAttendances,
  getAttendanceById,
  updateAttendance,
  deleteAttendance,
};
