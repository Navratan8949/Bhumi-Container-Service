import api from "./api";

export const createEmployee = async (data) => {
  try {
    const response = await api.post("/employees", data);
    return response.data;
  } catch (error) {
    console.error("createEmployee error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to create Employee",
    );
  }
};

export const getEmployees = async (params = {}) => {
  try {
    const response = await api.get("/employees", { params });
    return response.data;
  } catch (error) {
    console.error("getEmployees error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch Employees",
    );
  }
};

export const getEmployeeById = async (id) => {
  try {
    const response = await api.get(`/employees/${id}`);
    return response.data;
  } catch (error) {
    console.error("getEmployeeById error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch Employee",
    );
  }
};

export const updateEmployee = async (id, data) => {
  try {
    const response = await api.put(`/employees/${id}`, data);
    return response.data;
  } catch (error) {
    console.error("updateEmployee error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to update Employee",
    );
  }
};

export const deleteEmployee = async (id) => {
  try {
    const response = await api.delete(`/employees/${id}`);
    return response.data;
  } catch (error) {
    console.error("deleteEmployee error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to delete Employee",
    );
  }
};
