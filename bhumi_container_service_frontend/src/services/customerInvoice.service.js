import api from "./api";

export const createCustomerInvoice = async (data) => {
  try {
    const response = await api.post("/customer-invoices", data);
    return response.data;
  } catch (error) {
    console.error("createCustomerInvoice error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to create CustomerInvoice",
    );
  }
};

export const getCustomerInvoices = async (params = {}) => {
  try {
    const response = await api.get("/customer-invoices", { params });
    return response.data;
  } catch (error) {
    console.error("getCustomerInvoices error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch CustomerInvoices",
    );
  }
};

export const getCustomerInvoiceById = async (id) => {
  try {
    const response = await api.get(`/customer-invoices/${id}`);
    return response.data;
  } catch (error) {
    console.error("getCustomerInvoiceById error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch CustomerInvoice",
    );
  }
};

export const updateCustomerInvoice = async (id, data) => {
  try {
    const response = await api.put(`/customer-invoices/${id}`, data);
    return response.data;
  } catch (error) {
    console.error("updateCustomerInvoice error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to update CustomerInvoice",
    );
  }
};

export const cancelCustomerInvoice = async (id) => {
  try {
    const response = await api.delete(`/customer-invoices/${id}`);
    return response.data;
  } catch (error) {
    console.error("cancelCustomerInvoice error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to delete CustomerInvoice",
    );
  }
};
