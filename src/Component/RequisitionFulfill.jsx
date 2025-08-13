import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";

const RequisitionFulfill = ({ setNotification, inventory }) => {
  const [code, setCode] = useState("");
  const [batch, setBatch] = useState(null);
  const [message, setMessage] = useState("");
  const token = localStorage.getItem("token");
  const [readyBatches, setReadyBatches] = useState([]); // Array of batches (each batch is an array of requisitions)
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Load batches that are ready for fulfillment
    const fetchReady = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`http://localhost:5000/requisitions`, {
          headers: { Authorization: "Bearer " + token }
        });
        const all = await res.json();
        // Group by batch_id
        const batchesMap = {};
        all.forEach(r => {
          if (!batchesMap[r.batch_id]) batchesMap[r.batch_id] = [];
          batchesMap[r.batch_id].push(r);
        });
        const batches = Object.values(batchesMap);
        // Ready if all items in batch are ho_account_approved (new flow) or account_approved (legacy)
        const ready = batches.filter(b => {
          const statuses = b.map(x => x.status);
          const allHO = statuses.every(s => s === 'ho_account_approved');
          const allLegacy = statuses.every(s => s === 'account_approved');
          return allHO || allLegacy;
        });
        // Sort by created_at desc using first item timestamp when available
        ready.sort((a, b) => {
          const ta = a[0].created_at ? new Date(a[0].created_at).getTime() : 0;
          const tb = b[0].created_at ? new Date(b[0].created_at).getTime() : 0;
          return tb - ta;
        });
        setReadyBatches(ready);
      } catch (e) {
        setReadyBatches([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchReady();
  }, [token]);

  const handleLookup = async () => {
    setMessage("");
    const res = await fetch(`http://localhost:5000/requisitions/code/${code}`);
    const data = await res.json();
    if (res.ok) {
      // Fetch all items in the batch
      const batch_id = data.batch_id;
      const res2 = await fetch(`http://localhost:5000/requisitions`, {
        headers: { Authorization: "Bearer " + token }
      });
      const all = await res2.json();
      setBatch(all.filter(r => r.batch_id === batch_id));
    } else {
      setMessage(data.error || "Not found.");
      setBatch(null);
    }
  };

  const handleOpenBatch = (batch_id) => {
    // Open batch from readyBatches
    const b = readyBatches.find(b => b[0].batch_id === batch_id);
    if (b) {
      setBatch(b);
      setMessage("");
      setCode("");
    }
  };

  const handleFulfill = async () => {
    setMessage("");
    if (!batch || batch.length === 0) return;
    const batch_id = batch[0].batch_id;
    const res = await fetch(`http://localhost:5000/requisitions/0/fulfill`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify({ unique_code: code, batch_id })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      if (setNotification) {
        setNotification("Batch fulfilled!");
        setTimeout(() => setNotification(""), 3000);
      } else {
        setMessage("Batch fulfilled!");
      }
      // Remove from ready list and clear view
      setReadyBatches(prev => prev.filter(b => b[0].batch_id !== batch_id));
      setBatch(null);
      setCode("");
    } else {
      if (setNotification) {
        setNotification(data.error || "Fulfillment failed.");
        setTimeout(() => setNotification(""), 3000);
      } else {
        setMessage(data.error || "Fulfillment failed.");
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

  const getItemName = (id) => {
    const item = inventory.find(i => i.id === id);
    return item ? item.name : id;
  };

  const getItemDetails = (id) => {
    const item = inventory.find(i => i.id === id);
    return item ? { name: item.name, category: item.category, type: item.type } : { name: id, category: '', type: '' };
  };

  // Helper to get overall batch status and icon
  const getBatchStatus = (batch) => {
    const statuses = batch.map(r => r.status);
    if (statuses.every(s => s === 'fulfilled')) return { label: 'Fulfilled', icon: '✅', color: '#28a745' };
    if (statuses.every(s => s === 'ho_account_approved' || s === 'account_approved')) return { label: 'Approved', icon: '✔️', color: '#1976d2' };
    if (statuses.every(s => s === 'pending')) return { label: 'Pending', icon: '⏳', color: '#ffc107' };
    if (statuses.some(s => s === 'rejected')) return { label: 'Rejected', icon: '❌', color: '#dc3545' };
    return { label: 'In Progress', icon: '🔄', color: '#888' };
  };

  return (
    <div>
      <h2>Fulfill Requisition</h2>

      {/* Ready batches list */}
      <div style={{ marginBottom: 16 }}>
        <h4 style={{ marginBottom: 8 }}>Batches ready to fulfill</h4>
        {isLoading ? (
          <div>Loading…</div>
        ) : readyBatches.length === 0 ? (
          <div>No batches are currently ready.</div>
        ) : (
          <table style={{ width: '100%', marginBottom: 12 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Batch ID</th>
                <th style={{ textAlign: 'left' }}>Department</th>
                <th>Items</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {readyBatches.map(b => (
                <tr key={b[0].batch_id}>
                  <td>{b[0].batch_id}</td>
                  <td>{b[0].department}</td>
                  <td style={{ textAlign: 'center' }}>{b.length}</td>
                  <td>
                    <span style={{ color: getBatchStatus(b).color, fontWeight: 600 }}>{getBatchStatus(b).label}</span>
                  </td>
                  <td>
                    <button className="btn btn-secondary" onClick={() => handleOpenBatch(b[0].batch_id)}>Open</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Lookup by code */}
      <div style={{ marginBottom: 16 }}>
        <input value={code} onChange={e => setCode(e.target.value)} placeholder="Enter unique code" />
        <button onClick={handleLookup}>Lookup</button>
      </div>

      {batch && batch.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ marginBottom: 8, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 16 }}>
            Batch ID: {batch[0].batch_id} | Department: {batch[0].department} | IT Item: {batch[0].is_it_item ? 'Yes' : 'No'}
            <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, color: getBatchStatus(batch).color, fontWeight: 700 }}>
              <span style={{ fontSize: 20 }}>{getBatchStatus(batch).icon}</span>
              {getBatchStatus(batch).label}
            </span>
          </div>
          <table style={{ width: '100%', marginBottom: 12 }}>
            <thead>
              <tr>
                <th>Item</th>
                <th>Category</th>
                <th>Type</th>
                <th>Quantity</th>
                <th>Status</th>
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
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input value={code} onChange={e => setCode(e.target.value)} placeholder="Enter unique code to confirm" />
            <button className="btn btn-primary" onClick={handleFulfill}>Fulfill Batch</button>
            <button className="btn btn-secondary" onClick={() => exportBatchToCSV(batch)}>Export CSV</button>
          </div>
        </div>
      )}
      {(!setNotification && message) && <div>{message}</div>}
    </div>
  );
};

RequisitionFulfill.propTypes = {
  setNotification: PropTypes.func,
  inventory: PropTypes.array.isRequired,
};

export default RequisitionFulfill; 