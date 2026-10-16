import api from "./api";

export const getTripDashboard = async (params = {}) => {
  try {
    const response = await api.get("/trip-reports/dashboard", { params });
    return response.data;
  } catch (error) {
    console.error("getTripDashboard error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch report",
    );
  }
};

export const getTripProfitability = async (params = {}) => {
  try {
    const response = await api.get("/trip-reports/profitability", { params });
    return response.data;
  } catch (error) {
    console.error("getTripProfitability error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch report",
    );
  }
};

export const getVehicleReport = async (params = {}) => {
  try {
    const response = await api.get("/trip-reports/vehicles", { params });
    return response.data;
  } catch (error) {
    console.error("getVehicleReport error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch report",
    );
  }
};
