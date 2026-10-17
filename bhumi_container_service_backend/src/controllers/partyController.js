const mongoose = require("mongoose");

const Party = require("../models/Party");

// ==========================================
// CREATE PARTY
// ==========================================
const createParty = async (req, res) => {
  try {
    const { name, phone, email, address, city, state, gstNumber, status } =
      req.body;

    // User must be authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Super admin can manage companies, but Party belongs to a company
    if (!req.user.companyId) {
      return res.status(400).json({
        success: false,
        message: "Company selection is required",
      });
    }

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Party name is required",
      });
    }

    // Check duplicate party inside same company
    const existingParty = await Party.findOne({
      companyId: req.user.companyId,
      name: name.trim(),
    });

    if (existingParty) {
      return res.status(409).json({
        success: false,
        message: "Party with this name already exists",
      });
    }

    const party = await Party.create({
      companyId: req.user.companyId,
      name: name.trim(),
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

    return res.status(201).json({
      success: true,
      message: "Party created successfully",
      data: party,
    });
  } catch (error) {
    console.error("Create party error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create party",
      error: error.message,
    });
  }
};

// ==========================================
// GET ALL PARTIES
// ==========================================
const getParties = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!req.user.companyId) {
      return res.status(400).json({
        success: false,
        message: "Company selection is required",
      });
    }

    const parties = await Party.find({
      companyId: req.user.companyId,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: parties.length,
      data: parties,
    });
  } catch (error) {
    console.error("Get parties error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get parties",
      error: error.message,
    });
  }
};

// ==========================================
// GET PARTY BY ID
// ==========================================
const getPartyById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!req.user.companyId) {
      return res.status(400).json({
        success: false,
        message: "Company selection is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid party ID",
      });
    }

    const party = await Party.findOne({
      _id: id,
      companyId: req.user.companyId,
    });

    if (!party) {
      return res.status(404).json({
        success: false,
        message: "Party not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: party,
    });
  } catch (error) {
    console.error("Get party error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get party",
      error: error.message,
    });
  }
};

// ==========================================
// UPDATE PARTY
// ==========================================
const updateParty = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!req.user.companyId) {
      return res.status(400).json({
        success: false,
        message: "Company selection is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid party ID",
      });
    }

    const party = await Party.findOne({
      _id: id,
      companyId: req.user.companyId,
    });

    if (!party) {
      return res.status(404).json({
        success: false,
        message: "Party not found",
      });
    }

    const { name, phone, email, address, city, state, gstNumber, status } =
      req.body;

    // If name is changing, check duplicate within same company
    if (name !== undefined && name.trim() !== party.name) {
      const existingParty = await Party.findOne({
        companyId: req.user.companyId,
        name: name.trim(),
        _id: { $ne: id },
      });

      if (existingParty) {
        return res.status(409).json({
          success: false,
          message: "Party with this name already exists",
        });
      }

      party.name = name.trim();
    }

    if (phone !== undefined) party.phone = phone;
    if (email !== undefined) party.email = email;
    if (address !== undefined) party.address = address;
    if (city !== undefined) party.city = city;
    if (state !== undefined) party.state = state;
    if (gstNumber !== undefined) party.gstNumber = gstNumber;
    if (status !== undefined) {
      party.status =
        status && status.trim() && !status.toLowerCase().startsWith("select")
          ? status.trim().toLowerCase()
          : party.status || "active";
    }

    await party.save();

    return res.status(200).json({
      success: true,
      message: "Party updated successfully",
      data: party,
    });
  } catch (error) {
    console.error("Update party error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update party",
      error: error.message,
    });
  }
};

// ==========================================
// DELETE PARTY
// ==========================================
const deleteParty = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!req.user.companyId) {
      return res.status(400).json({
        success: false,
        message: "Company selection is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid party ID",
      });
    }

    const party = await Party.findOne({
      _id: id,
      companyId: req.user.companyId,
    });

    if (!party) {
      return res.status(404).json({
        success: false,
        message: "Party not found",
      });
    }

    await Party.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Party deleted successfully",
    });
  } catch (error) {
    console.error("Delete party error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete party",
      error: error.message,
    });
  }
};

module.exports = {
  createParty,
  getParties,
  getPartyById,
  updateParty,
  deleteParty,
};
