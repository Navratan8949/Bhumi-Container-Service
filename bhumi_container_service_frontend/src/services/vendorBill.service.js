import api from "./api";

export const createVendorBill = async (data) => {
  try {
    const response = await api.post("/vendor-bills", data);
    return response.data;
  } catch (error) {
    console.error("createVendorBill error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to create VendorBill",
    );
  }
};

export const getVendorBills = async (params = {}) => {
  try {
    const response = await api.get("/vendor-bills", { params });
    return response.data;
  } catch (error) {
    console.error("getVendorBills error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch VendorBills",
    );
  }
};

export const getVendorBillById = async (id) => {
  try {
    const response = await api.get(`/vendor-bills/${id}`);
    return response.data;
  } catch (error) {
    console.error("getVendorBillById error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch VendorBill",
    );
  }
};

export const updateVendorBill = async (id, data) => {
  try {
    const response = await api.put(`/vendor-bills/${id}`, data);
    return response.data;
  } catch (error) {
    console.error("updateVendorBill error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to update VendorBill",
    );
  }
};

export const cancelVendorBill = async (id) => {
  try {
    const response = await api.delete(`/vendor-bills/${id}`);
    return response.data;
  } catch (error) {
    console.error("cancelVendorBill error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to delete VendorBill",
    );
  }
};
