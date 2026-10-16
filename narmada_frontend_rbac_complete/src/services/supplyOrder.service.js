import api from "./api";

export const createSupplyOrder = async (data) => {
  try {
    const response = await api.post("/supply-orders", data);
    return response.data;
  } catch (error) {
    console.error("createSupplyOrder error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to create SupplyOrder",
    );
  }
};

export const getSupplyOrders = async (params = {}) => {
  try {
    const response = await api.get("/supply-orders", { params });
    return response.data;
  } catch (error) {
    console.error("getSupplyOrders error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch SupplyOrders",
    );
  }
};

export const getSupplyOrderById = async (id) => {
  try {
    const response = await api.get(`/supply-orders/${id}`);
    return response.data;
  } catch (error) {
    console.error("getSupplyOrderById error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch SupplyOrder",
    );
  }
};

export const updateSupplyOrder = async (id, data) => {
  try {
    const response = await api.put(`/supply-orders/${id}`, data);
    return response.data;
  } catch (error) {
    console.error("updateSupplyOrder error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to update SupplyOrder",
    );
  }
};

export const deleteSupplyOrder = async (id) => {
  try {
    const response = await api.delete(`/supply-orders/${id}`);
    return response.data;
  } catch (error) {
    console.error("deleteSupplyOrder error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to delete SupplyOrder",
    );
  }
};
