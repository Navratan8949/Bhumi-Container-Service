const mongoose = require("mongoose");

const Trip = require("../models/Trip");
const LRBilty = require("../models/LRBilty");
const Vehicle = require("../models/Vehicle");
const Driver = require("../models/Driver");
const Customer = require("../models/Customer");
const AdvanceMemo = require("../models/AdvanceMemo");
const Vendor = require("../models/Vendor");
const CustomerInvoice = require("../models/CustomerInvoice");
const VendorBill = require("../models/VendorBill");
const { getNextSequence } = require("../utils/sequenceService");

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

// =====================================================
// VALIDATE VEHICLE AND DRIVER
// =====================================================
const validateVehicleAndDriver = async ({ companyId, vehicleId, driverId }) => {
  const vehicle = await Vehicle.findOne({
    _id: vehicleId,
    companyId,
  });

  if (!vehicle) {
    return {
      error: {
        status: 404,
        message: "Vehicle not found in this company",
      },
    };
  }

  const driver = await Driver.findOne({
    _id: driverId,
    companyId,
  });

  if (!driver) {
    return {
      error: {
        status: 404,
        message: "Driver not found in this company",
      },
    };
  }

  return { vehicle, driver };
};

// =====================================================
// GET LR STATUS FROM TRIPS
// =====================================================
const getLRStatusFromTrips = async (companyId, lrBiltyId) => {
  if (!lrBiltyId) return "generated";

  const trips = await Trip.find({
    companyId,
    lrBiltyId,
    status: { $ne: "cancelled" },
  })
    .select("status createdAt")
    .sort({ createdAt: -1 });

  if (!trips.length) return "generated";

  const latestTrip = trips[0];
  if (latestTrip.status === "delivered" || latestTrip.status === "completed") {
    return "delivered";
  }
  if (latestTrip.status === "dispatched" || latestTrip.status === "in_transit") {
    return "in_transit";
  }
  return "generated";
};

// =====================================================
// SYNC LR STATUS
// =====================================================
const syncTripRelatedStatuses = async (trip) => {
  try {
    if (trip.lrBiltyId) {
      const lrStatus = await getLRStatusFromTrips(trip.companyId, trip.lrBiltyId);
      await LRBilty.findOneAndUpdate(
        {
          _id: trip.lrBiltyId,
          companyId: trip.companyId,
        },
        {
          $set: { status: lrStatus },
        },
      );
    }

    // Sync Advance Memo status with Trip status
    if (trip.advanceMemoId || trip.advanceMemoNumber || trip._id) {
      let memoStatus = null;
      if (trip.status === "settled") {
        memoStatus = "settled";
      } else if (trip.status === "completed" || trip.status === "delivered") {
        memoStatus = "delivered";
      } else if (trip.status === "cancelled") {
        memoStatus = "pending";
      } else if (trip.status === "dispatched" || trip.status === "in_transit") {
        memoStatus = "dispatched";
      }

      if (memoStatus) {
        const memoOr = [];
        if (trip.advanceMemoId) memoOr.push({ _id: trip.advanceMemoId });
        if (trip._id) memoOr.push({ tripId: trip._id });
        if (trip.advanceMemoNumber) memoOr.push({ memoNumber: trip.advanceMemoNumber });

        if (memoOr.length > 0) {
          await AdvanceMemo.updateMany(
            {
              $or: memoOr,
              companyId: trip.companyId,
            },
            {
              $set: {
                status: memoStatus,
                tripId: trip._id,
              },
            }
          ).catch((e) => console.error("AdvanceMemo sync error:", e.message));
        }
      }
    }
  } catch (err) {
    console.error("syncTripRelatedStatuses error:", err.message);
  }
};

// =====================================================
// SYNC TRIP TO PARTY ACCOUNT (CUSTOMER INVOICE) & MARKET LORRY (VENDOR BILL)
// =====================================================
const syncTripToCustomerInvoiceAndVendorBill = async (trip) => {
  try {
    const companyId = trip.companyId;

    // 1. Sync to CustomerInvoice (Party Account / Sheet 4)
    const hasParty =
      trip.partyName ||
      (trip.partyRate && trip.partyRate > 0) ||
      (trip.rate && trip.rate > 0) ||
      trip.partyId;

    if (hasParty) {
      let inv = await CustomerInvoice.findOne({ companyId, tripId: trip._id });

      const pRate = Number(trip.partyRate || trip.rate || 0);
      const pAdv = Number(trip.partyAdvance || trip.advanceAmount || 0);
      const pAdvDate = trip.partyAdvanceDate || trip.advanceDate || null;
      const dMamul = Number(trip.debitMamul || 0);
      const dTds = Number(trip.debitTds || 0);
      const extra = Number(trip.extraExp || 0);
      const revAmt = Number(trip.balanceRevAmount || 0);
      const revDate = trip.balanceRevDate || null;
      const pBal =
        trip.partyBalance !== undefined && trip.partyBalance !== null
          ? Number(trip.partyBalance)
          : Math.max(0, pRate - pAdv - dMamul - dTds);
      const totBal =
        trip.totalBalance !== undefined && trip.totalBalance !== null
          ? Number(trip.totalBalance)
          : pBal + extra;
      const debitDue =
        trip.debit !== undefined && trip.debit !== null
          ? Number(trip.debit)
          : Math.max(0, totBal - revAmt);

      const pStatus =
        revAmt > 0 && debitDue === 0
          ? "paid"
          : pAdv > 0 || revAmt > 0
            ? "partial"
            : "unpaid";

      let finalPartyId =
        trip.partyId && isValidObjectId(trip.partyId) ? trip.partyId : null;
      let finalPartyName = (trip.partyName || "").toString().trim();
      if (isValidObjectId(finalPartyName)) {
        if (!finalPartyId) finalPartyId = finalPartyName;
        finalPartyName = "";
      }
      if (finalPartyId && (!finalPartyName || isValidObjectId(finalPartyName))) {
        const pDoc = await Customer.findById(finalPartyId);
        if (pDoc?.name || pDoc?.customerName) finalPartyName = (pDoc.name || pDoc.customerName).trim();
      } else if (!finalPartyId && finalPartyName) {
        const pDoc = await Customer.findOne({ name: finalPartyName, companyId });
        if (pDoc?._id) finalPartyId = pDoc._id;
      }

      if (!inv) {
        let invNum = trip.tripNumber
          ? `INV-${trip.tripNumber.replace(/^TRIP-?/i, "")}`
          : "";
        const exists = invNum
          ? await CustomerInvoice.findOne({ companyId, invoiceNumber: invNum })
          : null;
        if (!invNum || exists) {
          invNum = await getNextSequence(companyId, "customer-invoices");
        }

        await CustomerInvoice.create({
          companyId,
          invoiceNumber: invNum,
          invoiceDate: trip.dispatchDate || new Date(),
          tripId: trip._id,
          partyId: finalPartyId,
          customerName: finalPartyName,
          partyName: finalPartyName,
          vehicleId: trip.vehicleId || null,
          containerSize: trip.containerSize || "20F",
          fromLocation: trip.fromCity || "",
          toLocation: trip.toCity || "",
          freightRate: pRate,
          freightAmount: pRate,
          advanceReceived: pAdv,
          advanceDate: pAdvDate,
          bankAccountName: trip.partyBank || "",
          munshiyanaML: dMamul,
          tdsAmount: dTds,
          otherCharges: extra,
          extraExpenses: Array.isArray(trip.extraExpenses) ? trip.extraExpenses : [],
          taxableAmount: pRate + extra,
          grandTotal: pRate + extra,
          paidAmount: revAmt,
          paymentDate: revDate,
          outstandingAmount: debitDue,
          paymentStatus: pStatus,
          status: "issued",
        });
      } else {
        if (finalPartyId) inv.partyId = finalPartyId;
        if (finalPartyName) {
          inv.customerName = finalPartyName;
          inv.partyName = finalPartyName;
        }
        if (trip.vehicleId) inv.vehicleId = trip.vehicleId;
        inv.containerSize = trip.containerSize || inv.containerSize || "20F";
        inv.fromLocation = trip.fromCity || inv.fromLocation || "";
        inv.toLocation = trip.toCity || inv.toLocation || "";
        inv.freightRate = pRate;
        inv.freightAmount = pRate;
        inv.advanceReceived = pAdv;
        inv.advanceDate = pAdvDate;
        inv.bankAccountName = trip.partyBank || inv.bankAccountName || "";
        inv.munshiyanaML = dMamul;
        inv.tdsAmount = dTds;
        inv.otherCharges = extra;
        if (Array.isArray(trip.extraExpenses)) inv.extraExpenses = trip.extraExpenses;
        inv.taxableAmount = pRate + extra;
        inv.grandTotal = pRate + extra;
        inv.paidAmount = revAmt;
        inv.paymentDate = revDate;
        inv.outstandingAmount = debitDue;
        inv.paymentStatus = pStatus;
        await inv.save();
      }
    }

    // 2. Sync to VendorBill (Market Lorry Account / Sheet 3)
    const isMarketLorry =
      String(trip.ownerType || "").toLowerCase() === "market" ||
      (trip.ownerName &&
        trip.ownerName.trim() &&
        !trip.ownerName.toLowerCase().includes("bhumi"));

    if (isMarketLorry) {
      let vb = await VendorBill.findOne({ companyId, tripId: trip._id });

      const hireRate = Number(
        trip.ownerRate !== undefined && trip.ownerRate !== null
          ? trip.ownerRate
          : trip.rate || 0,
      );
      const hireAdv = Number(trip.advanceAmount || 0);
      const catting = Number(trip.catting || 0);
      const lorryExtra = Number(trip.lorryExtraExp || 0);
      const balAmt =
        trip.balanceAmount !== undefined && trip.balanceAmount !== null
          ? Number(trip.balanceAmount)
          : Math.max(0, (hireRate + lorryExtra) - hireAdv - catting);
      const isSettled = trip.status === "settled" || !!trip.balDate;
      const paidAmt = isSettled ? (hireRate + lorryExtra) - catting : hireAdv;
      const outstanding = isSettled ? 0 : balAmt;
      const paymentStatus = isSettled ? "paid" : hireAdv > 0 ? "partial" : "unpaid";

      let finalVendorId = null;
      const vName = (trip.ownerName || trip.brokerName || "Market Broker").trim();
      if (vName) {
        const vDoc = await Vendor.findOne({
          companyId,
          name: { $regex: new RegExp(`^${vName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
        });
        if (vDoc?._id) finalVendorId = vDoc._id;
      }

      let truckNo = trip.truckNumber || "";
      if (!truckNo && trip.vehicleId) {
        const vehDoc = await Vehicle.findById(trip.vehicleId);
        if (vehDoc?.vehicleNumber) truckNo = vehDoc.vehicleNumber;
      }

      if (!vb) {
        let billNum = trip.tripNumber
          ? `VB-${trip.tripNumber.replace(/^TRIP-?/i, "")}`
          : "";
        const exists = billNum
          ? await VendorBill.findOne({ companyId, billNumber: billNum })
          : null;
        if (!billNum || exists) {
          billNum = await getNextSequence(companyId, "vendor-bills");
        }

        await VendorBill.create({
          companyId,
          billNumber: billNum,
          billDate: trip.dispatchDate || new Date(),
          tripId: trip._id,
          vendorId: finalVendorId,
          vendorName: vName,
          vehicleId: trip.vehicleId || null,
          vehicleNumber: truckNo,
          partyName: trip.partyName || "",
          containerSize: trip.containerSize || "20F",
          fromLocation: trip.fromCity || "",
          toLocation: trip.toCity || "",
          deliveryDate: trip.deliveryDate || null,
          podDate: trip.podDate || "",
          hireRate,
          hireAmount: hireRate,
          advanceDate: trip.advanceDate || null,
          advanceBank: trip.advanceBank || "",
          catting,
          balDate: trip.balDate || null,
          advanceCash: hireAdv,
          otherCharges: lorryExtra,
          extraExpense: lorryExtra,
          extraExpenses: Array.isArray(trip.lorryExtraExpenses) ? trip.lorryExtraExpenses : [],
          taxableAmount: hireRate + lorryExtra,
          grandTotal: hireRate + lorryExtra,
          paidAmount: paidAmt,
          outstandingAmount: outstanding,
          paymentStatus,
          status: "issued",
        });
      } else {
        if (finalVendorId) vb.vendorId = finalVendorId;
        vb.vendorName = vName;
        if (trip.vehicleId) vb.vehicleId = trip.vehicleId;
        if (truckNo) vb.vehicleNumber = truckNo;
        vb.partyName = trip.partyName || vb.partyName || "";
        vb.containerSize = trip.containerSize || vb.containerSize || "20F";
        vb.fromLocation = trip.fromCity || vb.fromLocation || "";
        vb.toLocation = trip.toCity || vb.toLocation || "";
        vb.deliveryDate = trip.deliveryDate || vb.deliveryDate;
        vb.podDate = trip.podDate || vb.podDate || "";
        vb.hireRate = hireRate;
        vb.hireAmount = hireRate;
        vb.advanceDate = trip.advanceDate || vb.advanceDate;
        vb.advanceBank = trip.advanceBank || vb.advanceBank || "";
        vb.catting = catting;
        vb.balDate = trip.balDate || vb.balDate;
        vb.advanceCash = hireAdv;
        vb.otherCharges = lorryExtra;
        vb.extraExpense = lorryExtra;
        if (Array.isArray(trip.lorryExtraExpenses)) vb.extraExpenses = trip.lorryExtraExpenses;
        vb.taxableAmount = hireRate + lorryExtra;
        vb.grandTotal = hireRate + lorryExtra;
        vb.paidAmount = paidAmt;
        vb.outstandingAmount = outstanding;
        vb.paymentStatus = paymentStatus;
        await vb.save();
      }
    }
  } catch (err) {
    console.error("syncTripToCustomerInvoiceAndVendorBill error:", err.message);
  }
};

// =====================================================
// CREATE TRIP
// =====================================================
const createTrip = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const createdBy = req.user.userId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company is required",
      });
    }

    let {
      tripNumber,
      bookingId,
      lrBiltyId,
      containerNumber,
      containerSize,
      containerType,
      customsSealNumber,
      shippingLine,
      vehicleId,
      driverId,
      dispatchDate,
      tripStartDate,
      deliveryDate,
      fromCity,
      toCity,
      fromCityId,
      toCityId,
      startingOdometer,
      endingOdometer,
      remarks,
      partyName,
      ownerName,
      ownerType,
      rate,
      advanceAmount,
      advanceDate,
      balanceAmount,
      podDate,
      podStatus,
    } = req.body;

    if (!tripNumber || !tripNumber.toString().trim()) {
      tripNumber = await getNextSequence(companyId, "trips");
    }

    const normalizedTripNumber = tripNumber.toString().trim().toUpperCase();

    if (!vehicleId || !driverId) {
      return res.status(400).json({
        success: false,
        message: "vehicleId and driverId are required",
      });
    }

    if (!isValidObjectId(vehicleId) || !isValidObjectId(driverId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vehicleId or driverId",
      });
    }

    // Check duplicate trip number
    const existingTripNumber = await Trip.findOne({
      companyId,
      tripNumber: normalizedTripNumber,
    });

    if (existingTripNumber) {
      return res.status(409).json({
        success: false,
        message: "Trip number already exists",
      });
    }

    // Validate Vehicle & Driver
    const vehicleDriverResult = await validateVehicleAndDriver({
      companyId,
      vehicleId,
      driverId,
    });

    if (vehicleDriverResult.error) {
      return res.status(vehicleDriverResult.error.status).json({
        success: false,
        message: vehicleDriverResult.error.message,
      });
    }

    const dispatch = parseDate(dispatchDate) || new Date();

    // Odometer
    let startOdo = null;
    if (startingOdometer !== undefined && startingOdometer !== null && startingOdometer !== "") {
      startOdo = Number(startingOdometer);
      if (Number.isNaN(startOdo) || startOdo < 0) {
        return res.status(400).json({
          success: false,
          message: "Starting odometer must be a non-negative number",
        });
      }
    }

    let endOdo = null;
    if (endingOdometer !== undefined && endingOdometer !== null && endingOdometer !== "") {
      endOdo = Number(endingOdometer);
      if (Number.isNaN(endOdo) || endOdo < 0) {
        return res.status(400).json({
          success: false,
          message: "Ending odometer must be a non-negative number",
        });
      }
    }

    // Update vehicle's assigned driver
    await Vehicle.updateOne(
      { _id: vehicleId, companyId },
      { $set: { driverId } },
    );

    let finalPartyId = req.body.partyId && isValidObjectId(req.body.partyId) ? req.body.partyId : null;
    let finalPartyName = (partyName || "").toString().trim();
    if (isValidObjectId(finalPartyName)) {
      if (!finalPartyId) finalPartyId = finalPartyName;
      finalPartyName = "";
    }
    if (finalPartyId && (!finalPartyName || isValidObjectId(finalPartyName))) {
      const pDoc = await Customer.findById(finalPartyId);
      if (pDoc?.name || pDoc?.customerName) finalPartyName = (pDoc.name || pDoc.customerName).trim();
    } else if (!finalPartyId && finalPartyName) {
      const pDoc = await Customer.findOne({ name: finalPartyName, companyId });
      if (pDoc?._id) finalPartyId = pDoc._id;
    }

    let finalOwnerName = (ownerName || "").toString().trim();
    if (isValidObjectId(finalOwnerName)) {
      finalOwnerName = "";
    }
    if (!finalOwnerName) {
      finalOwnerName = String(ownerType || "").toLowerCase() === "market"
        ? (req.body.brokerName || "Market Broker")
        : "BHUMI CONTAINER SERVICE";
    }

    const newTrip = await Trip.create({
      companyId,
      tripNumber: normalizedTripNumber,
      bookingId: bookingId && isValidObjectId(bookingId) ? bookingId : null,
      lrBiltyId: lrBiltyId && isValidObjectId(lrBiltyId) ? lrBiltyId : null,

      containerNumber: (containerNumber || "").toString().trim().toUpperCase(),
      containerSize: containerSize || "40_ft_hc",
      containerType: containerType || "standard",
      customsSealNumber: (customsSealNumber || "").toString().trim().toUpperCase(),
      shippingLine: (shippingLine || "").toString().trim(),

      vehicleId,
      driverId,
      dispatchDate: dispatch,
      transitDays: (() => {
        const rawDays = req.body.transitDays !== undefined && req.body.transitDays !== "" ? Number(req.body.transitDays) : 0;
        const exp = req.body.expectedDeliveryDate ? parseDate(req.body.expectedDeliveryDate) : null;
        if ((!rawDays || rawDays <= 0) && dispatch && exp) {
          const diffDays = Math.round((new Date(exp) - new Date(dispatch)) / (1000 * 60 * 60 * 24));
          return Math.max(0, diffDays);
        }
        return rawDays;
      })(),
      expectedDeliveryDate: (() => {
        const exp = req.body.expectedDeliveryDate ? parseDate(req.body.expectedDeliveryDate) : null;
        const rawDays = req.body.transitDays !== undefined && req.body.transitDays !== "" ? Number(req.body.transitDays) : 0;
        if (!exp && dispatch && rawDays > 0) {
          const d = new Date(dispatch);
          d.setDate(d.getDate() + rawDays);
          return d;
        }
        return exp;
      })(),
      tripStartDate: parseDate(tripStartDate),
      deliveryDate: parseDate(deliveryDate),

      fromCity: fromCity || "",
      toCity: toCity || "",
      fromCityId: fromCityId && isValidObjectId(fromCityId) ? fromCityId : null,
      toCityId: toCityId && isValidObjectId(toCityId) ? toCityId : null,

      startingOdometer: startOdo,
      endingOdometer: endOdo,
      status: "dispatched",
      partyId: finalPartyId,
      partyName: finalPartyName,
      ownerName: finalOwnerName,
      ownerType: String(ownerType || "").toLowerCase() === "market" ? "market" : "company",
      rate: Number(req.body.ownerRate !== undefined ? req.body.ownerRate : (rate || 0)),
      ownerRate: Number(req.body.ownerRate !== undefined ? req.body.ownerRate : (rate || 0)),
      advanceAmount: Number(advanceAmount) || 0,
      advanceBank: (req.body.advanceBank || req.body.advBank || "").toString().trim(),
      advanceDate: parseDate(advanceDate),
      catting: Number(req.body.catting) || 0,
      lorryExtraExp: (() => {
        const lList = Array.isArray(req.body.lorryExtraExpenses) ? req.body.lorryExtraExpenses : [];
        if (req.body.lorryExtraExp !== undefined && req.body.lorryExtraExp !== "") return Number(req.body.lorryExtraExp) || 0;
        return lList.reduce((acc, curr) => acc + (Number(curr?.amount) || 0), 0);
      })(),
      lorryExtraExpenses: Array.isArray(req.body.lorryExtraExpenses) ? req.body.lorryExtraExpenses : [],
      balanceAmount: balanceAmount !== undefined && balanceAmount !== ""
        ? Number(balanceAmount)
        : Math.max(0, (Number(req.body.ownerRate !== undefined ? req.body.ownerRate : (rate || 0)) + (Number(req.body.lorryExtraExp) || (Array.isArray(req.body.lorryExtraExpenses) ? req.body.lorryExtraExpenses.reduce((acc, curr) => acc + (Number(curr?.amount) || 0), 0) : 0))) - Number(advanceAmount || 0) - Number(req.body.catting || 0)),
      balDate: parseDate(req.body.balDate || req.body.balanceDate),

      partyRate: Number(req.body.partyRate) || 0,
      partyAdvance: Number(req.body.partyAdvance) || 0,
      partyAdvanceDate: parseDate(req.body.partyAdvanceDate || req.body.partyAdvDate),
      debitMamul: Number(req.body.debitMamul) || 0,
      debitTds: Number(req.body.debitTds) || 0,
      partyBank: (req.body.partyBank || req.body.bank || "").toString().trim(),
      partyBalance: (() => {
        const pRate = Number(req.body.partyRate) || 0;
        const pAdv = Number(req.body.partyAdvance) || 0;
        const dMamul = Number(req.body.debitMamul) || 0;
        const dTds = Number(req.body.debitTds) || 0;
        return req.body.partyBalance !== undefined && req.body.partyBalance !== ""
          ? Number(req.body.partyBalance)
          : Math.max(0, pRate - pAdv - dMamul - dTds);
      })(),
      extraExp: (() => {
        const pList = Array.isArray(req.body.extraExpenses) ? req.body.extraExpenses : [];
        if (req.body.extraExp !== undefined && req.body.extraExp !== "") return Number(req.body.extraExp) || 0;
        return pList.reduce((acc, curr) => acc + (Number(curr?.amount) || 0), 0);
      })(),
      extraExpenses: Array.isArray(req.body.extraExpenses) ? req.body.extraExpenses : [],
      totalBalance: (() => {
        const pRate = Number(req.body.partyRate) || 0;
        const pAdv = Number(req.body.partyAdvance) || 0;
        const dMamul = Number(req.body.debitMamul) || 0;
        const dTds = Number(req.body.debitTds) || 0;
        const pBal = req.body.partyBalance !== undefined && req.body.partyBalance !== ""
          ? Number(req.body.partyBalance)
          : Math.max(0, pRate - pAdv - dMamul - dTds);
        const pList = Array.isArray(req.body.extraExpenses) ? req.body.extraExpenses : [];
        const extra = req.body.extraExp !== undefined && req.body.extraExp !== ""
          ? Number(req.body.extraExp) || 0
          : pList.reduce((acc, curr) => acc + (Number(curr?.amount) || 0), 0);
        return req.body.totalBalance !== undefined && req.body.totalBalance !== ""
          ? Number(req.body.totalBalance)
          : (pBal + extra);
      })(),
      balanceRevAmount: Number(req.body.balanceRevAmount) || 0,
      balanceRevDate: parseDate(req.body.balanceRevDate),
      debit: (() => {
        const pRate = Number(req.body.partyRate) || 0;
        const pAdv = Number(req.body.partyAdvance) || 0;
        const dMamul = Number(req.body.debitMamul) || 0;
        const dTds = Number(req.body.debitTds) || 0;
        const pBal = req.body.partyBalance !== undefined && req.body.partyBalance !== ""
          ? Number(req.body.partyBalance)
          : Math.max(0, pRate - pAdv - dMamul - dTds);
        const pList = Array.isArray(req.body.extraExpenses) ? req.body.extraExpenses : [];
        const extra = req.body.extraExp !== undefined && req.body.extraExp !== ""
          ? Number(req.body.extraExp) || 0
          : pList.reduce((acc, curr) => acc + (Number(curr?.amount) || 0), 0);
        const tot = pBal + extra;
        const rev = Number(req.body.balanceRevAmount) || 0;
        return req.body.debit !== undefined && req.body.debit !== ""
          ? Number(req.body.debit)
          : Math.max(0, tot - rev);
      })(),
      podDate: (podDate || "").toString().trim(),
      podStatus: (podStatus || "pending").toString().trim(),
      remarks: (remarks || "").toString().trim(),
      truckNumber: (req.body.truckNumber || vehicleDriverResult?.vehicle?.vehicleNumber || "").toString().trim().toUpperCase(),
      driverName: (req.body.driverName || vehicleDriverResult?.driver?.name || "").toString().trim(),
      driverPhone: (req.body.driverPhone || vehicleDriverResult?.driver?.phone || "").toString().trim(),
      brokerName: (req.body.brokerName || "").toString().trim(),
      advanceMemoId: req.body.advanceMemoId && isValidObjectId(req.body.advanceMemoId) ? req.body.advanceMemoId : null,
      advanceMemoNumber: (req.body.advanceMemoNumber || "").toString().trim(),
      createdBy: createdBy && isValidObjectId(createdBy) ? createdBy : null,
    });

    await syncTripRelatedStatuses(newTrip);

    if (newTrip.advanceMemoId) {
      await AdvanceMemo.findOneAndUpdate(
        { _id: newTrip.advanceMemoId, companyId },
        {
          $set: {
            status: "dispatched",
            tripId: newTrip._id,
            vehicleId: newTrip.vehicleId || undefined,
            truckNumber: newTrip.truckNumber || undefined,
            driverId: newTrip.driverId || undefined,
            driverName: newTrip.driverName || undefined,
            driverPhone: newTrip.driverPhone || undefined,
            ownerType: newTrip.ownerType || undefined,
            ownerName: newTrip.ownerName || undefined,
            brokerName: newTrip.brokerName || undefined,
          },
        }
      ).catch(() => {});
    }

    await syncTripToCustomerInvoiceAndVendorBill(newTrip);

    const populatedTrip = await Trip.findOne({
      _id: newTrip._id,
      companyId,
    })
      .populate("vehicleId", "vehicleNumber vehicleType ownerType ownerName")
      .populate("driverId", "name phone licenseNumber status")
      .populate("lrBiltyId", "lrNumber lrDate status containerNumber consignorName consigneeName partyName fromCity toCity article");

    return res.status(201).json({
      success: true,
      message: "Trip created and dispatched successfully",
      data: populatedTrip,
    });
  } catch (error) {
    console.error("Create trip error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create trip",
      error: error.message,
    });
  }
};

// =====================================================
// GET ALL TRIPS
// =====================================================
const getTrips = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const { vehicleId, driverId, status, fromDate, toDate } = req.query;

    const filter = {
      companyId,
    };

    if (vehicleId && isValidObjectId(vehicleId)) {
      filter.vehicleId = vehicleId;
    }

    if (driverId && isValidObjectId(driverId)) {
      filter.driverId = driverId;
    }

    if (status) {
      filter.status = status;
    }

    if (fromDate || toDate) {
      filter.dispatchDate = {};
      if (fromDate) {
        const start = parseDate(fromDate);
        if (start) {
          start.setHours(0, 0, 0, 0);
          filter.dispatchDate.$gte = start;
        }
      }
      if (toDate) {
        const end = parseDate(toDate);
        if (end) {
          end.setHours(23, 59, 59, 999);
          filter.dispatchDate.$lte = end;
        }
      }
    }

    const trips = await Trip.find(filter)
      .populate("vehicleId", "vehicleNumber vehicleType ownerType ownerName")
      .populate("driverId", "name phone licenseNumber status")
      .populate("partyId", "name customerName phone")
      .populate("lrBiltyId", "lrNumber lrDate status containerNumber customsSealNumber shippingLine consignorName consigneeName partyName fromCity toCity article quantity unit loadingWeight unloadingWeight")
      .populate("createdBy", "name email")
      .sort({
        dispatchDate: -1,
        createdAt: -1,
      });

    return res.status(200).json({
      success: true,
      count: trips.length,
      data: trips,
    });
  } catch (error) {
    console.error("Get trips error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch trips",
      error: error.message,
    });
  }
};

// =====================================================
// GET TRIP BY ID
// =====================================================
const getTripById = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const trip = await Trip.findOne({
      _id: req.params.id,
      companyId,
    })
      .populate("vehicleId", "vehicleNumber vehicleType ownerType ownerName")
      .populate("driverId", "name phone licenseNumber status")
      .populate("partyId", "name customerName phone")
      .populate("lrBiltyId", "lrNumber lrDate status containerNumber customsSealNumber shippingLine consignorName consigneeName partyName fromCity toCity article quantity unit loadingWeight unloadingWeight")
      .populate("createdBy", "name email");

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found in this company",
      });
    }

    return res.status(200).json({
      success: true,
      data: trip,
    });
  } catch (error) {
    console.error("Get trip by ID error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch trip",
      error: error.message,
    });
  }
};

// =====================================================
// DISPATCH TRIP
// =====================================================
const dispatchTrip = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const trip = await Trip.findOne({ _id: req.params.id, companyId });

    if (!trip) {
      return res.status(404).json({ success: false, message: "Trip not found" });
    }

    trip.status = "dispatched";
    if (!trip.tripStartDate) trip.tripStartDate = new Date();
    await trip.save();

    await syncTripRelatedStatuses(trip);

    return res.status(200).json({
      success: true,
      message: "Trip dispatched successfully",
      data: trip,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================
// START TRIP
// =====================================================
const startTrip = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const trip = await Trip.findOne({ _id: req.params.id, companyId });

    if (!trip) {
      return res.status(404).json({ success: false, message: "Trip not found" });
    }

    trip.status = "in_transit";
    if (!trip.tripStartDate) trip.tripStartDate = new Date();
    if (req.body.startingOdometer !== undefined) {
      trip.startingOdometer = Number(req.body.startingOdometer) || trip.startingOdometer;
    }
    await trip.save();

    await syncTripRelatedStatuses(trip);

    return res.status(200).json({
      success: true,
      message: "Trip marked in-transit",
      data: trip,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================
// DELIVER TRIP
// =====================================================
const deliverTrip = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const trip = await Trip.findOne({ _id: req.params.id, companyId });

    if (!trip) {
      return res.status(404).json({ success: false, message: "Trip not found" });
    }

    trip.status = "delivered";
    trip.deliveryDate = new Date();
    if (req.body.endingOdometer !== undefined) {
      trip.endingOdometer = Number(req.body.endingOdometer) || trip.endingOdometer;
    }
    await trip.save();

    await syncTripRelatedStatuses(trip);

    return res.status(200).json({
      success: true,
      message: "Trip marked delivered",
      data: trip,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================
// COMPLETE TRIP
// =====================================================
const completeTrip = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const trip = await Trip.findOne({ _id: req.params.id, companyId });

    if (!trip) {
      return res.status(404).json({ success: false, message: "Trip not found" });
    }

    trip.status = "completed";
    if (!trip.deliveryDate) trip.deliveryDate = new Date();
    if (req.body.endingOdometer !== undefined) {
      trip.endingOdometer = Number(req.body.endingOdometer) || trip.endingOdometer;
    }
    await trip.save();

    await syncTripRelatedStatuses(trip);

    return res.status(200).json({
      success: true,
      message: "Trip marked completed",
      data: trip,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================
// CANCEL TRIP
// =====================================================
const cancelTrip = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const trip = await Trip.findOne({ _id: req.params.id, companyId });

    if (!trip) {
      return res.status(404).json({ success: false, message: "Trip not found" });
    }

    trip.status = "cancelled";
    await trip.save();

    await syncTripRelatedStatuses(trip);

    return res.status(200).json({
      success: true,
      message: "Trip cancelled successfully",
      data: trip,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================
// UPDATE TRIP
// =====================================================
const updateTrip = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const trip = await Trip.findOne({ _id: req.params.id, companyId });

    if (!trip) {
      return res.status(404).json({ success: false, message: "Trip not found" });
    }

    const {
      containerNumber,
      containerSize,
      containerType,
      customsSealNumber,
      shippingLine,
      fromCity,
      toCity,
      startingOdometer,
      endingOdometer,
      dispatchDate,
      deliveryDate,
      status,
      remarks,
      partyName,
      ownerName,
      ownerType,
      rate,
      advanceAmount,
      advanceDate,
      balanceAmount,
      podDate,
      podStatus,
    } = req.body;

    if (containerNumber !== undefined) trip.containerNumber = containerNumber.toString().trim().toUpperCase();
    if (containerSize !== undefined) trip.containerSize = containerSize;
    if (containerType !== undefined) trip.containerType = containerType;
    if (customsSealNumber !== undefined) trip.customsSealNumber = customsSealNumber.toString().trim().toUpperCase();
    if (shippingLine !== undefined) trip.shippingLine = shippingLine.toString().trim();

    if (fromCity !== undefined) trip.fromCity = fromCity;
    if (toCity !== undefined) trip.toCity = toCity;

    if (startingOdometer !== undefined) trip.startingOdometer = Number(startingOdometer);
    if (endingOdometer !== undefined) trip.endingOdometer = Number(endingOdometer);

    if (req.body.partyId !== undefined) {
      trip.partyId = req.body.partyId && isValidObjectId(req.body.partyId) ? req.body.partyId : null;
    }
    if (partyName !== undefined) {
      let pName = partyName.toString().trim();
      if (isValidObjectId(pName)) {
        if (!trip.partyId) trip.partyId = pName;
        pName = "";
      }
      trip.partyName = pName;
    }
    if (trip.partyId && (!trip.partyName || isValidObjectId(trip.partyName))) {
      const pDoc = await Customer.findById(trip.partyId);
      if (pDoc?.name || pDoc?.customerName) trip.partyName = (pDoc.name || pDoc.customerName).trim();
    } else if (!trip.partyId && trip.partyName) {
      const pDoc = await Customer.findOne({ name: trip.partyName, companyId: trip.companyId });
      if (pDoc?._id) trip.partyId = pDoc._id;
    }

    if (ownerName !== undefined) {
      let oName = ownerName.toString().trim();
      if (isValidObjectId(oName)) oName = "";
      trip.ownerName = oName;
    }
    if (ownerType !== undefined) {
      trip.ownerType = String(ownerType).toLowerCase() === "market" ? "market" : "company";
    }
    if (!trip.ownerName) {
      trip.ownerName = trip.ownerType === "market"
        ? (trip.brokerName || "Market Broker")
        : "BHUMI CONTAINER SERVICE";
    }
    if (req.body.ownerRate !== undefined) {
      trip.ownerRate = Number(req.body.ownerRate) || 0;
      trip.rate = trip.ownerRate;
    } else if (rate !== undefined) {
      trip.rate = Number(rate) || 0;
      if (trip.ownerRate === undefined || trip.ownerRate === 0) trip.ownerRate = trip.rate;
    }
    if (advanceAmount !== undefined) trip.advanceAmount = Number(advanceAmount) || 0;
    if (req.body.advanceBank !== undefined || req.body.advBank !== undefined) {
      trip.advanceBank = (req.body.advanceBank || req.body.advBank || "").toString().trim();
    }
    if (advanceDate !== undefined) trip.advanceDate = parseDate(advanceDate);
    if (req.body.catting !== undefined) trip.catting = Number(req.body.catting) || 0;
    if (req.body.lorryExtraExpenses !== undefined) {
      trip.lorryExtraExpenses = Array.isArray(req.body.lorryExtraExpenses) ? req.body.lorryExtraExpenses : [];
    }
    if (req.body.lorryExtraExp !== undefined) {
      trip.lorryExtraExp = Number(req.body.lorryExtraExp) || 0;
    } else if (req.body.lorryExtraExpenses !== undefined && trip.lorryExtraExpenses.length > 0) {
      trip.lorryExtraExp = trip.lorryExtraExpenses.reduce((acc, curr) => acc + (Number(curr?.amount) || 0), 0);
    }
    if (balanceAmount !== undefined) {
      trip.balanceAmount = Number(balanceAmount);
    } else if (req.body.ownerRate !== undefined || rate !== undefined || advanceAmount !== undefined || req.body.catting !== undefined || req.body.lorryExtraExp !== undefined || req.body.lorryExtraExpenses !== undefined) {
      const oRate = trip.ownerRate !== undefined ? trip.ownerRate : (trip.rate || 0);
      const lExtra = trip.lorryExtraExp || 0;
      trip.balanceAmount = Math.max(0, (oRate + lExtra) - (trip.advanceAmount || 0) - (trip.catting || 0));
    }
    if (req.body.balDate !== undefined || req.body.balanceDate !== undefined) {
      trip.balDate = parseDate(req.body.balDate || req.body.balanceDate);
    }

    // Party Account fields
    if (req.body.partyRate !== undefined) trip.partyRate = Number(req.body.partyRate) || 0;
    if (req.body.partyAdvance !== undefined) trip.partyAdvance = Number(req.body.partyAdvance) || 0;
    if (req.body.partyAdvanceDate !== undefined || req.body.partyAdvDate !== undefined) {
      trip.partyAdvanceDate = parseDate(req.body.partyAdvanceDate || req.body.partyAdvDate);
    }
    if (req.body.debitMamul !== undefined) trip.debitMamul = Number(req.body.debitMamul) || 0;
    if (req.body.debitTds !== undefined) trip.debitTds = Number(req.body.debitTds) || 0;
    if (req.body.partyBank !== undefined || req.body.bank !== undefined) {
      trip.partyBank = (req.body.partyBank || req.body.bank || "").toString().trim();
    }
    if (req.body.partyBalance !== undefined) {
      trip.partyBalance = Number(req.body.partyBalance) || 0;
    } else if (req.body.partyRate !== undefined || req.body.partyAdvance !== undefined || req.body.debitMamul !== undefined || req.body.debitTds !== undefined) {
      trip.partyBalance = Math.max(0, (trip.partyRate || 0) - (trip.partyAdvance || 0) - (trip.debitMamul || 0) - (trip.debitTds || 0));
    }
    if (req.body.extraExpenses !== undefined) {
      trip.extraExpenses = Array.isArray(req.body.extraExpenses) ? req.body.extraExpenses : [];
    }
    if (req.body.extraExp !== undefined) {
      trip.extraExp = Number(req.body.extraExp) || 0;
    } else if (req.body.extraExpenses !== undefined && trip.extraExpenses.length > 0) {
      trip.extraExp = trip.extraExpenses.reduce((acc, curr) => acc + (Number(curr?.amount) || 0), 0);
    }
    if (req.body.totalBalance !== undefined) {
      trip.totalBalance = Number(req.body.totalBalance) || 0;
    } else {
      trip.totalBalance = (trip.partyBalance || 0) + (trip.extraExp || 0);
    }
    if (req.body.balanceRevAmount !== undefined) trip.balanceRevAmount = Number(req.body.balanceRevAmount) || 0;
    if (req.body.balanceRevDate !== undefined) trip.balanceRevDate = parseDate(req.body.balanceRevDate);
    if (req.body.debit !== undefined) {
      trip.debit = Number(req.body.debit) || 0;
    } else {
      trip.debit = Math.max(0, (trip.totalBalance || 0) - (trip.balanceRevAmount || 0));
    }
    if (podDate !== undefined) trip.podDate = podDate.toString().trim();
    if (podStatus !== undefined) trip.podStatus = podStatus.toString().trim();

    if (dispatchDate) trip.dispatchDate = new Date(dispatchDate);
    if (deliveryDate) trip.deliveryDate = new Date(deliveryDate);
    if (req.body.transitDays !== undefined) trip.transitDays = Number(req.body.transitDays) || 0;
    if (req.body.expectedDeliveryDate !== undefined) {
      trip.expectedDeliveryDate = req.body.expectedDeliveryDate ? new Date(req.body.expectedDeliveryDate) : null;
    }
    // Auto-calculate expectedDeliveryDate or transitDays if one is missing
    if (trip.dispatchDate && trip.transitDays > 0 && !trip.expectedDeliveryDate) {
      const d = new Date(trip.dispatchDate);
      d.setDate(d.getDate() + trip.transitDays);
      trip.expectedDeliveryDate = d;
    } else if (trip.dispatchDate && trip.expectedDeliveryDate && (!trip.transitDays || trip.transitDays <= 0)) {
      const diffDays = Math.round((new Date(trip.expectedDeliveryDate) - new Date(trip.dispatchDate)) / (1000 * 60 * 60 * 24));
      trip.transitDays = Math.max(0, diffDays);
    }
    if (req.body.driverId && isValidObjectId(req.body.driverId)) trip.driverId = req.body.driverId;
    if (req.body.vehicleId && isValidObjectId(req.body.vehicleId)) trip.vehicleId = req.body.vehicleId;
    if (status) trip.status = status;
    if (remarks !== undefined) trip.remarks = remarks;

    await trip.save();
    await syncTripRelatedStatuses(trip);
    await syncTripToCustomerInvoiceAndVendorBill(trip);

    if (trip.advanceMemoId) {
      await AdvanceMemo.findOneAndUpdate(
        { _id: trip.advanceMemoId, companyId },
        {
          $set: {
            vehicleId: trip.vehicleId || undefined,
            truckNumber: trip.truckNumber || undefined,
            driverId: trip.driverId || undefined,
            driverName: trip.driverName || undefined,
            driverPhone: trip.driverPhone || undefined,
            ownerType: trip.ownerType || undefined,
            ownerName: trip.ownerName || undefined,
            brokerName: trip.brokerName || undefined,
          },
        }
      ).catch(() => {});
    }

    return res.status(200).json({
      success: true,
      message: "Trip updated successfully",
      data: trip,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================
// DELETE TRIP
// =====================================================
const deleteTrip = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const trip = await Trip.findOne({ _id: req.params.id, companyId });

    if (!trip) {
      return res.status(404).json({ success: false, message: "Trip not found" });
    }

    await Trip.deleteOne({ _id: trip._id, companyId });
    await syncTripRelatedStatuses(trip);
    await CustomerInvoice.deleteOne({ companyId, tripId: trip._id }).catch(() => {});
    await VendorBill.deleteOne({ companyId, tripId: trip._id }).catch(() => {});

    return res.status(200).json({
      success: true,
      message: "Trip deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createTrip,
  getTrips,
  getTripById,
  dispatchTrip,
  startTrip,
  deliverTrip,
  completeTrip,
  cancelTrip,
  updateTrip,
  deleteTrip,
};
