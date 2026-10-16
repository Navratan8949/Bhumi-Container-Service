import api from "./api";
export const createAssignment = async (data) => {
  try {
    const response = await api.post("/vehicle-driver-assignments", data);
    return response.data;
  } catch (error) {
    console.error("createAssignment error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to create assignment",
    );
  }
};

export const getAssignments = async (params = {}) => {
  try {
    const response = await api.get("/vehicle-driver-assignments", { params });
    return response.data;
  } catch (error) {
    console.error("getAssignments error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch assignments",
    );
  }
};

export const getAssignmentById = async (id) => {
  try {
    const response = await api.get(`/vehicle-driver-assignments/${id}`);
    return response.data;
  } catch (error) {
    console.error("getAssignmentById error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch assignment",
    );
  }
};

export const completeAssignment = async (id, data = {}) => {
  try {
    const response = await api.put(
      `/vehicle-driver-assignments/${id}/complete`,
      data,
    );
    return response.data;
  } catch (error) {
    console.error("completeAssignment error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to complete assignment",
    );
  }
};

export const cancelAssignment = async (id) => {
  try {
    const response = await api.delete(`/vehicle-driver-assignments/${id}`);
    return response.data;
  } catch (error) {
    console.error("cancelAssignment error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to cancel assignment",
    );
  }
};
