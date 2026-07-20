import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../Context/AuthContext.js";
import ConfirmDialog from "./ui/ConfirmDialog.jsx";
import StateNotice from "./ui/StateNotice.jsx";
import StatusBadge from "./ui/StatusBadge.jsx";
import { api } from "../utils/api.js";
import { getBatchStatusMeta } from "../utils/requisitionStatus.js";
import { getStatusLabel } from "../utils/statusLabels.js";

// ─── helpers ─────────────────────────────────────────────────────────────────
const formatDate = (ts) =>
  ts ? new Date(ts).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";

const groupByBatch = (requisitions) => {
  const map = new Map();
  for (const row of requisitions) {
    const key = row.batch_id || `no-batch-${row.id}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  }
  return [...map.entries()].map(([batchId, items]) => ({ batchId, items }));
};

const exportBatchCSV = (batches) => {
  const rows = [["Batch ID", "Item", "Qty", "Dept", "Status", "Submitted"]];
  for (const { batchId, items } of batches) {
    for (const item of items) {
      rows.push([
        batchId,
        item.item_name ?? item.name ?? item.id,
        item.quantity,
        item.department_name ?? item.department_id,
        getStatusLabel(item.status),
        formatDate(item.created_at),
      ]);
    }
  }
  const csv = rows.map((r) => r.join(",")).join("\n");
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(new Blob([csv], { type: "text/csv" })),
    download: `requisitions-${Date.now()}.csv`,
  });
  a.click();
  URL.revokeObjectURL(a.href);
};

// ─── component ────────────────────────────────────────────────────────────────
const RequisitionApproval = () => {
  const { role } = useAuth();

  const [batches, setBatches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState({ msg: "", tone: "success" });

  // approve state
  const [approvingBatchId, setApprovingBatchId] = useState(null);
  const [isApproving, setIsApproving] = useState(false);

  // reject state
  const [rejectingBatchId, setRejectingBatchId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);
  const rejectTextareaRef = useRef(null);
  const noticeTimerRef    = useRef(null);

  // search / filter
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // ── fetch ─────────────────────────────────────────────────────────────
  const loadRequisitions = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await api.getRequisitions();
      const all = Array.isArray(data) ? data : (data?.requisitions ?? []);
      setBatches(groupByBatch(all));
    } catch (err) {
      setError(err.message || "Failed to load requisitions.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadRequisitions(); }, [loadRequisitions]);

  // focus reject textarea when panel opens
  useEffect(() => {
    if (rejectingBatchId) rejectTextareaRef.current?.focus();
  }, [rejectingBatchId]);

  // Clear notice timer on unmount to avoid state updates on an unmounted component.
  useEffect(() => () => { if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current); }, []);

  // ── notice helper ─────────────────────────────────────────────────────
  const showNotice = (msg, tone = "success") => {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    setNotice({ msg, tone });
    noticeTimerRef.current = setTimeout(() => setNotice({ msg: "", tone: "success" }), 4000);
  };

  // ── approve ───────────────────────────────────────────────────────────
  const handleApproveConfirm = async () => {
    if (!approvingBatchId) return;
    setIsApproving(true);
    try {
      await api.approveRequisition(0, { batch_id: approvingBatchId });
      showNotice(`Batch approved.`);
      await loadRequisitions();
    } catch (err) {
      showNotice(err.message || "Approval failed.", "error");
    } finally {
      setIsApproving(false);
      setApprovingBatchId(null);
    }
  };

  // ── reject ────────────────────────────────────────────────────────────
  const openRejectPanel = (batchId) => {
    setRejectingBatchId(batchId);
    setRejectReason("");
  };

  const closeRejectPanel = () => {
    setRejectingBatchId(null);
    setRejectReason("");
  };

  const handleRejectSubmit = async (batchId) => {
    if (!rejectReason.trim()) {
      showNotice("Please provide a reason for rejection.", "error");
      rejectTextareaRef.current?.focus();
      return;
    }
    setIsRejecting(true);
    try {
      await api.rejectRequisition(0, { batch_id: batchId, reason: rejectReason.trim() });
      showNotice(`Batch rejected.`);
      closeRejectPanel();
      await loadRequisitions();
    } catch (err) {
      showNotice(err.message || "Rejection failed.", "error");
    } finally {
      setIsRejecting(false);
    }
  };

  // ── filtering ─────────────────────────────────────────────────────────
  const visibleBatches = batches.filter(({ batchId, items }) => {
    const meta = getBatchStatusMeta(items);
    if (statusFilter && meta.label.toLowerCase() !== statusFilter.toLowerCase()) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        batchId.toString().toLowerCase().includes(q) ||
        items.some(
          (i) =>
            (i.item_name ?? i.name ?? "").toLowerCase().includes(q) ||
            (i.department_name ?? "").toLowerCase().includes(q)
        )
      );
    }
    return true;
  });

  const uniqueStatuses = [...new Set(batches.map(({ items }) => getBatchStatusMeta(items).label))].sort();

  // ── render ────────────────────────────────────────────────────────────
  if (isLoading) return <StateNotice>Loading requisitions…</StateNotice>;
  if (error) return (
    <StateNotice tone="error">
      {error}{" "}
      <button className="btn btn-secondary btn-sm" onClick={loadRequisitions}>Retry</button>
    </StateNotice>
  );

  return (
    <div className="approval-shell">

      {/* ── Global notice ──────────────────────────────────────────────── */}
      {notice.msg && (
        <StateNotice tone={notice.tone}>{notice.msg}</StateNotice>
      )}

      {/* ── Controls ───────────────────────────────────────────────────── */}
      <div className="approval-controls">
        <input
          type="text"
          placeholder="Search batch ID, item, department…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="approval-search"
          aria-label="Search requisitions"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="approval-status-filter"
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {uniqueStatuses.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => exportBatchCSV(visibleBatches)}
          disabled={visibleBatches.length === 0}
        >
          Export CSV
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={loadRequisitions}>
          Refresh
        </button>
      </div>

      {/* ── Batch cards ────────────────────────────────────────────────── */}
      {visibleBatches.length === 0 ? (
        <StateNotice>No requisitions match your filters.</StateNotice>
      ) : (
        <ul className="approval-list" role="list">
          {visibleBatches.map(({ batchId, items }) => {
            const meta = getBatchStatusMeta(items);
            const firstItem = items[0];
            const isRejectOpen = rejectingBatchId === batchId;
            const canAct = meta.label !== "Fulfilled" && meta.label !== "Rejected";

            return (
              <li key={batchId} className="approval-card">

                {/* ── Card header ───────────────────────────────────── */}
                <div className="approval-card__header">
                  <div className="approval-card__meta">
                    <span className="approval-card__batch-id" title={batchId}>
                      Ref: …{batchId.toString().slice(-6).toUpperCase()}
                    </span>
                    <StatusBadge variant={meta.variant} color={meta.color}>
                      {meta.label}
                    </StatusBadge>
                  </div>
                  <div className="approval-card__info">
                    <span>{firstItem?.department_name ?? firstItem?.department ?? `Dept ${firstItem?.department_id}`}</span>
                    <span className="approval-card__date">{formatDate(firstItem?.created_at)}</span>
                  </div>
                </div>

                {/* ── Items table ───────────────────────────────────── */}
                <div className="approval-card__table-wrap">
                  <table className="approval-card__table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Qty</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr key={item.id}>
                          <td>{item.item_name ?? item.name ?? item.item_id ?? item.id}</td>
                          <td>{item.quantity}</td>
                          <td>
                            <span className={`status-chip status-chip--${item.status}`}>
                              {getStatusLabel(item.status)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* ── Action footer ──────────────────────────────────── */}
                {canAct && (
                  <div className="approval-card__footer">
                    {/* Approve */}
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => setApprovingBatchId(batchId)}
                    >
                      Approve Batch
                    </button>

                    {/* Reject toggle / panel */}
                    {!isRejectOpen ? (
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => openRejectPanel(batchId)}
                      >
                        Reject
                      </button>
                    ) : (
                      <div className="approval-reject-panel" role="region" aria-label="Reject batch">
                        <label
                          htmlFor={`reject-reason-${batchId}`}
                          className="approval-reject-panel__label"
                        >
                          Reason for rejection <span aria-hidden="true">*</span>
                        </label>
                        <textarea
                          id={`reject-reason-${batchId}`}
                          ref={rejectTextareaRef}
                          rows={3}
                          placeholder="Explain why this requisition is being rejected…"
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          className="approval-reject-panel__textarea"
                          disabled={isRejecting}
                        />
                        <div className="approval-reject-panel__actions">
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => handleRejectSubmit(batchId)}
                            disabled={isRejecting || !rejectReason.trim()}
                          >
                            {isRejecting ? "Rejecting…" : "Confirm Reject"}
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={closeRejectPanel}
                            disabled={isRejecting}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* ── Approve confirm dialog ─────────────────────────────────────── */}
      {approvingBatchId && (
        <ConfirmDialog
          title="Approve Batch"
          message={`Approve this batch? This will advance all items to the next stage.`}
          confirmLabel="Approve"
          isLoading={isApproving}
          onConfirm={handleApproveConfirm}
          onCancel={() => setApprovingBatchId(null)}
        />
      )}
    </div>
  );
};

export default RequisitionApproval;
