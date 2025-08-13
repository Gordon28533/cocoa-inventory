import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";

const RequisitionApproval = ({ setNotification, inventory }) => {
  const [requisitions, setRequisitions] = useState([]);
  const [message, setMessage] = useState("");
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  const [filterDept, setFilterDept] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortKey, setSortKey] = useState('');
  const [sortAsc, setSortAsc] = useState(true);
  const departmentId = localStorage.getItem("department_id");
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    fetchRequisitions();
    // Fetch departments
    const fetchDepartments = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("http://localhost:5000/departments", {
          headers: { Authorization: "Bearer " + token }
        });
        if (res.ok) setDepartments(await res.json());
      } catch {}
    };
    fetchDepartments();
    // eslint-disable-next-line
  }, []);

  const fetchRequisitions = async () => {
    const res = await fetch("http://localhost:5000/requisitions", {
      headers: { Authorization: "Bearer " + token }
    });
    const data = await res.json();
    setRequisitions(data);
  };

  // Group requisitions by batch_id
  const batches = {};
  requisitions.forEach(req => {
    if (!batches[req.batch_id]) batches[req.batch_id] = [];
    batches[req.batch_id].push(req);
  });

  // Only show batches relevant to the current role and approval step
  let filteredBatches = Object.values(batches).filter(batch => {
    const first = batch[0];
    // Branch stores submits: status = 'pending', next is branch account
    if (role === "account" && first.status === "pending") {
      // Only show if department matches user's department (branch)
      return String(first.department_id) === String(departmentId);
    }
    // Head office account: after branch account approves
    if (role === "account_manager" && first.status === "account_approved" && first.department !== "Head Office") {
      return true;
    }
    // Head office stores: after head office account approves
    if (role === "stores" && first.status === "ho_account_approved" && first.department === "Head Office") {
      return true;
    }
    // Existing logic for HOD, IT, etc.
    if (role === "hod" || role === "deputy_hod") {
      return first.status === "pending" && String(first.department_id) === String(departmentId);
    }
    if (role === "it_manager") return first.status === "hod_approved" && first.is_it_item;
    return false;
  });

  // Filtering
  if (filterDept) {
    filteredBatches = filteredBatches.filter(batch => batch[0].department === filterDept);
  }
  if (filterStatus) {
    filteredBatches = filteredBatches.filter(batch => batch[0].status === filterStatus);
  }

  // Sorting
  if (sortKey) {
    filteredBatches.sort((a, b) => {
      const valA = a[0][sortKey] || '';
      const valB = b[0][sortKey] || '';
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }

  // Get unique departments and statuses for filter dropdowns
  const allDepts = Array.from(new Set(requisitions.map(r => r.department))).filter(Boolean);
  const allStatuses = Array.from(new Set(requisitions.map(r => r.status))).filter(Boolean);

  // Helper to get overall batch status and icon
  const getBatchStatus = (batch) => {
    const statuses = batch.map(r => r.status);
    if (statuses.every(s => s === 'fulfilled')) return { label: 'Fulfilled', icon: '✅', color: '#28a745' };
    if (statuses.every(s => s === 'account_approved')) return { label: 'Approved', icon: '✔️', color: '#1976d2' };
    if (statuses.every(s => s === 'pending')) return { label: 'Pending', icon: '⏳', color: '#ffc107' };
    if (statuses.some(s => s === 'rejected')) return { label: 'Rejected', icon: '❌', color: '#dc3545' };
    return { label: 'In Progress', icon: '🔄', color: '#888' };
  };

  const handleBatchApprove = async (batch_id) => {
    setMessage("");
    const res = await fetch(`http://localhost:5000/requisitions/0/approve`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify({ batch_id })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      if (setNotification) {
        setNotification("Batch approved!");
        setTimeout(() => setNotification(""), 3000);
      } else {
        setMessage("Batch approved!");
      }
      fetchRequisitions();
    } else {
      if (setNotification) {
        setNotification(data.error || "Approval failed.");
        setTimeout(() => setNotification(""), 3000);
      } else {
        setMessage(data.error || "Approval failed.");
      }
    }
  };

  const exportBatchToCSV = (batch) => {
    const headers = ['Item', 'Category', 'Type', 'Quantity', 'Status'];
    const rows = batch.map(req => {
      const details = getItemDetails(req.item_id);
      return [details.name, details.category, details.type, req.quantity, req.status];
    });
    let csvContent = headers.join(',') + '\n' + rows.map(r => r.map(x => '"' + String(x).replace(/"/g, '""') + '"').join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `batch_${batch[0].batch_id}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getItemDetails = (id) => {
    const item = inventory.find(i => i.id === id);
    return item ? { name: item.name, category: item.category, type: item.type } : { name: id, category: '', type: '' };
  };

  const getDeptName = (id) => {
    const dept = departments.find(d => String(d.id) === String(id));
    return dept ? dept.name : id;
  };

  return (
    <div>
      <h2>Requisitions to Approve</h2>
      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        <label>
          Department:
          <select value={filterDept} onChange={e => setFilterDept(e.target.value)} style={{ marginLeft: 8 }}>
            <option value="">All</option>
            {allDepts.map(dept => <option key={dept} value={dept}>{dept}</option>)}
          </select>
        </label>
        <label>
          Status:
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ marginLeft: 8 }}>
            <option value="">All</option>
            {allStatuses.map(status => <option key={status} value={status}>{status}</option>)}
          </select>
        </label>
      </div>
      {(!setNotification && message) && <div>{message}</div>}
      {filteredBatches.length === 0 ? (
        <div>No requisitions to approve.</div>
      ) : (
        filteredBatches.map(batch => (
          <div key={batch[0].batch_id} style={{ border: '1px solid #e1e8ed', borderRadius: 8, marginBottom: 24, padding: 16, background: '#fafbfc' }}>
            <div style={{ marginBottom: 8, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 16 }}>
              Batch ID: {batch[0].batch_id} | Department: {getDeptName(batch[0].department_id)} | IT Item: {batch[0].is_it_item ? 'Yes' : 'No'}
              <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, color: getBatchStatus(batch).color, fontWeight: 700 }}>
                <span style={{ fontSize: 20 }}>{getBatchStatus(batch).icon}</span>
                {getBatchStatus(batch).label}
              </span>
            </div>
            <table style={{ width: '100%', marginBottom: 12 }}>
              <thead>
                <tr>
                  <th style={{ cursor: 'pointer' }} onClick={() => { setSortKey('item_id'); setSortAsc(sortKey === 'item_id' ? !sortAsc : true); }}>Item</th>
                  <th style={{ cursor: 'pointer' }} onClick={() => { setSortKey('category'); setSortAsc(sortKey === 'category' ? !sortAsc : true); }}>Category</th>
                  <th style={{ cursor: 'pointer' }} onClick={() => { setSortKey('type'); setSortAsc(sortKey === 'type' ? !sortAsc : true); }}>Type</th>
                  <th style={{ cursor: 'pointer' }} onClick={() => { setSortKey('quantity'); setSortAsc(sortKey === 'quantity' ? !sortAsc : true); }}>Quantity</th>
                  <th style={{ cursor: 'pointer' }} onClick={() => { setSortKey('status'); setSortAsc(sortKey === 'status' ? !sortAsc : true); }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {batch.map((req, idx) => {
                  const details = getItemDetails(req.item_id);
                  return (
                    <tr key={req.id} style={{ background: idx % 2 === 0 ? '#f4f6fa' : '#fff' }}>
                      <td>{details.name}</td>
                      <td>{details.category}</td>
                      <td>{details.type}</td>
                      <td>{req.quantity}</td>
                      <td title={`Status: ${req.status}`}>{req.status}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <button className="btn btn-primary" onClick={() => handleBatchApprove(batch[0].batch_id)}>Approve Batch</button>
            <button className="btn btn-secondary" style={{ marginLeft: 12 }} onClick={() => exportBatchToCSV(batch)}>Export CSV</button>
          </div>
        ))
      )}
    </div>
  );
};

RequisitionApproval.propTypes = {
  setNotification: PropTypes.func,
  inventory: PropTypes.array.isRequired,
};

export default RequisitionApproval; 