import api from "./api";
export const getTyreReport = async (params = {}) => {
  try {
    const response = await api.get("/tyre-reports", { params });
    return response.data;
  } catch (error) {
    console.error("getTyreReport error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch tyre report",
    );
  }
};

export const getVehicleTyreReport = async (params = {}) => {
  try {
    const response = await api.get("/tyre-reports/vehicle-tyres", { params });
    return response.data;
  } catch (error) {
    console.error("getVehicleTyreReport error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch vehicle tyre report",
    );
  }
};

export const getTyreHistoryReport = async (tyreId) => {
  try {
    const response = await api.get(`/tyre-reports/history/${tyreId}`);
    return response.data;
  } catch (error) {
    console.error("getTyreHistoryReport error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch tyre history report",
    );
  }
};
