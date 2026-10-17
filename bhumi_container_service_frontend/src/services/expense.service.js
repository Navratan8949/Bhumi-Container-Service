import api from "./api";

export const createExpense = async (data) => {
  try {
    const response = await api.post("/expenses", data);
    return response.data;
  } catch (error) {
    console.error("createExpense error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to create Expense",
    );
  }
};

export const getExpenses = async (params = {}) => {
  try {
    const response = await api.get("/expenses", { params });
    return response.data;
  } catch (error) {
    console.error("getExpenses error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch Expenses",
    );
  }
};

export const getExpenseById = async (id) => {
  try {
    const response = await api.get(`/expenses/${id}`);
    return response.data;
  } catch (error) {
    console.error("getExpenseById error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch Expense",
    );
  }
};

export const updateExpense = async (id, data) => {
  try {
    const response = await api.put(`/expenses/${id}`, data);
    return response.data;
  } catch (error) {
    console.error("updateExpense error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to update Expense",
    );
  }
};

export const cancelExpense = async (id) => {
  try {
    const response = await api.delete(`/expenses/${id}`);
    return response.data;
  } catch (error) {
    console.error("cancelExpense error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to delete Expense",
    );
  }
};
