import api from "./api";

export const createAttendance = async (data) => {
  try {
    const response = await api.post("/attendances", data);
    return response.data;
  } catch (error) {
    console.error("createAttendance error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to create Attendance",
    );
  }
};

export const getAttendances = async (params = {}) => {
  try {
    const response = await api.get("/attendances", { params });
    return response.data;
  } catch (error) {
    console.error("getAttendances error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch Attendances",
    );
  }
};

export const getAttendanceById = async (id) => {
  try {
    const response = await api.get(`/attendances/${id}`);
    return response.data;
  } catch (error) {
    console.error("getAttendanceById error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch Attendance",
    );
  }
};

export const updateAttendance = async (id, data) => {
  try {
    const response = await api.put(`/attendances/${id}`, data);
    return response.data;
  } catch (error) {
    console.error("updateAttendance error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to update Attendance",
    );
  }
};

export const deleteAttendance = async (id) => {
  try {
    const response = await api.delete(`/attendances/${id}`);
    return response.data;
  } catch (error) {
    console.error("deleteAttendance error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to delete Attendance",
    );
  }
};
