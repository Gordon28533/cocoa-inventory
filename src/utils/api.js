import { clearStoredSession, getStoredSession } from "./session.js";

const _rawApiUrl = process.env.REACT_APP_API_URL;

if (!_rawApiUrl && process.env.NODE_ENV === "production") {
  // Evaluated at build time by CRA's webpack — surfaces in the browser console
  // and in the Vercel build log so the misconfiguration is impossible to miss.
  // eslint-disable-next-line no-console
  console.error(
    "[cocoa-inventory] CRITICAL: REACT_APP_API_URL is not set. " +
    "All API requests will fail. Add it to your Vercel project environment variables and redeploy."
  );
}

// In development fall back to localhost so engineers can run the app without
// setting the var. In production an empty string means every request will fail
// loudly (404 on the same origin) rather than silently hitting a wrong server.
export const API_BASE_URL =
  _rawApiUrl ||
  (process.env.NODE_ENV !== "production" ? "http://localhost:5000" : "");

export const getAuthHeaders = () => {
  const { token } = getStoredSession();
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` })
  };
};

const getPublicHeaders = () => ({ "Content-Type": "application/json" });

const handleApiResponse = async (response, { redirectOn401 = false } = {}) => {
  const data = await response.json().catch(() => ({}));

  if (response.status === 401 && redirectOn401) {
    clearStoredSession();
    window.location.href = "/login";
    throw new Error("Authentication required");
  }

  if (!response.ok) {
    const err = new Error(data.error || data.message || `HTTP ${response.status}`);
    err.status = response.status;
    throw err;
  }

  return data;
};

// M-2: Removed the dead first `headers` key — only the merged object is used
export const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers
    }
  };

  try {
    const response = await fetch(url, config);
    return await handleApiResponse(response, { redirectOn401: true });
  } catch (error) {
    console.error("API request failed:", error);
    throw error;
  }
};

export const publicApiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    ...options,
    headers: {
      ...getPublicHeaders(),
      ...options.headers
    }
  };

  try {
    const response = await fetch(url, config);
    return await handleApiResponse(response);
  } catch (error) {
    console.error("Public API request failed:", error);
    throw error;
  }
};

export const isAuthenticated = () => {
  const { token } = getStoredSession();
  return !!token;
};

export const getUserRole = () => getStoredSession().role;

export const logout = () => {
  clearStoredSession();
  window.location.href = "/login";
};

export const api = {
  // Authentication
  login:         (credentials) => publicApiRequest("/login", { method: "POST", body: JSON.stringify(credentials) }),
  validateToken: ()            => apiRequest("/auth/validate"),

  // Inventory — M-6: optional page/limit params
  getItems:   (params = {}) => apiRequest(`/items${buildQuery(params)}`),
  createItem: (data)        => apiRequest("/items", { method: "POST", body: JSON.stringify(data) }),
  updateItem: (id, data)    => apiRequest(`/items/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteItem: (id)          => apiRequest(`/items/${id}`, { method: "DELETE" }),

  // Requisitions — M-6: optional page/limit params
  getRequisitions:     (params = {}) => apiRequest(`/requisitions${buildQuery(params)}`),
  createRequisition:   (data)        => apiRequest("/requisitions", { method: "POST", body: JSON.stringify(data) }),
  approveRequisition:  (id, data)    => apiRequest(`/requisitions/${id}/approve`, { method: "PUT", body: JSON.stringify(data) }),
  rejectRequisition:   (id, data)    => apiRequest(`/requisitions/${id}/reject`,  { method: "PUT", body: JSON.stringify(data) }),
  fulfillBatch:        (batchId, data) => apiRequest(`/requisitions/batch/${batchId}/fulfill`, { method: "PUT", body: JSON.stringify(data) }),
  getRequisitionByCode: (code)       => apiRequest(`/requisitions/code/${code}`),

  // Departments
  getDepartments:    ()          => apiRequest("/departments"),
  createDepartment:  (data)      => apiRequest("/departments", { method: "POST", body: JSON.stringify(data) }),
  updateDepartment:  (id, data)  => apiRequest(`/departments/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteDepartment:  (id)        => apiRequest(`/departments/${id}`, { method: "DELETE" }),

  // Users (Admin only)
  getUsers:        ()          => apiRequest("/users"),
  createUser:      (data)      => apiRequest("/users", { method: "POST", body: JSON.stringify(data) }),
  updateUser:      (id, data)  => apiRequest(`/users/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteUser:      (id)        => apiRequest(`/users/${id}`, { method: "DELETE" }),
  deactivateUser:  (id)        => apiRequest(`/users/${id}/deactivate`, { method: "PATCH" }),
  activateUser:    (id)        => apiRequest(`/users/${id}/activate`,   { method: "PATCH" }),  // H-3

  // Audit logs
  getAuditLogs: () => apiRequest("/audit-logs"),

  // Change password
  changePassword: (data) => apiRequest("/change-password", { method: "POST", body: JSON.stringify(data) })
};

function buildQuery(params) {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v != null))
  ).toString();
  return qs ? `?${qs}` : "";
}
