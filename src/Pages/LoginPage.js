import React, { useState, useLayoutEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../Context/AuthContext.js";
import { api } from "../utils/api.js";
import "../styles.css";

const LoginPage = () => {
  const [staffName, setStaffName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [goToUserManager, setGoToUserManager] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  // Prevent flicker on mount (e.g., autofill, focus, etc.)
  useLayoutEffect(() => {
    // Optionally, focus the staffName input on mount
    const input = document.getElementById('staffName');
    if (input) input.focus();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const data = await api.login({ staffName, password });

      if (data.success && data.token) {
        login({
          token: data.token,
          role: data.role,
          user: staffName,
          departmentId: data.department_id
        });

        if (data.role === 'admin' && goToUserManager) {
          navigate("/admin/users");
        } else {
          navigate("/dashboard");
        }
      }
    } catch (err) {
      setError(err.message || "Network error. Please check your connection.");
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
              name="staffName"
              type="text"
              placeholder="Enter your staff name"
              value={staffName}
              onChange={(e) => setStaffName(e.target.value)}
              required
              disabled={isLoading}
              autoComplete="username"
              aria-describedby={error ? "login-error" : undefined}
            />
        </div>
        
        <div className="form-group">
          <label htmlFor="password" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Password</span>
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              style={{
                background: 'none',
                border: 'none',
                color: '#1976d2',
                cursor: 'pointer',
                fontSize: 13,
                padding: 0,
                marginLeft: 8
              }}
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </label>
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              autoComplete="current-password"
            />
        </div>
        {/* Admin shortcut option */}
        <div className="form-group" style={{ marginBottom: 16 }}>
            <label htmlFor="goToUserManager" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
                id="goToUserManager"
                name="goToUserManager"
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
