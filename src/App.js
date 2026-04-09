import React, { useEffect, useMemo, useState } from "react";
import { BrowserRouter as Router, Navigate, NavLink, Route, Routes } from "react-router-dom";
import StockAlert from "./Component/StockAlert.jsx";
import AuditLogViewer from "./Component/AuditLogViewer.jsx";
import RoleBasedRoute from "./Component/RoleBasedRoute.jsx";
import { AuthProvider, useAuth } from "./Context/AuthContext.js";
import { DepartmentsProvider } from "./Context/DepartmentsContext.js";
import LoginPage from "./Pages/LoginPage.js";
import Dashboard from "./Pages/Dashboard.js";
import InventoryDetails from "./Component/InventoryDetails.jsx";
import AdminAddUser from "./Pages/AdminAddUser.js";
import ChangePasswordPage from "./Pages/ChangePasswordPage.js";
import { api } from "./utils/api.js";
import "./styles.css";

const NON_REQUESTER_ROLES = ["account", "hod", "deputy_hod", "it_manager", "account_manager", "stores"];

const AppContent = () => {
  const { token, role, currentPath, logout, isAuthChecked, errorMsg } = useAuth();
  const [inventory, setInventory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const showMyRequisitionsNav = useMemo(
    () => token && !NON_REQUESTER_ROLES.includes(role),
    [role, token]
  );

  useEffect(() => {
    if (!token) {
      setInventory([]);
      setIsLoading(false);
      return;
    }

    if (!isAuthChecked) {
      setIsLoading(true);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    const loadInventory = async () => {
      try {
        const inventoryData = await api.getItems();

        if (isMounted) {
          setInventory(inventoryData);
        }
      } catch (error) {
        console.error("Inventory fetch error:", error);
        if (isMounted) {
          setInventory([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadInventory();

    return () => {
      isMounted = false;
    };
  }, [isAuthChecked, token]);

  if (!isAuthChecked) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          background: "linear-gradient(135deg, rgba(102, 126, 234, 0.9) 0%, rgba(118, 75, 162, 0.9) 100%)"
        }}
      >
        <div
          style={{
            background: "white",
            padding: "40px",
            borderRadius: "20px",
            textAlign: "center",
            boxShadow: "0 20px 60px rgba(0,0,0,0.1)"
          }}
        >
          <h2>Loading...</h2>
          <p>Checking authentication...</p>
          {errorMsg && <div style={{ color: "#d32f2f", marginTop: 16, fontWeight: 600 }}>{errorMsg}</div>}
        </div>
      </div>
    );
  }

  return (
    <DepartmentsProvider>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <div className="container">
          <header>
            <div className="header-content">
              <img src="/cmc_logo1.jpg" alt="Cocoa Marketing Company Logo" className="logo" />
              <div className="header-text">
                <h1>CMC Inventory Control System</h1>
                <p>Cocoa Marketing Company</p>
              </div>
              {token && (
                <div style={{ display: "flex", alignItems: "center", gap: "20px", marginTop: 10 }}>
                  <nav style={{ display: "flex", gap: 16 }}>
                    <NavLink
                      to="/dashboard"
                      style={({ isActive }) => ({
                        fontWeight: isActive ? "bold" : "normal",
                        color: isActive ? "#1976d2" : "#333",
                        textDecoration: "none"
                      })}
                    >
                      Dashboard
                    </NavLink>
                    <NavLink
                      to="/inventory/GEN001"
                      style={({ isActive }) => ({
                        fontWeight: isActive ? "bold" : "normal",
                        color: isActive ? "#1976d2" : "#333",
                        textDecoration: "none"
                      })}
                    >
                      Inventory
                    </NavLink>
                    {showMyRequisitionsNav && (
                      <NavLink
                        to="/dashboard?tab=myreq"
                        style={({ isActive }) => ({
                          fontWeight: isActive ? "bold" : "normal",
                          color: isActive ? "#1976d2" : "#333",
                          textDecoration: "none"
                        })}
                      >
                        My Requisitions
                      </NavLink>
                    )}
                    {role === "admin" && (
                      <NavLink
                        to="/admin/users"
                        style={({ isActive }) => ({
                          fontWeight: isActive ? "bold" : "normal",
                          color: isActive ? "#1976d2" : "#333",
                          textDecoration: "none"
                        })}
                      >
                        User Management
                      </NavLink>
                    )}
                    {role === "admin" && (
                      <NavLink
                        to="/audit-logs"
                        style={({ isActive }) => ({
                          fontWeight: isActive ? "bold" : "normal",
                          color: isActive ? "#1976d2" : "#333",
                          textDecoration: "none"
                        })}
                      >
                        Audit Logs
                      </NavLink>
                    )}
                  </nav>
                  <button
                    onClick={logout}
                    style={{
                      background: "#dc3545",
                      color: "white",
                      border: "none",
                      padding: "8px 16px",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "14px"
                    }}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </header>

          {!isLoading && token && role === "stores" && <StockAlert inventory={inventory} />}

          <main>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route
                path="/dashboard"
                element={
                  token ? (
                    <Dashboard inventory={inventory} setInventory={setInventory} isLoading={isLoading} />
                  ) : (
                    <Navigate to="/" />
                  )
                }
              />
              <Route
                path="/inventory/:id"
                element={token ? <InventoryDetails inventory={inventory} /> : <Navigate to="/" />}
              />
              <Route
                path="/admin/users"
                element={
                  <RoleBasedRoute allowedRoles={["admin"]} redirectTo="/unauthorized">
                    <AdminAddUser />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/audit-logs"
                element={
                  <RoleBasedRoute allowedRoles={["admin"]} redirectTo="/unauthorized">
                    <AuditLogViewer />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/unauthorized"
                element={
                  <div style={{ padding: 40, textAlign: "center" }}>
                    <h2>Unauthorized</h2>
                    <p>You do not have permission to access this page.</p>
                  </div>
                }
              />
              <Route path="/change-password" element={token ? <ChangePasswordPage /> : <Navigate to="/" />} />
              <Route path="*" element={token ? <Navigate to={currentPath} /> : <Navigate to="/" />} />
            </Routes>
          </main>
        </div>
      </Router>
    </DepartmentsProvider>
  );
};

const App = () => (
  <AuthProvider>
    <AppContent />
  </AuthProvider>
);

export default App;
