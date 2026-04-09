import React from "react";
import PropTypes from "prop-types";
import { Navigate } from "react-router-dom";
import { useAuth } from "../Context/AuthContext.js";

/**
 * RoleBasedRoute - restricts access to a route based on user role(s).
 * @param {ReactNode} children - The component to render if allowed.
 * @param {string[]} allowedRoles - Array of allowed roles (e.g. ['admin'])
 * @param {string} redirectTo - Path to redirect if not allowed.
 * @param {string} userRole - The current user's role.
 */

// If userRole is null/undefined, treat as 'guest' (not logged in)
const RoleBasedRoute = ({ children, allowedRoles, redirectTo = "/dashboard", userRole }) => {
  const auth = useAuth();
  const effectiveRole = userRole || auth.role || "guest";
  if (!allowedRoles.includes(effectiveRole)) {
    return <Navigate to={redirectTo} replace />;
  }
  return children;
};

RoleBasedRoute.propTypes = {
  children: PropTypes.node.isRequired,
  allowedRoles: PropTypes.arrayOf(PropTypes.string).isRequired,
  redirectTo: PropTypes.string,
  userRole: PropTypes.string, // Not required, defaults to 'guest'
};

export default RoleBasedRoute;
