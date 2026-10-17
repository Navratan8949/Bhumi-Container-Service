
export const getComplianceDashboard = async (params = {}) => {
  try {
    const response = await api.get("/vehicle-documents/compliance/dashboard", { params });
    return response.data;
  } catch (error) {
    console.error("getComplianceDashboard error:", error);
    throw new Error(error?.response?.data?.message || error?.message || "Failed to fetch compliance dashboard");
  }
};

export const getComplianceDocuments = async (params = {}) => {
  try {
    const response = await api.get("/vehicle-documents/compliance/expiring", { params });
    return response.data;
  } catch (error) {
    console.error("getComplianceDocuments error:", error);
    throw new Error(error?.response?.data?.message || error?.message || "Failed to fetch expiring compliance documents");
  }
};
