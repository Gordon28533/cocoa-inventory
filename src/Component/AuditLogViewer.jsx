import React, { useEffect, useState } from "react";

const AuditLogViewer = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("http://localhost:5000/audit-logs", {
        headers: { Authorization: "Bearer " + token }
      });
      let data;
      try {
        data = await res.json();
      } catch {
        data = {};
      }
      if (res.ok) {
        setLogs(data);
      } else if (res.status === 401 || res.status === 403) {
        localStorage.removeItem("token");
        setError("Session expired or not authorized. Please log in again.");
        setTimeout(() => {
          window.location.href = "/login";
        }, 2000);
      } else if (res.status === 500) {
        setError("Internal server error. Please check backend logs.");
      } else {
        setError(data.error || "Failed to fetch logs.");
      }
    } catch (err) {
      setError("Could not connect to server. Is the backend running?");
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ margin: 24 }}>
      <h2>Audit Logs</h2>
      {loading && <div>Loading...</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {!loading && !error && (
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
    </div>
  );
};

export default AuditLogViewer; 