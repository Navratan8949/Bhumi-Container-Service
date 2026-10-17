import api from "./api";

export const createCompany = async (data) => {
  try {
    const response = await api.post("/companies", data);
    return response.data;
  } catch (error) {
    console.error("createCompany error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to create Company",
    );
  }
};

export const getCompanies = async (params = {}) => {
  try {
    const response = await api.get("/companies", { params });
    return response.data;
  } catch (error) {
    console.error("getCompanies error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch Companies",
    );
  }
};

export const getCompanyById = async (id) => {
  try {
    const response = await api.get(`/companies/${id}`);
    return response.data;
  } catch (error) {
    console.error("getCompanyById error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch Company",
    );
  }
};

export const updateCompany = async (id, data) => {
  try {
    const response = await api.put(`/companies/${id}`, data);
    return response.data;
  } catch (error) {
    console.error("updateCompany error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to update Company",
    );
  }
};

export const deleteCompany = async (id) => {
  try {
    const response = await api.delete(`/companies/${id}`);
    return response.data;
  } catch (error) {
    console.error("deleteCompany error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to delete Company",
    );
  }
};
