const Consignee = require("../models/Consignee");

// CREATE
const createConsignee = async (req, res) => {
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
        message: "Consignee name is required",
      });
    }

    const existingConsignee = await Consignee.findOne({
      companyId,
      name: name.trim(),
    });

    if (existingConsignee) {
      return res.status(409).json({
        success: false,
        message: "Consignee already exists",
      });
    }

    const consignee = await Consignee.create({
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
      message: "Consignee created successfully",
      data: consignee,
    });
  } catch (error) {
    console.error("Create consignee error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create consignee",
      error: error.message,
    });
  }
};

// GET ALL
const getConsignees = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company is required",
      });
    }

    const consignees = await Consignee.find({
      companyId,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: consignees.length,
      data: consignees,
    });
  } catch (error) {
    console.error("Get consignees error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch consignees",
      error: error.message,
    });
  }
};

// GET ONE
const getConsigneeById = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const consignee = await Consignee.findOne({
      _id: req.params.id,
      companyId,
    });

    if (!consignee) {
      return res.status(404).json({
        success: false,
        message: "Consignee not found",
      });
    }

    res.status(200).json({
      success: true,
      data: consignee,
    });
  } catch (error) {
    console.error("Get consignee error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch consignee",
      error: error.message,
    });
  }
};

// UPDATE
const updateConsignee = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const consignee = await Consignee.findOne({
      _id: req.params.id,
      companyId,
    });

    if (!consignee) {
      return res.status(404).json({
        success: false,
        message: "Consignee not found",
      });
    }

    const { name, phone, email, address, city, state, gstNumber, status } =
      req.body;

    if (name && name.trim() !== consignee.name) {
      const duplicate = await Consignee.findOne({
        companyId,
        name: name.trim(),
        _id: { $ne: req.params.id },
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "Another consignee with this name already exists",
        });
      }
    }

    if (name !== undefined) consignee.name = name;
    if (phone !== undefined) consignee.phone = phone;
    if (email !== undefined) consignee.email = email;
    if (address !== undefined) consignee.address = address;
    if (city !== undefined) consignee.city = city;
    if (state !== undefined) consignee.state = state;
    if (gstNumber !== undefined) consignee.gstNumber = gstNumber;
    if (status !== undefined) {
      consignee.status =
        status && status.trim() && !status.toLowerCase().startsWith("select")
          ? status.trim().toLowerCase()
          : consignee.status || "active";
    }

    await consignee.save();

    res.status(200).json({
      success: true,
      message: "Consignee updated successfully",
      data: consignee,
    });
  } catch (error) {
    console.error("Update consignee error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update consignee",
      error: error.message,
    });
  }
};

// DELETE
const deleteConsignee = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const consignee = await Consignee.findOneAndDelete({
      _id: req.params.id,
      companyId,
    });

    if (!consignee) {
      return res.status(404).json({
        success: false,
        message: "Consignee not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Consignee deleted successfully",
    });
  } catch (error) {
    console.error("Delete consignee error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete consignee",
      error: error.message,
    });
  }
};

module.exports = {
  createConsignee,
  getConsignees,
  getConsigneeById,
  updateConsignee,
  deleteConsignee,
};
