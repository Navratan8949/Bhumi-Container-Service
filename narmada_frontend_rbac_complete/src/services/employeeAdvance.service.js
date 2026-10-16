import api from "./api";

export const createEmployeeAdvance = async (data) => {
  try {
    const response = await api.post("/employee-advances", data);
    return response.data;
  } catch (error) {
    console.error("createEmployeeAdvance error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to create EmployeeAdvance",
    );
  }
};

export const getEmployeeAdvances = async (params = {}) => {
  try {
    const response = await api.get("/employee-advances", { params });
    return response.data;
  } catch (error) {
    console.error("getEmployeeAdvances error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch EmployeeAdvances",
    );
  }
};

export const getEmployeeAdvanceById = async (id) => {
  try {
    const response = await api.get(`/employee-advances/${id}`);
    return response.data;
  } catch (error) {
    console.error("getEmployeeAdvanceById error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch EmployeeAdvance",
    );
  }
};

export const updateEmployeeAdvance = async (id, data) => {
  try {
    const response = await api.put(`/employee-advances/${id}`, data);
    return response.data;
  } catch (error) {
    console.error("updateEmployeeAdvance error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to update EmployeeAdvance",
    );
  }
};

export const deleteEmployeeAdvance = async (id) => {
  try {
    const response = await api.delete(`/employee-advances/${id}`);
    return response.data;
  } catch (error) {
    console.error("deleteEmployeeAdvance error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to delete EmployeeAdvance",
    );
  }
};

export const recoverEmployeeAdvance = async (id, data) => {
  try {
    const response = await api.post(`/employee-advances/${id}/recover`, data);
    return response.data;
  } catch (error) {
    console.error("recoverEmployeeAdvance error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to recover employee advance",
    );
  }
};
