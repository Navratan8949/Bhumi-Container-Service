const Vehicle = require("../models/Vehicle");
const Driver = require("../models/Driver");

// CREATE
const createVehicle = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company is required",
      });
    }

    const {
      vehicleNumber,
      vehicleType,
      driverId,
      ownerType,
      ownerName,
      ownerPhone,
      status,
    } = req.body;

    if (!vehicleNumber || !vehicleType) {
      return res.status(400).json({
        success: false,
        message: "Vehicle number and vehicle type are required",
      });
    }

    const normalizedVehicleNumber = vehicleNumber.trim().toUpperCase();

    // Check duplicate vehicle
    const existingVehicle = await Vehicle.findOne({
      companyId,
      vehicleNumber: normalizedVehicleNumber,
    });

    if (existingVehicle) {
      return res.status(409).json({
        success: false,
        message: "Vehicle with this number already exists",
      });
    }

    // Validate driver
    if (driverId) {
      const driver = await Driver.findOne({
        _id: driverId,
        companyId,
      });

      if (!driver) {
        return res.status(404).json({
          success: false,
          message: "Driver not found in your company",
        });
      }
    }

    const vehicle = await Vehicle.create({
      companyId,
      vehicleNumber: normalizedVehicleNumber,
      vehicleType,
      driverId: driverId || null,
      ownerType,
      ownerName,
      ownerPhone,
      status:
        status && status.trim() && !status.toLowerCase().startsWith("select")
          ? status.trim().toLowerCase()
          : "active",
    });

    const populatedVehicle = await Vehicle.findById(vehicle._id).populate(
      "driverId",
      "name phone licenseNumber status",
    );

    res.status(201).json({
      success: true,
      message: "Vehicle created successfully",
      data: populatedVehicle,
    });
  } catch (error) {
    console.error("Create vehicle error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create vehicle",
      error: error.message,
    });
  }
};

// GET ALL
const getVehicles = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company is required",
      });
    }

    const vehicles = await Vehicle.find({
      companyId,
    })
      .populate("driverId", "name phone licenseNumber status")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: vehicles.length,
      data: vehicles,
    });
  } catch (error) {
    console.error("Get vehicles error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch vehicles",
      error: error.message,
    });
  }
};

// GET ONE
const getVehicleById = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const vehicle = await Vehicle.findOne({
      _id: req.params.id,
      companyId,
    }).populate("driverId", "name phone licenseNumber status");

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    res.status(200).json({
      success: true,
      data: vehicle,
    });
  } catch (error) {
    console.error("Get vehicle error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch vehicle",
      error: error.message,
    });
  }
};

// UPDATE
const updateVehicle = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const vehicle = await Vehicle.findOne({
      _id: req.params.id,
      companyId,
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    const {
      vehicleNumber,
      vehicleType,
      driverId,
      ownerType,
      ownerName,
      ownerPhone,
      status,
    } = req.body;

    // Vehicle number duplicate check
    if (
      vehicleNumber &&
      vehicleNumber.trim().toUpperCase() !== vehicle.vehicleNumber
    ) {
      const duplicate = await Vehicle.findOne({
        companyId,
        vehicleNumber: vehicleNumber.trim().toUpperCase(),
        _id: { $ne: req.params.id },
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "Another vehicle with this number already exists",
        });
      }

      vehicle.vehicleNumber = vehicleNumber.trim().toUpperCase();
    }

    // Validate driver
    if (driverId !== undefined && driverId !== null) {
      const driver = await Driver.findOne({
        _id: driverId,
        companyId,
      });

      if (!driver) {
        return res.status(404).json({
          success: false,
          message: "Driver not found in your company",
        });
      }

      vehicle.driverId = driverId;
    }

    if (driverId === null) {
      vehicle.driverId = null;
    }

    if (vehicleType !== undefined) {
      vehicle.vehicleType = vehicleType;
    }

    if (ownerType !== undefined) {
      vehicle.ownerType = ownerType;
    }

    if (ownerName !== undefined) {
      vehicle.ownerName = ownerName;
    }

    if (ownerPhone !== undefined) {
      vehicle.ownerPhone = ownerPhone;
    }

    if (status !== undefined) {
      vehicle.status =
        status && status.trim() && !status.toLowerCase().startsWith("select")
          ? status.trim().toLowerCase()
          : vehicle.status || "active";
    }

    await vehicle.save();

    const updatedVehicle = await Vehicle.findById(vehicle._id).populate(
      "driverId",
      "name phone licenseNumber status",
    );

    res.status(200).json({
      success: true,
      message: "Vehicle updated successfully",
      data: updatedVehicle,
    });
  } catch (error) {
    console.error("Update vehicle error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update vehicle",
      error: error.message,
    });
  }
};

// DELETE
const deleteVehicle = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const vehicle = await Vehicle.findOneAndDelete({
      _id: req.params.id,
      companyId,
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Vehicle deleted successfully",
    });
  } catch (error) {
    console.error("Delete vehicle error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete vehicle",
      error: error.message,
    });
  }
};

module.exports = {
  createVehicle,
  getVehicles,
  getVehicleById,
  updateVehicle,
  deleteVehicle,
};
