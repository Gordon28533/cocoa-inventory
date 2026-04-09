import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { useAuth } from "../Context/AuthContext.js";
import StateNotice from "./ui/StateNotice.jsx";
import StatusBadge from "./ui/StatusBadge.jsx";
import { api } from "../utils/api.js";
import { APPROVED_BATCH_STATUSES, getBatchStatusMeta } from "../utils/requisitionStatus.js";

const groupByBatchId = (requisitions) => {
  const grouped = {};

  requisitions.forEach((requisition) => {
    if (!grouped[requisition.batch_id]) {
      grouped[requisition.batch_id] = [];
    }

    grouped[requisition.batch_id].push(requisition);
  });

  return Object.values(grouped);
};

const sortByNewest = (left, right) => {
  const leftTime = left[0].created_at ? new Date(left[0].created_at).getTime() : 0;
  const rightTime = right[0].created_at ? new Date(right[0].created_at).getTime() : 0;
  return rightTime - leftTime;
};

const RequisitionFulfill = ({ setNotification, inventory }) => {
  const [code, setCode] = useState("");
  const [batch, setBatch] = useState(null);
  const [message, setMessage] = useState("");
  const [readyBatches, setReadyBatches] = useState([]);
  const [requestedBatches, setRequestedBatches] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [receiverId, setReceiverId] = useState("");
  const { token } = useAuth();

  const showFeedback = (nextMessage) => {
    setMessage(nextMessage);

    if (setNotification) {
      setNotification(nextMessage);
      setTimeout(() => setNotification(""), 3000);
    }
  };

  const fetchBatches = async () => {
    setIsLoading(true);

    try {
      const all = await api.getRequisitions();
      const groupedBatches = groupByBatchId(all);
      const ready = groupedBatches.filter((group) => group.every((item) => APPROVED_BATCH_STATUSES.has(item.status)));
      const requested = groupedBatches.filter((group) => {
        const statuses = group.map((item) => item.status);
        const allFulfilled = statuses.every((status) => status === "fulfilled");
        const allReady = statuses.every((status) => APPROVED_BATCH_STATUSES.has(status));
        return !allFulfilled && !allReady;
      });

      ready.sort(sortByNewest);
      requested.sort(sortByNewest);

      setReadyBatches(ready);
      setRequestedBatches(requested);
    } catch (error) {
      setReadyBatches([]);
      setRequestedBatches([]);
      setMessage(error.message || "Failed to load batches.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      setReadyBatches([]);
      setRequestedBatches([]);
      setIsLoading(false);
      return;
    }

    fetchBatches();
  }, [token]);

  const readyBatchIds = useMemo(() => new Set(readyBatches.map((currentBatch) => currentBatch[0].batch_id)), [readyBatches]);

  const handleLookup = async () => {
    const trimmedCode = code.trim();
    setMessage("");

    if (!trimmedCode) {
      setMessage("Please enter a unique code.");
      setBatch(null);
      return;
    }

    try {
      const requisition = await api.getRequisitionByCode(trimmedCode);
      const all = await api.getRequisitions();
      const nextBatch = all.filter((item) => item.batch_id === requisition.batch_id);

      if (nextBatch.length === 0) {
        setMessage("Batch not found.");
        setBatch(null);
        return;
      }

      setBatch(nextBatch);
      setCode(trimmedCode);
      setMessage("");
    } catch (error) {
      setMessage(error.message || "Not found.");
      setBatch(null);
    }
  };

  const handleOpenBatch = (batchId) => {
    const nextBatch =
      readyBatches.find((group) => group[0].batch_id === batchId) ||
      requestedBatches.find((group) => group[0].batch_id === batchId);

    if (nextBatch) {
      setBatch(nextBatch);
      setMessage("");
      setCode("");
      setReceiverId("");
    }
  };

  const handleFulfill = async () => {
    setMessage("");

    if (!batch || batch.length === 0) {
      return;
    }

    const batchId = batch[0].batch_id;
    const trimmedCode = code.trim();
    const trimmedReceiverId = receiverId.trim();

    if (!readyBatchIds.has(batchId)) {
      setMessage("This batch is not ready for fulfillment yet.");
      return;
    }

    if (!trimmedCode || !trimmedReceiverId) {
      setMessage("Please enter the unique code and receiver Staff ID to verify.");
      return;
    }

    try {
      const data = await api.fulfillBatch(batchId, {
        unique_code: trimmedCode,
        receiver_id: trimmedReceiverId
      });

      if (data.success) {
        showFeedback("Batch fulfilled!");
        setReadyBatches((current) => current.filter((group) => group[0].batch_id !== batchId));
        setBatch(null);
        setCode("");
        setReceiverId("");
      }
    } catch (error) {
      showFeedback(error.message || "Fulfillment failed.");
    }
  };

  const getItemDetails = (id) => {
    const item = inventory.find((entry) => entry.id === id);
    return item ? { name: item.name, category: item.category, type: item.type } : { name: id, category: "", type: "" };
  };

  const exportBatchToCSV = (currentBatch) => {
    const headers = ["Item", "Category", "Type", "Quantity", "Status"];
    const rows = currentBatch.map((item) => {
      const details = getItemDetails(item.item_id);
      return [details.name, details.category, details.type, item.quantity, item.status];
    });

    const csvContent = `${headers.join(",")}\n${rows
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
      .join("\n")}`;

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `batch_${currentBatch[0].batch_id}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const selectedBatchReady = batch?.length ? readyBatchIds.has(batch[0].batch_id) : false;

  return (
    <div>
      <h2>Fulfill Requisition</h2>

      <div style={{ marginBottom: 16 }}>
        <h4 style={{ marginBottom: 8 }}>Batches requested (awaiting approvals)</h4>
        {isLoading ? (
          <StateNotice>Loading...</StateNotice>
        ) : requestedBatches.length === 0 ? (
          <StateNotice>No requested batches awaiting approval.</StateNotice>
        ) : (
          <table style={{ width: "100%", marginBottom: 12 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Batch ID</th>
                <th style={{ textAlign: "left" }}>Department</th>
                <th>Items</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {requestedBatches.map((currentBatch) => {
                const batchStatus = getBatchStatusMeta(currentBatch);
                return (
                  <tr key={currentBatch[0].batch_id}>
                    <td>{currentBatch[0].batch_id}</td>
                    <td>{currentBatch[0].department}</td>
                    <td style={{ textAlign: "center" }}>{currentBatch.length}</td>
                    <td>
                      <StatusBadge color={batchStatus.color} label={batchStatus.label} />
                    </td>
                    <td>
                      <button className="btn btn-secondary" onClick={() => handleOpenBatch(currentBatch[0].batch_id)}>
                        Open
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ marginBottom: 16 }}>
        <h4 style={{ marginBottom: 8 }}>Batches ready to fulfill</h4>
        {isLoading ? (
          <StateNotice>Loading...</StateNotice>
        ) : readyBatches.length === 0 ? (
          <StateNotice>No batches are currently ready.</StateNotice>
        ) : (
          <table style={{ width: "100%", marginBottom: 12 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Batch ID</th>
                <th style={{ textAlign: "left" }}>Department</th>
                <th>Items</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {readyBatches.map((currentBatch) => {
                const batchStatus = getBatchStatusMeta(currentBatch);
                return (
                  <tr key={currentBatch[0].batch_id}>
                    <td>{currentBatch[0].batch_id}</td>
                    <td>{currentBatch[0].department}</td>
                    <td style={{ textAlign: "center" }}>{currentBatch.length}</td>
                    <td>
                      <StatusBadge color={batchStatus.color} label={batchStatus.label} />
                    </td>
                    <td>
                      <button className="btn btn-secondary" onClick={() => handleOpenBatch(currentBatch[0].batch_id)}>
                        Open
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ marginBottom: 16 }}>
        <label htmlFor="lookup-code" style={{ marginRight: 8 }}>
          Unique Code:
        </label>
        <input
          id="lookup-code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="Enter unique code"
        />
        <button type="button" onClick={handleLookup} style={{ marginLeft: 8 }}>
          Lookup
        </button>
      </div>

      {batch && batch.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div className="batch-card__header" style={{ marginBottom: 8, background: "#fff", borderBottom: "none", padding: 0 }}>
            Batch ID: {batch[0].batch_id} | Department: {batch[0].department} | IT Item: {batch[0].is_it_item ? "Yes" : "No"}
            <StatusBadge color={getBatchStatusMeta(batch).color} className="batch-card__status">
              <span style={{ fontSize: 14 }}>{getBatchStatusMeta(batch).icon}</span>
              {getBatchStatusMeta(batch).label}
            </StatusBadge>
          </div>

          <table style={{ width: "100%", marginBottom: 12 }}>
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
              {batch.map((item, index) => {
                const details = getItemDetails(item.item_id);
                return (
                  <tr key={item.id} style={{ background: index % 2 === 0 ? "#f4f6fa" : "#fff" }}>
                    <td>{details.name}</td>
                    <td>{details.category}</td>
                    <td>{details.type}</td>
                    <td>{item.quantity}</td>
                    <td title={`Status: ${item.status}`}>{item.status}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input
              aria-label="Enter unique code to confirm"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="Enter unique code to confirm"
            />
            <input
              aria-label="Receiver Staff ID"
              value={receiverId}
              onChange={(event) => setReceiverId(event.target.value)}
              placeholder="Receiver Staff ID (required)"
            />
            <button
              className="btn btn-primary"
              onClick={handleFulfill}
              disabled={!selectedBatchReady || !code.trim() || !receiverId.trim()}
            >
              Fulfill Batch
            </button>
            <button className="btn btn-secondary" onClick={() => exportBatchToCSV(batch)}>
              Export CSV
            </button>
          </div>
        </div>
      )}

      {message && <StateNotice>{message}</StateNotice>}
    </div>
  );
};

RequisitionFulfill.propTypes = {
  setNotification: PropTypes.func,
  inventory: PropTypes.array.isRequired
};

export default RequisitionFulfill;
