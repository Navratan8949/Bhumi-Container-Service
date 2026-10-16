import api from "./api";
export const createLRBilty = async (data) => {
  try {
    const response = await api.post("/lr-bilties", data);
    return response.data;
  } catch (error) {
    console.error("createLRBilty error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to create LR/Bilty",
    );
  }
};

export const getLRBilties = async (params = {}) => {
  try {
    const response = await api.get("/lr-bilties", { params });
    return response.data;
  } catch (error) {
    console.error("getLRBilties error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch LR/Bilties",
    );
  }
};

export const getLRBiltyById = async (id) => {
  try {
    const response = await api.get(`/lr-bilties/${id}`);
    return response.data;
  } catch (error) {
    console.error("getLRBiltyById error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch LR/Bilty",
    );
  }
};

export const updateLRBilty = async (id, data) => {
  try {
    const response = await api.put(`/lr-bilties/${id}`, data);
    return response.data;
  } catch (error) {
    console.error("updateLRBilty error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to update LR/Bilty",
    );
  }
};

export const deleteLRBilty = async (id) => {
  try {
    const response = await api.delete(`/lr-bilties/${id}`);
    return response.data;
  } catch (error) {
    console.error("deleteLRBilty error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to delete LR/Bilty",
    );
  }
};
