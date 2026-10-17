import api from "./api";
export const login = async (credentials) => {
  try {
    const response = await api.post("/auth/login", credentials);
    return response.data;
  } catch (error) {
    console.error("login error:", error);
    throw new Error(
      error?.response?.data?.message || error?.message || "Login failed",
    );
  }
};

export const getCurrentUser = async () => {
  try {
    const response = await api.get("/auth/me");
    return response.data;
  } catch (error) {
    console.error("getCurrentUser error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch authenticated user",
    );
  }
};

export const updateProfile = async (data) => {
  try {
    let response;
    if (data instanceof FormData) {
      response = await api.post("/auth/update-profile", data, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
    } else {
      response = await api.post("/auth/update-profile", data);
    }
    return response.data;
  } catch (error) {
    throw new Error(error?.response?.data?.message || "Failed to update profile");
  }
};

export const changePassword = async (data) => {
  try {
    const response = await api.post("/auth/change-password", data);
    return response.data;
  } catch (error) {
    throw new Error(error?.response?.data?.message || "Failed to change password");
  }
};
