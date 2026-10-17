const mongoose = require("mongoose");

const SupplyOrder = require("../models/SupplyOrder");
const DOReceived = require("../models/DOReceived");
const Booking = require("../models/Booking");
const LRBilty = require("../models/LRBilty");
const Trip = require("../models/Trip");
const Vehicle = require("../models/Vehicle");
const Driver = require("../models/Driver");
const Fuel = require("../models/Fuel");
const Maintenance = require("../models/Maintenance");
const Tyre = require("../models/Tyre");
const VehicleDocument = require("../models/VehicleDocument");
const VehicleDriverAssignment = require("../models/VehicleDriverAssignment");

const CustomerInvoice = require("../models/CustomerInvoice");
const CustomerPayment = require("../models/CustomerPayment");
const VendorBill = require("../models/VendorBill");
const VendorPayment = require("../models/VendorPayment");
const Expense = require("../models/Expense");

const Employee = require("../models/Employee");
const Attendance = require("../models/Attendance");
const Payroll = require("../models/Payroll");
const EmployeeAdvance = require("../models/EmployeeAdvance");

// =====================================================
// OVERALL TMS DASHBOARD
// =====================================================

const getDashboard = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid companyId",
      });
    }

    const companyObjectId = new mongoose.Types.ObjectId(companyId);

    const { fromDate, toDate } = req.query;

    // =================================================
    // DATE FILTER
    // =================================================

    let startDate = null;
    let endDate = null;

    if (fromDate) {
      startDate = new Date(fromDate);

      if (isNaN(startDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid fromDate",
        });
      }

      startDate.setHours(0, 0, 0, 0);
    }

    if (toDate) {
      endDate = new Date(toDate);

      if (isNaN(endDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid toDate",
        });
      }

      endDate.setHours(23, 59, 59, 999);
    }

    if (startDate && endDate && startDate > endDate) {
      return res.status(400).json({
        success: false,
        message: "fromDate cannot be greater than toDate",
      });
    }

    // Helper for date-based filters
    const addDateFilter = (filter, field) => {
      if (startDate || endDate) {
        filter[field] = {};

        if (startDate) {
          filter[field].$gte = startDate;
        }

        if (endDate) {
          filter[field].$lte = endDate;
        }
      }

      return filter;
    };

    // =================================================
    // OPERATIONS
    // =================================================

    const supplyOrderFilter = {
      companyId: companyObjectId,
    };

    addDateFilter(supplyOrderFilter, "soDate");

    const doFilter = {
      companyId: companyObjectId,
    };

    addDateFilter(doFilter, "doDate");

    const bookingFilter = {
      companyId: companyObjectId,
    };

    addDateFilter(bookingFilter, "bookingDate");

    const tripFilter = {
      companyId: companyObjectId,
    };

    addDateFilter(tripFilter, "dispatchDate");

    const [
      totalSupplyOrders,
      pendingSupplyOrders,
      partialSupplyOrders,
      completedSupplyOrders,
      cancelledSupplyOrders,

      totalDO,
      pendingDO,
      convertedDO,
      receivedDO,

      totalBookings,
      bookedBookings,
      inTransitBookings,
      deliveredBookings,
      cancelledBookings,

      totalTrips,
      plannedTrips,
      dispatchedTrips,
      inTransitTrips,
      deliveredTrips,
      completedTrips,
      cancelledTrips,
    ] = await Promise.all([
      SupplyOrder.countDocuments(supplyOrderFilter),

      SupplyOrder.countDocuments({
        ...supplyOrderFilter,
        status: "pending",
      }),

      SupplyOrder.countDocuments({
        ...supplyOrderFilter,
        status: "partial",
      }),

      SupplyOrder.countDocuments({
        ...supplyOrderFilter,
        status: "completed",
      }),

      SupplyOrder.countDocuments({
        ...supplyOrderFilter,
        status: "cancelled",
      }),

      DOReceived.countDocuments(doFilter),

      DOReceived.countDocuments({
        ...doFilter,
        status: "pending",
      }),

      DOReceived.countDocuments({
        ...doFilter,
        status: "converted",
      }),

      DOReceived.countDocuments({
        ...doFilter,
        status: "received",
      }),

      Booking.countDocuments(bookingFilter),

      Booking.countDocuments({
        ...bookingFilter,
        status: "booked",
      }),

      Booking.countDocuments({
        ...bookingFilter,
        status: "in_transit",
      }),

      Booking.countDocuments({
        ...bookingFilter,
        status: "delivered",
      }),

      Booking.countDocuments({
        ...bookingFilter,
        status: "cancelled",
      }),

      Trip.countDocuments(tripFilter),

      Trip.countDocuments({
        ...tripFilter,
        status: "planned",
      }),

      Trip.countDocuments({
        ...tripFilter,
        status: "dispatched",
      }),

      Trip.countDocuments({
        ...tripFilter,
        status: "in_transit",
      }),

      Trip.countDocuments({
        ...tripFilter,
        status: "delivered",
      }),

      Trip.countDocuments({
        ...tripFilter,
        status: "completed",
      }),

      Trip.countDocuments({
        ...tripFilter,
        status: "cancelled",
      }),
    ]);

    // =================================================
    // FLEET
    // =================================================

    const [
      totalVehicles,
      activeVehicles,
      inactiveVehicles,

      totalDrivers,
      activeDrivers,

      activeAssignments,

      totalFuelRecords,
      fuelSummary,

      maintenanceSummary,

      tyreSummary,

      totalVehicleDocuments,
      expiredVehicleDocuments,
      expiringVehicleDocuments,
    ] = await Promise.all([
      Vehicle.countDocuments({
        companyId: companyObjectId,
      }),

      Vehicle.countDocuments({
        companyId: companyObjectId,
        status: "active",
      }),

      Vehicle.countDocuments({
        companyId: companyObjectId,
        status: "inactive",
      }),

      Driver.countDocuments({
        companyId: companyObjectId,
      }),

      Driver.countDocuments({
        companyId: companyObjectId,
        status: "active",
      }),

      VehicleDriverAssignment.countDocuments({
        companyId: companyObjectId,
        status: "active",
      }),

      Fuel.countDocuments({
        companyId: companyObjectId,
        ...(startDate || endDate
          ? {
              fuelDate: {
                ...(startDate ? { $gte: startDate } : {}),
                ...(endDate ? { $lte: endDate } : {}),
              },
            }
          : {}),
      }),

      Fuel.aggregate([
        {
          $match: {
            companyId: companyObjectId,
            ...(startDate || endDate
              ? {
                  fuelDate: {
                    ...(startDate ? { $gte: startDate } : {}),
                    ...(endDate ? { $lte: endDate } : {}),
                  },
                }
              : {}),
          },
        },
        {
          $group: {
            _id: null,
            quantity: {
              $sum: "$quantity",
            },
            amount: {
              $sum: "$totalAmount",
            },
          },
        },
      ]),

      Maintenance.aggregate([
        {
          $match: {
            companyId: companyObjectId,
            status: {
              $ne: "cancelled",
            },
            ...(startDate || endDate
              ? {
                  maintenanceDate: {
                    ...(startDate ? { $gte: startDate } : {}),
                    ...(endDate ? { $lte: endDate } : {}),
                  },
                }
              : {}),
          },
        },
        {
          $group: {
            _id: null,
            amount: {
              $sum: "$totalCost",
            },
            count: {
              $sum: 1,
            },
          },
        },
      ]),

      Tyre.aggregate([
        {
          $match: {
            companyId: companyObjectId,
            ...(startDate || endDate
              ? {
                  purchaseDate: {
                    ...(startDate ? { $gte: startDate } : {}),
                    ...(endDate ? { $lte: endDate } : {}),
                  },
                }
              : {}),
          },
        },
        {
          $group: {
            _id: null,
            amount: {
              $sum: "$purchasePrice",
            },
            count: {
              $sum: 1,
            },
          },
        },
      ]),

      VehicleDocument.countDocuments({
        companyId: companyObjectId,
        status: {
          $ne: "cancelled",
        },
      }),

      VehicleDocument.countDocuments({
        companyId: companyObjectId,
        status: "expired",
      }),

      VehicleDocument.countDocuments({
        companyId: companyObjectId,
        status: "active",
        expiryDate: {
          $gte: new Date(),
          $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      }),
    ]);

    // =================================================
    // ACCOUNTS
    // =================================================

    const invoiceFilter = {
      companyId: companyObjectId,
      status: {
        $ne: "cancelled",
      },
    };

    addDateFilter(invoiceFilter, "invoiceDate");

    const vendorBillFilter = {
      companyId: companyObjectId,
      status: {
        $ne: "cancelled",
      },
    };

    addDateFilter(vendorBillFilter, "billDate");

    const customerPaymentFilter = {
      companyId: companyObjectId,
    };

    addDateFilter(customerPaymentFilter, "paymentDate");

    const vendorPaymentFilter = {
      companyId: companyObjectId,
    };

    addDateFilter(vendorPaymentFilter, "paymentDate");

    const expenseFilter = {
      companyId: companyObjectId,
      status: "active",
    };

    addDateFilter(expenseFilter, "expenseDate");

    const [
      invoiceSummary,
      customerPaymentSummary,
      vendorBillSummary,
      vendorPaymentSummary,
      expenseSummary,
    ] = await Promise.all([
      CustomerInvoice.aggregate([
        {
          $match: invoiceFilter,
        },
        {
          $group: {
            _id: null,
            count: {
              $sum: 1,
            },
            amount: {
              $sum: "$grandTotal",
            },
            received: {
              $sum: "$paidAmount",
            },
            outstanding: {
              $sum: "$outstandingAmount",
            },
          },
        },
      ]),

      CustomerPayment.aggregate([
        {
          $match: customerPaymentFilter,
        },
        {
          $group: {
            _id: null,
            count: {
              $sum: 1,
            },
            amount: {
              $sum: "$amount",
            },
          },
        },
      ]),

      VendorBill.aggregate([
        {
          $match: vendorBillFilter,
        },
        {
          $group: {
            _id: null,
            count: {
              $sum: 1,
            },
            amount: {
              $sum: "$grandTotal",
            },
            paid: {
              $sum: "$paidAmount",
            },
            outstanding: {
              $sum: "$outstandingAmount",
            },
          },
        },
      ]),

      VendorPayment.aggregate([
        {
          $match: vendorPaymentFilter,
        },
        {
          $group: {
            _id: null,
            count: {
              $sum: 1,
            },
            amount: {
              $sum: "$amount",
            },
          },
        },
      ]),

      Expense.aggregate([
        {
          $match: expenseFilter,
        },
        {
          $group: {
            _id: null,
            count: {
              $sum: 1,
            },
            amount: {
              $sum: "$amount",
            },
          },
        },
      ]),
    ]);

    // =================================================
    // HR
    // =================================================

    const [
      totalEmployees,
      activeEmployees,
      inactiveEmployees,

      attendanceSummary,

      payrollSummary,

      advanceSummary,
    ] = await Promise.all([
      Employee.countDocuments({
        companyId: companyObjectId,
      }),

      Employee.countDocuments({
        companyId: companyObjectId,
        status: "active",
      }),

      Employee.countDocuments({
        companyId: companyObjectId,
        status: "inactive",
      }),

      Attendance.aggregate([
        {
          $match: {
            companyId: companyObjectId,
            ...(startDate || endDate
              ? {
                  attendanceDate: {
                    ...(startDate
                      ? {
                          $gte: startDate,
                        }
                      : {}),
                    ...(endDate
                      ? {
                          $lte: endDate,
                        }
                      : {}),
                  },
                }
              : {}),
          },
        },
        {
          $group: {
            _id: "$status",
            count: {
              $sum: 1,
            },
            workingHours: {
              $sum: "$workingHours",
            },
            overtimeHours: {
              $sum: "$overtimeHours",
            },
          },
        },
      ]),

      Payroll.aggregate([
        {
          $match: {
            companyId: companyObjectId,
            status: {
              $ne: "cancelled",
            },
            ...(startDate || endDate
              ? {
                  payrollMonth: {
                    ...(startDate
                      ? {
                          $gte: startDate.toISOString().slice(0, 7),
                        }
                      : {}),
                    ...(endDate
                      ? {
                          $lte: endDate.toISOString().slice(0, 7),
                        }
                      : {}),
                  },
                }
              : {}),
          },
        },
        {
          $group: {
            _id: null,
            count: {
              $sum: 1,
            },
            grossSalary: {
              $sum: "$grossSalary",
            },
            deduction: {
              $sum: "$totalDeduction",
            },
            netSalary: {
              $sum: "$netSalary",
            },
          },
        },
      ]),

      EmployeeAdvance.aggregate([
        {
          $match: {
            companyId: companyObjectId,
            status: {
              $ne: "cancelled",
            },
          },
        },
        {
          $group: {
            _id: null,
            count: {
              $sum: 1,
            },
            amount: {
              $sum: "$amount",
            },
            recovered: {
              $sum: "$recoveredAmount",
            },
            outstanding: {
              $sum: "$outstandingAmount",
            },
          },
        },
      ]),
    ]);

    // =================================================
    // ACTIVE & RECENT TRIPS FOR DASHBOARD
    // =================================================

    const activeTripsData = await Trip.find({
      companyId: companyObjectId,
      status: { $in: ["planned", "dispatched", "in_transit", "delivered", "completed"] },
    })
      .populate("vehicleId", "vehicleNumber vehicleType")
      .populate("driverId", "name phone")
      .populate("fromCityId", "name")
      .populate("toCityId", "name")
      .populate("lrBiltyId", "lrNumber lrDate quantity unit article loadingWeight")
      .populate("bookingId", "bookingNumber")
      .sort({ dispatchDate: -1, createdAt: -1 })
      .limit(25);
    
    const activeTrips = await Promise.all(activeTripsData.map(async trip => {
      // Fetch trip expenses
      const expenses = await Expense.aggregate([
        { $match: { tripId: trip._id, status: 'active' } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]);
      const totalExpense = expenses[0]?.total || 0;
      
      return {
        _id: trip._id,
        tripNumber: trip.tripNumber,
        status: trip.status,
        dispatchDate: trip.dispatchDate,
        vehicle: trip.vehicleId?.vehicleNumber || "N/A",
        vehicleType: trip.vehicleId?.vehicleType || "",
        driver: trip.driverId?.name || "N/A",
        driverPhone: trip.driverId?.phone || "N/A",
        from: trip.fromCityId?.name || "N/A",
        to: trip.toCityId?.name || "N/A",
        startingOdometer: trip.startingOdometer || 0,
        endingOdometer: trip.endingOdometer || 0,
        lrBiltyId: trip.lrBiltyId?._id || trip.lrBiltyId || null,
        lrNumber: trip.lrBiltyId?.lrNumber || "",
        cargo: trip.lrBiltyId?.article || "General Goods",
        quantity: trip.lrBiltyId?.quantity || 0,
        unit: trip.lrBiltyId?.unit || "MT",
        weight: trip.lrBiltyId?.loadingWeight || 0,
        bookingNumber: trip.bookingId?.bookingNumber || "",
        totalExpense
      };
    }));

    // =================================================
    // HELPERS
    // =================================================

    const round = (value) =>
      Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

    const fuel = fuelSummary[0] || {};
    const maintenance = maintenanceSummary[0] || {};
    const tyre = tyreSummary[0] || {};

    const invoices = invoiceSummary[0] || {};
    const customerPayments = customerPaymentSummary[0] || {};

    const vendorBills = vendorBillSummary[0] || {};

    const vendorPayments = vendorPaymentSummary[0] || {};

    const expenses = expenseSummary[0] || {};

    const payroll = payrollSummary[0] || {};

    const advances = advanceSummary[0] || {};

    const totalRevenue = round(invoices.amount);

    const generalExpense = round(expenses.amount);

    const fuelExpense = round(fuel.amount);

    const maintenanceExpense = round(maintenance.amount);

    const tyreExpense = round(tyre.amount);

    const totalOperationalExpenses = round(
      generalExpense + fuelExpense + maintenanceExpense + tyreExpense,
    );

    const netOperationalAmount = round(totalRevenue - totalOperationalExpenses);

    // =================================================
    // RESPONSE
    // =================================================

    return res.status(200).json({
      success: true,

      filters: {
        fromDate: fromDate || null,
        toDate: toDate || null,
      },

      data: {
        operations: {
          supplyOrders: {
            total: totalSupplyOrders,
            pending: pendingSupplyOrders,
            partial: partialSupplyOrders,
            completed: completedSupplyOrders,
            cancelled: cancelledSupplyOrders,
          },

          doReceived: {
            total: totalDO,
            pending: pendingDO,
            received: receivedDO,
            converted: convertedDO,
          },

          bookings: {
            total: totalBookings,
            booked: bookedBookings,
            inTransit: inTransitBookings,
            delivered: deliveredBookings,
            cancelled: cancelledBookings,
          },

          trips: {
            total: totalTrips,
            planned: plannedTrips,
            dispatched: dispatchedTrips,
            inTransit: inTransitTrips,
            delivered: deliveredTrips,
            completed: completedTrips,
            cancelled: cancelledTrips,
          },
        },
        activeTrips,


        fleet: {
          vehicles: {
            total: totalVehicles,
            active: activeVehicles,
            inactive: inactiveVehicles,
          },

          drivers: {
            total: totalDrivers,
            active: activeDrivers,
          },

          activeDriverAssignments: activeAssignments,

          documents: {
            total: totalVehicleDocuments,
            expired: expiredVehicleDocuments,
            expiringWithin30Days: expiringVehicleDocuments,
          },

          fuel: {
            records: totalFuelRecords,
            quantity: round(fuel.quantity),
            expense: fuelExpense,
          },

          maintenance: {
            count: maintenance.count || 0,
            expense: maintenanceExpense,
          },

          tyres: {
            count: tyre.count || 0,
            purchaseAmount: tyreExpense,
          },
        },

        accounts: {
          receivable: {
            invoiceCount: invoices.count || 0,
            invoiceAmount: round(invoices.amount),
            received: round(invoices.received),
            outstanding: round(invoices.outstanding),
          },

          customerPayments: {
            count: customerPayments.count || 0,
            amount: round(customerPayments.amount),
          },

          payable: {
            billCount: vendorBills.count || 0,
            billAmount: round(vendorBills.amount),
            paid: round(vendorBills.paid),
            outstanding: round(vendorBills.outstanding),
          },

          vendorPayments: {
            count: vendorPayments.count || 0,
            amount: round(vendorPayments.amount),
          },

          expenses: {
            general: generalExpense,
            fuel: fuelExpense,
            maintenance: maintenanceExpense,
            tyres: tyreExpense,
            total: totalOperationalExpenses,
          },

          revenueExpense: {
            totalRevenue,
            totalExpenses: totalOperationalExpenses,
            netOperationalAmount,
          },
        },

        hr: {
          employees: {
            total: totalEmployees,
            active: activeEmployees,
            inactive: inactiveEmployees,
          },

          attendance: {
            statusSummary: attendanceSummary.map((item) => ({
              status: item._id,
              count: item.count,
              workingHours: round(item.workingHours),
              overtimeHours: round(item.overtimeHours),
            })),
          },

          payroll: {
            count: payroll.count || 0,
            grossSalary: round(payroll.grossSalary),
            deduction: round(payroll.deduction),
            netSalary: round(payroll.netSalary),
          },

          advances: {
            count: advances.count || 0,
            amount: round(advances.amount),
            recovered: round(advances.recovered),
            outstanding: round(advances.outstanding),
          },
        },
      },
    });
  } catch (error) {
    console.error("Get overall dashboard error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get dashboard",
      error: error.message,
    });
  }
};

const getAlerts = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    if (!companyId) return res.status(200).json({ success: true, data: [] });
    const companyObjectId = new mongoose.Types.ObjectId(companyId);

    const alerts = [];

    // 1. Expired Documents
    const expiredDocs = await VehicleDocument.find({
      companyId: companyObjectId,
      status: "expired",
    }).populate("vehicleId", "vehicleNumber");

    expiredDocs.forEach(doc => {
      const daysRemaining = Math.ceil((new Date(doc.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
      alerts.push({
        id: doc._id,
        type: "danger",
        category: "document",
        title: "Document Expired",
        message: `${doc.documentType?.toUpperCase()} for vehicle ${doc.vehicleId?.vehicleNumber || "Unknown"} has expired on ${new Date(doc.expiryDate).toLocaleDateString("en-IN")}.`,
        link: "/vehicle-documents",
        date: doc.expiryDate,
        documentType: doc.documentType,
        documentNumber: doc.documentNumber || "",
        vehicleNumber: doc.vehicleId?.vehicleNumber || "Unknown",
        daysRemaining
      });
    });

    // 2. Expiring Documents (next 30 days)
    const expiringDocs = await VehicleDocument.find({
      companyId: companyObjectId,
      status: "active",
      expiryDate: {
        $gte: new Date(),
        $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    }).populate("vehicleId", "vehicleNumber");

    expiringDocs.forEach(doc => {
      const daysRemaining = Math.ceil((new Date(doc.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
      alerts.push({
        id: doc._id,
        type: "warning",
        category: "document",
        title: "Document Expiring Soon",
        message: `${doc.documentType?.toUpperCase()} for vehicle ${doc.vehicleId?.vehicleNumber || "Unknown"} is expiring on ${new Date(doc.expiryDate).toLocaleDateString("en-IN")}.`,
        link: "/vehicle-documents",
        date: doc.expiryDate,
        documentType: doc.documentType,
        documentNumber: doc.documentNumber || "",
        vehicleNumber: doc.vehicleId?.vehicleNumber || "Unknown",
        daysRemaining
      });
    });

    // 3. Active Trips (Dispatched / In Transit)
    const activeTrips = await Trip.find({
      companyId: companyObjectId,
      status: { $in: ["dispatched", "in_transit"] },
    }).populate("vehicleId", "vehicleNumber").populate("driverId", "name");

    activeTrips.forEach(trip => {
      alerts.push({
        id: trip._id,
        type: "info",
        title: `Trip ${trip.status === 'in_transit' ? 'In Transit' : 'Dispatched'}`,
        message: `Trip ${trip.tripNumber} with vehicle ${trip.vehicleId?.vehicleNumber || "Unknown"} (Driver: ${trip.driverId?.name || "Unknown"}) is currently active.`,
        link: "/trips",
        date: trip.updatedAt || trip.dispatchDate
      });
    });

    // Sort by date descending
    alerts.sort((a, b) => new Date(b.date) - new Date(a.date));

    return res.status(200).json({
      success: true,
      data: alerts,
    });
  } catch (error) {
    console.error("Alerts Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const searchGlobal = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    if (!companyId) {
      return res.status(400).json({ success: false, message: "Company is required" });
    }

    const q = String(req.query.q || "").trim();
    if (!q) {
      return res.json({ success: true, data: { trips: [], bilties: [], vehicles: [], bookings: [] } });
    }

    const companyObjectId = new mongoose.Types.ObjectId(companyId);
    const regex = new RegExp(q.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&"), "i");

    // 1. Search Vehicles
    const vehicles = await Vehicle.find({
      companyId: companyObjectId,
      $or: [{ vehicleNumber: regex }, { vehicleType: regex }]
    }).limit(6).lean();

    const vehicleIds = vehicles.map(v => v._id);

    // 2. Search Trips (by tripNumber or status or linked vehicle)
    const trips = await Trip.find({
      companyId: companyObjectId,
      $or: [
        { tripNumber: regex },
        { status: regex },
        { vehicleId: { $in: vehicleIds } }
      ]
    })
      .populate("vehicleId", "vehicleNumber vehicleType")
      .populate("driverId", "name phone")
      .populate("fromCityId", "name")
      .populate("toCityId", "name")
      .populate("lrBiltyId", "lrNumber lrDate article")
      .sort({ dispatchDate: -1, createdAt: -1 })
      .limit(6)
      .lean();

    // 3. Search LR Bilties
    const bilties = await LRBilty.find({
      companyId: companyObjectId,
      $or: [
        { lrNumber: regex },
        { eWayBillNumber: regex },
        { invoiceNumber: regex },
        { article: regex }
      ]
    })
      .populate("fromCityId", "name")
      .populate("toCityId", "name")
      .populate("partyId", "name")
      .sort({ lrDate: -1, createdAt: -1 })
      .limit(6)
      .lean();

    // 4. Search Bookings
    const bookings = await Booking.find({
      companyId: companyObjectId,
      $or: [
        { bookingNumber: regex },
        { lrNumber: regex },
        { invoiceNumber: regex },
        { article: regex }
      ]
    })
      .populate("billingPartyId", "name")
      .populate("fromCityId", "name")
      .populate("toCityId", "name")
      .sort({ bookingDate: -1, createdAt: -1 })
      .limit(6)
      .lean();

    return res.json({
      success: true,
      data: {
        trips: trips.map(t => ({
          _id: t._id,
          tripNumber: t.tripNumber,
          vehicle: t.vehicleId?.vehicleNumber || "N/A",
          driver: t.driverId?.name || "N/A",
          from: t.fromCityId?.name || "",
          to: t.toCityId?.name || "",
          status: t.status,
          lrNumber: t.lrBiltyId?.lrNumber || ""
        })),
        bilties: bilties.map(b => ({
          _id: b._id,
          lrNumber: b.lrNumber,
          party: b.partyId?.name || "",
          from: b.fromCityId?.name || "",
          to: b.toCityId?.name || "",
          status: b.status,
          article: b.article || ""
        })),
        vehicles: vehicles.map(v => ({
          _id: v._id,
          vehicleNumber: v.vehicleNumber,
          vehicleType: v.vehicleType || "Truck",
          status: v.status
        })),
        bookings: bookings.map(b => ({
          _id: b._id,
          bookingNumber: b.bookingNumber,
          party: b.billingPartyId?.name || "",
          from: b.fromCityId?.name || "",
          to: b.toCityId?.name || "",
          status: b.status
        }))
      }
    });
  } catch (error) {
    console.error("Dashboard Global Search Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getDashboard,
  getAlerts,
  searchGlobal,
};
