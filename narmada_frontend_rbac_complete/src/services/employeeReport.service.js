import api from "./api";

export const getEmployeeReport = async (params = {}) => {
  try {
    const response = await api.get("/employee-reports", { params });
    return response.data;
  } catch (error) {
    console.error("getEmployeeReport error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch report",
    );
  }
};

export const getEmployeeSummary = async (params = {}) => {
  try {
    const response = await api.get("/employee-reports/summary", { params });
    return response.data;
  } catch (error) {
    console.error("getEmployeeSummary error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch report",
    );
  }
};
