/**
 * API utility functions for consistent JWT authentication
 */
import { clearStoredSession, getStoredSession } from "./session.js";

export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

/**
 * Get authorization headers with JWT token
 */
export const getAuthHeaders = () => {
  const { token } = getStoredSession();
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

const getPublicHeaders = () => ({
  'Content-Type': 'application/json'
});

const handleApiResponse = async (response, { redirectOn401 = false } = {}) => {
  const data = await response.json().catch(() => ({}));

  if (response.status === 401 && redirectOn401) {
    clearStoredSession();
    window.location.href = '/login';
    throw new Error('Authentication required');
  }

  if (!response.ok) {
    throw new Error(data.error || data.message || `HTTP ${response.status}`);
  }

  return data;
};

/**
 * Make authenticated API request
 */
export const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    headers: getAuthHeaders(),
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
    console.error('API request failed:', error);
    throw error;
  }
};

export const publicApiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    headers: getPublicHeaders(),
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
    console.error('Public API request failed:', error);
    throw error;
  }
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = () => {
  const { token } = getStoredSession();
  return !!token;
};

/**
 * Get current user role
 */
export const getUserRole = () => {
  return getStoredSession().role;
};

/**
 * Logout user
 */
export const logout = () => {
  clearStoredSession();
  window.location.href = '/login';
};

/**
 * Specific API methods for common operations
 */
export const api = {
  // Authentication
  login: (credentials) => publicApiRequest('/login', {
    method: 'POST',
    body: JSON.stringify(credentials)
  }),
  
  validateToken: () => apiRequest('/auth/validate'),
  
  // Inventory
  getItems: () => apiRequest('/items'),
  createItem: (data) => apiRequest('/items', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateItem: (id, data) => apiRequest(`/items/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  deleteItem: (id) => apiRequest(`/items/${id}`, {
    method: 'DELETE'
  }),
  
  // Requisitions
  getRequisitions: () => apiRequest('/requisitions'),
  createRequisition: (data) => apiRequest('/requisitions', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  approveRequisition: (id, data) => apiRequest(`/requisitions/${id}/approve`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  fulfillBatch: (batchId, data) => apiRequest(`/requisitions/batch/${batchId}/fulfill`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  getRequisitionByCode: (code) => apiRequest(`/requisitions/code/${code}`),
  
  // Departments
  getDepartments: () => apiRequest('/departments'),
  createDepartment: (data) => apiRequest('/departments', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateDepartment: (id, data) => apiRequest(`/departments/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  deleteDepartment: (id) => apiRequest(`/departments/${id}`, {
    method: 'DELETE'
  }),
  
  // Users (Admin only)
  getUsers: () => apiRequest('/users'),
  createUser: (data) => apiRequest('/users', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateUser: (id, data) => apiRequest(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  deleteUser: (id) => apiRequest(`/users/${id}`, {
    method: 'DELETE'
  }),
  deactivateUser: (id) => apiRequest(`/users/${id}/deactivate`, {
    method: 'PATCH'
  }),
  
  // Audit logs
  getAuditLogs: () => apiRequest('/audit-logs'),
  
  // Change password
  changePassword: (data) => apiRequest('/change-password', {
    method: 'POST',
    body: JSON.stringify(data)
  })
};
