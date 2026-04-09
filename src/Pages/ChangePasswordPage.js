import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../utils/api.js";

const ChangePasswordPage = () => {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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
    <div className="login-container" style={{ maxWidth: 400, margin: "60px auto" }}>
      <h2>Change Password</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="password"
          placeholder="Current password"
          value={oldPassword}
          onChange={e => setOldPassword(e.target.value)}
          required
          style={{ marginBottom: 12 }}
        />
        <input
          type="password"
          placeholder="New password"
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
          required
          style={{ marginBottom: 12 }}
        />
        <input
          type="password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          required
          style={{ marginBottom: 18 }}
        />
        <button type="submit" disabled={loading} style={{ width: '100%', marginBottom: 10 }}>
          {loading ? "Changing..." : "Change Password"}
        </button>
        {message && <div style={{ color: message.includes('success') ? 'green' : 'red', marginTop: 10 }}>{message}</div>}
      </form>
      <button onClick={() => navigate('/dashboard')} style={{ marginTop: 18, width: '100%' }}>
        Back to Dashboard
      </button>
    </div>
  );
};

export default ChangePasswordPage; 
