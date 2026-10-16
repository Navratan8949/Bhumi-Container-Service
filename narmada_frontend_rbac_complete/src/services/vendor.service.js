import api from "./api";

export const createVendor = async (data) => {
  try {
    const response = await api.post("/vendors", data);
    return response.data;
  } catch (error) {
    console.error("createVendor error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to create Vendor",
    );
  }
};

export const getVendors = async (params = {}) => {
  try {
    const response = await api.get("/vendors", { params });
    return response.data;
  } catch (error) {
    console.error("getVendors error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch Vendors",
    );
  }
};

export const getVendorById = async (id) => {
  try {
    const response = await api.get(`/vendors/${id}`);
    return response.data;
  } catch (error) {
    console.error("getVendorById error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch Vendor",
    );
  }
};

export const updateVendor = async (id, data) => {
  try {
    const response = await api.put(`/vendors/${id}`, data);
    return response.data;
  } catch (error) {
    console.error("updateVendor error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to update Vendor",
    );
  }
};

export const deleteVendor = async (id) => {
  try {
    const response = await api.delete(`/vendors/${id}`);
    return response.data;
  } catch (error) {
    console.error("deleteVendor error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to delete Vendor",
    );
  }
};
