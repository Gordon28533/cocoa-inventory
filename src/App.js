import React, { useEffect, useState } from "react";
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

const getNavLinkClassName = ({ isActive }) => `app-nav__link${isActive ? " app-nav__link--active" : ""}`;

const AppContent = () => {
  const { token, role, currentPath, logout, isAuthChecked, errorMsg } = useAuth();
  const [inventory, setInventory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  useEffect(() => {
    if (!token) {
      setIsMobileMenuOpen(false);
    }
  }, [token]);

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const handleLogout = () => {
    closeMobileMenu();
    logout();
  };

  if (!isAuthChecked) {
    return (
      <div className="auth-loading-screen">
        <div className="auth-loading-card">
          <h2>Loading your session...</h2>
          <p>Checking your authentication state before opening the workspace.</p>
          {errorMsg && <div className="auth-loading-error">{errorMsg}</div>}
        </div>
      </div>
    );
  }

  return (
    <DepartmentsProvider>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <div className="container">
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>
          <header>
            <div className="header-content">
              <img src="/cmc_logo1.jpg" alt="Cocoa Marketing Company Logo" className="logo" />
              <div className="header-text">
                <h1>CMC Inventory Control System</h1>
                <p>Cocoa Marketing Company</p>
              </div>
              {token && (
                <>
                  <button
                    type="button"
                    className="app-nav-toggle"
                    aria-expanded={isMobileMenuOpen}
                    aria-controls="app-primary-nav"
                    aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
                    onClick={() => setIsMobileMenuOpen((current) => !current)}
                  >
                    <span className="app-nav-toggle__icon" aria-hidden="true">
                      {isMobileMenuOpen ? "X" : "|||"}
                    </span>
                    <span>{isMobileMenuOpen ? "Close" : "Menu"}</span>
                  </button>
                  <div className={`app-shell-controls${isMobileMenuOpen ? " app-shell-controls--open" : ""}`}>
                    <nav id="app-primary-nav" className="app-nav" aria-label="Primary navigation">
                      <NavLink to="/dashboard" className={getNavLinkClassName} onClick={closeMobileMenu}>
                        Workspace
                      </NavLink>
                      {role === "admin" && (
                        <NavLink to="/admin/users" className={getNavLinkClassName} onClick={closeMobileMenu}>
                          User Management
                        </NavLink>
                      )}
                    </nav>
                    <div className="app-shell-actions">
                      <NavLink to="/change-password" className="btn btn-secondary" onClick={closeMobileMenu}>
                        Change Password
                      </NavLink>
                      <button onClick={handleLogout} className="btn btn-danger">
                        Logout
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </header>

          {!isLoading && token && role === "stores" && <StockAlert inventory={inventory} />}

          <main id="main-content" tabIndex={-1}>
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
              <Route path="/inventory" element={token ? <Navigate to="/dashboard?tab=inventory" replace /> : <Navigate to="/" />} />
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
                  <div className="page-message-card">
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
