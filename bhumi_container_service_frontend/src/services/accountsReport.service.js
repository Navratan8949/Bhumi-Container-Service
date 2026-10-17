import api from "./api";

export const getAccountsDashboard = async (params = {}) => {
  try {
    const response = await api.get("/accounts/dashboard", { params });
    return response.data;
  } catch (error) {
    console.error("getAccountsDashboard error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch report",
    );
  }
};

export const getCustomerOutstandingReport = async (params = {}) => {
  try {
    const response = await api.get("/accounts/customer-outstanding", {
      params,
    });
    return response.data;
  } catch (error) {
    console.error("getCustomerOutstandingReport error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch report",
    );
  }
};

export const getVendorOutstandingReport = async (params = {}) => {
  try {
    const response = await api.get("/accounts/vendor-outstanding", { params });
    return response.data;
  } catch (error) {
    console.error("getVendorOutstandingReport error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch report",
    );
  }
};

export const getExpenseReport = async (params = {}) => {
  try {
    const response = await api.get("/accounts/expenses", { params });
    return response.data;
  } catch (error) {
    console.error("getExpenseReport error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch report",
    );
  }
};
