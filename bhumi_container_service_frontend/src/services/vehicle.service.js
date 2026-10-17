import api from "./api";

export const createVehicle = async (data) => {
  try {
    const response = await api.post("/vehicles", data);
    return response.data;
  } catch (error) {
    console.error("createVehicle error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to create Vehicle",
    );
  }
};

export const getVehicles = async (params = {}) => {
  try {
    const response = await api.get("/vehicles", { params });
    return response.data;
  } catch (error) {
    console.error("getVehicles error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch Vehicles",
    );
  }
};

export const getVehicleById = async (id) => {
  try {
    const response = await api.get(`/vehicles/${id}`);
    return response.data;
  } catch (error) {
    console.error("getVehicleById error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch Vehicle",
    );
  }
};

export const updateVehicle = async (id, data) => {
  try {
    const response = await api.put(`/vehicles/${id}`, data);
    return response.data;
  } catch (error) {
    console.error("updateVehicle error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to update Vehicle",
    );
  }
};

export const deleteVehicle = async (id) => {
  try {
    const response = await api.delete(`/vehicles/${id}`);
    return response.data;
  } catch (error) {
    console.error("deleteVehicle error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to delete Vehicle",
    );
  }
};
