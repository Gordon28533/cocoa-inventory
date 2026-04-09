import React, { createContext, useContext, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { useAuth } from "./AuthContext.js";
import { api } from "../utils/api.js";

const DepartmentsContext = createContext();

export const useDepartments = () => useContext(DepartmentsContext);

export const DepartmentsProvider = ({ children }) => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { token } = useAuth();

  const refreshDepartments = async () => {
    if (!token) {
      setDepartments([]);
      setError("");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await api.getDepartments();
      setDepartments(data);
    } catch (err) {
      setError("Failed to fetch departments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshDepartments();
  }, [token]);

  return (
    <DepartmentsContext.Provider value={{ departments, loading, error, refreshDepartments }}>
      {children}
    </DepartmentsContext.Provider>
  );
};

DepartmentsProvider.propTypes = {
  children: PropTypes.node.isRequired
};
