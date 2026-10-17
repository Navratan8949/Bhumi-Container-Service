import api from "./api";

export const getPayrollReport = async (params = {}) => {
  try {
    const response = await api.get("/payroll-reports", { params });
    return response.data;
  } catch (error) {
    console.error("getPayrollReport error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch report",
    );
  }
};

export const getEmployeePayrollReport = async (params = {}) => {
  try {
    const response = await api.get("/payroll-reports/employees", { params });
    return response.data;
  } catch (error) {
    console.error("getEmployeePayrollReport error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch report",
    );
  }
};
