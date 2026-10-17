const DOReceived = require("../models/DOReceived");
const Party = require("../models/Party");
const Consignor = require("../models/Consignor");
const Consignee = require("../models/Consignee");
const Product = require("../models/Product");
const City = require("../models/City");
const { getNextSequence } = require("../utils/sequenceService");

// CREATE
const createDOReceived = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company is required",
      });
    }

    let {
      doNumber,
      doDate,
      partyId,
      consignorId,
      consigneeId,
      productId,
      quantity,
      unit,
      fromCityId,
      toCityId,
      expectedDeliveryDate,
      remarks,
      status,
    } = req.body;

    if (!doNumber || !doNumber.toString().trim()) {
      doNumber = await getNextSequence(companyId, "do-received");
    }

    if (
      !doDate ||
      !partyId ||
      !productId ||
      quantity === undefined ||
      !unit ||
      !fromCityId ||
      !toCityId
    ) {
      return res.status(400).json({
        success: false,
        message:
          "DO date, party, product, quantity, unit, from city and to city are required",
      });
    }

    const existingDO = await DOReceived.findOne({
      companyId,
      doNumber: doNumber.trim().toUpperCase(),
    });

    if (existingDO) {
      return res.status(409).json({
        success: false,
        message: "DO number already exists",
      });
    }

    // Validate Party
    const party = await Party.findOne({
      _id: partyId,
      companyId,
    });

    if (!party) {
      return res.status(404).json({
        success: false,
        message: "Party not found in your company",
      });
    }

    // Validate Product
    const product = await Product.findOne({
      _id: productId,
      companyId,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found in your company",
      });
    }

    // Validate Consignor
    if (consignorId) {
      const consignor = await Consignor.findOne({
        _id: consignorId,
        companyId,
      });

      if (!consignor) {
        return res.status(404).json({
          success: false,
          message: "Consignor not found in your company",
        });
      }
    }

    // Validate Consignee
    if (consigneeId) {
      const consignee = await Consignee.findOne({
        _id: consigneeId,
        companyId,
      });

      if (!consignee) {
        return res.status(404).json({
          success: false,
          message: "Consignee not found in your company",
        });
      }
    }

    // Validate From City
    const fromCity = await City.findOne({
      _id: fromCityId,
      companyId,
    });

    if (!fromCity) {
      return res.status(404).json({
        success: false,
        message: "From city not found in your company",
      });
    }

    // Validate To City
    const toCity = await City.findOne({
      _id: toCityId,
      companyId,
    });

    if (!toCity) {
      return res.status(404).json({
        success: false,
        message: "To city not found in your company",
      });
    }

    const doReceived = await DOReceived.create({
      companyId,
      doNumber,
      doDate,
      partyId,
      consignorId: consignorId || null,
      consigneeId: consigneeId || null,
      productId,
      quantity,
      unit,
      fromCityId,
      toCityId,
      expectedDeliveryDate: expectedDeliveryDate || null,
      remarks,
      status: status || "received",
    });

    const populatedDO = await DOReceived.findById(doReceived._id)
      .populate("partyId", "name phone gstNumber")
      .populate("consignorId", "name phone")
      .populate("consigneeId", "name phone")
      .populate("productId", "name code unit")
      .populate("fromCityId", "name state")
      .populate("toCityId", "name state");

    res.status(201).json({
      success: true,
      message: "D.O. received successfully",
      data: populatedDO,
    });
  } catch (error) {
    console.error("Create DO error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create D.O.",
      error: error.message,
    });
  }
};

// GET ALL
const getDOReceived = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company is required",
      });
    }

    const data = await DOReceived.find({
      companyId,
    })
      .populate("partyId", "name phone gstNumber")
      .populate("consignorId", "name phone")
      .populate("consigneeId", "name phone")
      .populate("productId", "name code unit")
      .populate("fromCityId", "name state")
      .populate("toCityId", "name state")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error("Get DO error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch D.O. records",
      error: error.message,
    });
  }
};

// GET ONE
const getDOReceivedById = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const data = await DOReceived.findOne({
      _id: req.params.id,
      companyId,
    })
      .populate("partyId", "name phone gstNumber")
      .populate("consignorId", "name phone")
      .populate("consigneeId", "name phone")
      .populate("productId", "name code unit")
      .populate("fromCityId", "name state")
      .populate("toCityId", "name state");

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "D.O. record not found",
      });
    }

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Get DO by ID error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch D.O.",
      error: error.message,
    });
  }
};

// UPDATE
const updateDOReceived = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const doReceived = await DOReceived.findOne({
      _id: req.params.id,
      companyId,
    });

    if (!doReceived) {
      return res.status(404).json({
        success: false,
        message: "D.O. record not found",
      });
    }

    const {
      doNumber,
      doDate,
      partyId,
      consignorId,
      consigneeId,
      productId,
      quantity,
      unit,
      fromCityId,
      toCityId,
      expectedDeliveryDate,
      remarks,
      status,
    } = req.body;

    if (doNumber && doNumber.trim().toUpperCase() !== doReceived.doNumber) {
      const duplicate = await DOReceived.findOne({
        companyId,
        doNumber: doNumber.trim().toUpperCase(),
        _id: { $ne: req.params.id },
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "Another D.O. with this number already exists",
        });
      }

      doReceived.doNumber = doNumber.trim().toUpperCase();
    }

    // Validate references if supplied
    if (partyId !== undefined) {
      const party = await Party.findOne({
        _id: partyId,
        companyId,
      });

      if (!party) {
        return res.status(404).json({
          success: false,
          message: "Party not found in your company",
        });
      }

      doReceived.partyId = partyId;
    }

    if (productId !== undefined) {
      const product = await Product.findOne({
        _id: productId,
        companyId,
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found in your company",
        });
      }

      doReceived.productId = productId;
    }

    if (consignorId !== undefined) {
      if (consignorId === null) {
        doReceived.consignorId = null;
      } else {
        const consignor = await Consignor.findOne({
          _id: consignorId,
          companyId,
        });

        if (!consignor) {
          return res.status(404).json({
            success: false,
            message: "Consignor not found in your company",
          });
        }

        doReceived.consignorId = consignorId;
      }
    }

    if (consigneeId !== undefined) {
      if (consigneeId === null) {
        doReceived.consigneeId = null;
      } else {
        const consignee = await Consignee.findOne({
          _id: consigneeId,
          companyId,
        });

        if (!consignee) {
          return res.status(404).json({
            success: false,
            message: "Consignee not found in your company",
          });
        }

        doReceived.consigneeId = consigneeId;
      }
    }

    if (fromCityId !== undefined) {
      const city = await City.findOne({
        _id: fromCityId,
        companyId,
      });

      if (!city) {
        return res.status(404).json({
          success: false,
          message: "From city not found in your company",
        });
      }

      doReceived.fromCityId = fromCityId;
    }

    if (toCityId !== undefined) {
      const city = await City.findOne({
        _id: toCityId,
        companyId,
      });

      if (!city) {
        return res.status(404).json({
          success: false,
          message: "To city not found in your company",
        });
      }

      doReceived.toCityId = toCityId;
    }

    if (doDate !== undefined) {
      doReceived.doDate = doDate;
    }

    if (quantity !== undefined) {
      doReceived.quantity = quantity;
    }

    if (unit !== undefined) {
      doReceived.unit = unit;
    }

    if (expectedDeliveryDate !== undefined) {
      doReceived.expectedDeliveryDate = expectedDeliveryDate;
    }

    if (remarks !== undefined) {
      doReceived.remarks = remarks;
    }

    if (status !== undefined) {
      doReceived.status = status;
    }

    await doReceived.save();

    const updatedDO = await DOReceived.findById(doReceived._id)
      .populate("partyId", "name phone gstNumber")
      .populate("consignorId", "name phone")
      .populate("consigneeId", "name phone")
      .populate("productId", "name code unit")
      .populate("fromCityId", "name state")
      .populate("toCityId", "name state");

    res.status(200).json({
      success: true,
      message: "D.O. updated successfully",
      data: updatedDO,
    });
  } catch (error) {
    console.error("Update DO error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update D.O.",
      error: error.message,
    });
  }
};

// DELETE
const deleteDOReceived = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const data = await DOReceived.findOneAndDelete({
      _id: req.params.id,
      companyId,
    });

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "D.O. record not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "D.O. deleted successfully",
    });
  } catch (error) {
    console.error("Delete DO error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete D.O.",
      error: error.message,
    });
  }
};

module.exports = {
  createDOReceived,
  getDOReceived,
  getDOReceivedById,
  updateDOReceived,
  deleteDOReceived,
};
