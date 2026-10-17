import api from "./api";

export const getDashboard = async (params = {}) => {
  try {
    const response = await api.get("/dashboard", { params });
    return response.data;
  } catch (error) {
    console.error("getDashboard error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch report",
    );
  }
};
