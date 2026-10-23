const AdvanceMemo = require("../models/AdvanceMemo");
const Trip = require("../models/Trip");
const Vehicle = require("../models/Vehicle");
const Driver = require("../models/Driver");

// 1. Create Advance Memo
const createAdvanceMemo = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(400).json({ success: false, message: "Company is required" });
    }

    const {
      memoNumber,
      date,
      partyId,
      partyName,
      fromLocation,
      toLocation,
      vehicleId,
      truckNumber,
      driverId,
      driverName,
      driverPhone,
      guaranteeWeight,
      totalFreight,
      advance,
      remarks,
      ownerType,
      brokerName,
    } = req.body;

    // Auto-generate memoNumber if not passed
    let finalMemoNumber = memoNumber ? String(memoNumber).trim().toUpperCase() : "";
    if (!finalMemoNumber) {
      const lastMemo = await AdvanceMemo.findOne({ companyId }).sort({ createdAt: -1 });
      if (lastMemo && !isNaN(parseInt(lastMemo.memoNumber, 10))) {
        finalMemoNumber = String(parseInt(lastMemo.memoNumber, 10) + 1);
      } else {
        finalMemoNumber = "985";
      }
    }

    // Check duplicate
    const existing = await AdvanceMemo.findOne({ companyId, memoNumber: finalMemoNumber });
    if (existing) {
      return res.status(409).json({ success: false, message: `Advance Memo #${finalMemoNumber} already exists` });
    }

    const freightVal = Number(totalFreight) || 0;
    const advanceVal = Number(advance) || 0;
    const balanceVal = freightVal - advanceVal;
    const normalizedOwnerType =
      ownerType === "market" ? "market" : "company";

    const newMemo = await AdvanceMemo.create({
      companyId,
      memoNumber: finalMemoNumber,
      date: date || new Date(),
      partyId: partyId || null,
      partyName: partyName?.trim() || "Cash Party",
      fromLocation: fromLocation?.trim() || "",
      toLocation: toLocation?.trim() || "",
      vehicleId: vehicleId || null,
      truckNumber: truckNumber?.trim().toUpperCase() || "",
      driverId: driverId || null,
      driverName: driverName?.trim() || "",
      driverPhone: driverPhone?.trim() || "",
      guaranteeWeight: guaranteeWeight?.trim() || "20 Feet",
      totalFreight: freightVal,
      advance: advanceVal,
      balance: balanceVal,
      remarks: remarks?.trim() || "",
      ownerType: normalizedOwnerType,
      brokerName: brokerName?.trim() || "",
      status: "pending",
      createdBy: req.user?._id || null,
    });

    return res.status(201).json({
      success: true,
      message: `Advance Memo #${finalMemoNumber} created successfully`,
      data: newMemo,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Get All Advance Memos
const getAdvanceMemos = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(400).json({ success: false, message: "Company is required" });
    }

    const { search, status, ownerType } = req.query;
    const query = { companyId };

    if (status) {
      query.status = status;
    }

    if (ownerType) {
      query.ownerType = ownerType;
    }

    if (search) {
      const regex = new RegExp(search.trim(), "i");
      query.$or = [
        { memoNumber: regex },
        { partyName: regex },
        { truckNumber: regex },
        { driverPhone: regex },
        { driverName: regex },
        { fromLocation: regex },
        { toLocation: regex },
        { brokerName: regex },
      ];
    }

    const memos = await AdvanceMemo.find(query)
      .populate("partyId", "name phone city")
      .populate("vehicleId", "vehicleNumber vehicleType ownership")
      .populate("driverId", "name phone licenseNumber")
      .sort({ date: -1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: memos.length,
      data: memos,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Get Advance Memo By ID
const getAdvanceMemoById = async (req, res) => {
  try {
    const memo = await AdvanceMemo.findOne({
      _id: req.params.id,
      companyId: req.user?.companyId,
    })
      .populate("partyId")
      .populate("vehicleId")
      .populate("driverId")
      .populate("tripId");

    if (!memo) {
      return res.status(404).json({ success: false, message: "Advance Memo not found" });
    }

    return res.status(200).json({ success: true, data: memo });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 4. Update Advance Memo
const updateAdvanceMemo = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const memo = await AdvanceMemo.findOne({ _id: req.params.id, companyId });

    if (!memo) {
      return res.status(404).json({ success: false, message: "Advance Memo not found" });
    }

    const fields = [
      "date",
      "partyId",
      "partyName",
      "fromLocation",
      "toLocation",
      "vehicleId",
      "truckNumber",
      "driverId",
      "driverName",
      "driverPhone",
      "guaranteeWeight",
      "totalFreight",
      "advance",
      "remarks",
      "ownerType",
      "brokerName",
      "status",
    ];

    fields.forEach((k) => {
      if (req.body[k] !== undefined) {
        if (k === "ownerType") {
          memo[k] = req.body[k] === "market" ? "market" : "company";
        } else {
          memo[k] = req.body[k];
        }
      }
    });

    if (req.body.totalFreight !== undefined || req.body.advance !== undefined) {
      memo.balance = (Number(memo.totalFreight) || 0) - (Number(memo.advance) || 0);
    }

    await memo.save();

    return res.status(200).json({
      success: true,
      message: "Advance Memo updated successfully",
      data: memo,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 5. Delete Advance Memo
const deleteAdvanceMemo = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const memo = await AdvanceMemo.findOneAndDelete({ _id: req.params.id, companyId });

    if (!memo) {
      return res.status(404).json({ success: false, message: "Advance Memo not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Advance Memo deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 6. Convert Advance Memo to Trip
const convertToTrip = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const memo = await AdvanceMemo.findOne({ _id: req.params.id, companyId });

    if (!memo) {
      return res.status(404).json({ success: false, message: "Advance Memo not found" });
    }

    // Auto trip number
    let tripNumber = `TRIP-${memo.memoNumber}`;
    const existing = await Trip.findOne({ companyId, tripNumber });
    if (existing) {
      tripNumber = `TRIP-${memo.memoNumber}-${Date.now().toString().slice(-4)}`;
    }

    const newTrip = await Trip.create({
      companyId,
      tripNumber,
      vehicleId: memo.vehicleId || null,
      truckNumber: memo.truckNumber || "",
      driverId: memo.driverId || null,
      driverName: memo.driverName || "",
      driverPhone: memo.driverPhone || "",
      partyName: memo.partyName || "",
      fromCity: memo.fromLocation || "",
      toCity: memo.toLocation || "",
      containerSize: memo.guaranteeWeight || "20 Feet",
      rate: memo.totalFreight || 0,
      advanceAmount: memo.advance || 0,
      balanceAmount: memo.balance || 0,
      ownerType: memo.ownerType || "company",
      ownerName: memo.ownerType === "company" ? "BHUMI CONTAINER SERVICE" : (memo.brokerName || "MARKET"),
      brokerName: memo.brokerName || "",
      advanceMemoId: memo._id,
      advanceMemoNumber: memo.memoNumber,
      dispatchDate: memo.date || new Date(),
      remarks: memo.remarks || `Advance Memo #${memo.memoNumber} | Party: ${memo.partyName} | Freight: ₹${memo.totalFreight} | Adv: ₹${memo.advance}`,
      status: "dispatched",
      createdBy: req.user?._id || null,
    });

    memo.status = "dispatched";
    memo.tripId = newTrip._id;
    await memo.save();

    return res.status(200).json({
      success: true,
      message: `Trip ${tripNumber} created from Advance Memo #${memo.memoNumber}`,
      data: { memo, trip: newTrip },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createAdvanceMemo,
  getAdvanceMemos,
  getAdvanceMemoById,
  updateAdvanceMemo,
  deleteAdvanceMemo,
  convertToTrip,
};
