const mongoose = require("mongoose");

const InventoryItem = require("../models/InventoryItem");
const InventoryTransaction = require("../models/InventoryTransaction");
const Vendor = require("../models/Vendor");
const Vehicle = require("../models/Vehicle");
const Driver = require("../models/Driver");

// ======================================================
// CREATE INVENTORY ITEM
// ======================================================
const createInventoryItem = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const companyId = req.user.companyId;
    const createdBy = req.user.userId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company is required",
      });
    }

    const {
      itemCode,
      itemName,
      category,
      unit,
      openingStock,
      minimumStock,
      purchasePrice,
      vendorId,
      description,
      status,
    } = req.body;

    if (!itemCode || !itemName || !unit) {
      return res.status(400).json({
        success: false,
        message: "Item code, item name and unit are required",
      });
    }

    const opening = Number(openingStock || 0);
    const minimum = Number(minimumStock || 0);
    const price = Number(purchasePrice || 0);

    if (opening < 0 || minimum < 0 || price < 0) {
      return res.status(400).json({
        success: false,
        message:
          "Opening stock, minimum stock and purchase price cannot be negative",
      });
    }

    if (vendorId) {
      const vendor = await Vendor.findOne({
        _id: vendorId,
        companyId,
      });

      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: "Vendor not found in your company",
        });
      }
    }

    session.startTransaction();

    const existingItem = await InventoryItem.findOne({
      companyId,
      itemCode: itemCode.trim().toUpperCase(),
    }).session(session);

    if (existingItem) {
      await session.abortTransaction();

      return res.status(409).json({
        success: false,
        message: "Item code already exists in your company",
      });
    }

    const [item] = await InventoryItem.create(
      [
        {
          companyId,
          itemCode: itemCode.trim().toUpperCase(),
          itemName: itemName.trim(),
          category: category || "other",
          unit,
          openingStock: opening,
          currentStock: opening,
          minimumStock: minimum,
          purchasePrice: price,
          vendorId: vendorId || null,
          description: description || "",
          status:
            status && status.trim() && !status.toLowerCase().startsWith("select")
              ? status.trim().toLowerCase()
              : "active",
          createdBy,
        },
      ],
      { session },
    );

    // Opening stock ki history
    if (opening > 0) {
      await InventoryTransaction.create(
        [
          {
            companyId,
            itemId: item._id,
            transactionType: "stock_in",
            quantity: opening,
            previousStock: 0,
            newStock: opening,
            vendorId: vendorId || null,
            transactionDate: new Date(),
            purpose: "Opening Stock",
            remarks: "Opening stock created with inventory item",
            enteredBy: createdBy,
          },
        ],
        { session },
      );
    }

    await session.commitTransaction();

    const populatedItem = await InventoryItem.findById(item._id)
      .populate("vendorId", "vendorCode vendorName")
      .populate("createdBy", "name email");

    return res.status(201).json({
      success: true,
      message: "Inventory item created successfully",
      data: populatedItem,
    });
  } catch (error) {
    await session.abortTransaction();

    console.error("Create inventory item error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Item code already exists in your company",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create inventory item",
      error: error.message,
    });
  } finally {
    await session.endSession();
  }
};

// ======================================================
// GET ALL INVENTORY ITEMS
// ======================================================
const getInventoryItems = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company is required",
      });
    }

    const { search = "", category, status, lowStock } = req.query;

    const filter = {
      companyId,
    };

    if (category) {
      filter.category = category;
    }

    if (status) {
      filter.status = status;
    }

    if (search.trim()) {
      filter.$or = [
        {
          itemName: {
            $regex: search.trim(),
            $options: "i",
          },
        },
        {
          itemCode: {
            $regex: search.trim(),
            $options: "i",
          },
        },
      ];
    }

    let items = await InventoryItem.find(filter)
      .populate("vendorId", "vendorCode vendorName")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .sort({
        itemName: 1,
      });

    if (lowStock === "true") {
      items = items.filter((item) => item.currentStock <= item.minimumStock);
    }

    return res.status(200).json({
      success: true,
      count: items.length,
      data: items,
    });
  } catch (error) {
    console.error("Get inventory items error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch inventory items",
      error: error.message,
    });
  }
};

// ======================================================
// GET INVENTORY ITEM BY ID
// ======================================================
const getInventoryItemById = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const item = await InventoryItem.findOne({
      _id: req.params.id,
      companyId,
    })
      .populate("vendorId", "vendorCode vendorName phone")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Inventory item not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: item,
    });
  } catch (error) {
    console.error("Get inventory item error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch inventory item",
      error: error.message,
    });
  }
};

// ======================================================
// UPDATE INVENTORY ITEM
// ======================================================
const updateInventoryItem = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const updatedBy = req.user.userId;

    const item = await InventoryItem.findOne({
      _id: req.params.id,
      companyId,
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Inventory item not found",
      });
    }

    const {
      itemCode,
      itemName,
      category,
      unit,
      minimumStock,
      purchasePrice,
      vendorId,
      description,
      status,
    } = req.body;

    if (itemCode) {
      const duplicate = await InventoryItem.findOne({
        _id: { $ne: item._id },
        companyId,
        itemCode: itemCode.trim().toUpperCase(),
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "Another item already uses this item code",
        });
      }

      item.itemCode = itemCode.trim().toUpperCase();
    }

    if (itemName !== undefined) {
      item.itemName = itemName.trim();
    }

    if (category !== undefined) {
      item.category = category;
    }

    if (unit !== undefined) {
      item.unit = unit;
    }

    if (minimumStock !== undefined) {
      const value = Number(minimumStock);

      if (value < 0) {
        return res.status(400).json({
          success: false,
          message: "Minimum stock cannot be negative",
        });
      }

      item.minimumStock = value;
    }

    if (purchasePrice !== undefined) {
      const value = Number(purchasePrice);

      if (value < 0) {
        return res.status(400).json({
          success: false,
          message: "Purchase price cannot be negative",
        });
      }

      item.purchasePrice = value;
    }

    if (vendorId !== undefined) {
      if (vendorId) {
        const vendor = await Vendor.findOne({
          _id: vendorId,
          companyId,
        });

        if (!vendor) {
          return res.status(404).json({
            success: false,
            message: "Vendor not found in your company",
          });
        }
      }

      item.vendorId = vendorId || null;
    }

    if (description !== undefined) {
      item.description = description;
    }

    if (status !== undefined) {
      item.status =
        status && status.trim() && !status.toLowerCase().startsWith("select")
          ? status.trim().toLowerCase()
          : item.status || "active";
    }

    item.updatedBy = updatedBy;

    await item.save();

    const populatedItem = await InventoryItem.findById(item._id)
      .populate("vendorId", "vendorCode vendorName")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    return res.status(200).json({
      success: true,
      message: "Inventory item updated successfully",
      data: populatedItem,
    });
  } catch (error) {
    console.error("Update inventory item error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Item code already exists in your company",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update inventory item",
      error: error.message,
    });
  }
};

// ======================================================
// STOCK IN
// ======================================================
const stockIn = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const companyId = req.user.companyId;
    const enteredBy = req.user.userId;

    const {
      itemId,
      quantity,
      vendorId,
      referenceNumber,
      transactionDate,
      purpose,
      remarks,
    } = req.body;

    const qty = Number(quantity);

    if (!itemId || !quantity) {
      return res.status(400).json({
        success: false,
        message: "Item and quantity are required",
      });
    }

    if (qty <= 0) {
      return res.status(400).json({
        success: false,
        message: "Stock quantity must be greater than 0",
      });
    }

    session.startTransaction();

    const item = await InventoryItem.findOne({
      _id: itemId,
      companyId,
      status: "active",
    }).session(session);

    if (!item) {
      await session.abortTransaction();

      return res.status(404).json({
        success: false,
        message: "Active inventory item not found",
      });
    }

    if (vendorId) {
      const vendor = await Vendor.findOne({
        _id: vendorId,
        companyId,
      }).session(session);

      if (!vendor) {
        await session.abortTransaction();

        return res.status(404).json({
          success: false,
          message: "Vendor not found in your company",
        });
      }
    }

    const previousStock = item.currentStock;
    const newStock = previousStock + qty;

    item.currentStock = newStock;
    item.updatedBy = enteredBy;

    await item.save({ session });

    const [transaction] = await InventoryTransaction.create(
      [
        {
          companyId,
          itemId,
          transactionType: "stock_in",
          quantity: qty,
          previousStock,
          newStock,
          vendorId: vendorId || null,
          referenceNumber: referenceNumber || "",
          transactionDate: transactionDate || new Date(),
          purpose: purpose || "Stock Purchase",
          remarks: remarks || "",
          enteredBy,
        },
      ],
      { session },
    );

    await session.commitTransaction();

    return res.status(201).json({
      success: true,
      message: "Stock added successfully",
      data: {
        itemId: item._id,
        itemName: item.itemName,
        previousStock,
        quantityAdded: qty,
        currentStock: newStock,
        transaction,
      },
    });
  } catch (error) {
    await session.abortTransaction();

    console.error("Stock in error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to add stock",
      error: error.message,
    });
  } finally {
    await session.endSession();
  }
};

// ======================================================
// STOCK OUT
// ======================================================
const stockOut = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const companyId = req.user.companyId;
    const enteredBy = req.user.userId;

    const {
      itemId,
      quantity,
      vehicleId,
      driverId,
      referenceNumber,
      transactionDate,
      purpose,
      remarks,
    } = req.body;

    const qty = Number(quantity);

    if (!itemId || !quantity) {
      return res.status(400).json({
        success: false,
        message: "Item and quantity are required",
      });
    }

    if (qty <= 0) {
      return res.status(400).json({
        success: false,
        message: "Stock quantity must be greater than 0",
      });
    }

    session.startTransaction();

    const item = await InventoryItem.findOne({
      _id: itemId,
      companyId,
      status: "active",
    }).session(session);

    if (!item) {
      await session.abortTransaction();

      return res.status(404).json({
        success: false,
        message: "Active inventory item not found",
      });
    }

    if (vehicleId) {
      const vehicle = await Vehicle.findOne({
        _id: vehicleId,
        companyId,
      }).session(session);

      if (!vehicle) {
        await session.abortTransaction();

        return res.status(404).json({
          success: false,
          message: "Vehicle not found in your company",
        });
      }
    }

    if (driverId) {
      const driver = await Driver.findOne({
        _id: driverId,
        companyId,
      }).session(session);

      if (!driver) {
        await session.abortTransaction();

        return res.status(404).json({
          success: false,
          message: "Driver not found in your company",
        });
      }
    }

    const previousStock = item.currentStock;

    if (qty > previousStock) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: `Insufficient stock. Available stock is ${previousStock}`,
      });
    }

    const newStock = previousStock - qty;

    item.currentStock = newStock;
    item.updatedBy = enteredBy;

    await item.save({ session });

    const [transaction] = await InventoryTransaction.create(
      [
        {
          companyId,
          itemId,
          transactionType: "stock_out",
          quantity: qty,
          previousStock,
          newStock,
          vehicleId: vehicleId || null,
          driverId: driverId || null,
          referenceNumber: referenceNumber || "",
          transactionDate: transactionDate || new Date(),
          purpose: purpose || "Vehicle / Maintenance Usage",
          remarks: remarks || "",
          enteredBy,
        },
      ],
      { session },
    );

    await session.commitTransaction();

    return res.status(201).json({
      success: true,
      message: "Stock issued successfully",
      data: {
        itemId: item._id,
        itemName: item.itemName,
        previousStock,
        quantityIssued: qty,
        currentStock: newStock,
        transaction,
      },
    });
  } catch (error) {
    await session.abortTransaction();

    console.error("Stock out error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to issue stock",
      error: error.message,
    });
  } finally {
    await session.endSession();
  }
};

// ======================================================
// ADJUST STOCK
// ======================================================
const adjustStock = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const companyId = req.user.companyId;
    const enteredBy = req.user.userId;

    const {
      itemId,
      adjustmentType,
      quantity,
      referenceNumber,
      transactionDate,
      purpose,
      remarks,
    } = req.body;

    const qty = Number(quantity);

    if (!itemId || !adjustmentType || !quantity) {
      return res.status(400).json({
        success: false,
        message: "Item, adjustment type and quantity are required",
      });
    }

    if (!["increase", "decrease"].includes(adjustmentType)) {
      return res.status(400).json({
        success: false,
        message: "Adjustment type must be increase or decrease",
      });
    }

    if (qty <= 0) {
      return res.status(400).json({
        success: false,
        message: "Adjustment quantity must be greater than 0",
      });
    }

    session.startTransaction();

    const item = await InventoryItem.findOne({
      _id: itemId,
      companyId,
      status: "active",
    }).session(session);

    if (!item) {
      await session.abortTransaction();

      return res.status(404).json({
        success: false,
        message: "Active inventory item not found",
      });
    }

    const previousStock = item.currentStock;

    let newStock;

    if (adjustmentType === "increase") {
      newStock = previousStock + qty;
    } else {
      if (qty > previousStock) {
        await session.abortTransaction();

        return res.status(400).json({
          success: false,
          message: `Cannot decrease stock by ${qty}. Available stock is ${previousStock}`,
        });
      }

      newStock = previousStock - qty;
    }

    item.currentStock = newStock;
    item.updatedBy = enteredBy;

    await item.save({ session });

    const [transaction] = await InventoryTransaction.create(
      [
        {
          companyId,
          itemId,
          transactionType: "adjustment",
          adjustmentType,
          quantity: qty,
          previousStock,
          newStock,
          referenceNumber: referenceNumber || "",
          transactionDate: transactionDate || new Date(),
          purpose: purpose || "Stock Adjustment",
          remarks: remarks || "",
          enteredBy,
        },
      ],
      { session },
    );

    await session.commitTransaction();

    return res.status(201).json({
      success: true,
      message: "Stock adjusted successfully",
      data: {
        itemId: item._id,
        itemName: item.itemName,
        previousStock,
        adjustmentType,
        quantity: qty,
        currentStock: newStock,
        transaction,
      },
    });
  } catch (error) {
    await session.abortTransaction();

    console.error("Adjust stock error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to adjust stock",
      error: error.message,
    });
  } finally {
    await session.endSession();
  }
};

// ======================================================
// GET TRANSACTIONS
// ======================================================
const getInventoryTransactions = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const filter = {
      companyId,
    };

    if (req.query.itemId) {
      filter.itemId = req.query.itemId;
    }

    if (req.query.transactionType) {
      filter.transactionType = req.query.transactionType;
    }

    const transactions = await InventoryTransaction.find(filter)
      .populate("itemId", "itemCode itemName category unit")
      .populate("vendorId", "vendorCode vendorName")
      .populate("vehicleId", "vehicleNumber vehicleType")
      .populate("driverId", "name phone")
      .populate("enteredBy", "name email role")
      .sort({
        transactionDate: -1,
        createdAt: -1,
      });

    return res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions,
    });
  } catch (error) {
    console.error("Get inventory transactions error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch inventory transactions",
      error: error.message,
    });
  }
};

// ======================================================
// GET ITEM HISTORY
// ======================================================
const getItemHistory = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const itemId = req.params.id;

    const item = await InventoryItem.findOne({
      _id: itemId,
      companyId,
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Inventory item not found",
      });
    }

    const transactions = await InventoryTransaction.find({
      companyId,
      itemId,
    })
      .populate("vendorId", "vendorCode vendorName")
      .populate("vehicleId", "vehicleNumber vehicleType")
      .populate("driverId", "name phone")
      .populate("enteredBy", "name email role")
      .sort({
        transactionDate: -1,
        createdAt: -1,
      });

    return res.status(200).json({
      success: true,
      data: {
        item,
        transactions,
      },
    });
  } catch (error) {
    console.error("Get inventory history error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch inventory history",
      error: error.message,
    });
  }
};

// ======================================================
// LOW STOCK
// ======================================================
const getLowStockItems = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const items = await InventoryItem.find({
      companyId,
      status: "active",
      $expr: {
        $lte: ["$currentStock", "$minimumStock"],
      },
    })
      .populate("vendorId", "vendorCode vendorName")
      .sort({
        currentStock: 1,
        itemName: 1,
      });

    return res.status(200).json({
      success: true,
      count: items.length,
      data: items,
    });
  } catch (error) {
    console.error("Get low stock error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch low stock items",
      error: error.message,
    });
  }
};

// ======================================================
// DELETE / DEACTIVATE ITEM
// ======================================================
const deleteInventoryItem = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const item = await InventoryItem.findOne({
      _id: req.params.id,
      companyId,
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Inventory item not found",
      });
    }

    const transactionExists = await InventoryTransaction.exists({
      companyId,
      itemId: item._id,
    });

    if (transactionExists) {
      item.status = "inactive";
      item.updatedBy = req.user.userId;

      await item.save();

      return res.status(200).json({
        success: true,
        message:
          "Item has transaction history, so it was deactivated instead of deleted",
        data: item,
      });
    }

    await InventoryItem.deleteOne({
      _id: item._id,
      companyId,
    });

    return res.status(200).json({
      success: true,
      message: "Inventory item deleted successfully",
    });
  } catch (error) {
    console.error("Delete inventory item error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete inventory item",
      error: error.message,
    });
  }
};

module.exports = {
  createInventoryItem,
  getInventoryItems,
  getInventoryItemById,
  updateInventoryItem,
  stockIn,
  stockOut,
  adjustStock,
  getInventoryTransactions,
  getItemHistory,
  getLowStockItems,
  deleteInventoryItem,
};
