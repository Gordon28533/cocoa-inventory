import React, { useState, useEffect } from "react";
import AuditLogViewer from "../Component/AuditLogViewer.jsx";
import DepartmentManager from "../Component/DepartmentManager.jsx";

const AdminAddUser = () => {
  const [staffName, setStaffName] = useState("");
  const [staffId, setStaffId] = useState("");
  const [role, setRole] = useState("user");
  const [message, setMessage] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState(null);
  const [editStaffName, setEditStaffName] = useState("");
  const [editStaffId, setEditStaffId] = useState("");
  const [editRole, setEditRole] = useState("user");
  const [passwordPrompt, setPasswordPrompt] = useState(true);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showAudit, setShowAudit] = useState(false);
  const [showDepartments, setShowDepartments] = useState(false);
  const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:5000";
  const [editPassword, setEditPassword] = useState("");
  const [password, setPassword] = useState("");
  const [changePwOld, setChangePwOld] = useState("");
  const [changePwNew, setChangePwNew] = useState("");
  const [changePwConfirm, setChangePwConfirm] = useState("");
  const [changePwMsg, setChangePwMsg] = useState("");
  const [changePwLoading, setChangePwLoading] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [departmentId, setDepartmentId] = useState("");
  const [editDepartmentId, setEditDepartmentId] = useState("");

  const userRole = localStorage.getItem("role");
  const adminName = localStorage.getItem("user");
  useEffect(() => {
    if (userRole !== "admin") {
      window.location.href = "/dashboard";
    }
  }, [userRole]);

  useEffect(() => {
    if (!passwordPrompt) fetchUsers();
  }, [passwordPrompt]);

  // Fetch departments on mount
  useEffect(() => {
    const fetchDepartments = async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await fetch(`${apiUrl}/departments`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          setDepartments(await res.json());
        } else {
          setMessage("Failed to fetch departments.");
          if (res.status === 401) {
            localStorage.removeItem("token");
            localStorage.removeItem("role");
            localStorage.removeItem("user");
            setTimeout(() => { window.location.href = "/login"; }, 2000);
          }
        }
      } catch (err) {
        setMessage("Failed to fetch departments.");
        console.error("Fetch departments exception:", err);
      }
    };
    fetchDepartments();
  }, [apiUrl]);

  const fetchUsers = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    console.log("Fetching users with token:", token);
    try {
      const response = await fetch(`${apiUrl}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log("Response status:", response.status);
      const data = await response.json();
      if (response.ok) {
        setUsers(data);
      } else {
        setMessage(data.error || "Failed to fetch users.");
        console.log("Fetch users error:", data.error);
        if (response.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("role");
          localStorage.removeItem("user");
          setTimeout(() => { window.location.href = "/login"; }, 2000);
        }
      }
    } catch (err) {
      setMessage("Failed to fetch users.");
      console.error("Fetch users exception:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError("");
    // Verify password with backend
    try {
      const response = await fetch(`${apiUrl}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffName: adminName, password: passwordInput })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setPasswordPrompt(false);
        setPasswordInput("");
      } else {
        setPasswordError("Incorrect password. Please try again.");
      }
    } catch (err) {
      setPasswordError("Network error. Please try again.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    const token = localStorage.getItem("token");
    const response = await fetch(`${apiUrl}/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ staffName, staffId, role, password, department_id: departmentId }),
    });
    const data = await response.json();
    if (response.ok && data.success) {
      setMessage("User added successfully!");
      setStaffName("");
      setStaffId("");
      setPassword("");
      setDepartmentId("");
      fetchUsers();
    } else {
      setMessage(data.error || "Failed to add user.");
      if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("user");
        setTimeout(() => { window.location.href = "/login"; }, 2000);
      }
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    const token = localStorage.getItem("token");
    try {
      const response = await fetch(`${apiUrl}/users/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setMessage("User deleted successfully!");
        fetchUsers();
      } else {
        setMessage(data.error || "Failed to delete user.");
        if (response.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("role");
          localStorage.removeItem("user");
          setTimeout(() => { window.location.href = "/login"; }, 2000);
        }
      }
    } catch (err) {
      setMessage("Failed to delete user.");
    }
  };

  const openEditModal = (user) => {
    setEditUser(user);
    setEditStaffName(user.staffName);
    setEditStaffId(user.staffId);
    setEditRole(user.role);
    setEditPassword(""); // Reset password field on open
    setEditDepartmentId(user.department_id || "");
    setMessage(""); // Clear message on open
  };

  const closeEditModal = () => {
    setEditUser(null);
    setEditStaffName("");
    setEditStaffId("");
    setEditRole("user");
    setEditPassword(""); // Reset password field on close
    setMessage(""); // Clear message on close
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    const token = localStorage.getItem("token");
    const body = { staffName: editStaffName, staffId: editStaffId, role: editRole, department_id: editDepartmentId };
    if (editPassword) body.password = editPassword;
    const response = await fetch(`${apiUrl}/users/${editUser.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (response.ok && data.success) {
      setMessage("User updated successfully!");
      closeEditModal();
      fetchUsers();
    } else {
      setMessage(data.error || "Failed to update user.");
      if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("user");
        setTimeout(() => { window.location.href = "/login"; }, 2000);
      }
    }
  };

  if (passwordPrompt) {
    return (
      <div style={{ maxWidth: 400, margin: "80px auto", padding: 32, background: "#fff", borderRadius: 12, boxShadow: "0 2px 16px rgba(0,0,0,0.08)" }}>
        <h2>Admin Password Required</h2>
        <form onSubmit={handlePasswordSubmit}>
          <input
            type="password"
            placeholder="Enter your admin password"
            value={passwordInput}
            onChange={e => setPasswordInput(e.target.value)}
            required
            style={{ width: "100%", padding: 12, marginBottom: 16, borderRadius: 6, border: "1px solid #ccc" }}
          />
          {passwordError && <div style={{ color: "red", marginBottom: 12 }}>{passwordError}</div>}
          <button type="submit" style={{ padding: "10px 24px", borderRadius: 6, background: "#1976d2", color: "#fff", border: "none", fontWeight: 600 }}>Confirm</button>
        </form>
      </div>
    );
  }

  const ROLES = [
    { value: "user", label: "Normal Staff" },
    { value: "stores", label: "Stores Staff" },
    { value: "hod", label: "Head of Department (HOD)" },
    { value: "deputy_hod", label: "Deputy HOD" },
    { value: "admin", label: "Admin" },
    { value: "it_manager", label: "IT Manager" },
    { value: "account_manager", label: "Account Manager" }
  ];

  return (
    <div className="admin-add-user">
      <h2>User Management</h2>
      <div style={{ background: '#e8f0fe', padding: 16, borderRadius: 8, marginBottom: 16, color: '#333', fontSize: 15 }}>
        <b>Branch Setup Guidance:</b><br/>
        <ul style={{ margin: '8px 0 0 18px', padding: 0 }}>
          <li>Ensure departments exist for each branch: <b>Tema Takeover Center</b>, <b>Kumasi Takeover Center</b>, <b>Takoradi Takeover Center</b>, and <b>Head Office</b>.</li>
          <li>For each branch, add at least one user with role <b>stores</b> and one with role <b>account</b>.</li>
          <li>For Head Office, add users with roles <b>account_manager</b> and <b>stores</b> for final approvals and fulfillment.</li>
        </ul>
        <span style={{ color: '#1976d2' }}>This setup enables the multi-step branch requisition approval workflow.</span>
      </div>
      <form onSubmit={handleSubmit} style={{ marginBottom: 24 }}>
        <input
          type="text"
          placeholder="Staff Name"
          value={staffName}
          onChange={e => setStaffName(e.target.value)}
          required
          style={{ marginRight: 8, marginBottom: 8 }}
        />
        <input
          type="text"
          placeholder="Staff ID"
          value={staffId}
          onChange={e => setStaffId(e.target.value)}
          required
          style={{ marginRight: 8, marginBottom: 8 }}
        />
        <select
          value={role}
          onChange={e => setRole(e.target.value)}
          required
          style={{ marginRight: 8, marginBottom: 8 }}
        >
          <option value="">Select Role</option>
          <option value="admin">Admin</option>
          <option value="user">User</option>
          <option value="stores">Stores</option>
          <option value="hod">HOD</option>
          <option value="deputy_hod">Deputy HOD</option>
          <option value="account_manager">Account Manager</option>
          <option value="it_manager">IT Manager</option>
        </select>
        <select
          value={departmentId}
          onChange={e => setDepartmentId(e.target.value)}
          required
          style={{ marginRight: 8, marginBottom: 8 }}
        >
          <option value="">Select Department</option>
          {departments.map(dept => (
            <option key={dept.id} value={dept.id}>{dept.name}</option>
          ))}
        </select>
        <input
          type="password"
          placeholder="Password (leave blank for default)"
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={{ marginRight: 8, marginBottom: 8 }}
          autoComplete="new-password"
        />
        <button type="submit" style={{ padding: '8px 20px', borderRadius: 6, background: '#1976d2', color: '#fff', border: 'none', fontWeight: 600 }}>Add User</button>
      </form>
      {message && !editUser && <p>{message}</p>}
      <h3>All Users</h3>
      {loading ? (
        <p>Loading users...</p>
      ) : users.length === 0 ? (
        <p>No users found.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Staff ID</th>
              <th>Role</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.staffName}</td>
                <td>{user.staffId}</td>
                <td>{user.role}</td>
                <td>
                  <button style={{ marginRight: 8 }} onClick={() => openEditModal(user)}>Edit</button>
                  <button onClick={() => handleDelete(user.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {editUser && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{ background: '#fff', padding: 32, borderRadius: 8, minWidth: 320, boxShadow: '0 2px 16px rgba(0,0,0,0.2)' }}>
            <h3>Edit User</h3>
            <form onSubmit={handleEditSubmit}>
              <label htmlFor="editStaffName">Staff Name</label>
              <input
                id="editStaffName"
                name="editStaffName"
                type="text"
                placeholder="Staff Name"
                value={editStaffName}
                onChange={e => setEditStaffName(e.target.value)}
                required
                style={{ display: 'block', marginBottom: 12, width: '100%' }}
              />
              <label htmlFor="editStaffId">Staff ID</label>
              <input
                id="editStaffId"
                name="editStaffId"
                type="text"
                placeholder="Staff ID"
                value={editStaffId}
                onChange={e => setEditStaffId(e.target.value)}
                required
                style={{ display: 'block', marginBottom: 12, width: '100%' }}
              />
              <label htmlFor="editRole">Role</label>
              <select 
                id="editRole"
                name="editRole"
                value={editRole} 
                onChange={e => setEditRole(e.target.value)}
                style={{ display: 'block', marginBottom: 12, width: '100%', minHeight: 40, zIndex: 10, position: 'relative' }}
              >
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              <label htmlFor="editDepartmentId">Department</label>
              <select
                id="editDepartmentId"
                name="editDepartmentId"
                value={editDepartmentId}
                onChange={e => setEditDepartmentId(e.target.value)}
                style={{ minHeight: 40, zIndex: 10, position: 'relative', marginBottom: 12, width: '100%' }}
                required
              >
                <option value="">Select Department</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
              <label htmlFor="editPassword">Set new password (optional)</label>
              <input
                id="editPassword"
                name="editPassword"
                type="password"
                placeholder="Set new password (optional)"
                value={editPassword}
                onChange={e => setEditPassword(e.target.value)}
                style={{ display: 'block', marginBottom: 12, width: '100%' }}
              />
              {message && editUser && <div style={{ color: 'red', marginBottom: 12 }}>{message}</div>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" onClick={closeEditModal} style={{ background: '#eee' }}>Cancel</button>
                <button type="submit">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <div style={{ marginTop: 40 }}>
        <button onClick={() => setShowAudit(!showAudit)} style={{ marginRight: 16, padding: '10px 20px', borderRadius: 6, background: '#28a745', color: '#fff', border: 'none', fontWeight: 600 }}>📝 Audit Logs</button>
        <button onClick={() => setShowDepartments(!showDepartments)} style={{ padding: '10px 20px', borderRadius: 6, background: '#ffc107', color: '#333', border: 'none', fontWeight: 600 }}>🏢 Department Management</button>
      </div>
      {showAudit && (
        <div style={{ margin: '32px 0' }}>
          <AuditLogViewer />
        </div>
      )}
      {showDepartments && (
        <div style={{ margin: '32px 0' }}>
          <DepartmentManager />
        </div>
      )}
      {/* Change My Password Section */}
      <div style={{ marginTop: 48, maxWidth: 400, background: '#f9f9f9', padding: 24, borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <h3 style={{ marginBottom: 16 }}>Change My Password</h3>
        <form onSubmit={async (e) => {
          e.preventDefault();
          setChangePwMsg("");
          if (!changePwOld || !changePwNew || !changePwConfirm) {
            setChangePwMsg("All fields are required.");
            return;
          }
          if (changePwNew !== changePwConfirm) {
            setChangePwMsg("New passwords do not match.");
            return;
          }
          setChangePwLoading(true);
          try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${apiUrl}/change-password`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({ oldPassword: changePwOld, newPassword: changePwNew })
            });
            const data = await res.json();
            if (res.ok && data.success) {
              setChangePwMsg("Password changed successfully!");
              setChangePwOld(""); setChangePwNew(""); setChangePwConfirm("");
            } else {
              setChangePwMsg(data.error || data.message || "Failed to change password.");
            }
          } catch (err) {
            setChangePwMsg("Network error. Please try again.");
          } finally {
            setChangePwLoading(false);
          }
        }}>
          <input
            type="password"
            placeholder="Current password"
            value={changePwOld}
            onChange={e => setChangePwOld(e.target.value)}
            style={{ display: 'block', marginBottom: 10, width: '100%' }}
            required
          />
          <input
            type="password"
            placeholder="New password"
            value={changePwNew}
            onChange={e => setChangePwNew(e.target.value)}
            style={{ display: 'block', marginBottom: 10, width: '100%' }}
            required
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={changePwConfirm}
            onChange={e => setChangePwConfirm(e.target.value)}
            style={{ display: 'block', marginBottom: 14, width: '100%' }}
            required
          />
          <button type="submit" disabled={changePwLoading} style={{ width: '100%', padding: 10, borderRadius: 6, background: '#1976d2', color: '#fff', border: 'none', fontWeight: 600 }}>
            {changePwLoading ? "Changing..." : "Change Password"}
          </button>
          {changePwMsg && <div style={{ color: changePwMsg.includes('success') ? 'green' : 'red', marginTop: 10 }}>{changePwMsg}</div>}
        </form>
      </div>
    </div>
  );
};

export default AdminAddUser;