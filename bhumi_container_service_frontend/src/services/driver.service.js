import api from "./api";

export const createDriver = async (data) => {
  try {
    const response = await api.post("/drivers", data);
    return response.data;
  } catch (error) {
    console.error("createDriver error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to create Driver",
    );
  }
};

export const getDrivers = async (params = {}) => {
  try {
    const response = await api.get("/drivers", { params });
    return response.data;
  } catch (error) {
    console.error("getDrivers error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch Drivers",
    );
  }
};

export const getDriverById = async (id) => {
  try {
    const response = await api.get(`/drivers/${id}`);
    return response.data;
  } catch (error) {
    console.error("getDriverById error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch Driver",
    );
  }
};

export const updateDriver = async (id, data) => {
  try {
    const response = await api.put(`/drivers/${id}`, data);
    return response.data;
  } catch (error) {
    console.error("updateDriver error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to update Driver",
    );
  }
};

export const deleteDriver = async (id) => {
  try {
    const response = await api.delete(`/drivers/${id}`);
    return response.data;
  } catch (error) {
    console.error("deleteDriver error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to delete Driver",
    );
  }
};
