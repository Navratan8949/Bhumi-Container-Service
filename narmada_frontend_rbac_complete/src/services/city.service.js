import api from "./api";

export const createCity = async (data) => {
  try {
    const response = await api.post("/cities", data);
    return response.data;
  } catch (error) {
    console.error("createCity error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to create City",
    );
  }
};

export const getCities = async (params = {}) => {
  try {
    const response = await api.get("/cities", { params });
    return response.data;
  } catch (error) {
    console.error("getCities error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch Cities",
    );
  }
};

export const getCityById = async (id) => {
  try {
    const response = await api.get(`/cities/${id}`);
    return response.data;
  } catch (error) {
    console.error("getCityById error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch City",
    );
  }
};

export const updateCity = async (id, data) => {
  try {
    const response = await api.put(`/cities/${id}`, data);
    return response.data;
  } catch (error) {
    console.error("updateCity error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to update City",
    );
  }
};

export const deleteCity = async (id) => {
  try {
    const response = await api.delete(`/cities/${id}`);
    return response.data;
  } catch (error) {
    console.error("deleteCity error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to delete City",
    );
  }
};
