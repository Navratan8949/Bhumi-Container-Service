import api from "./api";

export const getVehicleRunningCost = async (params = {}) => {
  try {
    const response = await api.get("/vehicle-running-cost", { params });
    return response.data;
  } catch (error) {
    console.error("getVehicleRunningCost error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch report",
    );
  }
};
