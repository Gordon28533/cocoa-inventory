import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AuditLogViewer from "../Component/AuditLogViewer.jsx";
import ConfirmDialog from "../Component/ui/ConfirmDialog.jsx";
import DepartmentManager from "../Component/DepartmentManager.jsx";
import ModalCard from "../Component/ui/ModalCard.jsx";
import StateNotice from "../Component/ui/StateNotice.jsx";
import StatusBadge from "../Component/ui/StatusBadge.jsx";
import { useAuth } from "../Context/AuthContext.js";
import { useDepartments } from "../Context/DepartmentsContext.js";
import useDocumentTitle from "../hooks/useDocumentTitle.js";
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
  const [passwordChecking, setPasswordChecking] = useState(false);

  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_EDIT_FORM);
  const [savingUser, setSavingUser] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  const [showAudit, setShowAudit] = useState(false);
  const [showDepartments, setShowDepartments] = useState(false);

  const [changePwOld, setChangePwOld] = useState("");
  const [changePwNew, setChangePwNew] = useState("");
  const [changePwConfirm, setChangePwConfirm] = useState("");
  const [changePwMsg, setChangePwMsg] = useState("");
  const [changePwLoading, setChangePwLoading] = useState(false);
  const adminPasswordHelpId = "admin-password-help";
  const adminPasswordErrorId = passwordError ? "admin-password-error" : undefined;
  const adminPasswordDescription = [adminPasswordHelpId, adminPasswordErrorId].filter(Boolean).join(" ");
  const createUserHelpId = "admin-create-user-help";
  const createUserMessageId = message && !editUser ? "admin-create-user-message" : undefined;
  const createUserDescription = [createUserHelpId, createUserMessageId].filter(Boolean).join(" ");
  const changePasswordHelpId = "admin-change-password-help";
  const changePasswordMessageId = changePwMsg ? "admin-change-password-message" : undefined;
  const changePasswordDescription = [changePasswordHelpId, changePasswordMessageId].filter(Boolean).join(" ");
  const changePasswordMismatch = Boolean(changePwConfirm) && changePwConfirm !== changePwNew;

  const messageTone = useMemo(() => getMessageTone(message), [message]);
  const changePasswordTone = useMemo(() => getMessageTone(changePwMsg), [changePwMsg]);

  useDocumentTitle("User Management");

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
    if (savingUser) {
      return;
    }

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
    setPasswordChecking(true);

    try {
      const data = await api.login({ staffName: adminName, password: passwordInput });

      if (data.success) {
        setPasswordPrompt(false);
        setPasswordInput("");
      }
    } catch (error) {
      setPasswordError(error.message || "Network error. Please try again.");
    } finally {
      setPasswordChecking(false);
    }
  };

  const handleCreateUser = async (event) => {
    event.preventDefault();
    setMessage("");
    setSavingUser(true);

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
    } finally {
      setSavingUser(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) {
      return;
    }

    setSavingUser(true);

    try {
      const request =
        confirmAction.type === "delete"
          ? api.deleteUser(confirmAction.user.id)
          : api.deactivateUser(confirmAction.user.id);

      const data = await request;

      if (data.success) {
        setMessage(confirmAction.type === "delete" ? "User deleted successfully!" : "User deactivated successfully!");
        setConfirmAction(null);
        await fetchUsers();
      }
    } catch (error) {
      setMessage(
        error.message ||
          (confirmAction.type === "delete" ? "Failed to delete user." : "Failed to deactivate user.")
      );
    } finally {
      setSavingUser(false);
    }
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setSavingUser(true);

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
        setEditUser(null);
        setEditForm(EMPTY_EDIT_FORM);
        await fetchUsers();
      }
    } catch (error) {
      setMessage(error.message || "Failed to update user.");
    } finally {
      setSavingUser(false);
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
      <div className="admin-security-shell">
        <div className="form-container admin-security-card">
          <h2>Admin Password Required</h2>
          <p className="section-subtitle">Confirm your password before opening staff administration tools.</p>
          <form onSubmit={handlePasswordSubmit} className="admin-security-form" aria-busy={passwordChecking}>
            <label className="form-group" htmlFor="adminPassword">
              <span>Admin Password</span>
              <input
                id="adminPassword"
                name="adminPassword"
                type="password"
                placeholder="Enter your admin password"
                value={passwordInput}
                onChange={(event) => setPasswordInput(event.target.value)}
                required
                autoComplete="current-password"
                aria-describedby={adminPasswordDescription || undefined}
                aria-invalid={Boolean(passwordError)}
              />
            </label>
            <p id={adminPasswordHelpId} className="field-help">
              Re-enter your password to unlock staff management and audit controls.
            </p>
            {passwordError && (
              <div id="admin-password-error">
                <StateNotice tone="error">{passwordError}</StateNotice>
              </div>
            )}
            <button type="submit" className="btn btn-primary" disabled={passwordChecking || !passwordInput.trim()}>
              {passwordChecking ? "Checking..." : "Confirm"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-add-user feature-panel">
      <div className="feature-panel__header">
        <div>
          <h2>User Management</h2>
          <p className="section-subtitle">Create staff accounts, manage approval roles, and keep branch setup complete.</p>
        </div>
      </div>

      <div className="admin-guidance-card">
        <h3>Branch Setup Guidance</h3>
        <ul className="admin-guidance-list">
          <li>Ensure departments exist for each branch: Tema Takeover Center, Kumasi Takeover Center, Takoradi Takeover Center, and Head Office.</li>
          <li>For each branch, add at least one user with role `stores` and one with role `account`.</li>
          <li>For Head Office, add users with roles `account_manager` and `stores` for final approvals and fulfillment.</li>
        </ul>
        <p className="admin-guidance-note">This setup enables the multi-step branch requisition approval workflow.</p>
      </div>

      <section className="feature-card">
        <div className="feature-card__header">
          <div>
            <h3>Add User</h3>
            <p className="section-subtitle">Create new staff accounts and assign the right role and department from the start.</p>
          </div>
        </div>
        <p id={createUserHelpId} className="field-help">
          All new users need a role and department so routing, approvals, and inventory access work correctly.
        </p>

        <form onSubmit={handleCreateUser} className="admin-user-form" aria-busy={savingUser} aria-describedby={createUserDescription || undefined}>
          <label className="toolbar-field">
            <span>Create Account Name</span>
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
          </label>
          <label className="toolbar-field">
            <span>Create Account ID</span>
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
          </label>
          <label className="toolbar-field">
            <span>Role Assignment</span>
            <select id="role" name="role" value={role} onChange={(event) => setRole(event.target.value)} required>
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="toolbar-field">
            <span>Department Assignment</span>
            <select
              id="departmentId"
              name="departmentId"
              value={departmentId}
              onChange={(event) => setDepartmentId(event.target.value)}
              required
              aria-describedby={createUserDescription || undefined}
            >
              <option value="">Select Department</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </label>
          <label className="toolbar-field">
            <span>Initial Password</span>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Password (leave blank for default)"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              aria-describedby={createUserDescription || undefined}
            />
          </label>
          <div className="admin-user-form__actions">
            <button type="submit" className="btn btn-primary" disabled={savingUser}>
              {savingUser ? "Saving..." : "Add User"}
            </button>
          </div>
        </form>
      </section>

      {message && !editUser && (
        <div id="admin-create-user-message">
          <StateNotice tone={messageTone}>{message}</StateNotice>
        </div>
      )}

      <section className="feature-card">
        <div className="feature-card__header">
          <div>
            <h3>All Users</h3>
            <p className="section-subtitle">Review access across the organization and deactivate stale accounts when needed.</p>
          </div>
        </div>

        {loading ? (
          <StateNotice>Loading users...</StateNotice>
        ) : users.length === 0 ? (
          <StateNotice>No users found.</StateNotice>
        ) : (
          <div className="admin-users-table">
            <table>
              <caption className="sr-only">
                Staff accounts with their current roles, status, and available management actions.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Staff ID</th>
                  <th scope="col">Role</th>
                  <th scope="col">Status</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.staffName}</td>
                    <td>{user.staffId}</td>
                    <td>{user.role}</td>
                    <td>
                      <StatusBadge
                        label={user.isActive ? "Active" : "Inactive"}
                        variant={user.isActive ? "success" : "danger"}
                      />
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="btn btn-secondary btn-compact"
                          onClick={() => openEditModal(user)}
                          disabled={savingUser}
                          aria-label={`Edit ${user.staffName}`}
                        >
                          Edit
                        </button>
                        {user.isActive ? (
                          <button
                            type="button"
                            className="btn btn-secondary btn-compact"
                            onClick={() => setConfirmAction({ type: "deactivate", user })}
                            disabled={savingUser}
                            aria-label={`Deactivate ${user.staffName}`}
                          >
                            Deactivate
                          </button>
                        ) : (
                          <span className="muted-text">Deactivated</span>
                        )}
                        <button
                          type="button"
                          className="btn btn-danger btn-compact"
                          onClick={() => setConfirmAction({ type: "delete", user })}
                          disabled={savingUser}
                          aria-label={`Delete ${user.staffName}`}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editUser && (
        <ModalCard title="Edit User" onClose={closeEditModal}>
          <form onSubmit={handleEditSubmit} className="inventory-modal-form" aria-busy={savingUser}>
            <label className="form-group" htmlFor="editStaffName">
              <span>Staff Name</span>
              <input
                id="editStaffName"
                name="editStaffName"
                type="text"
                value={editForm.staffName}
                onChange={(event) => setEditForm((current) => ({ ...current, staffName: event.target.value }))}
                required
              />
            </label>

            <label className="form-group" htmlFor="editStaffId">
              <span>Staff ID</span>
              <input
                id="editStaffId"
                name="editStaffId"
                type="text"
                value={editForm.staffId}
                onChange={(event) => setEditForm((current) => ({ ...current, staffId: event.target.value }))}
                required
              />
            </label>

            <label className="form-group" htmlFor="editRole">
              <span>Role</span>
              <select
                id="editRole"
                name="editRole"
                value={editForm.role}
                onChange={(event) => setEditForm((current) => ({ ...current, role: event.target.value }))}
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-group" htmlFor="editDepartmentId">
              <span>Department</span>
              <select
                id="editDepartmentId"
                name="editDepartmentId"
                value={editForm.departmentId}
                onChange={(event) => setEditForm((current) => ({ ...current, departmentId: event.target.value }))}
                required
              >
                <option value="">Select Department</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-group" htmlFor="editPassword">
              <span>Set new password (optional)</span>
              <input
                id="editPassword"
                name="editPassword"
                type="password"
                placeholder="Set new password (optional)"
                value={editForm.password}
                onChange={(event) => setEditForm((current) => ({ ...current, password: event.target.value }))}
              />
            </label>

            {message && <StateNotice tone="error">{message}</StateNotice>}

            <div className="modal-actions">
              <button type="button" onClick={closeEditModal} className="btn btn-secondary" disabled={savingUser}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={savingUser}>
                {savingUser ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </ModalCard>
      )}

      {confirmAction && (
        <ConfirmDialog
          title={confirmAction.type === "delete" ? "Delete User" : "Deactivate User"}
          message={
            confirmAction.type === "delete"
              ? `Delete ${confirmAction.user.staffName}? This action cannot be undone.`
              : `Deactivate ${confirmAction.user.staffName}? They will lose access until reactivated.`
          }
          confirmLabel={confirmAction.type === "delete" ? "Delete User" : "Deactivate User"}
          isLoading={savingUser}
          onConfirm={handleConfirmAction}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      <div className="admin-toggle-row">
        <button type="button" onClick={() => setShowAudit((current) => !current)} className="btn btn-success">
          {showAudit ? "Hide Audit Logs" : "Audit Logs"}
        </button>
        <button type="button" onClick={() => setShowDepartments((current) => !current)} className="btn btn-secondary">
          {showDepartments ? "Hide Department Management" : "Department Management"}
        </button>
      </div>

      {showAudit && (
        <section className="feature-card">
          <div className="feature-card__header">
            <div>
              <h3>Audit Logs</h3>
              <p className="section-subtitle">Inspect notable system activity and recent account actions.</p>
            </div>
          </div>
          <AuditLogViewer />
        </section>
      )}

      {showDepartments && (
        <section className="feature-card">
          <div className="feature-card__header">
            <div>
              <h3>Department Management</h3>
              <p className="section-subtitle">Maintain the department list used by routing, approvals, and user assignments.</p>
            </div>
          </div>
          <DepartmentManager />
        </section>
      )}

      <section className="feature-card admin-password-card">
        <div className="feature-card__header">
          <div>
            <h3>Change My Password</h3>
            <p className="section-subtitle">Keep your own admin access secure without leaving the management workspace.</p>
          </div>
        </div>
        <p id={changePasswordHelpId} className="field-help">
          Use your current password to confirm the change before setting a new one.
        </p>
        <form onSubmit={handleChangePassword} className="inventory-modal-form" aria-describedby={changePasswordDescription || undefined}>
          <label className="form-group" htmlFor="adminChangePwOld">
            <span>Current Password</span>
            <input
              id="adminChangePwOld"
              name="adminChangePwOld"
              type="password"
              placeholder="Current password"
              value={changePwOld}
              onChange={(event) => setChangePwOld(event.target.value)}
              required
              autoComplete="current-password"
              aria-describedby={changePasswordDescription || undefined}
            />
          </label>
          <label className="form-group" htmlFor="adminChangePwNew">
            <span>New Password</span>
            <input
              id="adminChangePwNew"
              name="adminChangePwNew"
              type="password"
              placeholder="New password"
              value={changePwNew}
              onChange={(event) => setChangePwNew(event.target.value)}
              required
              autoComplete="new-password"
              aria-describedby={changePasswordDescription || undefined}
            />
          </label>
          <label className="form-group" htmlFor="adminChangePwConfirm">
            <span>Confirm New Password</span>
            <input
              id="adminChangePwConfirm"
              name="adminChangePwConfirm"
              type="password"
              placeholder="Confirm new password"
              value={changePwConfirm}
              onChange={(event) => setChangePwConfirm(event.target.value)}
              required
              autoComplete="new-password"
              aria-describedby={changePasswordDescription || undefined}
              aria-invalid={changePasswordMismatch}
            />
          </label>
          <button type="submit" disabled={changePwLoading} className="btn btn-primary admin-password-card__submit">
            {changePwLoading ? "Changing..." : "Change Password"}
          </button>
          {changePwMsg && (
            <div id="admin-change-password-message">
              <StateNotice tone={changePasswordTone}>{changePwMsg}</StateNotice>
            </div>
          )}
        </form>
      </section>
    </div>
  );
};

export default AdminAddUser;
