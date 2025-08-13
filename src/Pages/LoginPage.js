import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles.css";

const LoginPage = ({ setToken, setRole }) => {
  const [staffName, setStaffName] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [goToUserManager, setGoToUserManager] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`http://localhost:5000/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffName, password }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success && data.token) {
        localStorage.setItem("user", staffName);
        localStorage.setItem("token", data.token);
        if (data.role) {
          localStorage.setItem("role", data.role);
        }
        if (data.department_id !== undefined) {
          localStorage.setItem("department_id", data.department_id);
        }
        if (setToken) setToken(data.token);
        if (setRole && data.role) setRole(data.role);
        if (data.role === 'admin' && goToUserManager) {
          navigate("/admin/users");
          window.location.reload();
        } else if (data.role === 'admin') {
          navigate("/dashboard"); // Default for admin if not checked
        } else {
        navigate("/dashboard");
        }
      } else {
        setError(data.message || "Invalid credentials!");
      }
    } catch (err) {
      setError("Network error. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-logo">
        <img src="/cmc_logo1.jpg" alt="Cocoa Marketing Company Logo" />
      </div>
      <h2>Welcome Back</h2>
      <p style={{ color: '#666', marginBottom: '30px' }}>
        Sign in to access your inventory dashboard
      </p>
      
      {error && (
        <div id="login-error" className="error" style={{ marginBottom: '20px' }} role="alert">
          {error}
        </div>
      )}
      
      <form onSubmit={handleLogin} aria-label="Login form">
        <div className="form-group">
          <label htmlFor="staffName">Staff Name</label>
          <input
            id="staffName"
            type="text"
            placeholder="Enter your staff name"
            value={staffName}
            onChange={(e) => setStaffName(e.target.value)}
            required
            disabled={isLoading}
            aria-describedby={error ? "login-error" : undefined}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>
        {/* Admin shortcut option */}
        <div className="form-group" style={{ marginBottom: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={goToUserManager}
              onChange={e => setGoToUserManager(e.target.checked)}
              disabled={isLoading}
            />
            Go directly to User Management (admin only)
          </label>
        </div>
        <button 
          type="submit" 
          disabled={isLoading}
          style={{ width: '100%' }}
        >
          {isLoading ? "Signing In..." : "Sign In"}
        </button>
      </form>
    </div>
  );
};

export default LoginPage;
