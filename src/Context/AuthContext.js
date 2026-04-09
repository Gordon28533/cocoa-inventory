import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { api } from "../utils/api.js";
import {
  AUTH_STATE_CHANGED_EVENT,
  clearStoredCurrentPath,
  clearStoredSession,
  getStoredCurrentPath,
  getStoredSession,
  persistSession,
  setStoredCurrentPath
} from "../utils/session.js";

const VALID_PATH_PREFIXES = ["/dashboard", "/inventory/", "/admin/users", "/change-password", "/audit-logs"];

export const AuthContext = createContext(null);

const normalizeCurrentPath = (path) => {
  if (!path || path === "/") {
    return "/dashboard";
  }

  return VALID_PATH_PREFIXES.some((prefix) => path.startsWith(prefix)) ? path : "/dashboard";
};

export const AuthProvider = ({ children }) => {
  const storedSession = getStoredSession();
  const [token, setToken] = useState(storedSession.token);
  const [role, setRole] = useState(storedSession.role);
  const [user, setUser] = useState(storedSession.user);
  const [departmentId, setDepartmentId] = useState(storedSession.departmentId);
  const [currentPath, setCurrentPathState] = useState(normalizeCurrentPath(getStoredCurrentPath()));
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const setCurrentPath = useCallback((path) => {
    const nextPath = normalizeCurrentPath(path);
    setCurrentPathState(nextPath);
    setStoredCurrentPath(nextPath);
  }, []);

  const syncFromStorage = useCallback(() => {
    const session = getStoredSession();
    const nextPath = normalizeCurrentPath(getStoredCurrentPath());

    setToken(session.token);
    setRole(session.role);
    setUser(session.user);
    setDepartmentId(session.departmentId);
    setCurrentPathState(nextPath);
  }, []);

  const login = useCallback(({ token: nextToken, role: nextRole, user: nextUser, departmentId: nextDepartmentId }) => {
    persistSession({
      token: nextToken,
      role: nextRole || "guest",
      user: nextUser || "",
      departmentId: nextDepartmentId
    });
    setToken(nextToken);
    setRole(nextRole || "guest");
    setUser(nextUser || "");
    setDepartmentId(nextDepartmentId ? String(nextDepartmentId) : "");
    setErrorMsg("");
    setIsAuthChecked(false);
  }, []);

  const logout = useCallback(() => {
    clearStoredSession();
    clearStoredCurrentPath();
    setToken(null);
    setRole("guest");
    setUser("");
    setDepartmentId("");
    setCurrentPathState("/dashboard");
    setErrorMsg("");
    setIsAuthChecked(true);
  }, []);

  useEffect(() => {
    const handleStateSync = () => {
      syncFromStorage();
    };

    window.addEventListener("storage", handleStateSync);
    window.addEventListener("focus", handleStateSync);
    window.addEventListener(AUTH_STATE_CHANGED_EVENT, handleStateSync);

    handleStateSync();

    return () => {
      window.removeEventListener("storage", handleStateSync);
      window.removeEventListener("focus", handleStateSync);
      window.removeEventListener(AUTH_STATE_CHANGED_EVENT, handleStateSync);
    };
  }, [syncFromStorage]);

  useEffect(() => {
    if (!token) {
      setIsAuthChecked(true);
      return;
    }

    let isMounted = true;
    setIsAuthChecked(false);

    const validateSession = async () => {
      try {
        const authData = await api.validateToken();

        if (!isMounted) {
          return;
        }

        const nextRole = authData.role || "guest";
        const nextUser = authData.staffName || user || "";

        persistSession({
          token,
          role: nextRole,
          user: nextUser,
          departmentId
        });

        setRole(nextRole);
        setUser(nextUser);
        setErrorMsg("");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        console.error("Authentication error:", error);
        clearStoredSession();
        setToken(null);
        setRole("guest");
        setUser("");
        setDepartmentId("");
        setCurrentPathState("/dashboard");
        setStoredCurrentPath("/dashboard");
        setErrorMsg("Session expired or unauthorized. Please log in again.");
      } finally {
        if (isMounted) {
          setIsAuthChecked(true);
        }
      }
    };

    validateSession();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const value = useMemo(
    () => ({
      token,
      role,
      user,
      departmentId,
      currentPath,
      isAuthChecked,
      errorMsg,
      isAuthenticated: Boolean(token),
      login,
      logout,
      setCurrentPath,
      syncFromStorage
    }),
    [currentPath, departmentId, errorMsg, isAuthChecked, login, logout, role, setCurrentPath, syncFromStorage, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
};
