import api from "./api";
export const createDOReceived = async (data) => {
  try {
    const response = await api.post("/do-received", data);
    return response.data;
  } catch (error) {
    console.error("createDOReceived error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to create D.O. received",
    );
  }
};

export const getDOReceived = async (params = {}) => {
  try {
    const response = await api.get("/do-received", { params });
    return response.data;
  } catch (error) {
    console.error("getDOReceived error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch D.O. received records",
    );
  }
};

export const getDOReceivedById = async (id) => {
  try {
    const response = await api.get(`/do-received/${id}`);
    return response.data;
  } catch (error) {
    console.error("getDOReceivedById error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch D.O. received record",
    );
  }
};

export const updateDOReceived = async (id, data) => {
  try {
    const response = await api.put(`/do-received/${id}`, data);
    return response.data;
  } catch (error) {
    console.error("updateDOReceived error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to update D.O. received",
    );
  }
};

export const deleteDOReceived = async (id) => {
  try {
    const response = await api.delete(`/do-received/${id}`);
    return response.data;
  } catch (error) {
    console.error("deleteDOReceived error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to delete D.O. received",
    );
  }
};
