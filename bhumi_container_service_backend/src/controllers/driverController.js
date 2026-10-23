const Driver = require("../models/Driver");
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
    let licenseScanUrl = req.body.licenseScan || "";
    let aadharScanUrl = req.body.aadharScan || "";

    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files) {
        if (file.fieldname === "photo") {
          photoUrl = await saveUploadedFile(file, "drivers");
        } else if (file.fieldname === "licenseScan") {
          licenseScanUrl = await saveUploadedFile(file, "drivers");
        } else if (file.fieldname === "aadharScan") {
          aadharScanUrl = await saveUploadedFile(file, "drivers");
        }
      }
    } else if (req.files && typeof req.files === "object") {
      if (req.files.photo?.[0]) photoUrl = await saveUploadedFile(req.files.photo[0], "drivers");
      if (req.files.licenseScan?.[0]) licenseScanUrl = await saveUploadedFile(req.files.licenseScan[0], "drivers");
      if (req.files.aadharScan?.[0]) aadharScanUrl = await saveUploadedFile(req.files.aadharScan[0], "drivers");
    } else if (req.file) {
      photoUrl = await saveUploadedFile(req.file, "drivers");
    }

    const driver = await Driver.create({
      companyId,
      name,
      phone,
      alternatePhone: req.body.alternatePhone || req.body.alternateMobile || "",
      assignedVehicleId: req.body.assignedVehicleId || req.body.vehicleId || null,
      address: address || req.body.currentAddress || "",
      aadhaarNumber: aadhaarNumber ? aadhaarNumber.trim() : "",
      panNumber: panNumber ? panNumber.trim().toUpperCase() : "",
      licenseNumber: licenseNumber ? licenseNumber.trim().toUpperCase() : "",
      licenseType: licenseType || "Heavy Commercial",
      licenseExpiryDate,
      bloodGroup: bloodGroup ? bloodGroup.trim().toUpperCase() : "",
      emergencyContactName: emergencyContactName ? emergencyContactName.trim() : "",
      emergencyContact: emergencyContact ? emergencyContact.trim() : "",
      dailyBataRate: dailyBataRate !== undefined && dailyBataRate !== "" ? Number(dailyBataRate) : 400,
      monthlySalary: req.body.monthlySalary !== undefined && req.body.monthlySalary !== "" ? Number(req.body.monthlySalary) : (Number(req.body.salary) || 10000),
      dutyStatus: req.body.dutyStatus || "On Duty",
      dateOfJoining: dateOfJoining || req.body.joiningDate || new Date(),
      licenseScan: licenseScanUrl,
      aadharScan: aadharScanUrl,
      notes: req.body.notes || "",
      status:
        status && status.trim() && !status.toLowerCase().startsWith("select")
          ? status.trim().toLowerCase()
          : "active",
      photo: photoUrl,
    });

    if (driver.assignedVehicleId) {
      const Vehicle = require("../models/Vehicle");
      await Vehicle.updateOne(
        { _id: driver.assignedVehicleId, companyId },
        { $set: { driverId: driver._id } },
      );
    }

    const populated = await Driver.findById(driver._id).populate(
      "assignedVehicleId",
      "vehicleNumber vehicleType make model vehicleName",
    );

    res.status(201).json({
      success: true,
      message: "Driver created successfully",
      data: populated,
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
    })
      .populate("assignedVehicleId", "vehicleNumber vehicleType make model vehicleName")
      .sort({ createdAt: -1 });

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
    }).populate("assignedVehicleId", "vehicleNumber vehicleType make model vehicleName");

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
    if (req.body.alternatePhone !== undefined || req.body.alternateMobile !== undefined) {
      driver.alternatePhone = req.body.alternatePhone || req.body.alternateMobile || "";
    }
    if (req.body.assignedVehicleId !== undefined || req.body.vehicleId !== undefined) {
      const vId = req.body.assignedVehicleId || req.body.vehicleId || null;
      driver.assignedVehicleId = vId;
      if (vId) {
        const Vehicle = require("../models/Vehicle");
        await Vehicle.updateOne(
          { _id: vId, companyId },
          { $set: { driverId: driver._id } },
        );
      }
    }
    if (req.body.monthlySalary !== undefined && req.body.monthlySalary !== "") {
      driver.monthlySalary = Number(req.body.monthlySalary);
    } else if (req.body.salary !== undefined && req.body.salary !== "") {
      driver.monthlySalary = Number(req.body.salary);
    }
    if (req.body.dutyStatus !== undefined) driver.dutyStatus = req.body.dutyStatus;
    if (req.body.licenseScan !== undefined) driver.licenseScan = req.body.licenseScan;
    if (req.body.aadharScan !== undefined) driver.aadharScan = req.body.aadharScan;
    if (req.body.notes !== undefined) driver.notes = req.body.notes;

    const previousPhoto = driver.photo;
    const previousLicenseScan = driver.licenseScan;
    const previousAadharScan = driver.aadharScan;

    if (req.body.licenseScan !== undefined && typeof req.body.licenseScan === "string") {
      driver.licenseScan = req.body.licenseScan;
    }
    if (req.body.aadharScan !== undefined && typeof req.body.aadharScan === "string") {
      driver.aadharScan = req.body.aadharScan;
    }
    if (req.body.photo !== undefined && typeof req.body.photo === "string") {
      driver.photo = req.body.photo;
    }

    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files) {
        if (file.fieldname === "photo") {
          driver.photo = await saveUploadedFile(file, "drivers");
          if (previousPhoto && previousPhoto !== driver.photo) await deleteUploadedFile(previousPhoto);
        } else if (file.fieldname === "licenseScan") {
          driver.licenseScan = await saveUploadedFile(file, "drivers");
          if (previousLicenseScan && previousLicenseScan !== driver.licenseScan) await deleteUploadedFile(previousLicenseScan);
        } else if (file.fieldname === "aadharScan") {
          driver.aadharScan = await saveUploadedFile(file, "drivers");
          if (previousAadharScan && previousAadharScan !== driver.aadharScan) await deleteUploadedFile(previousAadharScan);
        }
      }
    } else if (req.files && typeof req.files === "object") {
      if (req.files.photo?.[0]) {
        driver.photo = await saveUploadedFile(req.files.photo[0], "drivers");
        if (previousPhoto && previousPhoto !== driver.photo) await deleteUploadedFile(previousPhoto);
      }
      if (req.files.licenseScan?.[0]) {
        driver.licenseScan = await saveUploadedFile(req.files.licenseScan[0], "drivers");
        if (previousLicenseScan && previousLicenseScan !== driver.licenseScan) await deleteUploadedFile(previousLicenseScan);
      }
      if (req.files.aadharScan?.[0]) {
        driver.aadharScan = await saveUploadedFile(req.files.aadharScan[0], "drivers");
        if (previousAadharScan && previousAadharScan !== driver.aadharScan) await deleteUploadedFile(previousAadharScan);
      }
    } else if (req.file) {
      driver.photo = await saveUploadedFile(req.file, "drivers");
      if (previousPhoto && previousPhoto !== driver.photo) await deleteUploadedFile(previousPhoto);
    }

    await driver.save();

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
