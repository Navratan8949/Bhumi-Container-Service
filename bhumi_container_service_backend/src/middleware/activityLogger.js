const ActivityLog = require("../models/ActivityLog");
const mongoose = require("mongoose");

const activityLogger = (req, res, next) => {
  // Store original send function
  const originalSend = res.send;
  
  // Override send function to capture response body
  res.send = function (body) {
    res.locals.body = body;
    originalSend.call(this, body);
  };

  res.on("finish", async () => {
    // Only log if the request was successful and it's a state-changing method
    if (
      res.statusCode >= 200 &&
      res.statusCode < 300 &&
      ["POST", "PUT", "PATCH", "DELETE"].includes(req.method)
    ) {
      try {
        let action = "UPDATE";
        if (req.method === "POST") action = "CREATE";
        if (req.method === "DELETE") action = "DELETE";

        // Parse resource from URL, e.g. /api/bookings -> bookings
        const urlParts = req.originalUrl.split("?")[0].split("/").filter(Boolean);
        // urlParts typically looks like ['api', 'bookings', 'id']
        const resourceIndex = urlParts.indexOf("api") + 1;
        const resource = urlParts[resourceIndex] || "unknown";

        let description = `${action} performed on ${resource}`;
        if (req.method === 'POST' && req.originalUrl.includes('/login')) {
            action = 'LOGIN';
            description = 'User logged in';
        }

        let entityId = null;

        // Try to extract entity ID
        if (req.method === "POST" && res.locals.body) {
          try {
            const responseData = JSON.parse(res.locals.body);
            if (responseData.data && responseData.data._id) {
              entityId = responseData.data._id;
            } else if (responseData._id) {
              entityId = responseData._id;
            }
          } catch (e) {
            // response might not be JSON, ignore
          }
        } else if (urlParts.length > resourceIndex + 1) {
          // If there's an ID in the URL, e.g. /api/bookings/12345
          const possibleId = urlParts[resourceIndex + 1];
          if (mongoose.Types.ObjectId.isValid(possibleId)) {
            entityId = possibleId;
          }
        }

        const logData = {
          user: req.user ? req.user.userId : null,
          company: req.user ? req.user.companyId : null,
          action,
          entity: resource,
          entityId: entityId && mongoose.Types.ObjectId.isValid(entityId) ? entityId : null,
          description,
          ipAddress: req.ip,
          endpoint: req.originalUrl,
          method: req.method,
        };

        // If it's a login and req.user is populated after auth, capture it
        if (action === 'LOGIN' && res.locals.body) {
             try {
                const responseData = JSON.parse(res.locals.body);
                if (responseData.user && responseData.user._id) {
                     logData.user = responseData.user._id;
                }
             } catch(e) {}
        }

        const log = new ActivityLog(logData);
        await log.save();
      } catch (err) {
        console.error("Error saving activity log:", err);
      }
    }
  });

  next();
};

module.exports = activityLogger;
