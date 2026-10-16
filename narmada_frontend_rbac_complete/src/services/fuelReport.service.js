import api from "./api";

export const getFuelReport = async (params = {}) => {
  try {
    const response = await api.get("/fuel-reports", { params });
    return response.data;
  } catch (error) {
    console.error("getFuelReport error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch report",
    );
  }
};

export const getVehicleFuelEfficiency = async (params = {}) => {
  try {
    const response = await api.get("/fuel-reports/vehicle-efficiency", {
      params,
    });
    return response.data;
  } catch (error) {
    console.error("getVehicleFuelEfficiency error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch report",
    );
  }
};
