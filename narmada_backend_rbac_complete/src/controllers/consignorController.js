const Consignor = require("../models/Consignor");

// CREATE
const createConsignor = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company is required",
      });
    }

    const { name, phone, email, address, city, state, gstNumber, status } =
      req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Consignor name is required",
      });
    }

    const existingConsignor = await Consignor.findOne({
      companyId,
      name: name.trim(),
    });

    if (existingConsignor) {
      return res.status(409).json({
        success: false,
        message: "Consignor already exists",
      });
    }

    const consignor = await Consignor.create({
      companyId,
      name,
      phone,
      email,
      address,
      city,
      state,
      gstNumber,
      status:
        status && status.trim() && !status.toLowerCase().startsWith("select")
          ? status.trim().toLowerCase()
          : "active",
    });

    res.status(201).json({
      success: true,
      message: "Consignor created successfully",
      data: consignor,
    });
  } catch (error) {
    console.error("Create consignor error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create consignor",
      error: error.message,
    });
  }
};

// GET ALL
const getConsignors = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company is required",
      });
    }

    const consignors = await Consignor.find({
      companyId,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: consignors.length,
      data: consignors,
    });
  } catch (error) {
    console.error("Get consignors error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch consignors",
      error: error.message,
    });
  }
};

// GET ONE
const getConsignorById = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const consignor = await Consignor.findOne({
      _id: req.params.id,
      companyId,
    });

    if (!consignor) {
      return res.status(404).json({
        success: false,
        message: "Consignor not found",
      });
    }

    res.status(200).json({
      success: true,
      data: consignor,
    });
  } catch (error) {
    console.error("Get consignor error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch consignor",
      error: error.message,
    });
  }
};

// UPDATE
const updateConsignor = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const consignor = await Consignor.findOne({
      _id: req.params.id,
      companyId,
    });

    if (!consignor) {
      return res.status(404).json({
        success: false,
        message: "Consignor not found",
      });
    }

    const { name, phone, email, address, city, state, gstNumber, status } =
      req.body;

    if (name && name.trim() !== consignor.name) {
      const duplicate = await Consignor.findOne({
        companyId,
        name: name.trim(),
        _id: { $ne: req.params.id },
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "Another consignor with this name already exists",
        });
      }
    }

    if (name !== undefined) consignor.name = name;
    if (phone !== undefined) consignor.phone = phone;
    if (email !== undefined) consignor.email = email;
    if (address !== undefined) consignor.address = address;
    if (city !== undefined) consignor.city = city;
    if (state !== undefined) consignor.state = state;
    if (gstNumber !== undefined) consignor.gstNumber = gstNumber;
    if (status !== undefined) {
      consignor.status =
        status && status.trim() && !status.toLowerCase().startsWith("select")
          ? status.trim().toLowerCase()
          : consignor.status || "active";
    }

    await consignor.save();

    res.status(200).json({
      success: true,
      message: "Consignor updated successfully",
      data: consignor,
    });
  } catch (error) {
    console.error("Update consignor error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update consignor",
      error: error.message,
    });
  }
};

// DELETE
const deleteConsignor = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const consignor = await Consignor.findOneAndDelete({
      _id: req.params.id,
      companyId,
    });

    if (!consignor) {
      return res.status(404).json({
        success: false,
        message: "Consignor not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Consignor deleted successfully",
    });
  } catch (error) {
    console.error("Delete consignor error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete consignor",
      error: error.message,
    });
  }
};

module.exports = {
  createConsignor,
  getConsignors,
  getConsignorById,
  updateConsignor,
  deleteConsignor,
};
