import api from "./api";

export const createParty = async (data) => {
  try {
    const response = await api.post("/parties", data);
    return response.data;
  } catch (error) {
    console.error("createParty error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to create Party",
    );
  }
};

export const getParties = async (params = {}) => {
  try {
    const response = await api.get("/parties", { params });
    return response.data;
  } catch (error) {
    console.error("getParties error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch Parties",
    );
  }
};

export const getPartyById = async (id) => {
  try {
    const response = await api.get(`/parties/${id}`);
    return response.data;
  } catch (error) {
    console.error("getPartyById error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch Party",
    );
  }
};

export const updateParty = async (id, data) => {
  try {
    const response = await api.put(`/parties/${id}`, data);
    return response.data;
  } catch (error) {
    console.error("updateParty error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to update Party",
    );
  }
};

export const deleteParty = async (id) => {
  try {
    const response = await api.delete(`/parties/${id}`);
    return response.data;
  } catch (error) {
    console.error("deleteParty error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to delete Party",
    );
  }
};
