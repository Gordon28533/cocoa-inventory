import React, { useLayoutEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import StateNotice from "../Component/ui/StateNotice.jsx";
import useDocumentTitle from "../hooks/useDocumentTitle.js";
import { api } from "../utils/api.js";
import "../styles.css";

const ChangePasswordPage = () => {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const helperId = "change-password-help";
  const messageId = message ? "change-password-message" : undefined;
  const confirmMismatch = Boolean(confirmPassword) && confirmPassword !== newPassword;
  const messageTone = useMemo(() => {
    if (!message) {
      return "neutral";
    }

    return message.toLowerCase().includes("success") ? "success" : "error";
  }, [message]);

  useDocumentTitle("Change Password");

  useLayoutEffect(() => {
    const input = document.getElementById("oldPassword");
    input?.focus();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    if (!oldPassword || !newPassword || !confirmPassword) {
      setMessage("All fields are required.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage("New passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const data = await api.changePassword({ oldPassword, newPassword });
      if (data.success) {
        setMessage("Password changed successfully!");
        setOldPassword(""); setNewPassword(""); setConfirmPassword("");
      }
    } catch (err) {
      setMessage(err.message || "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container page-form-shell">
      <h2>Change Password</h2>
      <p className="login-subtitle">Update your account password before returning to the workspace.</p>
      <p id={helperId} className="field-help field-help--centered">
        Choose a strong new password and confirm it before saving.
      </p>
      <form onSubmit={handleSubmit} className="page-form-shell__form" aria-describedby={[helperId, messageId].filter(Boolean).join(" ") || undefined}>
        <label className="form-group" htmlFor="oldPassword">
          <span>Current Password</span>
          <input
            id="oldPassword"
            name="oldPassword"
            type="password"
            placeholder="Current password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            required
            autoComplete="current-password"
            aria-describedby={[helperId, messageId].filter(Boolean).join(" ") || undefined}
            aria-invalid={messageTone === "error" && message.toLowerCase().includes("current")}
          />
        </label>
        <label className="form-group" htmlFor="newPassword">
          <span>New Password</span>
          <input
            id="newPassword"
            name="newPassword"
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            autoComplete="new-password"
            aria-describedby={[helperId, messageId].filter(Boolean).join(" ") || undefined}
          />
        </label>
        <label className="form-group" htmlFor="confirmPassword">
          <span>Confirm New Password</span>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
            aria-describedby={[helperId, messageId].filter(Boolean).join(" ") || undefined}
            aria-invalid={confirmMismatch}
          />
        </label>
        {message && (
          <div id="change-password-message">
            <StateNotice tone={messageTone}>{message}</StateNotice>
          </div>
        )}
        <button type="submit" disabled={loading} className="login-submit">
          {loading ? "Changing..." : "Change Password"}
        </button>
      </form>
      <button onClick={() => navigate("/dashboard")} className="btn btn-secondary page-form-shell__secondary-action">
        Back to Dashboard
      </button>
    </div>
  );
};

export default ChangePasswordPage;
