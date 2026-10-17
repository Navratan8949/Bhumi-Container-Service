import api from "./api";
const postAction = async (url, data, fallback) => {
  try {
    const response = await api.post(url, data);
    return response.data;
  } catch (error) {
    console.error(`${url} error:`, error);
    throw new Error(
      error?.response?.data?.message || error?.message || fallback,
    );
  }
};

export const createTyre = async (data) =>
  postAction("/tyres", data, "Failed to create tyre");

export const getTyres = async (params = {}) => {
  try {
    const response = await api.get("/tyres", { params });
    return response.data;
  } catch (error) {
    console.error("getTyres error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch tyres",
    );
  }
};

export const getTyreById = async (id) => {
  try {
    const response = await api.get(`/tyres/${id}`);
    return response.data;
  } catch (error) {
    console.error("getTyreById error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch tyre",
    );
  }
};

export const updateTyre = async (id, data) => {
  try {
    const response = await api.put(`/tyres/${id}`, data);
    return response.data;
  } catch (error) {
    console.error("updateTyre error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to update tyre",
    );
  }
};

export const fitTyre = async (id, data) =>
  postAction(`/tyres/${id}/fit`, data, "Failed to fit tyre");
export const removeTyre = async (id, data) =>
  postAction(`/tyres/${id}/remove`, data, "Failed to remove tyre");
export const repairTyre = async (id, data) =>
  postAction(`/tyres/${id}/repair`, data, "Failed to repair tyre");
export const retreadTyre = async (id, data) =>
  postAction(`/tyres/${id}/retread`, data, "Failed to retread tyre");
export const returnToStock = async (id, data) =>
  postAction(
    `/tyres/${id}/return-to-stock`,
    data,
    "Failed to return tyre to stock",
  );
export const scrapTyre = async (id, data) =>
  postAction(`/tyres/${id}/scrap`, data, "Failed to scrap tyre");

export const getTyreHistory = async (id) => {
  try {
    const response = await api.get(`/tyres/${id}/history`);
    return response.data;
  } catch (error) {
    console.error("getTyreHistory error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch tyre history",
    );
  }
};
