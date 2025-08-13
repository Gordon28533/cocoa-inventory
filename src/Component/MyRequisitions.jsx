import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";

const MyRequisitions = ({ inventory }) => {
  const [requisitions, setRequisitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const token = localStorage.getItem("token");
  const userId = JSON.parse(atob(localStorage.getItem("token").split('.')[1])).id;
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('created_at');
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(1);
  const [batchesPerPage, setBatchesPerPage] = useState(5);
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    fetchMine();
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

  const fetchMine = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("http://localhost:5000/requisitions", {
        headers: { Authorization: "Bearer " + token }
      });
      const data = await res.json();
      if (res.ok) {
        setRequisitions(data.filter(r => r.requested_by === userId));
      } else {
        setError(data.error || "Failed to fetch requisitions.");
      }
    } catch (err) {
      setError("Server error.");
    } finally {
      setLoading(false);
    }
  };

  // Group by batch_id
  const batches = {};
  requisitions.forEach(req => {
    if (!batches[req.batch_id]) batches[req.batch_id] = [];
    batches[req.batch_id].push(req);
  });

  const getItemDetails = (id) => {
    const item = inventory.find(i => i.id === id);
    return item ? { name: item.name, category: item.category, type: item.type } : { name: id, category: '', type: '' };
  };

  const getDeptName = (id) => {
    const dept = departments.find(d => String(d.id) === String(id));
    return dept ? dept.name : id;
  };

  const getBatchStatus = (batch) => {
    const statuses = batch.map(r => r.status);
    if (statuses.every(s => s === 'fulfilled')) return { label: 'Fulfilled', icon: '✅', color: '#28a745' };
    if (statuses.every(s => s === 'account_approved')) return { label: 'Approved', icon: '✔️', color: '#1976d2' };
    if (statuses.every(s => s === 'pending')) return { label: 'Pending', icon: '⏳', color: '#ffc107' };
    if (statuses.some(s => s === 'rejected')) return { label: 'Rejected', icon: '❌', color: '#dc3545' };
    return { label: 'In Progress', icon: '🔄', color: '#888' };
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
    a.download = `my_batch_${batch[0].batch_id}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;

  // Filtering and searching
  let batchList = Object.values(batches);
  if (filterStatus) {
    batchList = batchList.filter(batch => batch.some(r => r.status === filterStatus));
  }
  if (search) {
    batchList = batchList.filter(batch =>
      batch[0].batch_id.toLowerCase().includes(search.toLowerCase()) ||
      batch.some(r => {
        const details = getItemDetails(r.item_id);
        return details.name.toLowerCase().includes(search.toLowerCase());
      })
    );
  }
  // Sorting
  if (sortKey) {
    batchList.sort((a, b) => {
      let valA, valB;
      if (sortKey === 'created_at') {
        valA = a.reduce((min, r) => r.created_at < min ? r.created_at : min, a[0].created_at);
        valB = b.reduce((min, r) => r.created_at < min ? r.created_at : min, b[0].created_at);
      } else {
        valA = a[0][sortKey] || '';
        valB = b[0][sortKey] || '';
      }
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }
  const allStatuses = Array.from(new Set(requisitions.map(r => r.status))).filter(Boolean);

  // Pagination
  const totalPages = Math.ceil(batchList.length / batchesPerPage);
  const paginatedBatches = batchList.slice((page - 1) * batchesPerPage, page * batchesPerPage);
  const startIdx = (page - 1) * batchesPerPage + 1;
  const endIdx = Math.min(page * batchesPerPage, batchList.length);

  return (
    <div style={{ margin: 24 }}>
      <h2 style={{ marginBottom: 24 }}>My Requisitions</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Search by item, batch, or status..."
          value={search}
          onChange={e => {
            setSearch(e.target.value);
            setPage(1);
          }}
          style={{ padding: 8, borderRadius: 4, border: '1px solid #ccc', minWidth: 220 }}
        />
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} style={{ padding: 8, borderRadius: 4, border: '1px solid #ccc' }}>
          <option value="">All Statuses</option>
          {allStatuses.map(status => <option key={status} value={status}>{status}</option>)}
        </select>
        <button className="btn btn-primary" onClick={() => exportBatchToCSV(paginatedBatches)} style={{ marginLeft: 'auto' }}>Export CSV</button>
        <label style={{ marginLeft: 16, fontWeight: 500 }}>
          Show
          <select value={batchesPerPage} onChange={e => { setBatchesPerPage(Number(e.target.value)); setPage(1); }} style={{ margin: '0 8px', padding: 4, borderRadius: 4 }}>
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
          </select>
          per page
        </label>
      </div>
      <div style={{ marginBottom: 8, fontSize: 14, color: '#555' }}>
        Showing {batchList.length === 0 ? 0 : startIdx}-{endIdx} of {batchList.length} batches
      </div>
      {batchList.length === 0 ? <div>No requisitions found.</div> : (
        paginatedBatches.map(batch => (
          <div key={batch[0].batch_id} style={{ border: '1px solid #e1e8ed', borderRadius: 8, marginBottom: 24, padding: 0, background: '#fafbfc', overflow: 'hidden' }}>
            <div style={{
              position: 'sticky',
              top: 0,
              background: '#e3eafc',
              zIndex: 2,
              padding: 16,
              marginBottom: 8,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              borderBottom: '1px solid #b6c6e3',
            }}>
              Batch ID: {batch[0].batch_id} | Department: {getDeptName(batch[0].department_id)} | IT Item: {batch[0].is_it_item ? 'Yes' : 'No'}
              <span style={{ color: '#666', fontWeight: 400, fontSize: 13, marginLeft: 16 }}>
                Submitted: {new Date(batch.reduce((min, r) => r.created_at < min ? r.created_at : min, batch[0].created_at)).toLocaleString()}
              </span>
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
            <button className="btn btn-secondary" onClick={() => exportBatchToCSV(batch)}>Export CSV</button>
          </div>
        ))
      )}
      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 8,
          marginTop: 24,
          padding: 8,
          background: '#f5f7fa',
          borderRadius: 8,
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
        }}>
          <button
            className="btn btn-secondary"
            onClick={() => setPage(1)}
            disabled={page === 1}
            style={{ fontWeight: page === 1 ? 700 : 400 }}
            title="First page"
          >⏮</button>
          <button
            className="btn btn-secondary"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{ fontWeight: page === 1 ? 700 : 400 }}
            title="Previous page"
          >‹</button>
          <span style={{ alignSelf: 'center', fontWeight: 500 }}>
            Page
            <select
              value={page}
              onChange={e => setPage(Number(e.target.value))}
              style={{ margin: '0 6px', padding: 4, borderRadius: 4 }}
            >
              {Array.from({ length: totalPages }, (_, i) => (
                <option key={i + 1} value={i + 1}>{i + 1}</option>
              ))}
            </select>
            of {totalPages}
          </span>
          <button
            className="btn btn-secondary"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{ fontWeight: page === totalPages ? 700 : 400 }}
            title="Next page"
          >›</button>
          <button
            className="btn btn-secondary"
            onClick={() => setPage(totalPages)}
            disabled={page === totalPages}
            style={{ fontWeight: page === totalPages ? 700 : 400 }}
            title="Last page"
          >⏭</button>
        </div>
      )}
    </div>
  );
};

MyRequisitions.propTypes = {
  inventory: PropTypes.array.isRequired,
};

export default MyRequisitions; 