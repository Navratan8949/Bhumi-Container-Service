import api from "./api";

export const getEmployeeAdvanceReport = async (params = {}) => {
  try {
    const response = await api.get("/employee-advance-reports", { params });
    return response.data;
  } catch (error) {
    console.error("getEmployeeAdvanceReport error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch report",
    );
  }
};

export const getEmployeeWiseAdvanceReport = async (params = {}) => {
  try {
    const response = await api.get("/employee-advance-reports/employees", {
      params,
    });
    return response.data;
  } catch (error) {
    console.error("getEmployeeWiseAdvanceReport error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch report",
    );
  }
};
