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
      setError(err.message || "Unable to load audit logs. Check the backend connection and try again.");
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="feature-panel">
      <div className="feature-panel__header">
        <div>
          <h2>Audit Logs</h2>
          <p className="section-subtitle">Review user activity, requisition actions, and recent administrative changes.</p>
        </div>
      </div>

      {loading && <StateNotice>Loading audit activity...</StateNotice>}
      {error && <StateNotice tone="error">{error}</StateNotice>}

      {!loading && !error && Array.isArray(logs) && logs.length > 0 && (
        <div className="table-shell">
          <table className="table-compact table-compact--wide">
            <caption className="sr-only">
              Audit log entries showing who performed each action, the linked requisition, and when it happened.
            </caption>
            <thead>
              <tr>
                <th scope="col">User</th>
                <th scope="col">Action</th>
                <th scope="col">Requisition ID</th>
                <th scope="col">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, index) => (
                <tr key={log.id} className={index % 2 === 0 ? "row-alt" : ""}>
                  <td>{log.staffName || log.user_id}</td>
                  <td>{log.action}</td>
                  <td>{log.requisition_id}</td>
                  <td>{new Date(log.timestamp).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && Array.isArray(logs) && logs.length === 0 && (
        <StateNotice>No audit logs found.</StateNotice>
      )}
    </div>
  );
};

export default AuditLogViewer;
