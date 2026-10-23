const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const path = require("path");

const companyRoutes = require("./routes/companyRoutes");
const userRoutes = require("./routes/userRoutes");
const authRoutes = require("./routes/authRoutes");
const driverRoutes = require("./routes/driverRoutes");
const vehicleRoutes = require("./routes/vehicleRoutes");
const lrBiltyRoutes = require("./routes/lrBiltyRoutes");
const fuelRoutes = require("./routes/fuelRoutes");
const tyreRoutes = require("./routes/tyreRoutes");
const maintenanceRoutes = require("./routes/maintenanceRoutes");
const vendorRoutes = require("./routes/vendorRoutes");
const customerInvoiceRoutes = require("./routes/customerInvoiceRoutes");
const vendorBillRoutes = require("./routes/vendorBillRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const accountsReportRoutes = require("./routes/accountsReportRoutes");
const vehicleDocumentRoutes = require("./routes/vehicleDocumentRoutes");
const tripRoutes = require("./routes/tripRoutes");
const tripReportRoutes = require("./routes/tripReportRoutes");
const driverReportRoutes = require("./routes/driverReportRoutes");
const fuelReportRoutes = require("./routes/fuelReportRoutes");
const maintenanceReportRoutes = require("./routes/maintenanceReportRoutes");
const tyreReportRoutes = require("./routes/tyreReportRoutes");
const expenseReportRoutes = require("./routes/expenseReportRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const sequenceRoutes = require("./routes/sequenceRoutes");
const publicRoutes = require("./routes/publicRoutes");
const containerDetentionRoutes = require("./routes/containerDetentionRoutes");
const driverTripSettlementRoutes = require("./routes/driverTripSettlementRoutes");
const settingRoutes = require("./routes/settingRoutes");
const advanceMemoRoutes = require("./routes/advanceMemoRoutes");
const loanRoutes = require("./routes/loanRoutes");
const activityLogRoutes = require("./routes/activityLogRoutes");
const activityLogger = require("./middleware/activityLogger");

const app = express();

const configuredOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(morgan("dev"));
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);
// app.use(
//   cors({
//     origin: (origin, callback) => {
//       // Non-browser tools / same-origin requests have no Origin header.
//       if (!origin) return callback(null, true);

//       // Development fallback. In production set CORS_ORIGIN explicitly.
//       if (configuredOrigins.length === 0) {
//         return callback(null, true);
//       }

//       if (configuredOrigins.includes(origin)) {
//         return callback(null, true);
//       }

//       return callback(new Error("CORS origin not allowed"));
//     },
//     credentials: true,
//   }),
// );

app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

app.use("/public", express.static(path.join(__dirname, "..", "public")));
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.use(activityLogger);

app.use("/api/activity-logs", activityLogRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/drivers", driverRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/lr-bilties", lrBiltyRoutes);
app.use("/api/fuels", fuelRoutes);
app.use("/api/tyres", tyreRoutes);
app.use("/api/maintenances", maintenanceRoutes);
app.use("/api/vendors", vendorRoutes);
app.use("/api/customer-invoices", customerInvoiceRoutes);
app.use("/api/vendor-bills", vendorBillRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/accounts", accountsReportRoutes);
app.use("/api/vehicle-documents", vehicleDocumentRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/trip-reports", tripReportRoutes);
app.use("/api/driver-reports", driverReportRoutes);
app.use("/api/fuel-reports", fuelReportRoutes);
app.use("/api/maintenance-reports", maintenanceReportRoutes);
app.use("/api/tyre-reports", tyreReportRoutes);
app.use("/api/expense-reports", expenseReportRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/sequence", sequenceRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/container-detentions", containerDetentionRoutes);
app.use("/api/driver-trip-settlements", driverTripSettlementRoutes);
app.use("/api/settings", settingRoutes);
app.use("/api/advance-memos", advanceMemoRoutes);
app.use("/api/loans", loanRoutes);

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Bhumi Container Service API is healthy",
    timestamp: new Date().toISOString(),
  });
});

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Bhumi Container Service API is running",
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl,
  });
});

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);

  if (err instanceof multer.MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "Uploaded file is too large"
        : err.message || "File upload failed";

    return res.status(400).json({
      success: false,
      message,
      code: err.code,
    });
  }

  if (
    err.message ===
    "Invalid file type. Please upload a supported image or PDF file."
  ) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  if (err.message === "CORS origin not allowed") {
    return res.status(403).json({
      success: false,
      message: "CORS origin not allowed",
    });
  }

  return res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

module.exports = app;
