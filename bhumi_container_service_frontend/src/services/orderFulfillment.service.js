import api from "./api";
export const getAllSupplyOrderFulfillment = async (params = {}) => {
  try {
    const response = await api.get("/fulfillment-reports/supply-orders", {
      params,
    });
    return response.data;
  } catch (error) {
    console.error("getAllSupplyOrderFulfillment error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch supply order fulfillment",
    );
  }
};

export const getSupplyOrderFulfillment = async (id) => {
  try {
    const response = await api.get(`/fulfillment-reports/supply-orders/${id}`);
    return response.data;
  } catch (error) {
    console.error("getSupplyOrderFulfillment error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch supply order fulfillment",
    );
  }
};

export const getDOFulfillment = async (params = {}) => {
  try {
    const response = await api.get("/fulfillment-reports/do-received", {
      params,
    });
    return response.data;
  } catch (error) {
    console.error("getDOFulfillment error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch D.O. fulfillment",
    );
  }
};
