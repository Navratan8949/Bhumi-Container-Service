const mongoose = require("mongoose");

const Maintenance = require("../models/Maintenance");
const Vehicle = require("../models/Vehicle");
const InventoryItem = require("../models/InventoryItem");
const InventoryTransaction = require("../models/InventoryTransaction");

// ==========================================
// CREATE MAINTENANCE
// ==========================================

const createMaintenance = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const companyId = req.user.companyId;
    const enteredBy = req.user.userId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company is required",
      });
    }

    const {
      vehicleId,
      maintenanceDate,
      odometerReading,
      serviceType,
      workshopVendor,
      description,
      partsCost = 0,
      labourCost = 0,
      nextServiceDate,
      nextServiceOdometer,
      paymentMode,
      invoiceNumber,
      status,
      remarks,
      partsUsed,
    } = req.body;

    // -----------------------------
    // Required fields
    // -----------------------------

    if (
      !vehicleId ||
      !maintenanceDate ||
      odometerReading === undefined ||
      !serviceType
    ) {
      return res.status(400).json({
        success: false,
        message:
          "vehicleId, maintenanceDate, odometerReading and serviceType are required",
      });
    }

    // -----------------------------
    // Vehicle validation
    // -----------------------------

    const vehicle = await Vehicle.findOne({
      _id: vehicleId,
      companyId,
    }).session(session);

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    // -----------------------------
    // Odometer validation
    // -----------------------------

    const previousMaintenance = await Maintenance.findOne({
      companyId,
      vehicleId,
      status: { $ne: "cancelled" },
    })
      .sort({ odometerReading: -1 })
      .session(session);

    if (
      previousMaintenance &&
      Number(odometerReading) < Number(previousMaintenance.odometerReading)
    ) {
      return res.status(400).json({
        success: false,
        message: `Odometer reading cannot be less than previous maintenance reading (${previousMaintenance.odometerReading})`,
      });
    }

    // -----------------------------
    // Cost calculation & Inventory Stock Deduction
    // -----------------------------

    let computedPartsCost = 0;
    const validPartsUsed = [];

    let partsToProcess = Array.isArray(partsUsed) ? [...partsUsed] : [];
    if (partsToProcess.length === 0 && req.body.inventoryItemId) {
      partsToProcess.push({
        itemId: req.body.inventoryItemId,
        quantity: Number(req.body.partQuantity || 1),
        unitCost: Number(req.body.partUnitCost || 0),
        partName: req.body.partName || "",
      });
    }

    if (partsToProcess.length > 0) {
      for (const p of partsToProcess) {
        const qty = Number(p.quantity) || 1;
        const uCost = Number(p.unitCost) || 0;
        const tCost = Number(p.totalCost) || (qty * uCost);
        computedPartsCost += tCost;

        if (p.itemId) {
          const invItem = await InventoryItem.findOne({
            _id: p.itemId,
            companyId,
          }).session(session);

          if (invItem) {
            const prevStock = Number(invItem.currentStock) || 0;
            const newStock = Math.max(0, prevStock - qty);
            invItem.currentStock = newStock;
            invItem.updatedBy = enteredBy;
            await invItem.save({ session });

            await InventoryTransaction.create(
              [
                {
                  companyId,
                  itemId: invItem._id,
                  transactionType: "stock_out",
                  quantity: qty,
                  previousStock: prevStock,
                  newStock,
                  vehicleId: vehicle._id,
                  referenceNumber: invoiceNumber || "",
                  transactionDate: maintenanceDate || new Date(),
                  purpose: `Vehicle Maintenance: ${serviceType} for ${vehicle.vehicleNumber}`,
                  remarks: p.remarks || `Auto-issued for maintenance (${invItem.itemName})`,
                  enteredBy,
                },
              ],
              { session }
            );

            validPartsUsed.push({
              itemId: invItem._id,
              partName: p.partName || invItem.itemName,
              quantity: qty,
              unitCost: uCost || invItem.unitCost || 0,
              totalCost: tCost,
            });
          } else {
            validPartsUsed.push({
              itemId: null,
              partName: p.partName || "Spare Part",
              quantity: qty,
              unitCost: uCost,
              totalCost: tCost,
            });
          }
        } else if (p.partName) {
          validPartsUsed.push({
            itemId: null,
            partName: p.partName,
            quantity: qty,
            unitCost: uCost,
            totalCost: tCost,
          });
        }
      }
    }

    const finalPartsCost = Number(partsCost) || computedPartsCost || 0;
    const finalLabourCost = Number(labourCost) || 0;
    const totalCost = finalPartsCost + finalLabourCost;

    // -----------------------------
    // Next service validation
    // -----------------------------

    if (
      nextServiceOdometer !== undefined &&
      nextServiceOdometer !== null &&
      Number(nextServiceOdometer) < Number(odometerReading)
    ) {
      return res.status(400).json({
        success: false,
        message: "Next service odometer cannot be less than current odometer",
      });
    }

    // -----------------------------
    // Create maintenance
    // -----------------------------

    const maintenance = await Maintenance.create(
      [
        {
          companyId,
          vehicleId,
          maintenanceDate,
          odometerReading: Number(odometerReading),
          serviceType,
          workshopVendor,
          description,
          partsCost: finalPartsCost,
          labourCost: finalLabourCost,
          totalCost,
          partsUsed: validPartsUsed,
          nextServiceDate: nextServiceDate || null,
          nextServiceOdometer:
            nextServiceOdometer !== undefined
              ? Number(nextServiceOdometer)
              : null,
          paymentMode,
          invoiceNumber,
          status: status || "completed",
          remarks,
          enteredBy,
        },
      ],
      { session },
    );

    await session.commitTransaction();

    const result = await Maintenance.findById(maintenance[0]._id)
      .populate("vehicleId", "vehicleNumber vehicleType")
      .populate("enteredBy", "name email")
      .populate("partsUsed.itemId", "itemName partNumber unit category")
      .lean();

    return res.status(201).json({
      success: true,
      message: "Maintenance record created successfully",
      data: result,
    });
  } catch (error) {
    await session.abortTransaction();

    console.error("Create maintenance error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create maintenance record",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

// ==========================================
// GET ALL MAINTENANCE
// ==========================================

const getMaintenances = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const { vehicleId, serviceType, status, fromDate, toDate } = req.query;

    const filter = {
      companyId,
    };

    if (vehicleId) {
      filter.vehicleId = vehicleId;
    }

    if (serviceType) {
      filter.serviceType = serviceType;
    }

    if (status) {
      filter.status = status;
    }

    if (fromDate || toDate) {
      filter.maintenanceDate = {};

      if (fromDate) {
        filter.maintenanceDate.$gte = new Date(fromDate);
      }

      if (toDate) {
        const endDate = new Date(toDate);
        endDate.setHours(23, 59, 59, 999);

        filter.maintenanceDate.$lte = endDate;
      }
    }

    const data = await Maintenance.find(filter)
      .populate("vehicleId", "vehicleNumber vehicleType")
      .populate("enteredBy", "name email")
      .populate("partsUsed.itemId", "itemName partNumber unit category")
      .sort({
        maintenanceDate: -1,
        createdAt: -1,
      });

    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error("Get maintenance error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch maintenance records",
      error: error.message,
    });
  }
};

// ==========================================
// GET MAINTENANCE BY ID
// ==========================================

const getMaintenanceById = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const maintenance = await Maintenance.findOne({
      _id: req.params.id,
      companyId,
    })
      .populate("vehicleId", "vehicleNumber vehicleType")
      .populate("enteredBy", "name email")
      .populate("partsUsed.itemId", "itemName partNumber unit category");

    if (!maintenance) {
      return res.status(404).json({
        success: false,
        message: "Maintenance record not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: maintenance,
    });
  } catch (error) {
    console.error("Get maintenance by id error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch maintenance record",
      error: error.message,
    });
  }
};

// ==========================================
// UPDATE MAINTENANCE
// ==========================================

const updateMaintenance = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const maintenance = await Maintenance.findOne({
      _id: req.params.id,
      companyId,
    });

    if (!maintenance) {
      return res.status(404).json({
        success: false,
        message: "Maintenance record not found",
      });
    }

    if (maintenance.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cancelled maintenance cannot be updated",
      });
    }

    const {
      maintenanceDate,
      odometerReading,
      serviceType,
      workshopVendor,
      description,
      partsCost,
      labourCost,
      nextServiceDate,
      nextServiceOdometer,
      paymentMode,
      invoiceNumber,
      status,
      remarks,
      partsUsed,
    } = req.body;

    // -----------------------------
    // Odometer validation
    // -----------------------------

    if (odometerReading !== undefined) {
      const previousMaintenance = await Maintenance.findOne({
        companyId,
        vehicleId: maintenance.vehicleId,
        _id: { $ne: maintenance._id },
        status: { $ne: "cancelled" },
      }).sort({
        odometerReading: -1,
      });

      if (
        previousMaintenance &&
        Number(odometerReading) < Number(previousMaintenance.odometerReading)
      ) {
        return res.status(400).json({
          success: false,
          message: `Odometer reading cannot be less than previous maintenance reading (${previousMaintenance.odometerReading})`,
        });
      }

      maintenance.odometerReading = Number(odometerReading);
    }

    if (maintenanceDate !== undefined) {
      maintenance.maintenanceDate = maintenanceDate;
    }

    if (serviceType !== undefined) {
      maintenance.serviceType = serviceType;
    }

    if (workshopVendor !== undefined) {
      maintenance.workshopVendor = workshopVendor;
    }

    if (description !== undefined) {
      maintenance.description = description;
    }

    if (partsCost !== undefined) {
      maintenance.partsCost = Number(partsCost) || 0;
    }

    if (labourCost !== undefined) {
      maintenance.labourCost = Number(labourCost) || 0;
    }

    if (nextServiceDate !== undefined) {
      maintenance.nextServiceDate = nextServiceDate;
    }

    if (nextServiceOdometer !== undefined) {
      if (
        nextServiceOdometer !== null &&
        Number(nextServiceOdometer) < Number(maintenance.odometerReading)
      ) {
        return res.status(400).json({
          success: false,
          message: "Next service odometer cannot be less than current odometer",
        });
      }

      maintenance.nextServiceOdometer =
        nextServiceOdometer === null ? null : Number(nextServiceOdometer);
    }

    if (paymentMode !== undefined) {
      maintenance.paymentMode = paymentMode;
    }

    if (invoiceNumber !== undefined) {
      maintenance.invoiceNumber = invoiceNumber;
    }

    if (status !== undefined) {
      maintenance.status = status;
    }

    if (remarks !== undefined) {
      maintenance.remarks = remarks;
    }

    // Recalculate total
    maintenance.totalCost =
      Number(maintenance.partsCost || 0) + Number(maintenance.labourCost || 0);

    await maintenance.save();

    const result = await Maintenance.findById(maintenance._id)
      .populate("vehicleId", "vehicleNumber vehicleType")
      .populate("enteredBy", "name email")
      .populate("partsUsed.itemId", "itemName partNumber unit category");

    return res.status(200).json({
      success: true,
      message: "Maintenance record updated successfully",
      data: result,
    });
  } catch (error) {
    console.error("Update maintenance error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update maintenance record",
      error: error.message,
    });
  }
};

// ==========================================
// DELETE MAINTENANCE
// ==========================================

const deleteMaintenance = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const maintenance = await Maintenance.findOne({
      _id: req.params.id,
      companyId,
    });

    if (!maintenance) {
      return res.status(404).json({
        success: false,
        message: "Maintenance record not found",
      });
    }

    // Restore inventory if parts were used
    if (Array.isArray(maintenance.partsUsed) && maintenance.partsUsed.length > 0) {
      for (const p of maintenance.partsUsed) {
        if (p.itemId && Number(p.quantity) > 0) {
          const invItem = await InventoryItem.findOne({
            _id: p.itemId,
            companyId,
          });
          if (invItem) {
            const prevStock = Number(invItem.currentStock) || 0;
            const newStock = prevStock + Number(p.quantity);
            invItem.currentStock = newStock;
            await invItem.save();

            await InventoryTransaction.create({
              companyId,
              itemId: invItem._id,
              transactionType: "stock_in",
              quantity: Number(p.quantity),
              previousStock: prevStock,
              newStock,
              purpose: `Reversal: Maintenance #${maintenance._id} Deleted`,
              remarks: `Restocked parts from deleted maintenance record`,
              enteredBy: req.user.userId,
            });
          }
        }
      }
    }

    await Maintenance.deleteOne({
      _id: maintenance._id,
      companyId,
    });

    return res.status(200).json({
      success: true,
      message: "Maintenance record deleted successfully",
    });
  } catch (error) {
    console.error("Delete maintenance error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete maintenance record",
      error: error.message,
    });
  }
};

// ==========================================
// VEHICLE MAINTENANCE HISTORY
// ==========================================

const getVehicleMaintenanceHistory = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { vehicleId } = req.params;

    const vehicle = await Vehicle.findOne({
      _id: vehicleId,
      companyId,
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    const data = await Maintenance.find({
      companyId,
      vehicleId,
    })
      .populate("vehicleId", "vehicleNumber vehicleType")
      .populate("enteredBy", "name email")
      .populate("partsUsed.itemId", "itemName partNumber unit category")
      .sort({
        maintenanceDate: -1,
        createdAt: -1,
      });

    const totalExpense = data.reduce(
      (sum, item) => sum + Number(item.totalCost || 0),
      0,
    );

    return res.status(200).json({
      success: true,
      vehicle: {
        _id: vehicle._id,
        vehicleNumber: vehicle.vehicleNumber,
        vehicleType: vehicle.vehicleType,
      },
      count: data.length,
      totalExpense,
      data,
    });
  } catch (error) {
    console.error("Get vehicle maintenance history error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch vehicle maintenance history",
      error: error.message,
    });
  }
};

module.exports = {
  createMaintenance,
  getMaintenances,
  getMaintenanceById,
  updateMaintenance,
  deleteMaintenance,
  getVehicleMaintenanceHistory,
};
