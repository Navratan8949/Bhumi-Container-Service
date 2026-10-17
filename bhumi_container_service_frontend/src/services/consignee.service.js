import api from "./api";

export const createConsignee = async (data) => {
  try {
    const response = await api.post("/consignees", data);
    return response.data;
  } catch (error) {
    console.error("createConsignee error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to create Consignee",
    );
  }
};

export const getConsignees = async (params = {}) => {
  try {
    const response = await api.get("/consignees", { params });
    return response.data;
  } catch (error) {
    console.error("getConsignees error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch Consignees",
    );
  }
};

export const getConsigneeById = async (id) => {
  try {
    const response = await api.get(`/consignees/${id}`);
    return response.data;
  } catch (error) {
    console.error("getConsigneeById error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch Consignee",
    );
  }
};

export const updateConsignee = async (id, data) => {
  try {
    const response = await api.put(`/consignees/${id}`, data);
    return response.data;
  } catch (error) {
    console.error("updateConsignee error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to update Consignee",
    );
  }
};

export const deleteConsignee = async (id) => {
  try {
    const response = await api.delete(`/consignees/${id}`);
    return response.data;
  } catch (error) {
    console.error("deleteConsignee error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to delete Consignee",
    );
  }
};
