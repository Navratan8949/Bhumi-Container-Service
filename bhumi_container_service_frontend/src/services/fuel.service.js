import api from "./api";

export const createFuel = async (data) => {
  try {
    const response = await api.post("/fuels", data);
    return response.data;
  } catch (error) {
    console.error("createFuel error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to create Fuel",
    );
  }
};

export const getFuels = async (params = {}) => {
  try {
    const response = await api.get("/fuels", { params });
    return response.data;
  } catch (error) {
    console.error("getFuels error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch Fuels",
    );
  }
};

export const getFuelById = async (id) => {
  try {
    const response = await api.get(`/fuels/${id}`);
    return response.data;
  } catch (error) {
    console.error("getFuelById error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch Fuel",
    );
  }
};

export const updateFuel = async (id, data) => {
  try {
    const response = await api.put(`/fuels/${id}`, data);
    return response.data;
  } catch (error) {
    console.error("updateFuel error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to update Fuel",
    );
  }
};

export const deleteFuel = async (id) => {
  try {
    const response = await api.delete(`/fuels/${id}`);
    return response.data;
  } catch (error) {
    console.error("deleteFuel error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to delete Fuel",
    );
  }
};
