import api from "./api";
export const createSalaryPayment = async (data) => {
  try {
    const response = await api.post("/salary-payments", data);
    return response.data;
  } catch (error) {
    console.error("createSalaryPayment error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to create salary payment",
    );
  }
};

export const getSalaryPayments = async (params = {}) => {
  try {
    const response = await api.get("/salary-payments", { params });
    return response.data;
  } catch (error) {
    console.error("getSalaryPayments error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch salary payments",
    );
  }
};
