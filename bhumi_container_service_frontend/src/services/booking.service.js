import api from "./api";

export const createBooking = async (data) => {
  try {
    const response = await api.post("/bookings", data);
    return response.data;
  } catch (error) {
    console.error("createBooking error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to create Booking",
    );
  }
};

export const getBookings = async (params = {}) => {
  try {
    const response = await api.get("/bookings", { params });
    return response.data;
  } catch (error) {
    console.error("getBookings error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch Bookings",
    );
  }
};

export const getBookingById = async (id) => {
  try {
    const response = await api.get(`/bookings/${id}`);
    return response.data;
  } catch (error) {
    console.error("getBookingById error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch Booking",
    );
  }
};

export const updateBooking = async (id, data) => {
  try {
    const response = await api.put(`/bookings/${id}`, data);
    return response.data;
  } catch (error) {
    console.error("updateBooking error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to update Booking",
    );
  }
};

export const deleteBooking = async (id) => {
  try {
    const response = await api.delete(`/bookings/${id}`);
    return response.data;
  } catch (error) {
    console.error("deleteBooking error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to delete Booking",
    );
  }
};
