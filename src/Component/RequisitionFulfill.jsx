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
        showFeedback("Batch fulfilled successfully.");
        setReadyBatches((current) => current.filter((group) => group[0].batch_id !== batchId));
        setBatch(null);
        setCode("");
        setReceiverId("");
      }
    } catch (error) {
      showFeedback(error.message || "Unable to fulfill the batch. Please try again.");
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
    <div className="feature-panel">
      <div className="feature-panel__header">
        <div>
          <h2>Fulfill Requisition</h2>
          <p className="section-subtitle">
            Track batches still awaiting approval, open ready batches, and verify pickup details before fulfillment.
          </p>
        </div>
      </div>

      <div className="feature-grid feature-grid--2">
        <section className="feature-card">
          <div className="feature-card__header">
            <div>
              <h3>Batches requested</h3>
              <p className="section-subtitle">These batches are still moving through the approval chain.</p>
            </div>
          </div>
          {isLoading ? (
            <StateNotice>Loading batches still moving through approvals...</StateNotice>
          ) : requestedBatches.length === 0 ? (
            <StateNotice>No requested batches awaiting approval.</StateNotice>
          ) : (
            <table className="table-compact">
              <caption className="sr-only">Batches that are still moving through the approval process.</caption>
              <thead>
                <tr>
                  <th scope="col">Batch ID</th>
                  <th scope="col">Department</th>
                  <th scope="col">Items</th>
                  <th scope="col">Status</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requestedBatches.map((currentBatch, index) => {
                  const batchStatus = getBatchStatusMeta(currentBatch);
                  return (
                    <tr key={currentBatch[0].batch_id} className={index % 2 === 0 ? "row-alt" : ""}>
                      <td>{currentBatch[0].batch_id}</td>
                      <td>{currentBatch[0].department}</td>
                      <td>{currentBatch.length}</td>
                      <td>
                        <StatusBadge color={batchStatus.color} variant={batchStatus.variant} label={batchStatus.label} />
                      </td>
                      <td>
                        <button
                          className="btn btn-secondary btn-compact"
                          onClick={() => handleOpenBatch(currentBatch[0].batch_id)}
                          aria-label={`Open requested batch ${currentBatch[0].batch_id}`}
                        >
                          Open
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>

        <section className="feature-card">
          <div className="feature-card__header">
            <div>
              <h3>Batches ready to fulfill</h3>
              <p className="section-subtitle">These batches are approved and ready for code verification.</p>
            </div>
          </div>
          {isLoading ? (
            <StateNotice>Loading approved batches ready for fulfillment...</StateNotice>
          ) : readyBatches.length === 0 ? (
            <StateNotice>No batches are currently ready.</StateNotice>
          ) : (
            <table className="table-compact">
              <caption className="sr-only">Batches that are approved and ready for fulfillment.</caption>
              <thead>
                <tr>
                  <th scope="col">Batch ID</th>
                  <th scope="col">Department</th>
                  <th scope="col">Items</th>
                  <th scope="col">Status</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {readyBatches.map((currentBatch, index) => {
                  const batchStatus = getBatchStatusMeta(currentBatch);
                  return (
                    <tr key={currentBatch[0].batch_id} className={index % 2 === 0 ? "row-alt" : ""}>
                      <td>{currentBatch[0].batch_id}</td>
                      <td>{currentBatch[0].department}</td>
                      <td>{currentBatch.length}</td>
                      <td>
                        <StatusBadge color={batchStatus.color} variant={batchStatus.variant} label={batchStatus.label} />
                      </td>
                      <td>
                        <button
                          className="btn btn-secondary btn-compact"
                          onClick={() => handleOpenBatch(currentBatch[0].batch_id)}
                          aria-label={`Open ready batch ${currentBatch[0].batch_id}`}
                        >
                          Open
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      </div>

      <section className="feature-card">
        <div className="feature-card__header">
          <div>
            <h3>Lookup by Code</h3>
            <p className="section-subtitle">Paste a pickup code to locate the matching batch and verify the receiver.</p>
          </div>
        </div>

        <div className="lookup-toolbar">
          <label className="toolbar-field lookup-toolbar__field" htmlFor="lookup-code">
            <span>Unique Code</span>
            <input
              id="lookup-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="Enter unique code"
            />
          </label>
          <button type="button" onClick={handleLookup} className="btn btn-primary">
            Lookup
          </button>
        </div>

        {batch && batch.length > 0 && (
          <div className="batch-card batch-card--embedded">
            <div className="batch-card__header">
              <div className="batch-card__meta">
                <div className="batch-card__title-row">
                  <strong>Batch ID: {batch[0].batch_id}</strong>
                  {(() => {
                    const batchStatus = getBatchStatusMeta(batch);
                    return (
                      <StatusBadge color={batchStatus.color} variant={batchStatus.variant} className="batch-card__status">
                        <span className="status-badge__icon">{batchStatus.icon}</span>
                        {batchStatus.label}
                      </StatusBadge>
                    );
                  })()}
                </div>
                <div className="batch-card__details">
                  <span>Department: {batch[0].department}</span>
                  <span>IT Item: {batch[0].is_it_item ? "Yes" : "No"}</span>
                </div>
              </div>
            </div>

            <table className="table-compact">
              <caption className="sr-only">Selected batch {batch[0].batch_id} with its item details and fulfillment status.</caption>
              <thead>
                <tr>
                  <th scope="col">Item</th>
                  <th scope="col">Category</th>
                  <th scope="col">Type</th>
                  <th scope="col">Quantity</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {batch.map((item, index) => {
                  const details = getItemDetails(item.item_id);
                  return (
                    <tr key={item.id} className={index % 2 === 0 ? "row-alt" : ""}>
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

            <div className="lookup-toolbar lookup-toolbar--confirm">
              <label className="toolbar-field lookup-toolbar__field">
                <span>Confirm Unique Code</span>
                <input
                  aria-label="Enter unique code to confirm"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="Enter unique code to confirm"
                />
              </label>
              <label className="toolbar-field lookup-toolbar__field">
                <span>Receiver Staff ID</span>
                <input
                  aria-label="Receiver Staff ID"
                  value={receiverId}
                  onChange={(event) => setReceiverId(event.target.value)}
                  placeholder="Receiver Staff ID"
                />
              </label>
              <div className="modal-actions lookup-toolbar__actions">
                <button
                  className="btn btn-primary"
                  onClick={handleFulfill}
                  disabled={!selectedBatchReady || !code.trim() || !receiverId.trim()}
                  aria-label={batch?.length ? `Fulfill batch ${batch[0].batch_id}` : "Fulfill selected batch"}
                >
                  Fulfill Batch
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => exportBatchToCSV(batch)}
                  aria-label={batch?.length ? `Export batch ${batch[0].batch_id} to CSV` : "Export selected batch to CSV"}
                >
                  Export CSV
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {message && <StateNotice>{message}</StateNotice>}
    </div>
  );
};

RequisitionFulfill.propTypes = {
  setNotification: PropTypes.func,
  inventory: PropTypes.array.isRequired
};

export default RequisitionFulfill;
