import api from "./api";

export const createVendorPayment = async (data) => {
  try {
    const response = await api.post("/vendor-payments", data);
    return response.data;
  } catch (error) {
    console.error("createVendorPayment error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to create VendorPayment",
    );
  }
};

export const getVendorPayments = async (params = {}) => {
  try {
    const response = await api.get("/vendor-payments", { params });
    return response.data;
  } catch (error) {
    console.error("getVendorPayments error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch VendorPayments",
    );
  }
};

export const getVendorPaymentById = async (id) => {
  try {
    const response = await api.get(`/vendor-payments/${id}`);
    return response.data;
  } catch (error) {
    console.error("getVendorPaymentById error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch VendorPayment",
    );
  }
};

export const updateVendorPayment = async (id, data) => {
  try {
    const response = await api.put(`/vendor-payments/${id}`, data);
    return response.data;
  } catch (error) {
    console.error("updateVendorPayment error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to update VendorPayment",
    );
  }
};

export const cancelVendorPayment = async (id) => {
  try {
    const response = await api.delete(`/vendor-payments/${id}`);
    return response.data;
  } catch (error) {
    console.error("cancelVendorPayment error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to delete VendorPayment",
    );
  }
};
