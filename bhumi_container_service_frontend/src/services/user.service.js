import api from "./api";

export const createUser = async (data) => {
  try {
    const response = await api.post("/users", data);
    return response.data;
  } catch (error) {
    console.error("createUser error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to create User",
    );
  }
};

export const getUsers = async (params = {}) => {
  try {
    const response = await api.get("/users", { params });
    return response.data;
  } catch (error) {
    console.error("getUsers error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch Users",
    );
  }
};

export const getUserById = async (id) => {
  try {
    const response = await api.get(`/users/${id}`);
    return response.data;
  } catch (error) {
    console.error("getUserById error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch User",
    );
  }
};

export const updateUser = async (id, data) => {
  try {
    const response = await api.put(`/users/${id}`, data);
    return response.data;
  } catch (error) {
    console.error("updateUser error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to update User",
    );
  }
};

export const deleteUser = async (id) => {
  try {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  } catch (error) {
    console.error("deleteUser error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to delete User",
    );
  }
};
