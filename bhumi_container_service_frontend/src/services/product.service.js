import api from "./api";

export const createProduct = async (data) => {
  try {
    const response = await api.post("/products", data);
    return response.data;
  } catch (error) {
    console.error("createProduct error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to create Product",
    );
  }
};

export const getProducts = async (params = {}) => {
  try {
    const response = await api.get("/products", { params });
    return response.data;
  } catch (error) {
    console.error("getProducts error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch Products",
    );
  }
};

export const getProductById = async (id) => {
  try {
    const response = await api.get(`/products/${id}`);
    return response.data;
  } catch (error) {
    console.error("getProductById error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch Product",
    );
  }
};

export const updateProduct = async (id, data) => {
  try {
    const response = await api.put(`/products/${id}`, data);
    return response.data;
  } catch (error) {
    console.error("updateProduct error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to update Product",
    );
  }
};

export const deleteProduct = async (id) => {
  try {
    const response = await api.delete(`/products/${id}`);
    return response.data;
  } catch (error) {
    console.error("deleteProduct error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to delete Product",
    );
  }
};
