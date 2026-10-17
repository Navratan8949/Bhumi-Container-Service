import api from "./api";

export const getExpenseReport = async (params = {}) => {
  try {
    const response = await api.get("/expense-reports", { params });
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

export const getExpenseCategoryReport = async (params = {}) => {
  try {
    const response = await api.get("/expense-reports/categories", { params });
    return response.data;
  } catch (error) {
    console.error("getExpenseCategoryReport error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch report",
    );
  }
};
