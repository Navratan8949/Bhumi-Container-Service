import api from "./api";

export const createMaintenance = async (data) => {
  try {
    const response = await api.post("/maintenances", data);
    return response.data;
  } catch (error) {
    console.error("createMaintenance error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to create Maintenance",
    );
  }
};

export const getMaintenances = async (params = {}) => {
  try {
    const response = await api.get("/maintenances", { params });
    return response.data;
  } catch (error) {
    console.error("getMaintenances error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch Maintenances",
    );
  }
};

export const getMaintenanceById = async (id) => {
  try {
    const response = await api.get(`/maintenances/${id}`);
    return response.data;
  } catch (error) {
    console.error("getMaintenanceById error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch Maintenance",
    );
  }
};

export const updateMaintenance = async (id, data) => {
  try {
    const response = await api.put(`/maintenances/${id}`, data);
    return response.data;
  } catch (error) {
    console.error("updateMaintenance error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to update Maintenance",
    );
  }
};

export const deleteMaintenance = async (id) => {
  try {
    const response = await api.delete(`/maintenances/${id}`);
    return response.data;
  } catch (error) {
    console.error("deleteMaintenance error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to delete Maintenance",
    );
  }
};

export const getVehicleMaintenanceHistory = async (vehicleId, params = {}) => {
  try {
    const response = await api.get(`/maintenances/vehicle/${vehicleId}`, {
      params,
    });
    return response.data;
  } catch (error) {
    console.error("getVehicleMaintenanceHistory error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch vehicle maintenance history",
    );
  }
};
