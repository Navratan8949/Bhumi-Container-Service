import api from "./api";

export const getDriverReport = async (params = {}) => {
  try {
    const response = await api.get("/driver-reports", { params });
    return response.data;
  } catch (error) {
    console.error("getDriverReport error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch report",
    );
  }
};
