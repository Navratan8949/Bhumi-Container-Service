const mongoose = require("mongoose");

const Tyre = require("../models/Tyre");
const TyreHistory = require("../models/TyreHistory");
const Vehicle = require("../models/Vehicle");

// -------------------------------------------
// COMMON HELPERS
// -------------------------------------------

const POSITIONS = [
  "front_left",
  "front_right",
  "rear_left",
  "rear_right",
  "rear_inner_left",
  "rear_outer_left",
  "rear_inner_right",
  "rear_outer_right",
  "spare",
];

const isValidId = (id) => mongoose.isValidObjectId(id);

const isValidDate = (value) =>
  value && !Number.isNaN(new Date(value).getTime());

const validNumber = (value, min = 0) =>
  value !== null &&
  value !== "" &&
  Number.isFinite(Number(value)) &&
  Number(value) >= min;

const sendError = (res, error) => {
  console.error("Tyre error:", error);

  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "Duplicate tyre number or vehicle position",
    });
  }

  if (error.name === "ValidationError" || error.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  return res.status(500).json({
    success: false,
    message: "Tyre operation failed",
    error: error.message,
  });
};

const populateTyre = (query) =>
  query.populate("vehicleId", "vehicleNumber vehicleType ownerType");

const addHistory = async (tyre, action, data, userId, session) => {
  await TyreHistory.create(
    [
      {
        companyId: tyre.companyId,
        tyreId: tyre._id,
        action,
        vehicleId: data.vehicleId || null,
        position: data.position || null,
        actionDate: data.actionDate,
        odometerReading: data.odometerReading ?? null,
        cost: data.cost ?? 0,
        reason: data.reason || "",
        remarks: data.remarks || "",
        performedBy: userId,
      },
    ],
    { session },
  );
};

// -------------------------------------------
// CREATE TYRE
// -------------------------------------------

const createTyre = async (req, res) => {
  const {
    tyreNumber,
    brand,
    tyreSize,
    tyreType,
    purchaseDate,
    purchasePrice,
    remarks,
    vehicleId,
    position,
    fittingDate,
    fittingOdometer,
    status,
  } = req.body;

  const companyId = req.user.companyId;

  if (!companyId) {
    return res.status(400).json({
      success: false,
      message: "Company is required",
    });
  }

  if (
    typeof tyreNumber !== "string" ||
    !tyreNumber.trim() ||
    typeof brand !== "string" ||
    !brand.trim() ||
    typeof tyreSize !== "string" ||
    !tyreSize.trim()
  ) {
    return res.status(400).json({
      success: false,
      message: "Tyre number, brand and size are required",
    });
  }

  if (purchaseDate && !isValidDate(purchaseDate)) {
    return res.status(400).json({
      success: false,
      message: "Invalid purchase date",
    });
  }

  if (purchasePrice !== undefined && !validNumber(purchasePrice)) {
    return res.status(400).json({
      success: false,
      message: "Invalid purchase price",
    });
  }

  // Duplicate tyre number check early
  const existingTyre = await Tyre.findOne({
    companyId,
    tyreNumber: tyreNumber.trim().toUpperCase(),
  });
  if (existingTyre) {
    return res.status(409).json({
      success: false,
      message: `Tyre with number "${tyreNumber.trim().toUpperCase()}" already exists`,
    });
  }

  const isInitialFit =
    Boolean(vehicleId) &&
    Boolean(position) &&
    isValidId(vehicleId) &&
    POSITIONS.includes(position);

  if (isInitialFit) {
    const occupied = await Tyre.findOne({
      companyId,
      vehicleId,
      position,
      status: "fitted",
    });
    if (occupied) {
      return res.status(409).json({
        success: false,
        message: `Another tyre (${occupied.tyreNumber}) is already fitted at position "${position}" on this vehicle`,
      });
    }
  }

  const session = await mongoose.startSession();

  try {
    let tyre;

    await session.withTransaction(async () => {
      const tyreDoc = {
        companyId,
        tyreNumber: tyreNumber.trim().toUpperCase(),
        brand: brand.trim(),
        tyreSize: tyreSize.trim(),
        tyreType: tyreType || "new",
        purchaseDate: purchaseDate || null,
        purchasePrice: Number(purchasePrice ?? 0),
        remarks: remarks || "",
        status: isInitialFit ? "fitted" : status || "in_stock",
      };

      if (isInitialFit) {
        tyreDoc.vehicleId = vehicleId;
        tyreDoc.position = position;
        tyreDoc.fittingDate = fittingDate || purchaseDate || new Date();
        tyreDoc.fittingOdometer = validNumber(fittingOdometer)
          ? Number(fittingOdometer)
          : 0;
      }

      const result = await Tyre.create([tyreDoc], { session });
      tyre = result[0];

      // 1. Purchase history
      await addHistory(
        tyre,
        "purchased",
        {
          actionDate: purchaseDate || new Date(),
          cost: Number(purchasePrice ?? 0),
          remarks: remarks || "Initial purchase entry",
        },
        req.user.userId,
        session,
      );

      // 2. Initial fit history if fitted
      if (isInitialFit) {
        await addHistory(
          tyre,
          "fitted",
          {
            vehicleId,
            position,
            actionDate: tyreDoc.fittingDate,
            odometerReading: tyreDoc.fittingOdometer,
            remarks: "Fitted upon initial registration",
          },
          req.user.userId,
          session,
        );
      }
    });

    return res.status(201).json({
      success: true,
      message: "Tyre created successfully",
      data: tyre,
    });
  } catch (error) {
    return sendError(res, error);
  } finally {
    await session.endSession();
  }
};

// -------------------------------------------
// GET ALL TYRES
// -------------------------------------------

const getTyres = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company is required",
      });
    }

    const filter = { companyId };

    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (req.query.vehicleId) {
      if (!isValidId(req.query.vehicleId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid vehicle ID",
        });
      }

      filter.vehicleId = req.query.vehicleId;
    }

    const tyres = await populateTyre(Tyre.find(filter)).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: tyres.length,
      data: tyres,
    });
  } catch (error) {
    return sendError(res, error);
  }
};

// -------------------------------------------
// GET SINGLE TYRE
// -------------------------------------------

const getTyreById = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid tyre ID",
      });
    }

    const tyre = await populateTyre(
      Tyre.findOne({
        _id: req.params.id,
        companyId: req.user.companyId,
      }),
    );

    if (!tyre) {
      return res.status(404).json({
        success: false,
        message: "Tyre not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: tyre,
    });
  } catch (error) {
    return sendError(res, error);
  }
};

// -------------------------------------------
// UPDATE BASIC TYRE DETAILS
// -------------------------------------------

const updateTyre = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid tyre ID",
      });
    }

    const allowedFields = [
      "brand",
      "tyreSize",
      "tyreType",
      "purchaseDate",
      "purchasePrice",
      "remarks",
      "status",
      "vehicleId",
      "position",
      "fittingDate",
      "fittingOdometer",
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (updates.status === "in_stock" || updates.status === "removed") {
      updates.vehicleId = null;
      updates.position = null;
    } else if (updates.vehicleId === "") {
      updates.vehicleId = null;
    }

    if (
      updates.purchasePrice !== undefined &&
      !validNumber(updates.purchasePrice)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid purchase price",
      });
    }

    if (updates.purchaseDate && !isValidDate(updates.purchaseDate)) {
      return res.status(400).json({
        success: false,
        message: "Invalid purchase date",
      });
    }

    const tyre = await Tyre.findOne({
      _id: req.params.id,
      companyId: req.user.companyId,
    });

    if (!tyre) {
      return res.status(404).json({
        success: false,
        message: "Tyre not found",
      });
    }

    if (tyre.status === "scrapped") {
      return res.status(400).json({
        success: false,
        message: "Scrapped tyre cannot be edited",
      });
    }

    Object.assign(tyre, updates);

    await tyre.save();

    return res.status(200).json({
      success: true,
      message: "Tyre updated successfully",
      data: tyre,
    });
  } catch (error) {
    return sendError(res, error);
  }
};

// -------------------------------------------
// FIT TYRE TO VEHICLE
// -------------------------------------------

const fitTyre = async (req, res) => {
  const { vehicleId, position, fittingDate, odometerReading, remarks } =
    req.body;

  const companyId = req.user.companyId;

  if (
    !isValidId(req.params.id) ||
    !isValidId(vehicleId) ||
    !POSITIONS.includes(position) ||
    !isValidDate(fittingDate) ||
    !validNumber(odometerReading)
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Valid tyre, vehicle, position, fitting date and odometer are required",
    });
  }

  const session = await mongoose.startSession();

  try {
    let tyre;

    await session.withTransaction(async () => {
      tyre = await Tyre.findOne({
        _id: req.params.id,
        companyId,
      }).session(session);

      if (!tyre) {
        throw {
          status: 404,
          message: "Tyre not found",
        };
      }

      if (!["in_stock", "removed"].includes(tyre.status)) {
        throw {
          status: 400,
          message: "Only in-stock or removed tyres can be fitted",
        };
      }

      const vehicle = await Vehicle.findOne({
        _id: vehicleId,
        companyId,
      }).session(session);

      if (!vehicle) {
        throw {
          status: 404,
          message: "Vehicle not found",
        };
      }

      const occupied = await Tyre.findOne({
        companyId,
        vehicleId,
        position,
        status: "fitted",
      }).session(session);

      if (occupied) {
        throw {
          status: 409,
          message: "Another tyre is already fitted at this position",
        };
      }

      tyre.vehicleId = vehicleId;
      tyre.position = position;
      tyre.fittingDate = fittingDate;
      tyre.fittingOdometer = Number(odometerReading);
      tyre.status = "fitted";

      await tyre.save({ session });

      await addHistory(
        tyre,
        "fitted",
        {
          vehicleId,
          position,
          actionDate: fittingDate,
          odometerReading: Number(odometerReading),
          remarks,
        },
        req.user.userId,
        session,
      );
    });

    return res.status(200).json({
      success: true,
      message: "Tyre fitted successfully",
      data: tyre,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }

    return sendError(res, error);
  } finally {
    await session.endSession();
  }
};

// -------------------------------------------
// REMOVE TYRE
// -------------------------------------------

const removeTyre = async (req, res) => {
  const { removalDate, odometerReading, reason, remarks } = req.body;

  if (
    !isValidId(req.params.id) ||
    !isValidDate(removalDate) ||
    !validNumber(odometerReading) ||
    typeof reason !== "string" ||
    !reason.trim()
  ) {
    return res.status(400).json({
      success: false,
      message: "Valid removal date, odometer and reason are required",
    });
  }

  const session = await mongoose.startSession();

  try {
    let tyre;

    await session.withTransaction(async () => {
      tyre = await Tyre.findOne({
        _id: req.params.id,
        companyId: req.user.companyId,
      }).session(session);

      if (!tyre) {
        throw {
          status: 404,
          message: "Tyre not found",
        };
      }

      if (tyre.status !== "fitted") {
        throw {
          status: 400,
          message: "Tyre is not fitted",
        };
      }

      if (new Date(removalDate) < new Date(tyre.fittingDate)) {
        throw {
          status: 400,
          message: "Removal date cannot be before fitting date",
        };
      }

      if (Number(odometerReading) < tyre.fittingOdometer) {
        throw {
          status: 400,
          message: "Removal odometer cannot be less than fitting odometer",
        };
      }

      const previousVehicle = tyre.vehicleId;
      const previousPosition = tyre.position;

      await addHistory(
        tyre,
        "removed",
        {
          vehicleId: previousVehicle,
          position: previousPosition,
          actionDate: removalDate,
          odometerReading: Number(odometerReading),
          reason,
          remarks,
        },
        req.user.userId,
        session,
      );

      tyre.status = "removed";
      tyre.vehicleId = null;
      tyre.position = null;
      tyre.fittingDate = null;
      tyre.fittingOdometer = null;

      await tyre.save({ session });
    });

    return res.status(200).json({
      success: true,
      message: "Tyre removed successfully",
      data: tyre,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }

    return sendError(res, error);
  } finally {
    await session.endSession();
  }
};

// -------------------------------------------
// REPAIR OR RETREAD
// -------------------------------------------

const serviceTyre = (action) => async (req, res) => {
  const { actionDate, cost, reason, remarks } = req.body;

  if (
    !isValidId(req.params.id) ||
    !isValidDate(actionDate) ||
    !validNumber(cost)
  ) {
    return res.status(400).json({
      success: false,
      message: "Valid tyre, date and cost are required",
    });
  }

  const session = await mongoose.startSession();

  try {
    let tyre;

    await session.withTransaction(async () => {
      tyre = await Tyre.findOne({
        _id: req.params.id,
        companyId: req.user.companyId,
      }).session(session);

      if (!tyre) {
        throw {
          status: 404,
          message: "Tyre not found",
        };
      }

      if (tyre.status !== "removed") {
        throw {
          status: 400,
          message: "Remove tyre before repair or retread",
        };
      }

      tyre.status = action;

      if (action === "retread") {
        tyre.tyreType = "retreaded";
      }

      await tyre.save({ session });

      await addHistory(
        tyre,
        action,
        {
          actionDate,
          cost: Number(cost),
          reason,
          remarks,
        },
        req.user.userId,
        session,
      );
    });

    return res.status(200).json({
      success: true,
      message: `Tyre ${action} recorded successfully`,
      data: tyre,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }

    return sendError(res, error);
  } finally {
    await session.endSession();
  }
};

const repairTyre = serviceTyre("repair");
const retreadTyre = serviceTyre("retread");

// -------------------------------------------
// RETURN TO STOCK
// -------------------------------------------

const returnToStock = async (req, res) => {
  const { actionDate, remarks } = req.body;

  if (!isValidId(req.params.id) || !isValidDate(actionDate)) {
    return res.status(400).json({
      success: false,
      message: "Valid tyre and date required",
    });
  }

  const session = await mongoose.startSession();

  try {
    let tyre;

    await session.withTransaction(async () => {
      tyre = await Tyre.findOne({
        _id: req.params.id,
        companyId: req.user.companyId,
      }).session(session);

      if (!tyre) {
        throw {
          status: 404,
          message: "Tyre not found",
        };
      }

      if (!["removed", "repair", "retread"].includes(tyre.status)) {
        throw {
          status: 400,
          message: "Tyre cannot be returned to stock",
        };
      }

      tyre.status = "in_stock";
      await tyre.save({ session });

      await addHistory(
        tyre,
        "returned_to_stock",
        { actionDate, remarks },
        req.user.userId,
        session,
      );
    });

    return res.status(200).json({
      success: true,
      message: "Tyre returned to stock",
      data: tyre,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }

    return sendError(res, error);
  } finally {
    await session.endSession();
  }
};

// -------------------------------------------
// SCRAP TYRE
// -------------------------------------------

const scrapTyre = async (req, res) => {
  const { scrapDate, reason, remarks } = req.body;

  if (
    !isValidId(req.params.id) ||
    !isValidDate(scrapDate) ||
    typeof reason !== "string" ||
    !reason.trim()
  ) {
    return res.status(400).json({
      success: false,
      message: "Valid scrap date and reason required",
    });
  }

  const session = await mongoose.startSession();

  try {
    let tyre;

    await session.withTransaction(async () => {
      tyre = await Tyre.findOne({
        _id: req.params.id,
        companyId: req.user.companyId,
      }).session(session);

      if (!tyre) {
        throw {
          status: 404,
          message: "Tyre not found",
        };
      }

      if (!["in_stock", "removed", "repair", "retread"].includes(tyre.status)) {
        throw {
          status: 400,
          message: "Fitted or scrapped tyre cannot be scrapped directly",
        };
      }

      tyre.status = "scrapped";
      tyre.vehicleId = null;
      tyre.position = null;
      tyre.fittingDate = null;
      tyre.fittingOdometer = null;

      await tyre.save({ session });

      await addHistory(
        tyre,
        "scrapped",
        {
          actionDate: scrapDate,
          reason,
          remarks,
        },
        req.user.userId,
        session,
      );
    });

    return res.status(200).json({
      success: true,
      message: "Tyre scrapped successfully",
      data: tyre,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }

    return sendError(res, error);
  } finally {
    await session.endSession();
  }
};

// -------------------------------------------
// TYRE HISTORY
// -------------------------------------------

const getTyreHistory = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid tyre ID",
      });
    }

    const tyre = await Tyre.findOne({
      _id: req.params.id,
      companyId: req.user.companyId,
    });

    if (!tyre) {
      return res.status(404).json({
        success: false,
        message: "Tyre not found",
      });
    }

    const history = await TyreHistory.find({
      companyId: req.user.companyId,
      tyreId: tyre._id,
    })
      .populate("vehicleId", "vehicleNumber")
      .populate("performedBy", "name role")
      .sort({
        actionDate: 1,
        createdAt: 1,
      });

    return res.status(200).json({
      success: true,
      tyreNumber: tyre.tyreNumber,
      count: history.length,
      data: history,
    });
  } catch (error) {
    return sendError(res, error);
  }
};

module.exports = {
  createTyre,
  getTyres,
  getTyreById,
  updateTyre,
  fitTyre,
  removeTyre,
  repairTyre,
  retreadTyre,
  returnToStock,
  scrapTyre,
  getTyreHistory,
};
