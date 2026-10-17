const SupplyOrder = require("../models/SupplyOrder");
const DOReceived = require("../models/DOReceived");
const Party = require("../models/Party");
const Consignor = require("../models/Consignor");
const Consignee = require("../models/Consignee");
const Product = require("../models/Product");
const City = require("../models/City");
const { getNextSequence } = require("../utils/sequenceService");

// Helper: validate reference
const validateReference = async (Model, id, companyId, message) => {
  if (!id) return true;

  const record = await Model.findOne({
    _id: id,
    companyId,
  });

  if (!record) {
    throw new Error(message);
  }

  return true;
};

// CREATE
const createSupplyOrder = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company is required",
      });
    }

    let {
      soNumber,
      soDate,
      doReceivedId,
      partyId,
      consignorId,
      consigneeId,
      productId,
      fromCityId,
      toCityId,
      orderQuantity,
      unit,
      rate,
      expectedDeliveryDate,
      remarks,
      status,
    } = req.body;

    if (!soNumber || !soNumber.toString().trim()) {
      soNumber = await getNextSequence(companyId, "supply-orders");
    }

    if (
      !soDate ||
      !partyId ||
      !productId ||
      !fromCityId ||
      !toCityId ||
      orderQuantity === undefined ||
      !unit
    ) {
      return res.status(400).json({
        success: false,
        message:
          "SO number, SO date, party, product, cities, quantity and unit are required",
      });
    }

    if (Number(orderQuantity) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Order quantity must be greater than 0",
      });
    }

    // Duplicate SO
    const existingSO = await SupplyOrder.findOne({
      companyId,
      soNumber: soNumber.trim().toUpperCase(),
    });

    if (existingSO) {
      return res.status(409).json({
        success: false,
        message: "Supply Order number already exists",
      });
    }

    // Validate Party
    await validateReference(
      Party,
      partyId,
      companyId,
      "Party not found in your company",
    );

    // Validate Product
    await validateReference(
      Product,
      productId,
      companyId,
      "Product not found in your company",
    );

    // Validate Consignor
    await validateReference(
      Consignor,
      consignorId,
      companyId,
      "Consignor not found in your company",
    );

    // Validate Consignee
    await validateReference(
      Consignee,
      consigneeId,
      companyId,
      "Consignee not found in your company",
    );

    // Validate From City
    await validateReference(
      City,
      fromCityId,
      companyId,
      "From city not found in your company",
    );

    // Validate To City
    await validateReference(
      City,
      toCityId,
      companyId,
      "To city not found in your company",
    );

    // Validate D.O.
    if (doReceivedId) {
      const doRecord = await DOReceived.findOne({
        _id: doReceivedId,
        companyId,
      });

      if (!doRecord) {
        return res.status(404).json({
          success: false,
          message: "D.O. record not found in your company",
        });
      }
    }

    const quantity = Number(orderQuantity);

    const supplyOrder = await SupplyOrder.create({
      companyId,
      soNumber,
      soDate,
      doReceivedId: doReceivedId || null,
      partyId,
      consignorId: consignorId || null,
      consigneeId: consigneeId || null,
      productId,
      fromCityId,
      toCityId,
      orderQuantity: quantity,
      bookedQuantity: 0,
      pendingQuantity: quantity,
      unit,
      rate: rate || 0,
      expectedDeliveryDate: expectedDeliveryDate || null,
      remarks,
      status: status || "pending",
    });

    const populatedSO = await SupplyOrder.findById(supplyOrder._id)
      .populate("doReceivedId")
      .populate("partyId", "name phone gstNumber")
      .populate("consignorId", "name phone")
      .populate("consigneeId", "name phone")
      .populate("productId", "name code unit")
      .populate("fromCityId", "name state")
      .populate("toCityId", "name state");

    res.status(201).json({
      success: true,
      message: "Supply Order created successfully",
      data: populatedSO,
    });
  } catch (error) {
    console.error("Create Supply Order error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create Supply Order",
      error: error.message,
    });
  }
};

// GET ALL
const getSupplyOrders = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company is required",
      });
    }

    const supplyOrders = await SupplyOrder.find({
      companyId,
    })
      .populate("doReceivedId")
      .populate("partyId", "name phone gstNumber")
      .populate("consignorId", "name phone")
      .populate("consigneeId", "name phone")
      .populate("productId", "name code unit")
      .populate("fromCityId", "name state")
      .populate("toCityId", "name state")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: supplyOrders.length,
      data: supplyOrders,
    });
  } catch (error) {
    console.error("Get Supply Orders error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch Supply Orders",
      error: error.message,
    });
  }
};

// GET ONE
const getSupplyOrderById = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const supplyOrder = await SupplyOrder.findOne({
      _id: req.params.id,
      companyId,
    })
      .populate("doReceivedId")
      .populate("partyId", "name phone gstNumber")
      .populate("consignorId", "name phone")
      .populate("consigneeId", "name phone")
      .populate("productId", "name code unit")
      .populate("fromCityId", "name state")
      .populate("toCityId", "name state");

    if (!supplyOrder) {
      return res.status(404).json({
        success: false,
        message: "Supply Order not found",
      });
    }

    res.status(200).json({
      success: true,
      data: supplyOrder,
    });
  } catch (error) {
    console.error("Get Supply Order error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch Supply Order",
      error: error.message,
    });
  }
};

// UPDATE
const updateSupplyOrder = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const supplyOrder = await SupplyOrder.findOne({
      _id: req.params.id,
      companyId,
    });

    if (!supplyOrder) {
      return res.status(404).json({
        success: false,
        message: "Supply Order not found",
      });
    }

    const {
      soNumber,
      soDate,
      doReceivedId,
      partyId,
      consignorId,
      consigneeId,
      productId,
      fromCityId,
      toCityId,
      orderQuantity,
      unit,
      rate,
      expectedDeliveryDate,
      remarks,
      status,
    } = req.body;

    // SO Number
    if (soNumber && soNumber.trim().toUpperCase() !== supplyOrder.soNumber) {
      const duplicate = await SupplyOrder.findOne({
        companyId,
        soNumber: soNumber.trim().toUpperCase(),
        _id: { $ne: req.params.id },
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "Another Supply Order with this number already exists",
        });
      }

      supplyOrder.soNumber = soNumber.trim().toUpperCase();
    }

    // References
    if (partyId !== undefined) {
      await validateReference(
        Party,
        partyId,
        companyId,
        "Party not found in your company",
      );

      supplyOrder.partyId = partyId;
    }

    if (productId !== undefined) {
      await validateReference(
        Product,
        productId,
        companyId,
        "Product not found in your company",
      );

      supplyOrder.productId = productId;
    }

    if (consignorId !== undefined) {
      if (consignorId === null) {
        supplyOrder.consignorId = null;
      } else {
        await validateReference(
          Consignor,
          consignorId,
          companyId,
          "Consignor not found in your company",
        );

        supplyOrder.consignorId = consignorId;
      }
    }

    if (consigneeId !== undefined) {
      if (consigneeId === null) {
        supplyOrder.consigneeId = null;
      } else {
        await validateReference(
          Consignee,
          consigneeId,
          companyId,
          "Consignee not found in your company",
        );

        supplyOrder.consigneeId = consigneeId;
      }
    }

    if (fromCityId !== undefined) {
      await validateReference(
        City,
        fromCityId,
        companyId,
        "From city not found in your company",
      );

      supplyOrder.fromCityId = fromCityId;
    }

    if (toCityId !== undefined) {
      await validateReference(
        City,
        toCityId,
        companyId,
        "To city not found in your company",
      );

      supplyOrder.toCityId = toCityId;
    }

    if (doReceivedId !== undefined) {
      if (doReceivedId === null) {
        supplyOrder.doReceivedId = null;
      } else {
        const doRecord = await DOReceived.findOne({
          _id: doReceivedId,
          companyId,
        });

        if (!doRecord) {
          return res.status(404).json({
            success: false,
            message: "D.O. record not found",
          });
        }

        supplyOrder.doReceivedId = doReceivedId;
      }
    }

    if (soDate !== undefined) {
      supplyOrder.soDate = soDate;
    }

    /*
     * Order quantity can only be changed safely
     * when it is not less than already booked quantity.
     */
    if (orderQuantity !== undefined) {
      const newQuantity = Number(orderQuantity);

      if (newQuantity <= 0) {
        return res.status(400).json({
          success: false,
          message: "Order quantity must be greater than 0",
        });
      }

      if (newQuantity < supplyOrder.bookedQuantity) {
        return res.status(400).json({
          success: false,
          message: "Order quantity cannot be less than already booked quantity",
        });
      }

      supplyOrder.orderQuantity = newQuantity;

      supplyOrder.pendingQuantity = newQuantity - supplyOrder.bookedQuantity;
    }

    if (unit !== undefined) {
      supplyOrder.unit = unit;
    }

    if (rate !== undefined) {
      supplyOrder.rate = rate;
    }

    if (expectedDeliveryDate !== undefined) {
      supplyOrder.expectedDeliveryDate = expectedDeliveryDate;
    }

    if (remarks !== undefined) {
      supplyOrder.remarks = remarks;
    }

    if (status !== undefined) {
      supplyOrder.status = status;
    }

    await supplyOrder.save();

    const updatedSO = await SupplyOrder.findById(supplyOrder._id)
      .populate("doReceivedId")
      .populate("partyId", "name phone gstNumber")
      .populate("consignorId", "name phone")
      .populate("consigneeId", "name phone")
      .populate("productId", "name code unit")
      .populate("fromCityId", "name state")
      .populate("toCityId", "name state");

    res.status(200).json({
      success: true,
      message: "Supply Order updated successfully",
      data: updatedSO,
    });
  } catch (error) {
    console.error("Update Supply Order error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update Supply Order",
      error: error.message,
    });
  }
};

// DELETE
const deleteSupplyOrder = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const supplyOrder = await SupplyOrder.findOneAndDelete({
      _id: req.params.id,
      companyId,
    });

    if (!supplyOrder) {
      return res.status(404).json({
        success: false,
        message: "Supply Order not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Supply Order deleted successfully",
    });
  } catch (error) {
    console.error("Delete Supply Order error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete Supply Order",
      error: error.message,
    });
  }
};

module.exports = {
  createSupplyOrder,
  getSupplyOrders,
  getSupplyOrderById,
  updateSupplyOrder,
  deleteSupplyOrder,
};
