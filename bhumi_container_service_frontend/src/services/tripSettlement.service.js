import api from "./api";
export const getTripSettlement = async (tripId) => {
  try {
    const response = await api.get(`/trip-settlements/${tripId}`);
    return response.data;
  } catch (error) {
    console.error("getTripSettlement error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch trip settlement",
    );
  }
};
