import api from "./api";

export const createInventoryItem = async (data) => {
  try {
    const response = await api.post("/inventory/items", data);
    return response.data;
  } catch (error) {
    console.error("createInventoryItem error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to create Inventory Item",
    );
  }
};

export const getInventoryItems = async (params = {}) => {
  try {
    const response = await api.get("/inventory/items", { params });
    return response.data;
  } catch (error) {
    console.error("getInventoryItems error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch Inventory Items",
    );
  }
};

export const getInventoryItemById = async (id) => {
  try {
    const response = await api.get(`/inventory/items/${id}`);
    return response.data;
  } catch (error) {
    console.error("getInventoryItemById error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch Inventory Item",
    );
  }
};

export const updateInventoryItem = async (id, data) => {
  try {
    const response = await api.put(`/inventory/items/${id}`, data);
    return response.data;
  } catch (error) {
    console.error("updateInventoryItem error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to update Inventory Item",
    );
  }
};

export const deleteInventoryItem = async (id) => {
  try {
    const response = await api.delete(`/inventory/items/${id}`);
    return response.data;
  } catch (error) {
    console.error("deleteInventoryItem error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to delete Inventory Item",
    );
  }
};

export const stockIn = async (data) => {
  try {
    const response = await api.post("/inventory/stock-in", data);
    return response.data;
  } catch (error) {
    console.error("stockIn error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to add Stock",
    );
  }
};

export const stockOut = async (data) => {
  try {
    const response = await api.post("/inventory/stock-out", data);
    return response.data;
  } catch (error) {
    console.error("stockOut error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to issue Stock",
    );
  }
};

export const adjustInventoryStock = async (data) => {
  try {
    const response = await api.post("/inventory/adjust-stock", data);
    return response.data;
  } catch (error) {
    console.error("adjustInventoryStock error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to adjust Stock",
    );
  }
};

export const getInventoryTransactions = async (params = {}) => {
  try {
    const response = await api.get("/inventory/transactions", { params });
    return response.data;
  } catch (error) {
    console.error("getInventoryTransactions error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch Inventory Transactions",
    );
  }
};

export const getInventoryItemHistory = async (id) => {
  try {
    const response = await api.get(`/inventory/items/${id}/history`);
    return response.data;
  } catch (error) {
    console.error("getInventoryItemHistory error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch Inventory History",
    );
  }
};

export const getLowStockInventory = async () => {
  try {
    const response = await api.get("/inventory/low-stock");
    return response.data;
  } catch (error) {
    console.error("getLowStockInventory error:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch Low Stock Inventory",
    );
  }
};
