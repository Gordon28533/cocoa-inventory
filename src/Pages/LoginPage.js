import React, { useLayoutEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../Context/AuthContext.js";
import useDocumentTitle from "../hooks/useDocumentTitle.js";
import { api } from "../utils/api.js";
import "../styles.css";

const LoginPage = () => {
  const [staffName, setStaffName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();
  const subtitleId = "login-subtitle";
  const helpId = "login-help";
  const errorId = error ? "login-error" : undefined;
  const sharedDescription = [subtitleId, helpId, errorId].filter(Boolean).join(" ");

  useDocumentTitle("Sign In");

  useLayoutEffect(() => {
    const input = document.getElementById("staffName");
    if (input) {
      input.focus();
    }
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

        navigate("/dashboard");
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
      <p id={subtitleId} className="login-subtitle">Sign in to access your inventory dashboard</p>
      <p id={helpId} className="field-help field-help--centered">
        Use the staff name and password assigned to your account.
      </p>

      {error && (
        <div id="login-error" className="error login-error" role="alert">
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
            aria-describedby={sharedDescription}
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
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
            autoComplete="current-password"
            aria-describedby={sharedDescription}
            aria-invalid={Boolean(error)}
          />
        </div>

        <button className="login-submit" type="submit" disabled={isLoading}>
          {isLoading ? "Signing In..." : "Sign In"}
        </button>
      </form>
    </div>
  );
};

export default LoginPage;
