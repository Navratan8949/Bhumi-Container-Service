import api from "./api";

export const getCustomers = async (params = {}) => {
  try {
    const response = await api.get("/customers", { params });
    return response.data;
  } catch (error) {
    console.error("getCustomers error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch customers",
    );
  }
};

export const getCustomerById = async (id) => {
  try {
    const response = await api.get(`/customers/${id}`);
    return response.data;
  } catch (error) {
    console.error("getCustomerById error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch customer profile",
    );
  }
};

export const getCustomerStats = async () => {
  try {
    const response = await api.get("/customers/stats");
    return response.data;
  } catch (error) {
    console.error("getCustomerStats error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch customer statistics",
    );
  }
};

export const createCustomer = async (data) => {
  try {
    const response = await api.post("/customers", data);
    return response.data;
  } catch (error) {
    console.error("createCustomer error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to create customer",
    );
  }
};

export const updateCustomer = async (id, data) => {
  try {
    const response = await api.put(`/customers/${id}`, data);
    return response.data;
  } catch (error) {
    console.error("updateCustomer error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to update customer",
    );
  }
};

export const deleteCustomer = async (id, force = false) => {
  try {
    const response = await api.delete(`/customers/${id}${force ? "?force=true" : ""}`);
    return response.data;
  } catch (error) {
    console.error("deleteCustomer error:", error);
    const customErr = new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to delete customer",
    );
    customErr.response = error?.response;
    throw customErr;
  }
};
