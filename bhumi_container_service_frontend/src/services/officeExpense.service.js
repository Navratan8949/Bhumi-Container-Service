import api from "./api";

export const getOfficeExpenses = async (params = {}) => {
  try {
    const response = await api.get("/office-expenses", { params });
    return response.data;
  } catch (error) {
    console.error("getOfficeExpenses error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch Office Expenses",
    );
  }
};

export const getOfficeExpenseById = async (id) => {
  try {
    const response = await api.get(`/office-expenses/${id}`);
    return response.data;
  } catch (error) {
    console.error("getOfficeExpenseById error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch Office Expense details",
    );
  }
};

export const createOfficeExpense = async (data) => {
  try {
    const response = await api.post("/office-expenses", data);
    return response.data;
  } catch (error) {
    console.error("createOfficeExpense error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to create Office Expense",
    );
  }
};

export const updateOfficeExpense = async (id, data) => {
  try {
    const response = await api.put(`/office-expenses/${id}`, data);
    return response.data;
  } catch (error) {
    console.error("updateOfficeExpense error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to update Office Expense",
    );
  }
};

export const cancelOfficeExpense = async (id) => {
  try {
    const response = await api.delete(`/office-expenses/${id}`);
    return response.data;
  } catch (error) {
    console.error("cancelOfficeExpense error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to cancel Office Expense",
    );
  }
};
