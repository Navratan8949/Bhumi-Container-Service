const mongoose = require("mongoose");

const VehicleDriverAssignment = require("../models/VehicleDriverAssignment");
const Vehicle = require("../models/Vehicle");
const Driver = require("../models/Driver");

// =====================================================
// CREATE ASSIGNMENT
// =====================================================

const createAssignment = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const assignedBy = req.user.userId;

    const { vehicleId, driverId, assignedDate, remarks } = req.body;

    if (!vehicleId || !driverId || !assignedDate) {
      return res.status(400).json({
        success: false,
        message: "vehicleId, driverId and assignedDate are required",
      });
    }

    // -------------------------------------------------
    // Validate Vehicle
    // -------------------------------------------------

    const vehicle = await Vehicle.findOne({
      _id: vehicleId,
      companyId,
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found in this company",
      });
    }

    if (vehicle.status !== "active") {
      return res.status(400).json({
        success: false,
        message: "Inactive vehicle cannot be assigned",
      });
    }

    // -------------------------------------------------
    // Validate Driver
    // -------------------------------------------------

    const driver = await Driver.findOne({
      _id: driverId,
      companyId,
    });

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found in this company",
      });
    }

    if (driver.status !== "active") {
      return res.status(400).json({
        success: false,
        message: "Inactive driver cannot be assigned",
      });
    }

    // -------------------------------------------------
    // Validate assigned date
    // -------------------------------------------------

    const assignmentDate = new Date(assignedDate);

    if (isNaN(assignmentDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid assigned date",
      });
    }

    // -------------------------------------------------
    // Check vehicle already assigned
    // -------------------------------------------------

    const activeVehicleAssignment = await VehicleDriverAssignment.findOne({
      companyId,
      vehicleId,
      status: "active",
    });

    if (activeVehicleAssignment) {
      return res.status(409).json({
        success: false,
        message: "Vehicle already has an active driver assignment",
        assignmentId: activeVehicleAssignment._id,
      });
    }

    // -------------------------------------------------
    // Check driver already assigned
    // -------------------------------------------------

    const activeDriverAssignment = await VehicleDriverAssignment.findOne({
      companyId,
      driverId,
      status: "active",
    });

    if (activeDriverAssignment) {
      return res.status(409).json({
        success: false,
        message: "Driver already has an active vehicle assignment",
        assignmentId: activeDriverAssignment._id,
      });
    }

    // -------------------------------------------------
    // Check date overlap with previous assignments
    // -------------------------------------------------

    const overlappingAssignment = await VehicleDriverAssignment.findOne({
      companyId,
      status: { $in: ["active", "completed"] },

      $or: [
        {
          vehicleId,
          assignedDate: { $lte: assignmentDate },
          $or: [
            { unassignedDate: null },
            { unassignedDate: { $gte: assignmentDate } },
          ],
        },
        {
          driverId,
          assignedDate: { $lte: assignmentDate },
          $or: [
            { unassignedDate: null },
            { unassignedDate: { $gte: assignmentDate } },
          ],
        },
      ],
    });

    if (overlappingAssignment) {
      return res.status(409).json({
        success: false,
        message:
          "Vehicle or driver already has an assignment overlapping this date",
        assignmentId: overlappingAssignment._id,
      });
    }

    // -------------------------------------------------
    // Create assignment
    // -------------------------------------------------

    const assignment = await VehicleDriverAssignment.create({
      companyId,

      vehicleId,

      driverId,

      assignedDate: assignmentDate,

      status: "active",

      remarks: remarks || "",

      assignedBy,
    });

    // -------------------------------------------------
    // Update vehicle current driver
    // -------------------------------------------------

    vehicle.driverId = driverId;

    await vehicle.save();

    // -------------------------------------------------
    // Populate
    // -------------------------------------------------

    const populatedAssignment = await VehicleDriverAssignment.findById(
      assignment._id,
    )
      .populate(
        "vehicleId",
        "vehicleNumber vehicleType ownerType ownerName ownerPhone",
      )
      .populate("driverId", "name phone license status")
      .populate("assignedBy", "name email");

    return res.status(201).json({
      success: true,
      message: "Driver assigned to vehicle successfully",
      data: populatedAssignment,
    });
  } catch (error) {
    console.error("Create vehicle driver assignment error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create vehicle driver assignment",
      error: error.message,
    });
  }
};

// =====================================================
// GET ASSIGNMENTS
// =====================================================

const getAssignments = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const { vehicleId, driverId, status } = req.query;

    const filter = {
      companyId,
    };

    if (vehicleId) {
      filter.vehicleId = vehicleId;
    }

    if (driverId) {
      filter.driverId = driverId;
    }

    if (status) {
      filter.status = status;
    }

    const assignments = await VehicleDriverAssignment.find(filter)
      .populate(
        "vehicleId",
        "vehicleNumber vehicleType ownerType ownerName ownerPhone",
      )
      .populate("driverId", "name phone license status")
      .populate("assignedBy", "name email")
      .sort({
        assignedDate: -1,
        createdAt: -1,
      });

    return res.status(200).json({
      success: true,
      count: assignments.length,
      data: assignments,
    });
  } catch (error) {
    console.error("Get vehicle driver assignments error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch vehicle driver assignments",
      error: error.message,
    });
  }
};

// =====================================================
// GET ASSIGNMENT BY ID
// =====================================================

const getAssignmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid assignment ID",
      });
    }

    const assignment = await VehicleDriverAssignment.findOne({
      _id: id,
      companyId,
    })
      .populate(
        "vehicleId",
        "vehicleNumber vehicleType ownerType ownerName ownerPhone",
      )
      .populate("driverId", "name phone license status")
      .populate("assignedBy", "name email");

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Vehicle driver assignment not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: assignment,
    });
  } catch (error) {
    console.error("Get assignment error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch assignment",
      error: error.message,
    });
  }
};

// =====================================================
// COMPLETE ASSIGNMENT
// =====================================================

const completeAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    const { unassignedDate, remarks } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid assignment ID",
      });
    }

    const assignment = await VehicleDriverAssignment.findOne({
      _id: id,
      companyId,
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found",
      });
    }

    if (assignment.status !== "active") {
      return res.status(400).json({
        success: false,
        message: "Only active assignment can be completed",
      });
    }

    const endDate = unassignedDate ? new Date(unassignedDate) : new Date();

    if (isNaN(endDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid unassigned date",
      });
    }

    if (endDate < assignment.assignedDate) {
      return res.status(400).json({
        success: false,
        message: "Unassigned date cannot be before assigned date",
      });
    }

    assignment.unassignedDate = endDate;

    assignment.status = "completed";

    if (remarks !== undefined) {
      assignment.remarks = remarks;
    }

    await assignment.save();

    // -------------------------------------------------
    // Clear vehicle current driver
    // -------------------------------------------------

    const vehicle = await Vehicle.findOne({
      _id: assignment.vehicleId,
      companyId,
    });

    if (
      vehicle &&
      vehicle.driverId &&
      vehicle.driverId.toString() === assignment.driverId.toString()
    ) {
      vehicle.driverId = null;

      await vehicle.save();
    }

    const updatedAssignment = await VehicleDriverAssignment.findById(
      assignment._id,
    )
      .populate(
        "vehicleId",
        "vehicleNumber vehicleType ownerType ownerName ownerPhone",
      )
      .populate("driverId", "name phone license status")
      .populate("assignedBy", "name email");

    return res.status(200).json({
      success: true,
      message: "Vehicle driver assignment completed successfully",
      data: updatedAssignment,
    });
  } catch (error) {
    console.error("Complete assignment error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to complete assignment",
      error: error.message,
    });
  }
};

// =====================================================
// CANCEL ASSIGNMENT
// =====================================================

const cancelAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid assignment ID",
      });
    }

    const assignment = await VehicleDriverAssignment.findOne({
      _id: id,
      companyId,
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found",
      });
    }

    if (assignment.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Assignment is already cancelled",
      });
    }

    if (assignment.status === "active") {
      const vehicle = await Vehicle.findOne({
        _id: assignment.vehicleId,
        companyId,
      });

      if (
        vehicle &&
        vehicle.driverId &&
        vehicle.driverId.toString() === assignment.driverId.toString()
      ) {
        vehicle.driverId = null;

        await vehicle.save();
      }
    }

    assignment.status = "cancelled";

    assignment.unassignedDate = new Date();

    await assignment.save();

    return res.status(200).json({
      success: true,
      message: "Vehicle driver assignment cancelled successfully",
    });
  } catch (error) {
    console.error("Cancel assignment error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to cancel assignment",
      error: error.message,
    });
  }
};

module.exports = {
  createAssignment,
  getAssignments,
  getAssignmentById,
  completeAssignment,
  cancelAssignment,
};
