import React, { useEffect, useState } from "react";
import { useAuth } from "../Context/AuthContext.js";
import StateNotice from "./ui/StateNotice.jsx";
import { api } from "../utils/api.js";

const AuditLogViewer = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { token } = useAuth();

  useEffect(() => {
    if (!token) {
      setLogs([]);
      setLoading(false);
      return;
    }

    fetchLogs();
  }, [token]);

  const fetchLogs = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.getAuditLogs();
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Could not connect to server. Is the backend running?");
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ margin: 24 }}>
      <h2>Audit Logs</h2>
      {loading && <StateNotice>Loading...</StateNotice>}
      {error && <StateNotice tone="error">{error}</StateNotice>}
      {!loading && !error && Array.isArray(logs) && logs.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16 }}>
          <thead>
            <tr>
              <th>User</th>
              <th>Action</th>
              <th>Requisition ID</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.id}>
                <td>{log.staffName || log.user_id}</td>
                <td>{log.action}</td>
                <td>{log.requisition_id}</td>
                <td>{new Date(log.timestamp).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {!loading && !error && Array.isArray(logs) && logs.length === 0 && (
        <StateNotice>No audit logs found.</StateNotice>
      )}
    </div>
  );
};

export default AuditLogViewer; 
