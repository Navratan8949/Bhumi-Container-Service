const mongoose = require("mongoose");
const LRBilty = require("../models/LRBilty");
const Trip = require("../models/Trip");
const Vehicle = require("../models/Vehicle");

/**
 * Public Consignment / Vehicle Tracking
 * No authentication required
 */
const trackPublicConsignment = async (req, res) => {
  try {
    const rawQuery = String(
      req.query.q || req.query.number || req.query.trackingNumber || "",
    ).trim();

    if (!rawQuery) {
      return res.status(400).json({
        success: false,
        message:
          "Please enter a valid Vehicle Number or Tracking ID.",
      });
    }

    const cleanQuery = rawQuery.replace(/[^a-zA-Z0-9-]/g, "").toUpperCase();

    // 1. Try finding in Trip (Primary operational document)
    let trip = await Trip.findOne({
      $or: [
        { tripNumber: new RegExp(`^${cleanQuery}$`, "i") },
        { containerNumber: new RegExp(`^${cleanQuery}$`, "i") },
        { customsSealNumber: new RegExp(`^${cleanQuery}$`, "i") },
        { truckNumber: new RegExp(`^${cleanQuery}$`, "i") },
      ],
    })
      .populate("vehicleId", "vehicleNumber vehicleType ownerType")
      .populate("driverId", "name phone")
      .sort({ createdAt: -1 })
      .lean();

    if (trip) {
      const vehNo = trip.truckNumber || trip.vehicleId?.vehicleNumber || cleanQuery;
      const isDelivered = trip.status === "completed" || trip.status === "delivered";
      const isInTransit = trip.status === "in_transit" || trip.status === "dispatched";

      const tripDateStr = trip.dispatchDate || trip.startDate || trip.tripStartDate
        ? new Date(trip.dispatchDate || trip.startDate || trip.tripStartDate).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
        : "Active";

      const originName = trip.fromCity || "Chennai Port / Puzhal Terminal";
      const destName = trip.toCity || "Destination Unloading Point";

      const statusLabel = isDelivered
        ? "Delivered & Completed"
        : isInTransit
          ? "In Transit"
          : trip.status === "cancelled"
            ? "Cancelled"
            : "Trip Scheduled";

      return res.status(200).json({
        success: true,
        data: {
          queryNumber: trip.tripNumber || cleanQuery,
          type: "Container Freight Trip",
          status: statusLabel,
          containerNumber: trip.containerNumber || "Assigned Container",
          containerSize: trip.containerSize || "40 Feet HC",
          customsSealNumber: trip.customsSealNumber || "Customs Bottle Seal",
          shippingLine: trip.shippingLine || "Direct Shipping Carrier",
          origin: originName,
          destination: destName,
          currentLocation: isDelivered
            ? `${destName} (Delivered)`
            : `${originName} → ${destName}`,
          vehicleNo: vehNo,
          vehicleType: trip.vehicleId?.vehicleType || "Commercial Trailer / Container Truck",
          driverName: trip.driverName || trip.driverId?.name || "Assigned Driver",
          driverPhone: trip.driverPhone || trip.driverId?.phone || "+91 98840 08698",
          bookingDate: tripDateStr,
          eta: isDelivered ? "Delivered" : "Standard Highway Transit",
          cargoDescription: trip.partyName ? `Container Cargo for ${trip.partyName}` : "Commercial Containerized Cargo",
          steps: [
            {
              title: "Trip Scheduled & Assigned",
              time: tripDateStr,
              done: true,
              desc: `Trip #${trip.tripNumber || "Record"} allocated with vehicle ${vehNo}.`,
            },
            {
              title: "Container & Seal Verified",
              time: tripDateStr,
              done: true,
              desc: `Container ${trip.containerNumber || "Assigned"} verified with customs seal.`,
            },
            {
              title: "Dispatched from Loading Terminal",
              time: tripDateStr,
              done: isInTransit || isDelivered,
              desc: `Dispatched from ${originName} towards destination.`,
            },
            {
              title: "Interstate Transit Corridor",
              time: isDelivered ? "Completed" : isInTransit ? "In Progress" : "Scheduled",
              done: isInTransit || isDelivered,
              desc: `Moving towards ${destName}.`,
            },
            {
              title: "Destination Arrival & Unloading",
              time: isDelivered ? "Completed" : "Pending",
              done: isDelivered,
              desc: isDelivered
                ? "Container delivered and trip signed off."
                : `Awaiting delivery at ${destName}.`,
            },
          ],
        },
      });
    }

    // 2. Try finding in AdvanceMemo (Loading Memos)
    const AdvanceMemo = require("../models/AdvanceMemo");
    const memo = await AdvanceMemo.findOne({
      $or: [
        { memoNumber: new RegExp(`^${cleanQuery}$`, "i") },
        { containerNumber: new RegExp(`^${cleanQuery}$`, "i") },
        { truckNumber: new RegExp(`^${cleanQuery}$`, "i") },
        { sealNumber: new RegExp(`^${cleanQuery}$`, "i") },
      ],
    })
      .populate("vehicleId", "vehicleNumber vehicleType")
      .populate("partyId", "name")
      .sort({ createdAt: -1 })
      .lean();

    if (memo) {
      const vehNo = memo.truckNumber || memo.vehicleId?.vehicleNumber || cleanQuery;
      const memoDateStr = memo.date
        ? new Date(memo.date).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
        : "Recent";

      const originName = memo.fromLocation || "Chennai Port / Puzhal Terminal";
      const destName = memo.toLocation || "Destination Hub";

      return res.status(200).json({
        success: true,
        data: {
          queryNumber: memo.memoNumber || vehNo,
          type: "Advance Loading Memo",
          status: "Dispatched — In Transit",
          containerNumber: memo.containerNumber || "Assigned Unit",
          containerSize: memo.containerType || "40 Feet HC",
          customsSealNumber: memo.sealNumber || "Customs Bottle Seal",
          shippingLine: "Commercial Shipping Line",
          origin: originName,
          destination: destName,
          currentLocation: `${originName} → ${destName}`,
          vehicleNo: vehNo,
          vehicleType: memo.vehicleId?.vehicleType || "Commercial Container Trailer",
          driverName: memo.driverName || "Assigned Driver",
          driverPhone: memo.driverPhone || "+91 98840 08698",
          bookingDate: memoDateStr,
          eta: "Standard Highway Transit",
          cargoDescription: `Container Movement for ${memo.partyName || memo.partyId?.name || "Client"}`,
          steps: [
            {
              title: "Advance Memo Generated",
              time: memoDateStr,
              done: true,
              desc: `Advance Memo #${memo.memoNumber} issued for truck ${vehNo}.`,
            },
            {
              title: "Container & Seal Verified",
              time: memoDateStr,
              done: true,
              desc: `Container #${memo.containerNumber || "Assigned"} checked and loaded.`,
            },
            {
              title: "Dispatched from Origin",
              time: memoDateStr,
              done: true,
              desc: `Departed ${originName} towards ${destName}.`,
            },
            {
              title: "Highway Transit",
              time: "In Progress",
              done: true,
              desc: `En route to ${destName}.`,
            },
            {
              title: "Destination Delivery",
              time: "Scheduled",
              done: false,
              desc: `Scheduled for unloading at ${destName}.`,
            },
          ],
        },
      });
    }

    // 3. Try finding by Vehicle Number in Vehicle Master
    let vehicle = await Vehicle.findOne({
      vehicleNumber: new RegExp(`^${cleanQuery}$`, "i"),
    }).lean();

    if (vehicle) {
      // Check if there is an active trip for this vehicle
      const activeTrip = await Trip.findOne({
        $or: [{ vehicleId: vehicle._id }, { truckNumber: vehicle.vehicleNumber }],
      })
        .sort({ createdAt: -1 })
        .lean();

      if (activeTrip) {
        const isDelivered = activeTrip.status === "completed" || activeTrip.status === "delivered";
        const isInTransit = activeTrip.status === "in_transit" || activeTrip.status === "dispatched";
        const tripDateStr = activeTrip.dispatchDate
          ? new Date(activeTrip.dispatchDate).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })
          : "Active";

        return res.status(200).json({
          success: true,
          data: {
            queryNumber: vehicle.vehicleNumber,
            type: "Vehicle Assigned Trip",
            status: isDelivered ? "Delivered" : isInTransit ? "In Transit" : "Scheduled",
            containerNumber: activeTrip.containerNumber || "Assigned Container",
            containerSize: activeTrip.containerSize || "40 Feet HC",
            customsSealNumber: activeTrip.customsSealNumber || "Customs Bottle Seal",
            shippingLine: activeTrip.shippingLine || "Commercial Carrier",
            origin: activeTrip.fromCity || "Chennai Port / Puzhal",
            destination: activeTrip.toCity || "Destination Hub",
            currentLocation: `${activeTrip.fromCity || "Origin"} → ${activeTrip.toCity || "Destination"}`,
            vehicleNo: vehicle.vehicleNumber,
            vehicleType: vehicle.vehicleType || "Commercial Trailer",
            driverName: activeTrip.driverName || "Assigned Driver",
            driverPhone: activeTrip.driverPhone || "+91 98840 08698",
            bookingDate: tripDateStr,
            eta: isDelivered ? "Delivered" : "Standard Transit",
            cargoDescription: activeTrip.partyName ? `Cargo for ${activeTrip.partyName}` : "Commercial Containerized Freight",
            steps: [
              {
                title: "Vehicle Assigned to Trip",
                time: tripDateStr,
                done: true,
                desc: `Trip #${activeTrip.tripNumber || "Record"} allocated to vehicle ${vehicle.vehicleNumber}.`,
              },
              {
                title: "Loading & Seal Checked",
                time: tripDateStr,
                done: true,
                desc: `Container ${activeTrip.containerNumber || "Assigned"} loaded.`,
              },
              {
                title: "Dispatched from Terminal",
                time: tripDateStr,
                done: isInTransit || isDelivered,
                desc: `Dispatched from ${activeTrip.fromCity || "Origin"}.`,
              },
              {
                title: "In Transit",
                time: isDelivered ? "Completed" : isInTransit ? "In Progress" : "Scheduled",
                done: isInTransit || isDelivered,
                desc: `En route to ${activeTrip.toCity || "Destination"}.`,
              },
              {
                title: "Delivery & Unloading",
                time: isDelivered ? "Completed" : "Pending",
                done: isDelivered,
                desc: isDelivered ? "Consignment delivered successfully." : "Awaiting destination delivery.",
              },
            ],
          },
        });
      }

      // If registered vehicle has no active trip
      return res.status(200).json({
        success: true,
        data: {
          queryNumber: vehicle.vehicleNumber,
          type: "Fleet Vehicle Master",
          status: "Fleet Active — Available for Loading",
          containerNumber: "Awaiting Load Assignment",
          containerSize: "Standard 20ft / 40ft",
          customsSealNumber: "Pending Load Assignment",
          shippingLine: "Commercial Carrier",
          origin: "Puzhal Terminal, Chennai",
          destination: "South India Industrial Routes",
          currentLocation: "Puzhal Logistics Yard, Chennai",
          vehicleNo: vehicle.vehicleNumber,
          vehicleType: vehicle.vehicleType || "Commercial Trailer / Container Truck",
          driverName: "Assigned Fleet Driver",
          driverPhone: "+91 98840 08698",
          bookingDate: "Fleet Registered",
          eta: "Ready for Dispatch",
          cargoDescription: "Commercial Container Freight Operations",
          steps: [
            {
              title: "Fleet Vehicle Verified",
              time: "Verified",
              done: true,
              desc: `Vehicle ${vehicle.vehicleNumber} registered with active compliance.`,
            },
            {
              title: "Terminal Staging",
              time: "Ready",
              done: true,
              desc: "Stationed at Puzhal Logistics Terminal.",
            },
            {
              title: "Trip Assignment",
              time: "Pending",
              done: false,
              desc: "Awaiting trip dispatch and container loading.",
            },
          ],
        },
      });
    }

    // 4. Try finding in LRBilty if exists
    const lr = await LRBilty.findOne({
      $or: [
        { lrNumber: new RegExp(`^${cleanQuery}$`, "i") },
        { invoiceNumber: new RegExp(`^${cleanQuery}$`, "i") },
        { containerNumber: new RegExp(`^${cleanQuery}$`, "i") },
        { customsSealNumber: new RegExp(`^${cleanQuery}$`, "i") },
      ],
    })
      .populate("vehicleId", "vehicleNumber vehicleType")
      .populate("driverId", "name phone")
      .populate("companyId", "name city phone")
      .lean();

    if (lr) {
      const originName = lr.fromCity || "Chennai Port / Puzhal Terminal";
      const destName = lr.toCity || "Destination Hub";
      const isDelivered = lr.status === "delivered";
      const isInTransit = lr.status === "in_transit" || lr.status === "generated";
      const bookingDateStr = lr.lrDate
        ? new Date(lr.lrDate).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
        : "Recent";

      return res.status(200).json({
        success: true,
        data: {
          queryNumber: lr.lrNumber || cleanQuery,
          type: "Consignment Challan",
          status: isDelivered ? "Delivered" : "In Transit",
          containerNumber: lr.containerNumber || "Assigned Container",
          containerSize: lr.containerSize || "40 Feet HC",
          customsSealNumber: lr.customsSealNumber || "Customs Bottle Seal",
          shippingLine: lr.shippingLine || "Direct Shipping Carrier",
          origin: originName,
          destination: destName,
          currentLocation: `${originName} → ${destName}`,
          vehicleNo: lr.vehicleId?.vehicleNumber || "Assigned Vehicle",
          vehicleType: lr.vehicleId?.vehicleType || "Commercial Trailer",
          driverName: lr.driverId?.name || "Assigned Driver",
          driverPhone: "+91 98840 08698",
          bookingDate: bookingDateStr,
          eta: isDelivered ? "Delivered" : "Standard Transit",
          cargoDescription: "Commercial Container Freight",
          steps: [
            {
              title: "Challan Generated",
              time: bookingDateStr,
              done: true,
              desc: `Challan #${lr.lrNumber} generated.`,
            },
            {
              title: "Container Loaded",
              time: bookingDateStr,
              done: true,
              desc: "Container loaded with customs seal intact.",
            },
            {
              title: "Dispatched on Highway",
              time: bookingDateStr,
              done: true,
              desc: `Departed from ${originName}.`,
            },
            {
              title: "In Transit",
              time: isDelivered ? "Completed" : "In Progress",
              done: isDelivered || isInTransit,
              desc: `Moving towards ${destName}.`,
            },
            {
              title: "Delivered & Signed",
              time: isDelivered ? "Completed" : "Pending",
              done: isDelivered,
              desc: isDelivered ? "Delivered at destination." : "Awaiting arrival.",
            },
          ],
        },
      });
    }

    // 5. Not found in DB: return helpful message
    return res.status(404).json({
      success: false,
      message: `No active record found matching "${rawQuery}". Please check your Vehicle Number or Tracking ID, or call Operations Desk at +91 98840 08698.`,
    });
  } catch (error) {
    console.error("Public tracking error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch tracking details. Please try again or contact support.",
    });
  }
};

/**
 * Public Company Profile
 * Fetches active company details (Name, Address, Phone, Email, GSTIN, Logo, Bank Details)
 * for the public landing website without exposing SMTP credentials.
 */
const getPublicCompanyProfile = async (req, res) => {
  try {
    const Company = require("../models/Company");
    const company = await Company.findOne({ status: "active" })
      .select("-smtpPass -smtpUser -smtpHost -smtpPort")
      .lean();

    if (!company) {
      return res.status(200).json({
        success: true,
        data: {
          name: "Bhumi Container Service",
          code: "BCS",
          phone: "9884008698",
          email: "bhumicontainerservice@gmail.com",
          address: "Plot No 25, 1st Floor, Shree Ram Nagar, Second Street, Puzhal",
          city: "Chennai",
          state: "Tamil Nadu",
          gstNumber: "Registered Commercial Carrier",
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: company,
    });
  } catch (error) {
    console.error("Public company profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch company profile",
    });
  }
};

module.exports = {
  trackPublicConsignment,
  getPublicCompanyProfile,
};
