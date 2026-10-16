import api from "./api";
export const createTrip = async (data) => {
  try {
    const response = await api.post("/trips", data);
    return response.data;
  } catch (error) {
    console.error("createTrip error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to create trip",
    );
  }
};

export const updateTrip = async (id, data) => {
  try {
    const response = await api.put(`/trips/${id}`, data);
    return response.data;
  } catch (error) {
    console.error("updateTrip error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to update trip",
    );
  }
};

export const getTrips = async (params = {}) => {
  try {
    const response = await api.get("/trips", { params });
    return response.data;
  } catch (error) {
    console.error("getTrips error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch trips",
    );
  }
};

export const getTripById = async (id) => {
  try {
    const response = await api.get(`/trips/${id}`);
    return response.data;
  } catch (error) {
    console.error("getTripById error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch trip",
    );
  }
};

export const dispatchTrip = async (id, data = {}) => {
  try {
    const response = await api.put(`/trips/${id}/dispatch`, data);
    return response.data;
  } catch (error) {
    console.error("dispatchTrip error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to dispatch trip",
    );
  }
};

export const startTrip = async (id, data = {}) => {
  try {
    const response = await api.put(`/trips/${id}/start`, data);
    return response.data;
  } catch (error) {
    console.error("startTrip error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to start trip",
    );
  }
};

export const deliverTrip = async (id, data = {}) => {
  try {
    const response = await api.put(`/trips/${id}/deliver`, data);
    return response.data;
  } catch (error) {
    console.error("deliverTrip error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to deliver trip",
    );
  }
};

export const completeTrip = async (id, data = {}) => {
  try {
    const response = await api.put(`/trips/${id}/complete`, data);
    return response.data;
  } catch (error) {
    console.error("completeTrip error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to complete trip",
    );
  }
};

export const cancelTrip = async (id) => {
  try {
    const response = await api.put(`/trips/${id}/cancel`);
    return response.data;
  } catch (error) {
    console.error("cancelTrip error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to cancel trip",
    );
  }
};

export const deleteTrip = async (id) => {
  try {
    const response = await api.delete(`/trips/${id}`);
    return response.data;
  } catch (error) {
    console.error("deleteTrip error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to delete trip",
    );
  }
};
