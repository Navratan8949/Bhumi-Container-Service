const mongoose = require("mongoose");

const Tyre = require("../models/Tyre");
const TyreHistory = require("../models/TyreHistory");
const Vehicle = require("../models/Vehicle");

// =====================================================
// HELPERS
// =====================================================

const round2 = (value) => {
  return Number(Number(value || 0).toFixed(2));
};

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
// GET TYRE REPORT
// =====================================================

const getTyreReport = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const { vehicleId, status, tyreType, brand, tyreSize, fromDate, toDate } =
      req.query;

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
    // Validate Vehicle Belongs To Company
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

    if (status) {
      query.status = status;
    }

    if (tyreType) {
      query.tyreType = tyreType;
    }

    if (brand) {
      query.brand = brand;
    }

    if (tyreSize) {
      query.tyreSize = tyreSize;
    }

    // -------------------------------------------------
    // Purchase Date Filter
    // -------------------------------------------------

    if (startDate || endDate) {
      query.purchaseDate = {};

      if (startDate) {
        query.purchaseDate.$gte = startDate;
      }

      if (endDate) {
        query.purchaseDate.$lte = endDate;
      }
    }

    // =================================================
    // GET TYRES
    // =================================================

    const tyres = await Tyre.find(query)
      .populate("vehicleId", "vehicleNumber vehicleType ownerType")
      .sort({
        purchaseDate: -1,
      })
      .lean();

    // =================================================
    // SUMMARY
    // =================================================

    let totalPurchaseAmount = 0;

    const statusSummary = {};
    const typeSummary = {};
    const brandSummary = {};
    const sizeSummary = {};
    const vehicleSummary = {};

    // =================================================
    // PROCESS TYRES
    // =================================================

    tyres.forEach((tyre) => {
      const purchasePrice = Number(tyre.purchasePrice || 0);

      totalPurchaseAmount += purchasePrice;

      // ---------------------------------------------
      // Status Summary
      // ---------------------------------------------

      const currentStatus = tyre.status || "unknown";

      if (!statusSummary[currentStatus]) {
        statusSummary[currentStatus] = {
          status: currentStatus,
          count: 0,
          purchaseAmount: 0,
        };
      }

      statusSummary[currentStatus].count += 1;
      statusSummary[currentStatus].purchaseAmount += purchasePrice;

      // ---------------------------------------------
      // Tyre Type Summary
      // ---------------------------------------------

      const currentType = tyre.tyreType || "unknown";

      if (!typeSummary[currentType]) {
        typeSummary[currentType] = {
          tyreType: currentType,
          count: 0,
          purchaseAmount: 0,
        };
      }

      typeSummary[currentType].count += 1;
      typeSummary[currentType].purchaseAmount += purchasePrice;

      // ---------------------------------------------
      // Brand Summary
      // ---------------------------------------------

      const currentBrand = tyre.brand || "unknown";

      if (!brandSummary[currentBrand]) {
        brandSummary[currentBrand] = {
          brand: currentBrand,
          count: 0,
          purchaseAmount: 0,
        };
      }

      brandSummary[currentBrand].count += 1;
      brandSummary[currentBrand].purchaseAmount += purchasePrice;

      // ---------------------------------------------
      // Size Summary
      // ---------------------------------------------

      const currentSize = tyre.tyreSize || "unknown";

      if (!sizeSummary[currentSize]) {
        sizeSummary[currentSize] = {
          tyreSize: currentSize,
          count: 0,
          purchaseAmount: 0,
        };
      }

      sizeSummary[currentSize].count += 1;
      sizeSummary[currentSize].purchaseAmount += purchasePrice;

      // ---------------------------------------------
      // Vehicle Summary
      // ---------------------------------------------

      if (tyre.vehicleId) {
        const id = tyre.vehicleId._id.toString();

        if (!vehicleSummary[id]) {
          vehicleSummary[id] = {
            vehicleId: tyre.vehicleId._id,
            vehicleNumber: tyre.vehicleId.vehicleNumber,
            vehicleType: tyre.vehicleId.vehicleType,
            ownerType: tyre.vehicleId.ownerType,
            count: 0,
            purchaseAmount: 0,
          };
        }

        vehicleSummary[id].count += 1;
        vehicleSummary[id].purchaseAmount += purchasePrice;
      }
    });

    // =================================================
    // ROUND VALUES
    // =================================================

    totalPurchaseAmount = round2(totalPurchaseAmount);

    Object.values(statusSummary).forEach((item) => {
      item.purchaseAmount = round2(item.purchaseAmount);
    });

    Object.values(typeSummary).forEach((item) => {
      item.purchaseAmount = round2(item.purchaseAmount);
    });

    Object.values(brandSummary).forEach((item) => {
      item.purchaseAmount = round2(item.purchaseAmount);
    });

    Object.values(sizeSummary).forEach((item) => {
      item.purchaseAmount = round2(item.purchaseAmount);
    });

    Object.values(vehicleSummary).forEach((item) => {
      item.purchaseAmount = round2(item.purchaseAmount);
    });

    // =================================================
    // RESPONSE
    // =================================================

    return res.status(200).json({
      success: true,

      count: tyres.length,

      summary: {
        totalTyres: tyres.length,
        totalPurchaseAmount,
      },

      statusSummary: Object.values(statusSummary),

      tyreTypeSummary: Object.values(typeSummary),

      brandSummary: Object.values(brandSummary),

      sizeSummary: Object.values(sizeSummary),

      vehicleSummary: Object.values(vehicleSummary),

      data: tyres,
    });
  } catch (error) {
    console.error("Get tyre report error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate tyre report",
      error: error.message,
    });
  }
};

// =====================================================
// GET VEHICLE TYRE REPORT
// =====================================================

const getVehicleTyreReport = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const { vehicleId } = req.query;

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

    // =================================================
    // VEHICLES
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
    // Specific Vehicle Not Found
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
      const tyres = await Tyre.find({
        companyId,
        vehicleId: vehicle._id,
      })
        .sort({
          fittingDate: -1,
          purchaseDate: -1,
        })
        .lean();

      // ---------------------------------------------
      // Status Counts
      // ---------------------------------------------

      const fittedTyres = tyres.filter((tyre) => tyre.status === "fitted");

      const removedTyres = tyres.filter((tyre) => tyre.status === "removed");

      const repairTyres = tyres.filter((tyre) => tyre.status === "repair");

      const retreadTyres = tyres.filter((tyre) => tyre.status === "retread");

      const scrappedTyres = tyres.filter((tyre) => tyre.status === "scrapped");

      const inStockTyres = tyres.filter((tyre) => tyre.status === "in_stock");

      // ---------------------------------------------
      // Purchase Amount
      // ---------------------------------------------

      const totalPurchaseAmount = tyres.reduce(
        (sum, tyre) => sum + Number(tyre.purchasePrice || 0),
        0,
      );

      // ---------------------------------------------
      // Response
      // ---------------------------------------------

      report.push({
        vehicleId: vehicle._id,

        vehicleNumber: vehicle.vehicleNumber,

        vehicleType: vehicle.vehicleType,

        ownerType: vehicle.ownerType,

        totalTyres: tyres.length,

        inStock: inStockTyres.length,

        fitted: fittedTyres.length,

        removed: removedTyres.length,

        repair: repairTyres.length,

        retread: retreadTyres.length,

        scrapped: scrappedTyres.length,

        totalPurchaseAmount: round2(totalPurchaseAmount),

        fittedTyres,
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
    console.error("Get vehicle tyre report error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate vehicle tyre report",
      error: error.message,
    });
  }
};

// =====================================================
// GET TYRE HISTORY
// =====================================================

const getTyreHistory = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const { tyreId } = req.params;

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
    // Validate Tyre ID
    // -------------------------------------------------

    if (!mongoose.Types.ObjectId.isValid(tyreId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid tyre ID",
      });
    }

    // =================================================
    // FIND TYRE
    // =================================================

    const tyre = await Tyre.findOne({
      _id: tyreId,
      companyId,
    })
      .populate("vehicleId", "vehicleNumber vehicleType ownerType")
      .lean();

    if (!tyre) {
      return res.status(404).json({
        success: false,
        message: "Tyre not found",
      });
    }

    // =================================================
    // GET TYRE HISTORY
    // =================================================

    const history = await TyreHistory.find({
      companyId,
      tyreId,
    })
      .sort({
        createdAt: -1,
      })
      .lean();

    // =================================================
    // RESPONSE
    // =================================================

    return res.status(200).json({
      success: true,

      data: {
        tyre,
        history,
      },
    });
  } catch (error) {
    console.error("Get tyre history error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get tyre history",
      error: error.message,
    });
  }
};

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  getTyreReport,
  getVehicleTyreReport,
  getTyreHistory,
};
