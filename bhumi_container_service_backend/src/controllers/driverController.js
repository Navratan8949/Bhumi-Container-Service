const Driver = require("../models/Driver");
const Employee = require("../models/Employee");
const { saveUploadedFile, deleteUploadedFile } = require("../utils/upload");

// CREATE
const createDriver = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company is required",
      });
    }

    const {
      name,
      phone,
      address,
      aadhaarNumber,
      panNumber,
      licenseNumber,
      licenseType,
      licenseExpiryDate,
      bloodGroup,
      emergencyContactName,
      emergencyContact,
      dailyBataRate,
      dateOfJoining,
      status,
    } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: "Driver name and phone are required",
      });
    }

    const existingDriver = await Driver.findOne({
      companyId,
      phone: phone.trim(),
    });

    if (existingDriver) {
      return res.status(409).json({
        success: false,
        message: "Driver with this phone already exists",
      });
    }

    if (licenseNumber) {
      const existingLicense = await Driver.findOne({
        companyId,
        licenseNumber: licenseNumber.trim().toUpperCase(),
      });

      if (existingLicense) {
        return res.status(409).json({
          success: false,
          message: "Driver with this license number already exists",
        });
      }
    }

    let photoUrl = null;
    if (req.file) {
      photoUrl = await saveUploadedFile(req.file, "drivers");
    }

    const driver = await Driver.create({
      companyId,
      name,
      phone,
      address,
      aadhaarNumber: aadhaarNumber ? aadhaarNumber.trim() : "",
      panNumber: panNumber ? panNumber.trim().toUpperCase() : "",
      licenseNumber: licenseNumber ? licenseNumber.trim().toUpperCase() : "",
      licenseType: licenseType || "Heavy Commercial",
      licenseExpiryDate,
      bloodGroup: bloodGroup ? bloodGroup.trim().toUpperCase() : "",
      emergencyContactName: emergencyContactName ? emergencyContactName.trim() : "",
      emergencyContact: emergencyContact ? emergencyContact.trim() : "",
      dailyBataRate: dailyBataRate !== undefined && dailyBataRate !== "" ? Number(dailyBataRate) : 400,
      dateOfJoining: dateOfJoining || new Date(),
      status:
        status && status.trim() && !status.toLowerCase().startsWith("select")
          ? status.trim().toLowerCase()
          : "active",
      photo: photoUrl,
    });

    // Automatically create or sync corresponding Employee record for attendance tracking
    try {
      const existingEmp = await Employee.findOne({
        companyId,
        $or: [{ phone: driver.phone }, { name: driver.name, employeeType: "driver" }],
      });
      if (existingEmp) {
        if (driver.photo) existingEmp.photo = driver.photo;
        existingEmp.name = driver.name;
        existingEmp.phone = driver.phone;
        if (driver.address) existingEmp.address = driver.address;
        existingEmp.status = driver.status;
        await existingEmp.save();
      } else {
        await Employee.create({
          companyId,
          employeeCode: `DRV-${Date.now().toString().slice(-4)}`,
          name: driver.name,
          phone: driver.phone,
          designation: "Driver",
          department: "Fleet Operations",
          employeeType: "driver",
          joiningDate: new Date(),
          basicSalary: 0,
          status: driver.status,
          photo: driver.photo || null,
          address: driver.address || "",
        });
      }
    } catch (empErr) {
      console.error("Failed to auto-create employee for driver:", empErr);
      // Non-fatal, driver is already created
    }

    res.status(201).json({
      success: true,
      message: "Driver created successfully",
      data: driver,
    });
  } catch (error) {
    console.error("Create driver error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create driver",
      error: error.message,
    });
  }
};

// GET ALL
const getDrivers = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company is required",
      });
    }

    const drivers = await Driver.find({
      companyId,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: drivers.length,
      data: drivers,
    });
  } catch (error) {
    console.error("Get drivers error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch drivers",
      error: error.message,
    });
  }
};

// GET ONE
const getDriverById = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const driver = await Driver.findOne({
      _id: req.params.id,
      companyId,
    });

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }

    res.status(200).json({
      success: true,
      data: driver,
    });
  } catch (error) {
    console.error("Get driver error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch driver",
      error: error.message,
    });
  }
};

// UPDATE
const updateDriver = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const driver = await Driver.findOne({
      _id: req.params.id,
      companyId,
    });

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }

    const {
      name,
      phone,
      address,
      aadhaarNumber,
      panNumber,
      licenseNumber,
      licenseType,
      licenseExpiryDate,
      bloodGroup,
      emergencyContactName,
      emergencyContact,
      dailyBataRate,
      dateOfJoining,
      status,
    } = req.body;

    if (phone && phone.trim() !== driver.phone) {
      const duplicatePhone = await Driver.findOne({
        companyId,
        phone: phone.trim(),
        _id: { $ne: req.params.id },
      });

      if (duplicatePhone) {
        return res.status(409).json({
          success: false,
          message: "Another driver with this phone already exists",
        });
      }
    }

    if (
      licenseNumber &&
      licenseNumber.trim().toUpperCase() !== driver.licenseNumber
    ) {
      const duplicateLicense = await Driver.findOne({
        companyId,
        licenseNumber: licenseNumber.trim().toUpperCase(),
        _id: { $ne: req.params.id },
      });

      if (duplicateLicense) {
        return res.status(409).json({
          success: false,
          message: "Another driver with this license number already exists",
        });
      }
    }

    const previousPhoto = driver.photo;

    if (name !== undefined) driver.name = name;
    if (phone !== undefined) driver.phone = phone;
    if (address !== undefined) driver.address = address;
    if (aadhaarNumber !== undefined) driver.aadhaarNumber = aadhaarNumber ? aadhaarNumber.trim() : "";
    if (panNumber !== undefined) driver.panNumber = panNumber ? panNumber.trim().toUpperCase() : "";
    if (licenseNumber !== undefined) {
      driver.licenseNumber = licenseNumber ? licenseNumber.trim().toUpperCase() : "";
    }
    if (licenseType !== undefined) driver.licenseType = licenseType;
    if (licenseExpiryDate !== undefined) {
      driver.licenseExpiryDate = licenseExpiryDate;
    }
    if (bloodGroup !== undefined) driver.bloodGroup = bloodGroup ? bloodGroup.trim().toUpperCase() : "";
    if (emergencyContactName !== undefined) driver.emergencyContactName = emergencyContactName ? emergencyContactName.trim() : "";
    if (emergencyContact !== undefined) driver.emergencyContact = emergencyContact ? emergencyContact.trim() : "";
    if (dailyBataRate !== undefined && dailyBataRate !== "") driver.dailyBataRate = Number(dailyBataRate);
    if (dateOfJoining !== undefined) driver.dateOfJoining = dateOfJoining;
    if (status !== undefined) {
      driver.status =
        status && status.trim() && !status.toLowerCase().startsWith("select")
          ? status.trim().toLowerCase()
          : driver.status || "active";
    }

    if (req.file) {
      driver.photo = await saveUploadedFile(req.file, "drivers");
    }

    await driver.save();

    if (req.file && previousPhoto) {
      await deleteUploadedFile(previousPhoto);
    }

    // Auto-update corresponding Employee record
    try {
      const emp = await Employee.findOne({
        companyId,
        $or: [{ phone: driver.phone }, { name: driver.name, employeeType: "driver" }],
      });
      if (emp) {
        emp.name = driver.name;
        if (phone) emp.phone = driver.phone;
        if (status !== undefined) emp.status = driver.status;
        if (driver.photo) emp.photo = driver.photo;
        if (driver.address) emp.address = driver.address;
        await emp.save();
      }
    } catch (empErr) {
      console.error("Failed to update employee for driver:", empErr);
    }

    res.status(200).json({
      success: true,
      message: "Driver updated successfully",
      data: driver,
    });
  } catch (error) {
    console.error("Update driver error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update driver",
      error: error.message,
    });
  }
};

// DELETE
const deleteDriver = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const driver = await Driver.findOne({
      _id: req.params.id,
      companyId,
    });

    if (driver) {
      await Driver.findByIdAndDelete(driver._id);
      if (driver.photo) {
        await deleteUploadedFile(driver.photo);
      }
    }

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Driver deleted successfully",
    });
  } catch (error) {
    console.error("Delete driver error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete driver",
      error: error.message,
    });
  }
};

module.exports = {
  createDriver,
  getDrivers,
  getDriverById,
  updateDriver,
  deleteDriver,
};
