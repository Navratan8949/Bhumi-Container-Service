import api from "./api";

export const getAttendanceReport = async (params = {}) => {
  try {
    const response = await api.get("/attendance-reports", { params });
    return response.data;
  } catch (error) {
    console.error("getAttendanceReport error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch report",
    );
  }
};

export const getEmployeeAttendanceReport = async (params = {}) => {
  try {
    const response = await api.get("/attendance-reports/employees", { params });
    return response.data;
  } catch (error) {
    console.error("getEmployeeAttendanceReport error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch report",
    );
  }
};
