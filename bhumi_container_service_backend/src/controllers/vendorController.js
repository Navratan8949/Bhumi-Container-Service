const mongoose = require("mongoose");
const Vendor = require("../models/Vendor");
const VendorBill = require("../models/VendorBill");

// ==========================================
// CREATE VENDOR
// ==========================================

const createVendor = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company is required",
      });
    }

    const {
      vendorCode,
      vendorName,
      vendorType,
      phone,
      email,
      address,
      city,
      state,
      gstNumber,
      panNumber,
      bankName,
      accountNumber,
      ifscCode,
      status,
      remarks,
    } = req.body;

    const finalVendorName = (vendorName || "").trim();
    if (!finalVendorName) {
      return res.status(400).json({
        success: false,
        message: "Broker name is required",
      });
    }

    const finalVendorType = vendorType || "transporter";
    let finalVendorCode = vendorCode ? vendorCode.toString().trim().toUpperCase() : "";
    if (!finalVendorCode) {
      finalVendorCode = `BRK-${Date.now().toString().slice(-6)}`;
    }

    // Duplicate vendor code
    const existingVendor = await Vendor.findOne({
      companyId,
      vendorCode: finalVendorCode,
    });

    if (existingVendor) {
      return res.status(409).json({
        success: false,
        message: "Broker code already exists",
      });
    }

    const vendor = await Vendor.create({
      companyId,
      vendorCode: finalVendorCode,
      vendorName: finalVendorName,
      vendorType: finalVendorType,
      phone,
      email,
      address,
      city,
      state,
      gstNumber,
      panNumber,
      bankName,
      accountNumber,
      ifscCode,
      status:
        status && status.trim() && !status.toLowerCase().startsWith("select")
          ? status.trim().toLowerCase()
          : "active",
      remarks,
    });

    return res.status(201).json({
      success: true,
      message: "Vendor created successfully",
      data: vendor,
    });
  } catch (error) {
    console.error("Create vendor error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Vendor code already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create vendor",
      error: error.message,
    });
  }
};

// ==========================================
// GET ALL VENDORS
// ==========================================

const getVendors = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const { vendorType, status, search } = req.query;

    const filter = {
      companyId,
    };

    if (vendorType) {
      filter.vendorType = vendorType;
    }

    if (status) {
      filter.status = status;
    }

    if (search) {
      filter.$or = [
        {
          vendorName: {
            $regex: search,
            $options: "i",
          },
        },
        {
          vendorCode: {
            $regex: search,
            $options: "i",
          },
        },
        {
          phone: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    const vendors = await Vendor.find(filter).sort({
      vendorName: 1,
    });

    return res.status(200).json({
      success: true,
      count: vendors.length,
      data: vendors,
    });
  } catch (error) {
    console.error("Get vendors error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch vendors",
      error: error.message,
    });
  }
};

// ==========================================
// GET VENDOR BY ID
// ==========================================

const getVendorById = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const vendor = await Vendor.findOne({
      _id: req.params.id,
      companyId,
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: vendor,
    });
  } catch (error) {
    console.error("Get vendor error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch vendor",
      error: error.message,
    });
  }
};

// ==========================================
// UPDATE VENDOR
// ==========================================

const updateVendor = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const vendor = await Vendor.findOne({
      _id: req.params.id,
      companyId,
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    const {
      vendorCode,
      vendorName,
      vendorType,
      phone,
      email,
      address,
      city,
      state,
      gstNumber,
      panNumber,
      bankName,
      accountNumber,
      ifscCode,
      status,
      remarks,
    } = req.body;

    // -----------------------------
    // Vendor code duplicate check
    // -----------------------------

    if (vendorCode !== undefined) {
      const formattedCode = vendorCode.toUpperCase().trim();

      const duplicate = await Vendor.findOne({
        companyId,
        vendorCode: formattedCode,
        _id: { $ne: vendor._id },
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "Vendor code already exists",
        });
      }

      vendor.vendorCode = formattedCode;
    }

    if (vendorName !== undefined) {
      vendor.vendorName = vendorName;
    }

    if (vendorType !== undefined) {
      vendor.vendorType = vendorType;
    }

    if (phone !== undefined) {
      vendor.phone = phone;
    }

    if (email !== undefined) {
      vendor.email = email;
    }

    if (address !== undefined) {
      vendor.address = address;
    }

    if (city !== undefined) {
      vendor.city = city;
    }

    if (state !== undefined) {
      vendor.state = state;
    }

    if (gstNumber !== undefined) {
      vendor.gstNumber = gstNumber;
    }

    if (panNumber !== undefined) {
      vendor.panNumber = panNumber;
    }

    if (bankName !== undefined) {
      vendor.bankName = bankName;
    }

    if (accountNumber !== undefined) {
      vendor.accountNumber = accountNumber;
    }

    if (ifscCode !== undefined) {
      vendor.ifscCode = ifscCode;
    }

    if (status !== undefined) {
      vendor.status =
        status && status.trim() && !status.toLowerCase().startsWith("select")
          ? status.trim().toLowerCase()
          : vendor.status || "active";
    }

    if (remarks !== undefined) {
      vendor.remarks = remarks;
    }

    await vendor.save();

    return res.status(200).json({
      success: true,
      message: "Vendor updated successfully",
      data: vendor,
    });
  } catch (error) {
    console.error("Update vendor error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Vendor code already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update vendor",
      error: error.message,
    });
  }
};

// ==========================================
// DELETE VENDOR
// ==========================================

const deleteVendor = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const vendor = await Vendor.findOne({
      _id: req.params.id,
      companyId,
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    // ==========================================
    // CHECK LINKED VENDOR BILLS
    // ==========================================

    const vendorBillExists = await VendorBill.exists({
      vendorId: vendor._id,
      companyId,
    });

    if (vendorBillExists) {
      return res.status(400).json({
        success: false,
        message:
          "Vendor cannot be deleted because it is already used in business records. Please deactivate the vendor instead.",
      });
    }

    // ==========================================
    // DELETE VENDOR
    // ==========================================

    await Vendor.deleteOne({
      _id: vendor._id,
      companyId,
    });

    return res.status(200).json({
      success: true,
      message: "Vendor deleted successfully",
    });
  } catch (error) {
    console.error("Delete vendor error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete vendor",
      error: error.message,
    });
  }
};
module.exports = {
  createVendor,
  getVendors,
  getVendorById,
  updateVendor,
  deleteVendor,
};
