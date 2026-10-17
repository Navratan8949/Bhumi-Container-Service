const mongoose = require("mongoose");

const Maintenance = require("../models/Maintenance");
const Vehicle = require("../models/Vehicle");

// =====================================================
// HELPERS
// =====================================================

const round2 = (value) => Number(Number(value || 0).toFixed(2));

const buildDateRange = (fromDate, toDate) => {
  let startDate = null;
  let endDate = null;

  if (fromDate) {
    startDate = new Date(fromDate);

    if (isNaN(startDate.getTime())) {
      return {
        error: "Invalid fromDate",
      };
    }

    startDate.setHours(0, 0, 0, 0);
  }

  if (toDate) {
    endDate = new Date(toDate);

    if (isNaN(endDate.getTime())) {
      return {
        error: "Invalid toDate",
      };
    }

    endDate.setHours(23, 59, 59, 999);
  }

  if (startDate && endDate && startDate > endDate) {
    return {
      error: "fromDate cannot be greater than toDate",
    };
  }

  return {
    startDate,
    endDate,
  };
};

// =====================================================
// GET MAINTENANCE REPORT
// =====================================================

const getMaintenanceReport = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const { vehicleId, serviceType, status, fromDate, toDate } = req.query;

    // -------------------------------------------------
    // Validate Company
    // -------------------------------------------------

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid company ID",
      });
    }

    // -------------------------------------------------
    // Validate Vehicle ID
    // -------------------------------------------------

    if (vehicleId && !mongoose.Types.ObjectId.isValid(vehicleId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vehicle ID",
      });
    }

    // -------------------------------------------------
    // Validate Selected Vehicle Belongs To Company
    // -------------------------------------------------

    if (vehicleId) {
      const vehicle = await Vehicle.findOne({
        _id: vehicleId,
        companyId,
      }).select("_id");

      if (!vehicle) {
        return res.status(404).json({
          success: false,
          message: "Vehicle not found in this company",
        });
      }
    }

    // -------------------------------------------------
    // Date Validation
    // -------------------------------------------------

    const dateRange = buildDateRange(fromDate, toDate);

    if (dateRange.error) {
      return res.status(400).json({
        success: false,
        message: dateRange.error,
      });
    }

    const { startDate, endDate } = dateRange;

    // =================================================
    // BUILD QUERY
    // =================================================

    const query = {
      companyId,
    };

    if (vehicleId) {
      query.vehicleId = vehicleId;
    }

    if (serviceType) {
      query.serviceType = serviceType;
    }

    // -------------------------------------------------
    // Status
    // -------------------------------------------------
    // If a status is specifically requested,
    // return that status.
    //
    // Otherwise cancelled records are excluded from
    // normal operational maintenance reporting.

    if (status) {
      query.status = status;
    } else {
      query.status = { $ne: "cancelled" };
    }

    // -------------------------------------------------
    // Date Filter
    // -------------------------------------------------

    if (startDate || endDate) {
      query.maintenanceDate = {};

      if (startDate) {
        query.maintenanceDate.$gte = startDate;
      }

      if (endDate) {
        query.maintenanceDate.$lte = endDate;
      }
    }

    // =================================================
    // GET MAINTENANCE RECORDS
    // =================================================

    const maintenances = await Maintenance.find(query)
      .populate("vehicleId", "vehicleNumber vehicleType ownerType")
      .sort({
        maintenanceDate: -1,
      })
      .lean();

    // =================================================
    // SUMMARY
    // =================================================

    let totalPartsCost = 0;
    let totalLabourCost = 0;
    let totalCost = 0;

    const serviceTypeSummary = {};
    const vehicleSummary = {};
    const statusSummary = {};

    // =================================================
    // PROCESS RECORDS
    // =================================================

    maintenances.forEach((maintenance) => {
      const partsCost = Number(maintenance.partsCost || 0);

      const labourCost = Number(maintenance.labourCost || 0);

      const maintenanceTotal = Number(
        maintenance.totalCost ?? partsCost + labourCost,
      );

      totalPartsCost += partsCost;
      totalLabourCost += labourCost;
      totalCost += maintenanceTotal;

      // -----------------------------------------
      // Service Type Summary
      // -----------------------------------------

      const type = maintenance.serviceType || "other";

      if (!serviceTypeSummary[type]) {
        serviceTypeSummary[type] = {
          serviceType: type,
          records: 0,
          cost: 0,
        };
      }

      serviceTypeSummary[type].records += 1;
      serviceTypeSummary[type].cost += maintenanceTotal;

      // -----------------------------------------
      // Vehicle Summary
      // -----------------------------------------

      if (maintenance.vehicleId) {
        const id = maintenance.vehicleId._id.toString();

        if (!vehicleSummary[id]) {
          vehicleSummary[id] = {
            vehicleId: maintenance.vehicleId._id,
            vehicleNumber: maintenance.vehicleId.vehicleNumber,
            vehicleType: maintenance.vehicleId.vehicleType,
            ownerType: maintenance.vehicleId.ownerType,
            records: 0,
            cost: 0,
          };
        }

        vehicleSummary[id].records += 1;
        vehicleSummary[id].cost += maintenanceTotal;
      }

      // -----------------------------------------
      // Status Summary
      // -----------------------------------------

      const currentStatus = maintenance.status || "completed";

      if (!statusSummary[currentStatus]) {
        statusSummary[currentStatus] = {
          status: currentStatus,
          records: 0,
          cost: 0,
        };
      }

      statusSummary[currentStatus].records += 1;
      statusSummary[currentStatus].cost += maintenanceTotal;
    });

    // =================================================
    // ROUND SUMMARY
    // =================================================

    totalPartsCost = round2(totalPartsCost);
    totalLabourCost = round2(totalLabourCost);
    totalCost = round2(totalCost);

    Object.values(serviceTypeSummary).forEach((item) => {
      item.cost = round2(item.cost);
    });

    Object.values(vehicleSummary).forEach((item) => {
      item.cost = round2(item.cost);
    });

    Object.values(statusSummary).forEach((item) => {
      item.cost = round2(item.cost);
    });

    // =================================================
    // RESPONSE
    // =================================================

    return res.status(200).json({
      success: true,

      count: maintenances.length,

      summary: {
        totalRecords: maintenances.length,
        totalPartsCost,
        totalLabourCost,
        totalCost,
      },

      serviceTypeSummary: Object.values(serviceTypeSummary),

      vehicleSummary: Object.values(vehicleSummary),

      statusSummary: Object.values(statusSummary),

      data: maintenances,
    });
  } catch (error) {
    console.error("Get maintenance report error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate maintenance report",
      error: error.message,
    });
  }
};

// =====================================================
// GET VEHICLE MAINTENANCE REPORT
// =====================================================

const getVehicleMaintenanceReport = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const { vehicleId, fromDate, toDate } = req.query;

    // -------------------------------------------------
    // Validate Company
    // -------------------------------------------------

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid company ID",
      });
    }

    // -------------------------------------------------
    // Validate Vehicle ID
    // -------------------------------------------------

    if (vehicleId && !mongoose.Types.ObjectId.isValid(vehicleId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vehicle ID",
      });
    }

    // -------------------------------------------------
    // Date Validation
    // -------------------------------------------------

    const dateRange = buildDateRange(fromDate, toDate);

    if (dateRange.error) {
      return res.status(400).json({
        success: false,
        message: dateRange.error,
      });
    }

    const { startDate, endDate } = dateRange;

    // =================================================
    // VEHICLE QUERY
    // =================================================

    const vehicleQuery = {
      companyId,
      status: "active",
    };

    if (vehicleId) {
      vehicleQuery._id = vehicleId;
    }

    const vehicles = await Vehicle.find(vehicleQuery)
      .select("vehicleNumber vehicleType ownerType")
      .lean();

    // -------------------------------------------------
    // If specific vehicle was requested but not found
    // -------------------------------------------------

    if (vehicleId && vehicles.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found in this company",
      });
    }

    // =================================================
    // REPORT
    // =================================================

    const report = [];

    for (const vehicle of vehicles) {
      const maintenanceQuery = {
        companyId,
        vehicleId: vehicle._id,

        // Cancelled maintenance should not contribute
        // to normal vehicle maintenance cost.
        status: {
          $ne: "cancelled",
        },
      };

      // ---------------------------------------------
      // Date Filter
      // ---------------------------------------------

      if (startDate || endDate) {
        maintenanceQuery.maintenanceDate = {};

        if (startDate) {
          maintenanceQuery.maintenanceDate.$gte = startDate;
        }

        if (endDate) {
          maintenanceQuery.maintenanceDate.$lte = endDate;
        }
      }

      // ---------------------------------------------
      // Get Maintenance
      // ---------------------------------------------

      const maintenances = await Maintenance.find(maintenanceQuery)
        .sort({
          maintenanceDate: -1,
        })
        .lean();

      // ---------------------------------------------
      // Calculate Total Cost
      // ---------------------------------------------

      let totalCost = 0;

      maintenances.forEach((maintenance) => {
        const partsCost = Number(maintenance.partsCost || 0);

        const labourCost = Number(maintenance.labourCost || 0);

        const maintenanceTotal = Number(
          maintenance.totalCost ?? partsCost + labourCost,
        );

        totalCost += maintenanceTotal;
      });

      // ---------------------------------------------
      // Last Service
      // ---------------------------------------------

      const lastMaintenance = maintenances.length > 0 ? maintenances[0] : null;

      // ---------------------------------------------
      // Next Service
      // ---------------------------------------------
      // Look through latest records and use the first
      // record having a next-service date/odometer.

      let nextService = null;

      for (const maintenance of maintenances) {
        if (
          maintenance.status === "completed" ||
          maintenance.status === "pending"
        ) {
          if (maintenance.nextServiceDate || maintenance.nextServiceOdometer) {
            nextService = maintenance;
            break;
          }
        }
      }

      // ---------------------------------------------
      // Push Report
      // ---------------------------------------------

      report.push({
        vehicleId: vehicle._id,

        vehicleNumber: vehicle.vehicleNumber,

        vehicleType: vehicle.vehicleType,

        ownerType: vehicle.ownerType,

        totalServices: maintenances.length,

        totalCost: round2(totalCost),

        lastService: lastMaintenance
          ? {
              maintenanceDate: lastMaintenance.maintenanceDate,

              odometerReading: lastMaintenance.odometerReading,

              serviceType: lastMaintenance.serviceType,

              totalCost: round2(lastMaintenance.totalCost),
            }
          : null,

        nextService: nextService
          ? {
              nextServiceDate: nextService.nextServiceDate,

              nextServiceOdometer: nextService.nextServiceOdometer,
            }
          : null,
      });
    }

    // =================================================
    // RESPONSE
    // =================================================

    return res.status(200).json({
      success: true,
      count: report.length,
      data: report,
    });
  } catch (error) {
    console.error("Get vehicle maintenance report error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate vehicle maintenance report",
      error: error.message,
    });
  }
};

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  getMaintenanceReport,
  getVehicleMaintenanceReport,
};
