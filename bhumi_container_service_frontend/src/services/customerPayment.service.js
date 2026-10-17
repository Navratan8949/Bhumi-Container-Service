import api from "./api";

export const createCustomerPayment = async (data) => {
  try {
    const response = await api.post("/customer-payments", data);
    return response.data;
  } catch (error) {
    console.error("createCustomerPayment error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to create CustomerPayment",
    );
  }
};

export const getCustomerPayments = async (params = {}) => {
  try {
    const response = await api.get("/customer-payments", { params });
    return response.data;
  } catch (error) {
    console.error("getCustomerPayments error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch CustomerPayments",
    );
  }
};

export const getCustomerPaymentById = async (id) => {
  try {
    const response = await api.get(`/customer-payments/${id}`);
    return response.data;
  } catch (error) {
    console.error("getCustomerPaymentById error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch CustomerPayment",
    );
  }
};

export const updateCustomerPayment = async (id, data) => {
  try {
    const response = await api.put(`/customer-payments/${id}`, data);
    return response.data;
  } catch (error) {
    console.error("updateCustomerPayment error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to update CustomerPayment",
    );
  }
};

export const cancelCustomerPayment = async (id) => {
  try {
    const response = await api.delete(`/customer-payments/${id}`);
    return response.data;
  } catch (error) {
    console.error("cancelCustomerPayment error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to delete CustomerPayment",
    );
  }
};
