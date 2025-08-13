import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";

const DepartmentManager = ({ setNotification }) => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newDept, setNewDept] = useState({ name: "", description: "" });
  const [editDeptId, setEditDeptId] = useState(null);
  const [editDept, setEditDept] = useState({ name: "", description: "" });
  const [saving, setSaving] = useState(false);
  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchDepartments();
    // eslint-disable-next-line
  }, []);

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/departments", {
        headers: { Authorization: "Bearer " + token }
      });
      if (res.ok) {
        setDepartments(await res.json());
      } else {
        setNotification && setNotification("Failed to fetch departments");
      }
    } catch (err) {
      setNotification && setNotification("Server error fetching departments");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newDept.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("http://localhost:5000/departments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token
        },
        body: JSON.stringify(newDept)
      });
      const data = await res.json();
      if (res.ok) {
        setNotification && setNotification("Department added");
        setNewDept({ name: "", description: "" });
        fetchDepartments();
      } else {
        setNotification && setNotification(data.error || "Failed to add department");
      }
    } catch (err) {
      setNotification && setNotification("Server error");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (dept) => {
    setEditDeptId(dept.id);
    setEditDept({ name: dept.name, description: dept.description || "" });
  };

  const handleEditSave = async (id) => {
    if (!editDept.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`http://localhost:5000/departments/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token
        },
        body: JSON.stringify(editDept)
      });
      const data = await res.json();
      if (res.ok) {
        setNotification && setNotification("Department updated");
        setEditDeptId(null);
        fetchDepartments();
      } else {
        setNotification && setNotification(data.error || "Failed to update department");
      }
    } catch (err) {
      setNotification && setNotification("Server error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this department?")) return;
    setSaving(true);
    try {
      const res = await fetch(`http://localhost:5000/departments/${id}`, {
        method: "DELETE",
        headers: { Authorization: "Bearer " + token }
      });
      const data = await res.json();
      if (res.ok) {
        setNotification && setNotification("Department deleted");
        fetchDepartments();
      } else {
        setNotification && setNotification(data.error || "Failed to delete department");
      }
    } catch (err) {
      setNotification && setNotification("Server error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h3>Department Management</h3>
      <form onSubmit={handleAdd} style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Department name"
          value={newDept.name}
          onChange={e => setNewDept({ ...newDept, name: e.target.value })}
          required
          style={{ padding: 8, borderRadius: 4, border: '1px solid #ccc', minWidth: 180 }}
        />
        <input
          type="text"
          placeholder="Description (optional)"
          value={newDept.description}
          onChange={e => setNewDept({ ...newDept, description: e.target.value })}
          style={{ padding: 8, borderRadius: 4, border: '1px solid #ccc', minWidth: 220 }}
        />
        <button type="submit" className="btn btn-primary" disabled={saving || !newDept.name.trim()}>
          {saving ? 'Saving...' : 'Add Department'}
        </button>
      </form>
      {loading ? (
        <div>Loading departments...</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              <th style={{ padding: 10, border: '1px solid #eee', textAlign: 'left' }}>Name</th>
              <th style={{ padding: 10, border: '1px solid #eee', textAlign: 'left' }}>Description</th>
              <th style={{ padding: 10, border: '1px solid #eee' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {departments.map(dept => (
              <tr key={dept.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: 10 }}>
                  {editDeptId === dept.id ? (
                    <input
                      type="text"
                      value={editDept.name}
                      onChange={e => setEditDept({ ...editDept, name: e.target.value })}
                      required
                      style={{ padding: 6, borderRadius: 4, border: '1px solid #ccc', minWidth: 120 }}
                    />
                  ) : (
                    dept.name
                  )}
                </td>
                <td style={{ padding: 10 }}>
                  {editDeptId === dept.id ? (
                    <input
                      type="text"
                      value={editDept.description}
                      onChange={e => setEditDept({ ...editDept, description: e.target.value })}
                      style={{ padding: 6, borderRadius: 4, border: '1px solid #ccc', minWidth: 180 }}
                    />
                  ) : (
                    dept.description
                  )}
                </td>
                <td style={{ padding: 10, textAlign: 'center' }}>
                  {editDeptId === dept.id ? (
                    <>
                      <button className="btn btn-primary" style={{ marginRight: 8 }} onClick={() => handleEditSave(dept.id)} disabled={saving || !editDept.name.trim()}>
                        Save
                      </button>
                      <button className="btn btn-secondary" onClick={() => setEditDeptId(null)} disabled={saving}>
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="btn btn-secondary" style={{ marginRight: 8 }} onClick={() => handleEdit(dept)} disabled={saving}>
                        Edit
                      </button>
                      <button className="btn btn-danger" onClick={() => handleDelete(dept.id)} disabled={saving}>
                        Delete
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {departments.length === 0 && (
              <tr>
                <td colSpan={3} style={{ textAlign: 'center', color: '#888', padding: 24 }}>
                  No departments found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};

DepartmentManager.propTypes = {
  setNotification: PropTypes.func,
};

export default DepartmentManager; 