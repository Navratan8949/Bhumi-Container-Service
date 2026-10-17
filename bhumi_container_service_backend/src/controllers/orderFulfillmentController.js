const mongoose = require("mongoose");

const SupplyOrder = require("../models/SupplyOrder");
const DOReceived = require("../models/DOReceived");
const Booking = require("../models/Booking");

// =====================================================
// SUPPLY ORDER FULFILLMENT REPORT
// =====================================================

const getSupplyOrderFulfillment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid supply order ID",
      });
    }

    const supplyOrder = await SupplyOrder.findOne({
      _id: id,
      companyId: req.user.companyId,
    })
      .populate("doReceivedId")
      .populate("partyId")
      .populate("consignorId")
      .populate("consigneeId")
      .populate("productId")
      .populate("fromCityId")
      .populate("toCityId");

    if (!supplyOrder) {
      return res.status(404).json({
        success: false,
        message: "Supply order not found",
      });
    }

    // -------------------------------------------------
    // Get all active bookings against this SO
    // -------------------------------------------------

    const bookings = await Booking.find({
      companyId: req.user.companyId,
      supplyOrderId: supplyOrder._id,
      status: { $ne: "cancelled" },
    })
      .populate("vehicleId")
      .populate("driverId")
      .sort({ bookingDate: 1 });

    let bookedQuantity = 0;
    let inTransitQuantity = 0;
    let deliveredQuantity = 0;

    const bookingDetails = [];

    for (const booking of bookings) {
      const quantity = Number(booking.quantity || 0);

      bookedQuantity += quantity;

      if (booking.status === "in_transit") {
        inTransitQuantity += quantity;
      }

      if (booking.status === "delivered") {
        deliveredQuantity += quantity;
      }

      bookingDetails.push({
        bookingId: booking._id,
        bookingNumber: booking.bookingNumber,
        lrNumber: booking.lrNumber,
        bookingDate: booking.bookingDate,
        quantity,
        unit: booking.unit,
        status: booking.status,
        vehicle: booking.vehicleId
          ? {
              id: booking.vehicleId._id,
              vehicleNumber: booking.vehicleId.vehicleNumber,
            }
          : null,
        driver: booking.driverId
          ? {
              id: booking.driverId._id,
              name: booking.driverId.name,
            }
          : null,
      });
    }

    const orderQuantity = Number(supplyOrder.orderQuantity || 0);

    const pendingQuantity = Math.max(orderQuantity - bookedQuantity, 0);

    const fulfillmentPercentage =
      orderQuantity > 0
        ? Number(((bookedQuantity / orderQuantity) * 100).toFixed(2))
        : 0;

    let fulfillmentStatus = "pending";

    if (bookedQuantity >= orderQuantity) {
      fulfillmentStatus = "completed";
    } else if (bookedQuantity > 0) {
      fulfillmentStatus = "partial";
    }

    res.status(200).json({
      success: true,
      data: {
        supplyOrder: {
          id: supplyOrder._id,
          soNumber: supplyOrder.soNumber,
          soDate: supplyOrder.soDate,
          orderQuantity,
          unit: supplyOrder.unit,
          rate: supplyOrder.rate,
          expectedDeliveryDate: supplyOrder.expectedDeliveryDate,
          status: supplyOrder.status,
        },

        doReceived: supplyOrder.doReceivedId
          ? {
              id: supplyOrder.doReceivedId._id,
              doNumber: supplyOrder.doReceivedId.doNumber,
              doDate: supplyOrder.doReceivedId.doDate,
              quantity: supplyOrder.doReceivedId.quantity,
              unit: supplyOrder.doReceivedId.unit,
              status: supplyOrder.doReceivedId.status,
            }
          : null,

        summary: {
          orderQuantity,
          bookedQuantity,
          inTransitQuantity,
          deliveredQuantity,
          pendingQuantity,
          fulfillmentPercentage,
          fulfillmentStatus,
        },

        bookings: bookingDetails,
      },
    });
  } catch (error) {
    console.error("Get supply order fulfillment error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to get supply order fulfillment report",
      error: error.message,
    });
  }
};

// =====================================================
// ALL SUPPLY ORDER FULFILLMENT REPORT
// =====================================================

const getAllSupplyOrderFulfillment = async (req, res) => {
  try {
    const { status, fromDate, toDate } = req.query;

    const filter = {
      companyId: req.user.companyId,
    };

    if (status) {
      filter.status = status;
    }

    if (fromDate || toDate) {
      filter.soDate = {};

      if (fromDate) {
        filter.soDate.$gte = new Date(fromDate);
      }

      if (toDate) {
        const endDate = new Date(toDate);
        endDate.setHours(23, 59, 59, 999);

        filter.soDate.$lte = endDate;
      }
    }

    const supplyOrders = await SupplyOrder.find(filter)
      .populate("doReceivedId")
      .populate("partyId")
      .populate("productId")
      .populate("fromCityId")
      .populate("toCityId")
      .sort({ soDate: -1 });

    const report = [];

    for (const so of supplyOrders) {
      const bookings = await Booking.find({
        companyId: req.user.companyId,
        supplyOrderId: so._id,
        status: { $ne: "cancelled" },
      }).select("quantity status");

      let bookedQuantity = 0;
      let inTransitQuantity = 0;
      let deliveredQuantity = 0;

      for (const booking of bookings) {
        const quantity = Number(booking.quantity || 0);

        bookedQuantity += quantity;

        if (booking.status === "in_transit") {
          inTransitQuantity += quantity;
        }

        if (booking.status === "delivered") {
          deliveredQuantity += quantity;
        }
      }

      const orderQuantity = Number(so.orderQuantity || 0);

      const pendingQuantity = Math.max(orderQuantity - bookedQuantity, 0);

      const fulfillmentPercentage =
        orderQuantity > 0
          ? Number(((bookedQuantity / orderQuantity) * 100).toFixed(2))
          : 0;

      let fulfillmentStatus = "pending";

      if (bookedQuantity >= orderQuantity) {
        fulfillmentStatus = "completed";
      } else if (bookedQuantity > 0) {
        fulfillmentStatus = "partial";
      }

      report.push({
        supplyOrderId: so._id,
        soNumber: so.soNumber,
        soDate: so.soDate,

        doNumber: so.doReceivedId ? so.doReceivedId.doNumber : null,

        party: so.partyId
          ? {
              id: so.partyId._id,
              name: so.partyId.name,
            }
          : null,

        product: so.productId
          ? {
              id: so.productId._id,
              name: so.productId.name,
            }
          : null,

        orderQuantity,
        unit: so.unit,

        bookedQuantity,
        inTransitQuantity,
        deliveredQuantity,
        pendingQuantity,

        fulfillmentPercentage,
        fulfillmentStatus,

        systemStatus: so.status,
      });
    }

    res.status(200).json({
      success: true,
      count: report.length,
      data: report,
    });
  } catch (error) {
    console.error("Get all supply order fulfillment error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to get supply order fulfillment report",
      error: error.message,
    });
  }
};

// =====================================================
// DO RECEIVED FULFILLMENT REPORT
// =====================================================

const getDOFulfillment = async (req, res) => {
  try {
    const doList = await DOReceived.find({
      companyId: req.user.companyId,
      status: { $ne: "cancelled" },
    })
      .populate("partyId")
      .populate("consignorId")
      .populate("consigneeId")
      .populate("productId")
      .populate("fromCityId")
      .populate("toCityId")
      .sort({ doDate: -1 });

    const report = [];

    for (const doItem of doList) {
      const supplyOrders = await SupplyOrder.find({
        companyId: req.user.companyId,
        doReceivedId: doItem._id,
        status: { $ne: "cancelled" },
      }).select(
        "soNumber orderQuantity bookedQuantity pendingQuantity unit status",
      );

      let totalOrderQuantity = 0;
      let totalBookedQuantity = 0;
      let totalPendingQuantity = 0;

      const supplyOrderDetails = [];

      for (const so of supplyOrders) {
        const bookings = await Booking.find({
          companyId: req.user.companyId,
          supplyOrderId: so._id,
          status: { $ne: "cancelled" },
        }).select("quantity status");

        let bookedQuantity = 0;
        let inTransitQuantity = 0;
        let deliveredQuantity = 0;

        for (const booking of bookings) {
          const quantity = Number(booking.quantity || 0);

          bookedQuantity += quantity;

          if (booking.status === "in_transit") {
            inTransitQuantity += quantity;
          }

          if (booking.status === "delivered") {
            deliveredQuantity += quantity;
          }
        }

        const orderQuantity = Number(so.orderQuantity || 0);

        const pendingQuantity = Math.max(orderQuantity - bookedQuantity, 0);

        totalOrderQuantity += orderQuantity;
        totalBookedQuantity += bookedQuantity;
        totalPendingQuantity += pendingQuantity;

        supplyOrderDetails.push({
          supplyOrderId: so._id,
          soNumber: so.soNumber,
          orderQuantity,
          bookedQuantity,
          inTransitQuantity,
          deliveredQuantity,
          pendingQuantity,
          unit: so.unit,
          status: so.status,
        });
      }

      const doQuantity = Number(doItem.quantity || 0);

      const doPendingQuantity = Math.max(doQuantity - totalBookedQuantity, 0);

      const fulfillmentPercentage =
        doQuantity > 0
          ? Number(((totalBookedQuantity / doQuantity) * 100).toFixed(2))
          : 0;

      let fulfillmentStatus = "pending";

      if (totalBookedQuantity >= doQuantity) {
        fulfillmentStatus = "completed";
      } else if (totalBookedQuantity > 0) {
        fulfillmentStatus = "partial";
      }

      report.push({
        doReceivedId: doItem._id,
        doNumber: doItem.doNumber,
        doDate: doItem.doDate,

        party: doItem.partyId
          ? {
              id: doItem.partyId._id,
              name: doItem.partyId.name,
            }
          : null,

        product: doItem.productId
          ? {
              id: doItem.productId._id,
              name: doItem.productId.name,
            }
          : null,

        doQuantity,
        unit: doItem.unit,

        totalOrderQuantity,
        totalBookedQuantity,
        totalPendingQuantity,

        doPendingQuantity,
        fulfillmentPercentage,
        fulfillmentStatus,

        supplyOrders: supplyOrderDetails,
      });
    }

    res.status(200).json({
      success: true,
      count: report.length,
      data: report,
    });
  } catch (error) {
    console.error("Get DO fulfillment error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to get DO fulfillment report",
      error: error.message,
    });
  }
};

module.exports = {
  getSupplyOrderFulfillment,
  getAllSupplyOrderFulfillment,
  getDOFulfillment,
};
