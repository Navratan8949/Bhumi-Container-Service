const City = require("../models/City");

// CREATE
const createCity = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company is required",
      });
    }

    const { name, state, status } = req.body;

    if (!name || !state) {
      return res.status(400).json({
        success: false,
        message: "City name and state are required",
      });
    }

    const existingCity = await City.findOne({
      companyId,
      name: name.trim(),
    });

    if (existingCity) {
      return res.status(409).json({
        success: false,
        message: "City already exists",
      });
    }

    const city = await City.create({
      companyId,
      name: name.trim(),
      state: state.trim(),
      status:
        status && status.trim() && !status.toLowerCase().startsWith("select")
          ? status.trim().toLowerCase()
          : "active",
    });

    res.status(201).json({
      success: true,
      message: "City created successfully",
      data: city,
    });
  } catch (error) {
    console.error("Create city error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create city",
      error: error.message,
    });
  }
};

// GET ALL
const getCities = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company is required",
      });
    }

    const cities = await City.find({
      companyId,
    }).sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: cities.length,
      data: cities,
    });
  } catch (error) {
    console.error("Get cities error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch cities",
      error: error.message,
    });
  }
};

// GET ONE
const getCityById = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const city = await City.findOne({
      _id: req.params.id,
      companyId,
    });

    if (!city) {
      return res.status(404).json({
        success: false,
        message: "City not found",
      });
    }

    res.status(200).json({
      success: true,
      data: city,
    });
  } catch (error) {
    console.error("Get city error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch city",
      error: error.message,
    });
  }
};

// UPDATE
const updateCity = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const city = await City.findOne({
      _id: req.params.id,
      companyId,
    });

    if (!city) {
      return res.status(404).json({
        success: false,
        message: "City not found",
      });
    }

    const { name, state, status } = req.body;

    if (name && name.trim() !== city.name) {
      const duplicate = await City.findOne({
        companyId,
        name: name.trim(),
        _id: { $ne: req.params.id },
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "Another city with this name already exists",
        });
      }
    }

    if (name !== undefined) city.name = name.trim();
    if (state !== undefined) city.state = state.trim();
    if (status !== undefined) {
      city.status =
        status && status.trim() && !status.toLowerCase().startsWith("select")
          ? status.trim().toLowerCase()
          : city.status || "active";
    }

    await city.save();

    res.status(200).json({
      success: true,
      message: "City updated successfully",
      data: city,
    });
  } catch (error) {
    console.error("Update city error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update city",
      error: error.message,
    });
  }
};

// DELETE
const deleteCity = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const city = await City.findOneAndDelete({
      _id: req.params.id,
      companyId,
    });

    if (!city) {
      return res.status(404).json({
        success: false,
        message: "City not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "City deleted successfully",
    });
  } catch (error) {
    console.error("Delete city error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete city",
      error: error.message,
    });
  }
};

module.exports = {
  createCity,
  getCities,
  getCityById,
  updateCity,
  deleteCity,
};
