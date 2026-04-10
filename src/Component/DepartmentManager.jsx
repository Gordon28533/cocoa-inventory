import React, { useState } from "react";
import PropTypes from "prop-types";
import ConfirmDialog from "./ui/ConfirmDialog.jsx";
import StateNotice from "./ui/StateNotice.jsx";
import { useDepartments } from "../Context/DepartmentsContext.js";
import { api } from "../utils/api.js";

const DepartmentManager = ({ setNotification }) => {
  const { departments, loading, error, refreshDepartments } = useDepartments();
  const [newDept, setNewDept] = useState({ name: "", description: "" });
  const [editDeptId, setEditDeptId] = useState(null);
  const [editDept, setEditDept] = useState({ name: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [localNotice, setLocalNotice] = useState({ message: "", tone: "neutral" });
  const addDepartmentHelpId = "department-manager-help";
  const addDepartmentNoticeId = localNotice.message ? "department-manager-notice" : undefined;
  const addDepartmentDescription = [addDepartmentHelpId, addDepartmentNoticeId].filter(Boolean).join(" ");

  const showNotice = (message, tone = "neutral") => {
    setLocalNotice({ message, tone });
    setNotification && setNotification(message);
  };

  const handleAdd = async (event) => {
    event.preventDefault();
    if (!newDept.name.trim()) return;

    setSaving(true);
    try {
      await api.createDepartment(newDept);
      showNotice("Department added successfully.", "success");
      setNewDept({ name: "", description: "" });
      refreshDepartments();
    } catch (err) {
      showNotice(err.message || "Unable to save the department. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (dept) => {
    setEditDeptId(dept.id);
    setEditDept({ name: dept.name, description: dept.description || "" });
    setLocalNotice({ message: "", tone: "neutral" });
  };

  const handleEditSave = async (id) => {
    if (!editDept.name.trim()) return;

    setSaving(true);
    try {
      await api.updateDepartment(id, editDept);
      showNotice("Department updated successfully.", "success");
      setEditDeptId(null);
      refreshDepartments();
    } catch (err) {
      showNotice(err.message || "Unable to update the department. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) {
      return;
    }

    setSaving(true);
    try {
      await api.deleteDepartment(pendingDelete.id);
      showNotice("Department deleted successfully.", "success");
      setPendingDelete(null);
      refreshDepartments();
    } catch (err) {
      showNotice(err.message || "Unable to delete the department. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="feature-panel">
      <div className="feature-panel__header">
        <div>
          <h3>Department Management</h3>
          <p className="section-subtitle">Add, edit, and retire departments used for routing, approvals, and user assignment.</p>
        </div>
      </div>

      {localNotice.message && (
        <div id="department-manager-notice">
          <StateNotice tone={localNotice.tone}>{localNotice.message}</StateNotice>
        </div>
      )}

      <p id={addDepartmentHelpId} className="field-help">
        Department names should stay unique so approvals and user assignments stay unambiguous.
      </p>

      <form onSubmit={handleAdd} className="filter-toolbar" aria-busy={saving} aria-describedby={addDepartmentDescription || undefined}>
        <label className="toolbar-field department-form__field">
          <span>Department Name</span>
          <input
            type="text"
            placeholder="Department name"
            value={newDept.name}
            onChange={(event) => setNewDept({ ...newDept, name: event.target.value })}
            required
            aria-describedby={addDepartmentDescription || undefined}
          />
        </label>
        <label className="toolbar-field department-form__field department-form__field--wide">
          <span>Description</span>
          <input
            type="text"
            placeholder="Description (optional)"
            value={newDept.description}
            onChange={(event) => setNewDept({ ...newDept, description: event.target.value })}
            aria-describedby={addDepartmentDescription || undefined}
          />
        </label>
        <button type="submit" className="btn btn-primary" disabled={saving || !newDept.name.trim()}>
          {saving && !pendingDelete ? "Saving..." : "Add Department"}
        </button>
      </form>

      {loading ? (
        <StateNotice>Loading departments...</StateNotice>
      ) : error ? (
        <StateNotice tone="error">{error}</StateNotice>
      ) : departments.length === 0 ? (
        <StateNotice>No departments found.</StateNotice>
      ) : (
        <div className="table-shell">
          <table className="table-compact table-compact--wide">
            <caption className="sr-only">
              Departments currently available for routing, approval workflows, and user assignments.
            </caption>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Description</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((dept, index) => (
                <tr key={dept.id} className={index % 2 === 0 ? "row-alt" : ""}>
                  <td>
                    {editDeptId === dept.id ? (
                      <input
                        type="text"
                        value={editDept.name}
                        onChange={(event) => setEditDept({ ...editDept, name: event.target.value })}
                        required
                      />
                    ) : (
                      dept.name
                    )}
                  </td>
                  <td>
                    {editDeptId === dept.id ? (
                      <input
                        type="text"
                        value={editDept.description}
                        onChange={(event) => setEditDept({ ...editDept, description: event.target.value })}
                      />
                    ) : (
                      dept.description || <span className="muted-text">No description</span>
                    )}
                  </td>
                  <td>
                    <div className="table-actions">
                      {editDeptId === dept.id ? (
                        <>
                          <button
                            type="button"
                            className="btn btn-primary btn-compact"
                            onClick={() => handleEditSave(dept.id)}
                            disabled={saving || !editDept.name.trim()}
                          >
                            {saving ? "Saving..." : "Save"}
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-compact"
                            onClick={() => setEditDeptId(null)}
                            disabled={saving}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="btn btn-secondary btn-compact"
                            onClick={() => handleEdit(dept)}
                            disabled={saving}
                            aria-label={`Edit ${dept.name}`}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-compact"
                            onClick={() => setPendingDelete(dept)}
                            disabled={saving}
                            aria-label={`Delete ${dept.name}`}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Delete Department"
          message={`Delete ${pendingDelete.name}? This can affect users and requisitions linked to the department.`}
          confirmLabel="Delete Department"
          isLoading={saving}
          onConfirm={handleDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
};

DepartmentManager.propTypes = {
  setNotification: PropTypes.func
};

export default DepartmentManager;
