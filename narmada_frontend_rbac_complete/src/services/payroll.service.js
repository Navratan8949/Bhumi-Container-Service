import api from "./api";
export const createPayroll = async (data) => {
  try {
    const response = await api.post("/payrolls", data);
    return response.data;
  } catch (error) {
    console.error("createPayroll error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to create payroll",
    );
  }
};

export const getPayrolls = async (params = {}) => {
  try {
    const response = await api.get("/payrolls", { params });
    return response.data;
  } catch (error) {
    console.error("getPayrolls error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch payrolls",
    );
  }
};

export const getPayrollById = async (id) => {
  try {
    const response = await api.get(`/payrolls/${id}`);
    return response.data;
  } catch (error) {
    console.error("getPayrollById error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch payroll",
    );
  }
};
