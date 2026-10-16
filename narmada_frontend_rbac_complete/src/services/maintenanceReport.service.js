import api from "./api";

export const getMaintenanceReport = async (params = {}) => {
  try {
    const response = await api.get("/maintenance-reports", { params });
    return response.data;
  } catch (error) {
    console.error("getMaintenanceReport error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch report",
    );
  }
};

export const getVehicleMaintenanceReport = async (params = {}) => {
  try {
    const response = await api.get("/maintenance-reports/vehicle-maintenance", {
      params,
    });
    return response.data;
  } catch (error) {
    console.error("getVehicleMaintenanceReport error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch report",
    );
  }
};
