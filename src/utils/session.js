export const AUTH_STATE_CHANGED_EVENT = "auth-state-changed";

const SESSION_KEYS = {
  token: "token",
  role: "role",
  user: "user",
  departmentId: "department_id",
  currentPath: "currentPath"
};

const emitAuthStateChanged = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_STATE_CHANGED_EVENT));
  }
};

export const getStoredSession = () => ({
  token: localStorage.getItem(SESSION_KEYS.token),
  role: localStorage.getItem(SESSION_KEYS.role) || "guest",
  user: localStorage.getItem(SESSION_KEYS.user) || "",
  departmentId: localStorage.getItem(SESSION_KEYS.departmentId) || ""
});

export const persistSession = ({ token, role, user, departmentId }) => {
  if (token) {
    localStorage.setItem(SESSION_KEYS.token, token);
  } else {
    localStorage.removeItem(SESSION_KEYS.token);
  }

  if (role) {
    localStorage.setItem(SESSION_KEYS.role, role);
  } else {
    localStorage.removeItem(SESSION_KEYS.role);
  }

  if (user) {
    localStorage.setItem(SESSION_KEYS.user, user);
  } else {
    localStorage.removeItem(SESSION_KEYS.user);
  }

  if (departmentId !== undefined && departmentId !== null && departmentId !== "") {
    localStorage.setItem(SESSION_KEYS.departmentId, String(departmentId));
  } else {
    localStorage.removeItem(SESSION_KEYS.departmentId);
  }

  emitAuthStateChanged();
};

export const clearStoredSession = () => {
  localStorage.removeItem(SESSION_KEYS.token);
  localStorage.removeItem(SESSION_KEYS.role);
  localStorage.removeItem(SESSION_KEYS.user);
  localStorage.removeItem(SESSION_KEYS.departmentId);
  emitAuthStateChanged();
};

export const getStoredCurrentPath = () => localStorage.getItem(SESSION_KEYS.currentPath) || "/dashboard";

export const setStoredCurrentPath = (path) => {
  localStorage.setItem(SESSION_KEYS.currentPath, path);
};

export const clearStoredCurrentPath = () => {
  localStorage.removeItem(SESSION_KEYS.currentPath);
};
