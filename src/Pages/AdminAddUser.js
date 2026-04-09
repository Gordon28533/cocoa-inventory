import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AuditLogViewer from "../Component/AuditLogViewer.jsx";
import DepartmentManager from "../Component/DepartmentManager.jsx";
import ModalCard from "../Component/ui/ModalCard.jsx";
import StateNotice from "../Component/ui/StateNotice.jsx";
import { useAuth } from "../Context/AuthContext.js";
import { useDepartments } from "../Context/DepartmentsContext.js";
import { api } from "../utils/api.js";

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "user", label: "Normal Staff" },
  { value: "stores", label: "Stores Staff" },
  { value: "account", label: "Branch Account" },
  { value: "hod", label: "Head of Department (HOD)" },
  { value: "deputy_hod", label: "Deputy HOD" },
  { value: "account_manager", label: "Account Manager" },
  { value: "it_manager", label: "IT Manager" }
];

const EMPTY_EDIT_FORM = {
  staffName: "",
  staffId: "",
  role: "user",
  departmentId: "",
  password: ""
};

const getMessageTone = (message) => {
  const normalized = String(message || "").toLowerCase();

  if (!normalized) {
    return "neutral";
  }

  if (normalized.includes("success")) {
    return "success";
  }

  return "error";
};

const AdminAddUser = () => {
  const navigate = useNavigate();
  const { role: userRole, user: adminName } = useAuth();
  const { departments } = useDepartments();

  const [staffName, setStaffName] = useState("");
  const [staffId, setStaffId] = useState("");
  const [role, setRole] = useState("user");
  const [departmentId, setDepartmentId] = useState("");
  const [password, setPassword] = useState("");

  const [message, setMessage] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [passwordPrompt, setPasswordPrompt] = useState(true);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_EDIT_FORM);

  const [showAudit, setShowAudit] = useState(false);
  const [showDepartments, setShowDepartments] = useState(false);

  const [changePwOld, setChangePwOld] = useState("");
  const [changePwNew, setChangePwNew] = useState("");
  const [changePwConfirm, setChangePwConfirm] = useState("");
  const [changePwMsg, setChangePwMsg] = useState("");
  const [changePwLoading, setChangePwLoading] = useState(false);

  const messageTone = useMemo(() => getMessageTone(message), [message]);
  const changePasswordTone = useMemo(() => getMessageTone(changePwMsg), [changePwMsg]);

  useEffect(() => {
    if (userRole && userRole !== "admin") {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate, userRole]);

  useEffect(() => {
    if (!passwordPrompt) {
      fetchUsers();
    }
  }, [passwordPrompt]);

  const fetchUsers = async () => {
    setLoading(true);

    try {
      const data = await api.getUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      setMessage(error.message || "Failed to fetch users.");
      console.error("Fetch users exception:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetCreateForm = () => {
    setStaffName("");
    setStaffId("");
    setRole("user");
    setDepartmentId("");
    setPassword("");
  };

  const closeEditModal = () => {
    setEditUser(null);
    setEditForm(EMPTY_EDIT_FORM);
    setMessage("");
  };

  const openEditModal = (user) => {
    setEditUser(user);
    setEditForm({
      staffName: user.staffName || "",
      staffId: user.staffId || "",
      role: user.role || "user",
      departmentId: user.department_id || "",
      password: ""
    });
    setMessage("");
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setPasswordError("");

    try {
      const data = await api.login({ staffName: adminName, password: passwordInput });

      if (data.success) {
        setPasswordPrompt(false);
        setPasswordInput("");
      }
    } catch (error) {
      setPasswordError(error.message || "Network error. Please try again.");
    }
  };

  const handleCreateUser = async (event) => {
    event.preventDefault();
    setMessage("");

    try {
      const data = await api.createUser({
        staffName,
        staffId,
        role,
        password,
        department_id: departmentId
      });

      if (data.success) {
        setMessage("User added successfully!");
        resetCreateForm();
        await fetchUsers();
      }
    } catch (error) {
      setMessage(error.message || "Failed to add user.");
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user?")) {
      return;
    }

    try {
      const data = await api.deleteUser(userId);

      if (data.success) {
        setMessage("User deleted successfully!");
        await fetchUsers();
      }
    } catch (error) {
      setMessage(error.message || "Failed to delete user.");
    }
  };

  const handleDeactivateUser = async (userId) => {
    if (!window.confirm("Are you sure you want to deactivate this user?")) {
      return;
    }

    try {
      const data = await api.deactivateUser(userId);

      if (data.success) {
        setMessage("User deactivated successfully!");
        await fetchUsers();
      }
    } catch (error) {
      setMessage(error.message || "Failed to deactivate user.");
    }
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    setMessage("");

    const requestBody = {
      staffName: editForm.staffName,
      staffId: editForm.staffId,
      role: editForm.role,
      department_id: editForm.departmentId
    };

    if (editForm.password) {
      requestBody.password = editForm.password;
    }

    try {
      const data = await api.updateUser(editUser.id, requestBody);

      if (data.success) {
        setMessage("User updated successfully!");
        closeEditModal();
        await fetchUsers();
      }
    } catch (error) {
      setMessage(error.message || "Failed to update user.");
    }
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();
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
      const data = await api.changePassword({ oldPassword: changePwOld, newPassword: changePwNew });

      if (data.success) {
        setChangePwMsg("Password changed successfully!");
        setChangePwOld("");
        setChangePwNew("");
        setChangePwConfirm("");
      }
    } catch (error) {
      setChangePwMsg(error.message || "Network error. Please try again.");
    } finally {
      setChangePwLoading(false);
    }
  };

  if (passwordPrompt) {
    return (
      <div style={{ maxWidth: 420, margin: "80px auto" }}>
        <div className="form-container">
          <h2 style={{ marginBottom: 16 }}>Admin Password Required</h2>
          <form onSubmit={handlePasswordSubmit}>
            <input
              type="password"
              placeholder="Enter your admin password"
              value={passwordInput}
              onChange={(event) => setPasswordInput(event.target.value)}
              required
              style={{ width: "100%", padding: 12, marginBottom: 16, borderRadius: 6, border: "1px solid #ccc" }}
            />
            {passwordError && <StateNotice tone="error">{passwordError}</StateNotice>}
            <button type="submit" className="btn btn-primary" style={{ marginTop: 12 }}>
              Confirm
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-add-user">
      <div className="section-header">
        <div>
          <h2 style={{ marginBottom: 8 }}>User Management</h2>
          <p className="section-subtitle">Create staff accounts, manage roles, and maintain approval access.</p>
        </div>
      </div>

      <StateNotice>
        <strong>Branch Setup Guidance:</strong>
        <ul style={{ margin: "8px 0 0 18px", padding: 0 }}>
          <li>Ensure departments exist for each branch: Tema Takeover Center, Kumasi Takeover Center, Takoradi Takeover Center, and Head Office.</li>
          <li>For each branch, add at least one user with role `stores` and one with role `account`.</li>
          <li>For Head Office, add users with roles `account_manager` and `stores` for final approvals and fulfillment.</li>
        </ul>
        <div style={{ marginTop: 8, color: "#1976d2" }}>
          This setup enables the multi-step branch requisition approval workflow.
        </div>
      </StateNotice>

      <div className="form-container" style={{ marginTop: 24 }}>
        <h3>Add User</h3>
        <form onSubmit={handleCreateUser} className="toolbar-row">
          <input
            id="staffName"
            name="staffName"
            type="text"
            placeholder="Staff Name"
            value={staffName}
            onChange={(event) => setStaffName(event.target.value)}
            required
            autoComplete="name"
          />
          <input
            id="staffId"
            name="staffId"
            type="text"
            placeholder="Staff ID"
            value={staffId}
            onChange={(event) => setStaffId(event.target.value)}
            required
            autoComplete="off"
          />
          <select id="role" name="role" value={role} onChange={(event) => setRole(event.target.value)} required>
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            id="departmentId"
            name="departmentId"
            value={departmentId}
            onChange={(event) => setDepartmentId(event.target.value)}
            required
          >
            <option value="">Select Department</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="Password (leave blank for default)"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
          />
          <button type="submit" className="btn btn-primary">
            Add User
          </button>
        </form>
      </div>

      {message && !editUser && (
        <div style={{ marginBottom: 24 }}>
          <StateNotice tone={messageTone}>{message}</StateNotice>
        </div>
      )}

      <div className="section-header" style={{ marginBottom: 16 }}>
        <h3 style={{ margin: 0 }}>All Users</h3>
      </div>

      {loading ? (
        <StateNotice>Loading users...</StateNotice>
      ) : users.length === 0 ? (
        <StateNotice>No users found.</StateNotice>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Staff ID</th>
              <th>Role</th>
              <th>Status</th>
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
                  <StateNotice tone={user.isActive ? "success" : "error"}>
                    {user.isActive ? "Active" : "Inactive"}
                  </StateNotice>
                </td>
                <td>
                  <div className="dashboard-actions">
                    <button className="btn btn-secondary" onClick={() => openEditModal(user)}>
                      Edit
                    </button>
                    {user.isActive ? (
                      <button className="btn btn-secondary" onClick={() => handleDeactivateUser(user.id)}>
                        Deactivate
                      </button>
                    ) : (
                      <span style={{ color: "#6c757d" }}>Deactivated</span>
                    )}
                    <button className="btn btn-danger" onClick={() => handleDeleteUser(user.id)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editUser && (
        <ModalCard title="Edit User">
          <form onSubmit={handleEditSubmit}>
            <label htmlFor="editStaffName">Staff Name</label>
            <input
              id="editStaffName"
              name="editStaffName"
              type="text"
              value={editForm.staffName}
              onChange={(event) => setEditForm((current) => ({ ...current, staffName: event.target.value }))}
              required
              style={{ display: "block", marginBottom: 12, width: "100%" }}
            />

            <label htmlFor="editStaffId">Staff ID</label>
            <input
              id="editStaffId"
              name="editStaffId"
              type="text"
              value={editForm.staffId}
              onChange={(event) => setEditForm((current) => ({ ...current, staffId: event.target.value }))}
              required
              style={{ display: "block", marginBottom: 12, width: "100%" }}
            />

            <label htmlFor="editRole">Role</label>
            <select
              id="editRole"
              name="editRole"
              value={editForm.role}
              onChange={(event) => setEditForm((current) => ({ ...current, role: event.target.value }))}
              style={{ display: "block", marginBottom: 12, width: "100%", minHeight: 40 }}
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <label htmlFor="editDepartmentId">Department</label>
            <select
              id="editDepartmentId"
              name="editDepartmentId"
              value={editForm.departmentId}
              onChange={(event) => setEditForm((current) => ({ ...current, departmentId: event.target.value }))}
              style={{ display: "block", marginBottom: 12, width: "100%", minHeight: 40 }}
              required
            >
              <option value="">Select Department</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>

            <label htmlFor="editPassword">Set new password (optional)</label>
            <input
              id="editPassword"
              name="editPassword"
              type="password"
              placeholder="Set new password (optional)"
              value={editForm.password}
              onChange={(event) => setEditForm((current) => ({ ...current, password: event.target.value }))}
              style={{ display: "block", marginBottom: 12, width: "100%" }}
            />

            {message && <StateNotice tone="error">{message}</StateNotice>}

            <div className="dashboard-actions" style={{ justifyContent: "flex-end", marginTop: 16 }}>
              <button type="button" onClick={closeEditModal} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Save
              </button>
            </div>
          </form>
        </ModalCard>
      )}

      <div className="dashboard-actions" style={{ marginTop: 40 }}>
        <button onClick={() => setShowAudit((current) => !current)} className="btn btn-success">
          Audit Logs
        </button>
        <button onClick={() => setShowDepartments((current) => !current)} className="btn btn-secondary">
          Department Management
        </button>
      </div>

      {showAudit && (
        <div style={{ margin: "32px 0" }}>
          <AuditLogViewer />
        </div>
      )}

      {showDepartments && (
        <div style={{ margin: "32px 0" }}>
          <DepartmentManager />
        </div>
      )}

      <div className="form-container" style={{ marginTop: 48, maxWidth: 440 }}>
        <h3>Change My Password</h3>
        <form onSubmit={handleChangePassword}>
          <input
            type="password"
            placeholder="Current password"
            value={changePwOld}
            onChange={(event) => setChangePwOld(event.target.value)}
            style={{ display: "block", marginBottom: 10, width: "100%" }}
            required
          />
          <input
            type="password"
            placeholder="New password"
            value={changePwNew}
            onChange={(event) => setChangePwNew(event.target.value)}
            style={{ display: "block", marginBottom: 10, width: "100%" }}
            required
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={changePwConfirm}
            onChange={(event) => setChangePwConfirm(event.target.value)}
            style={{ display: "block", marginBottom: 14, width: "100%" }}
            required
          />
          <button type="submit" disabled={changePwLoading} className="btn btn-primary" style={{ width: "100%" }}>
            {changePwLoading ? "Changing..." : "Change Password"}
          </button>
          {changePwMsg && (
            <div style={{ marginTop: 10 }}>
              <StateNotice tone={changePasswordTone}>{changePwMsg}</StateNotice>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default AdminAddUser;
