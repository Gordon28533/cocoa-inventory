import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, NavLink } from "react-router-dom";
import StockAlert from "./Component/StockAlert.jsx";
import LoginPage from "./Pages/LoginPage.js";
import Dashboard from "./Pages/Dashboard.js";
import InventoryList from "./Component/InventoryList.jsx";
import InventoryDetails from "./Component/InventoryDetails.jsx"; // to be created
import AdminAddUser from "./Pages/AdminAddUser.js";
import ChangePasswordPage from "./Pages/ChangePasswordPage.js";
import "./styles.css";

const App = () => {
  const [inventory, setInventory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [role, setRole] = useState(() => localStorage.getItem("role"));
  const [isAuthChecked, setIsAuthChecked] = useState(false); // Track if we've checked auth
  const [currentPath, setCurrentPath] = useState(() => localStorage.getItem("currentPath") || "/dashboard");

  useEffect(() => {
    if (!token) {
      setInventory([]);
      setIsLoading(false);
      setIsAuthChecked(true); // Mark auth as checked even if no token
      return;
    }
    fetch("http://localhost:5000/items", {
      headers: { Authorization: "Bearer " + token },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Unauthorized or failed to fetch");
        return res.json();
      })
      .then((data) => {
        setInventory(data);
        setIsLoading(false);
        setIsAuthChecked(true);
      })
      .catch((err) => {
        setInventory([]);
        setIsLoading(false);
        setIsAuthChecked(true);
        console.error("Failed to fetch inventory:", err.message);
      });
  }, [token]);

  useEffect(() => {
    // Always sync role and token from localStorage after login, logout, reload, or storage change
    const syncState = () => {
      setRole(localStorage.getItem("role"));
      setToken(localStorage.getItem("token"));
      // Restore current path from localStorage
      const savedPath = localStorage.getItem("currentPath");
      if (savedPath && savedPath !== currentPath) {
        setCurrentPath(savedPath);
      }
    };
    window.addEventListener("storage", syncState);
    window.addEventListener("focus", syncState);
    syncState(); // Run once on mount
    return () => {
      window.removeEventListener("storage", syncState);
      window.removeEventListener("focus", syncState);
    };
  }, [currentPath]);

  // Save current path to localStorage whenever it changes
  useEffect(() => {
    if (currentPath && currentPath !== "/") {
      localStorage.setItem("currentPath", currentPath);
    }
  }, [currentPath]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user");
    localStorage.removeItem("currentPath"); // Clear saved path on logout
    setToken(null);
    setRole(null);
    setIsAuthChecked(true);
    setCurrentPath("/dashboard");
  };

  // Show loading spinner while checking authentication
  if (!isAuthChecked) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.9) 0%, rgba(118, 75, 162, 0.9) 100%)'
      }}>
        <div style={{ 
          background: 'white', 
          padding: '40px', 
          borderRadius: '20px', 
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(0,0,0,0.1)'
        }}>
          <h2>Loading...</h2>
          <p>Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="container">
        <header>
          <div className="header-content">
            <img src="/cmc_logo1.jpg" alt="Cocoa Marketing Company Logo" className="logo" />
            <div className="header-text">
              <h1>🏢 CMC Inventory Control System</h1>
              <p>Cocoa Marketing Company</p>
            </div>
            {token && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: 10 }}>
                <nav style={{ display: 'flex', gap: 16 }}>
                  <NavLink to="/dashboard" style={({ isActive }) => ({ fontWeight: isActive ? 'bold' : 'normal', color: isActive ? '#1976d2' : '#333', textDecoration: 'none' })}>Dashboard</NavLink>
                  <NavLink to="/inventory/GEN001" style={({ isActive }) => ({ fontWeight: isActive ? 'bold' : 'normal', color: isActive ? '#1976d2' : '#333', textDecoration: 'none' })}>Inventory</NavLink>
                  <NavLink to="/dashboard" state={{ tab: 'myreq' }} style={({ isActive }) => ({ fontWeight: isActive ? 'bold' : 'normal', color: isActive ? '#1976d2' : '#333', textDecoration: 'none' })}>My Requisitions</NavLink>
                {role === 'admin' && (
                    <NavLink to="/admin/users" style={({ isActive }) => ({ fontWeight: isActive ? 'bold' : 'normal', color: isActive ? '#1976d2' : '#333', textDecoration: 'none' })}>User Management</NavLink>
                  )}
                  </nav>
                <button 
                  onClick={handleLogout}
                  style={{
                    background: '#dc3545',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </header>

        {!isLoading && token && role === 'stores' && <StockAlert inventory={inventory} />}

        <main>
          <Routes>
            <Route
              path="/"
              element={token ? <Navigate to={currentPath} /> : <LoginPage setToken={setToken} setRole={setRole} />}
            />
            <Route
              path="/dashboard"
              element={
                token ? (
                  <Dashboard
                    inventory={inventory}
                    setInventory={setInventory}
                    currentPath={currentPath}
                    setCurrentPath={setCurrentPath}
                  />
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
              element={token && role === 'admin' ? <AdminAddUser /> : <Navigate to="/dashboard" />}
            />
            <Route
              path="/change-password"
              element={token ? <ChangePasswordPage /> : <Navigate to="/" />}
            />
            {/* Fallback route for unauthorized access */}
            <Route
              path="*"
              element={token ? <Navigate to={currentPath} /> : <Navigate to="/" />}
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;
