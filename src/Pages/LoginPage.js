import React, { useEffect, useLayoutEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../Context/AuthContext.js";
import useDocumentTitle from "../hooks/useDocumentTitle.js";
import { api } from "../utils/api.js";
import "../styles.css";

const LoginPage = () => {
  const [staffId, setStaffId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();
  const subtitleId = "login-subtitle";
  const errorId = error ? "login-error" : undefined;
  const sharedDescription = [subtitleId, errorId].filter(Boolean).join(" ");

  useDocumentTitle("Sign In");

  useEffect(() => {
    const saved = localStorage.getItem("rememberedStaffId");
    if (saved) {
      setStaffId(saved);
      setRememberMe(true);
    }
  }, []);

  useLayoutEffect(() => {
    const input = document.getElementById("staffId");
    if (input) input.focus();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const data = await api.login({ staffId, password });

      if (data.success && data.token) {
        if (rememberMe) {
          localStorage.setItem("rememberedStaffId", staffId);
        } else {
          localStorage.removeItem("rememberedStaffId");
        }

        login({
          token: data.token,
          role: data.role,
          user: data.staffName || staffId,
          staffId: data.staffId || staffId,
          departmentId: data.department_id
        });

        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.message || "Network error. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    alert("Please contact your IT administrator to reset your password.");
  };

  return (
    <div className="login-split">
      {/* Left decorative panel */}
      <div className="login-panel login-panel--left" aria-hidden="true">
        <span className="login-diamond login-diamond--1" />
        <span className="login-diamond login-diamond--2" />
        <span className="login-diamond login-diamond--3" />
        <span className="login-diamond login-diamond--4" />
        <div className="login-panel__copy">
          <div className="login-panel__icon">
            <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <rect x="4" y="4" width="18" height="18" rx="2" fill="white" fillOpacity="0.9"/>
              <rect x="26" y="4" width="18" height="18" rx="2" fill="white" fillOpacity="0.6"/>
              <rect x="4" y="26" width="18" height="18" rx="2" fill="white" fillOpacity="0.6"/>
              <rect x="26" y="26" width="18" height="18" rx="2" fill="white" fillOpacity="0.3"/>
            </svg>
          </div>
          <p className="login-panel__tagline">
            Empowering your enterprise with efficient inventory management.
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="login-panel login-panel--right">
        <div className="login-card">
          <div className="login-logo">
            <img src="/enterprise-ims-logo.svg" alt="Enterprise Inventory System" />
          </div>
          <p className="login-brand">Enterprise Inventory System</p>
          <h2 id={subtitleId}>Welcome Back</h2>

          {error && (
            <div id="login-error" className="error login-error" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} aria-label="Login form" aria-describedby={sharedDescription}>
            <div className="form-group">
              <label htmlFor="staffId">Employee ID</label>
              <input
                id="staffId"
                name="staffId"
                type="text"
                placeholder="Employee ID"
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="username"
                aria-invalid={Boolean(error)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="login-password-label">
                <span>Password</span>
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="login-toggle"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </label>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="current-password"
                aria-invalid={Boolean(error)}
              />
            </div>

            <div className="login-row">
              <label className="login-remember">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isLoading}
                />
                <span>Remember Me</span>
              </label>
              <button
                type="button"
                className="login-link"
                onClick={handleForgotPassword}
              >
                Forgot Password?
              </button>
            </div>

            <button className="login-submit" type="submit" disabled={isLoading}>
              {isLoading ? "Signing In..." : "Sign In"}
            </button>
          </form>

          <p className="login-support">Need help? Contact IT Support</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
