const mongoose = require("mongoose");

const VehicleDocument = require("../models/VehicleDocument");
const Vehicle = require("../models/Vehicle");
const { saveUploadedFile, deleteUploadedFile } = require("../utils/upload");

// =====================================================
// CREATE VEHICLE DOCUMENT
// =====================================================

const createVehicleDocument = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const createdBy = req.user.userId;

    const {
      vehicleId,
      documentType,
      documentNumber,
      issueDate,
      expiryDate,
      issuingAuthority,
      documentFile,
      remarks,
    } = req.body;

    if (!vehicleId || !documentType || !documentNumber || !expiryDate) {
      return res.status(400).json({
        success: false,
        message:
          "vehicleId, documentType, documentNumber and expiryDate are required",
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

    // -------------------------------------------------
    // Validate dates
    // -------------------------------------------------

    const expiry = new Date(expiryDate);

    if (isNaN(expiry.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid expiry date",
      });
    }

    let issue = null;

    if (issueDate) {
      issue = new Date(issueDate);

      if (isNaN(issue.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid issue date",
        });
      }

      if (issue > expiry) {
        return res.status(400).json({
          success: false,
          message: "Issue date cannot be after expiry date",
        });
      }
    }

    // -------------------------------------------------
    // Duplicate document number
    // -------------------------------------------------

    const existingDocument = await VehicleDocument.findOne({
      companyId,
      documentNumber: documentNumber.toUpperCase(),
    });

    if (existingDocument) {
      return res.status(409).json({
        success: false,
        message: "Document number already exists",
      });
    }

    // -------------------------------------------------
    // Automatically determine status
    // -------------------------------------------------

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiryDateOnly = new Date(expiry);
    expiryDateOnly.setHours(0, 0, 0, 0);

    const status = expiryDateOnly < today ? "expired" : "active";

    // -------------------------------------------------
    // Save uploaded document file
    // -------------------------------------------------

    let uploadedDocumentFile = null;

    if (req.file) {
      uploadedDocumentFile = await saveUploadedFile(
        req.file,
        "vehicle-documents",
      );
    } else if (documentFile) {
      uploadedDocumentFile = documentFile;
    }

    // -------------------------------------------------
    // Create
    // -------------------------------------------------

    const document = await VehicleDocument.create({
      companyId,

      vehicleId,

      documentType,

      documentNumber,

      issueDate: issue,

      expiryDate: expiry,

      issuingAuthority: issuingAuthority || "",

      documentFile: uploadedDocumentFile || null,

      status,

      remarks: remarks || "",

      createdBy,
    });

    const populatedDocument = await VehicleDocument.findById(document._id)
      .populate(
        "vehicleId",
        "vehicleNumber vehicleType ownerType ownerName ownerPhone",
      )
      .populate("createdBy", "name email");

    return res.status(201).json({
      success: true,
      message: "Vehicle document created successfully",
      data: populatedDocument,
    });
  } catch (error) {
    console.error("Create vehicle document error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Document number already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create vehicle document",
      error: error.message,
    });
  }
};

// =====================================================
// GET VEHICLE DOCUMENTS
// =====================================================

const getVehicleDocuments = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const { vehicleId, documentType, status, fromDate, toDate } = req.query;

    const filter = {
      companyId,
    };

    if (vehicleId) {
      filter.vehicleId = vehicleId;
    }

    if (documentType) {
      filter.documentType = documentType;
    }

    if (status) {
      filter.status = status;
    }

    if (fromDate || toDate) {
      filter.expiryDate = {};

      if (fromDate) {
        const startDate = new Date(fromDate);

        startDate.setHours(0, 0, 0, 0);

        filter.expiryDate.$gte = startDate;
      }

      if (toDate) {
        const endDate = new Date(toDate);

        endDate.setHours(23, 59, 59, 999);

        filter.expiryDate.$lte = endDate;
      }
    }

    const documents = await VehicleDocument.find(filter)
      .populate(
        "vehicleId",
        "vehicleNumber vehicleType ownerType ownerName ownerPhone",
      )
      .populate("createdBy", "name email")
      .sort({
        expiryDate: 1,
      });

    // Keep status updated based on current date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const document of documents) {
      if (
        document.status !== "cancelled" &&
        new Date(document.expiryDate) < today &&
        document.status !== "expired"
      ) {
        document.status = "expired";
        await document.save();
      }
    }

    return res.status(200).json({
      success: true,
      count: documents.length,
      data: documents,
    });
  } catch (error) {
    console.error("Get vehicle documents error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch vehicle documents",
      error: error.message,
    });
  }
};

// =====================================================
// GET DOCUMENT BY ID
// =====================================================

const getVehicleDocumentById = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vehicle document ID",
      });
    }

    const document = await VehicleDocument.findOne({
      _id: id,
      companyId,
    })
      .populate(
        "vehicleId",
        "vehicleNumber vehicleType ownerType ownerName ownerPhone",
      )
      .populate("createdBy", "name email");

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Vehicle document not found",
      });
    }

    // Update expired status
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (
      document.status !== "cancelled" &&
      new Date(document.expiryDate) < today
    ) {
      document.status = "expired";
      await document.save();
    }

    return res.status(200).json({
      success: true,
      data: document,
    });
  } catch (error) {
    console.error("Get vehicle document error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch vehicle document",
      error: error.message,
    });
  }
};

// =====================================================
// UPDATE VEHICLE DOCUMENT
// =====================================================

const updateVehicleDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vehicle document ID",
      });
    }

    const document = await VehicleDocument.findOne({
      _id: id,
      companyId,
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Vehicle document not found",
      });
    }

    if (document.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cancelled document cannot be updated",
      });
    }

    const {
      documentType,
      documentNumber,
      issueDate,
      expiryDate,
      issuingAuthority,
      documentFile,
      remarks,
    } = req.body;

    const previousDocumentFile = document.documentFile;
    let newDocumentFile = null;

    if (req.file) {
      newDocumentFile = await saveUploadedFile(
        req.file,
        "vehicle-documents",
      );
    }

    // -------------------------------------------------
    // Document number
    // -------------------------------------------------

    if (documentNumber !== undefined) {
      const newDocumentNumber = documentNumber.toUpperCase();

      const duplicate = await VehicleDocument.findOne({
        companyId,
        documentNumber: newDocumentNumber,
        _id: {
          $ne: id,
        },
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "Document number already exists",
        });
      }

      document.documentNumber = newDocumentNumber;
    }

    if (documentType !== undefined) {
      document.documentType = documentType;
    }

    if (issueDate !== undefined) {
      const issue = new Date(issueDate);

      if (isNaN(issue.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid issue date",
        });
      }

      document.issueDate = issue;
    }

    if (expiryDate !== undefined) {
      const expiry = new Date(expiryDate);

      if (isNaN(expiry.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid expiry date",
        });
      }

      document.expiryDate = expiry;
    }

    // -------------------------------------------------
    // Validate issue/expiry
    // -------------------------------------------------

    if (
      document.issueDate &&
      document.expiryDate &&
      document.issueDate > document.expiryDate
    ) {
      return res.status(400).json({
        success: false,
        message: "Issue date cannot be after expiry date",
      });
    }

    if (issuingAuthority !== undefined) {
      document.issuingAuthority = issuingAuthority;
    }

    if (newDocumentFile) {
      document.documentFile = newDocumentFile;
    } else if (documentFile !== undefined) {
      document.documentFile = documentFile;
    }

    if (remarks !== undefined) {
      document.remarks = remarks;
    }

    // -------------------------------------------------
    // Recalculate status
    // -------------------------------------------------

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiryDateOnly = new Date(document.expiryDate);

    expiryDateOnly.setHours(0, 0, 0, 0);

    document.status = expiryDateOnly < today ? "expired" : "active";

    await document.save();

    if (newDocumentFile && previousDocumentFile && previousDocumentFile !== document.documentFile) {
      await deleteUploadedFile(previousDocumentFile);
    }

    const updatedDocument = await VehicleDocument.findById(document._id)
      .populate(
        "vehicleId",
        "vehicleNumber vehicleType ownerType ownerName ownerPhone",
      )
      .populate("createdBy", "name email");

    return res.status(200).json({
      success: true,
      message: "Vehicle document updated successfully",
      data: updatedDocument,
    });
  } catch (error) {
    console.error("Update vehicle document error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update vehicle document",
      error: error.message,
    });
  }
};

// =====================================================
// CANCEL VEHICLE DOCUMENT
// =====================================================

const deleteVehicleDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vehicle document ID",
      });
    }

    const document = await VehicleDocument.findOne({
      _id: id,
      companyId,
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Vehicle document not found",
      });
    }

    document.status = "cancelled";

    await document.save();

    return res.status(200).json({
      success: true,
      message: "Vehicle document cancelled successfully",
    });
  } catch (error) {
    console.error("Cancel vehicle document error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to cancel vehicle document",
      error: error.message,
    });
  }
};

// =====================================================
// COMPLIANCE DASHBOARD
// =====================================================

const getComplianceDashboard = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sevenDaysLater = new Date(today);
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

    const thirtyDaysLater = new Date(today);
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

    // ---------------------------------------------
    // Total documents
    // ---------------------------------------------

    const totalDocuments = await VehicleDocument.countDocuments({
      companyId,
      status: {
        $ne: "cancelled",
      },
    });

    // ---------------------------------------------
    // Expired
    // ---------------------------------------------

    const expired = await VehicleDocument.countDocuments({
      companyId,
      status: {
        $ne: "cancelled",
      },
      expiryDate: {
        $lt: today,
      },
    });

    // ---------------------------------------------
    // Expiring within 7 days
    // ---------------------------------------------

    const expiringIn7Days = await VehicleDocument.countDocuments({
      companyId,
      status: {
        $ne: "cancelled",
      },
      expiryDate: {
        $gte: today,
        $lte: sevenDaysLater,
      },
    });

    // ---------------------------------------------
    // Expiring within 30 days
    // ---------------------------------------------

    const expiringIn30Days = await VehicleDocument.countDocuments({
      companyId,
      status: {
        $ne: "cancelled",
      },
      expiryDate: {
        $gt: sevenDaysLater,
        $lte: thirtyDaysLater,
      },
    });

    // ---------------------------------------------
    // Active documents
    // ---------------------------------------------

    const active = await VehicleDocument.countDocuments({
      companyId,
      status: {
        $ne: "cancelled",
      },
      expiryDate: {
        $gt: thirtyDaysLater,
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        totalDocuments,
        active,
        expired,
        expiringIn7Days,
        expiringIn30Days,
      },
    });
  } catch (error) {
    console.error("Compliance dashboard error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch compliance dashboard",
      error: error.message,
    });
  }
};

// =====================================================
// EXPIRING / EXPIRED DOCUMENTS
// =====================================================

const getComplianceDocuments = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const { period = "30" } = req.query;

    const days = Number(period);

    if (!Number.isFinite(days) || days < 0) {
      return res.status(400).json({
        success: false,
        message: "Period must be a valid number of days",
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const futureDate = new Date(today);

    futureDate.setDate(futureDate.getDate() + days);

    const documents = await VehicleDocument.find({
      companyId,
      status: {
        $ne: "cancelled",
      },
      expiryDate: {
        $lte: futureDate,
      },
    })
      .populate(
        "vehicleId",
        "vehicleNumber vehicleType ownerType ownerName ownerPhone",
      )
      .sort({
        expiryDate: 1,
      });

    const data = documents.map((document) => {
      const expiry = new Date(document.expiryDate);

      expiry.setHours(0, 0, 0, 0);

      const difference = expiry.getTime() - today.getTime();

      const daysRemaining = Math.ceil(difference / (1000 * 60 * 60 * 24));

      let complianceStatus;

      if (daysRemaining < 0) {
        complianceStatus = "expired";
      } else if (daysRemaining <= 7) {
        complianceStatus = "expiring_in_7_days";
      } else {
        complianceStatus = "expiring_soon";
      }

      return {
        _id: document._id,

        vehicleId: document.vehicleId,

        documentType: document.documentType,

        documentNumber: document.documentNumber,

        issueDate: document.issueDate,

        expiryDate: document.expiryDate,

        issuingAuthority: document.issuingAuthority,

        daysRemaining,

        complianceStatus,

        remarks: document.remarks,
      };
    });

    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error("Compliance documents error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch compliance documents",
      error: error.message,
    });
  }
};

module.exports = {
  createVehicleDocument,
  getVehicleDocuments,
  getVehicleDocumentById,
  updateVehicleDocument,
  deleteVehicleDocument,
  getComplianceDashboard,
  getComplianceDocuments,
};
