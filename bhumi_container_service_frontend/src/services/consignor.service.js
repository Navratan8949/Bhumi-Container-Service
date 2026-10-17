import api from "./api";

export const createConsignor = async (data) => {
  try {
    const response = await api.post("/consignors", data);
    return response.data;
  } catch (error) {
    console.error("createConsignor error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to create Consignor",
    );
  }
};

export const getConsignors = async (params = {}) => {
  try {
    const response = await api.get("/consignors", { params });
    return response.data;
  } catch (error) {
    console.error("getConsignors error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch Consignors",
    );
  }
};

export const getConsignorById = async (id) => {
  try {
    const response = await api.get(`/consignors/${id}`);
    return response.data;
  } catch (error) {
    console.error("getConsignorById error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch Consignor",
    );
  }
};

export const updateConsignor = async (id, data) => {
  try {
    const response = await api.put(`/consignors/${id}`, data);
    return response.data;
  } catch (error) {
    console.error("updateConsignor error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to update Consignor",
    );
  }
};

export const deleteConsignor = async (id) => {
  try {
    const response = await api.delete(`/consignors/${id}`);
    return response.data;
  } catch (error) {
    console.error("deleteConsignor error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to delete Consignor",
    );
  }
};
