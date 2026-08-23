import React, { useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { useAuth } from "../Context/AuthContext.js";
import StateNotice from "./ui/StateNotice.jsx";
import StatusBadge from "./ui/StatusBadge.jsx";
import { api } from "../utils/api.js";
import { getBatchStatusMeta } from "../utils/requisitionStatus.js";

// ── Thresholds (kept in sync with StockAlert.jsx and InventoryList.jsx) ───────
const LOW_THRESHOLD    = 10;
const MEDIUM_THRESHOLD = 30;

// ── Role sets ─────────────────────────────────────────────────────────────────
const STOCK_ALERT_ROLES  = new Set(["admin", "stores", "it_manager"]);
const APPROVER_ROLES     = new Set(["account", "hod", "deputy_hod", "it_manager", "account_manager"]);

// Show batches updated within this many days in the Recent Activity section
const RECENT_DAYS = 7;

// ── helpers ───────────────────────────────────────────────────────────────────
// Mirrors StockAlert.jsx: zero quantity is "out", not merely "low".
const getSeverityKey = (quantity) => {
  if (quantity <= 0)                return "out";
  if (quantity <= LOW_THRESHOLD)    return "low";
  if (quantity <= MEDIUM_THRESHOLD) return "medium";
  return null;
};

const groupByBatch = (rows) => {
  const map = new Map();
  for (const row of rows) {
    const key = row.batch_id || `no-batch-${row.id}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  }
  return [...map.values()];
};

const formatDate = (ts) =>
  ts ? new Date(ts).toLocaleDateString("en-GB") : "";

// ── component ─────────────────────────────────────────────────────────────────
const NotificationsPanel = ({ inventory }) => {
  const { role: userRole } = useAuth();
  const [requisitions, setRequisitions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]     = useState("");

  const loadRequisitions = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await api.getRequisitions();
      setRequisitions(Array.isArray(data) ? data : (data?.requisitions ?? []));
    } catch (err) {
      setError(err.message || "Failed to load notifications.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadRequisitions(); }, [loadRequisitions]);

  // ── stock alerts ─────────────────────────────────────────────────────────
  const showStock = STOCK_ALERT_ROLES.has(userRole);

  const { outItems, lowItems, mediumItems } = useMemo(() => {
    const sorted = [...inventory].sort((a, b) => a.quantity - b.quantity);
    return {
      outItems:    sorted.filter((i) => getSeverityKey(i.quantity) === "out"),
      lowItems:    sorted.filter((i) => getSeverityKey(i.quantity) === "low"),
      mediumItems: sorted.filter((i) => getSeverityKey(i.quantity) === "medium"),
    };
  }, [inventory]);

  // ── pending approvals ─────────────────────────────────────────────────────
  const showApprovals = APPROVER_ROLES.has(userRole);

  const pendingBatches = useMemo(() => {
    if (!showApprovals || requisitions.length === 0) return [];
    return groupByBatch(requisitions).filter((items) => {
      const meta = getBatchStatusMeta(items);
      return meta.label !== "Fulfilled" && meta.label !== "Rejected";
    });
  }, [showApprovals, requisitions]);

  // ── recent activity ───────────────────────────────────────────────────────
  const recentActivity = useMemo(() => {
    if (requisitions.length === 0) return [];
    const cutoff = Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000;
    return groupByBatch(requisitions)
      .filter((items) => {
        const ts = items[0].updated_at || items[0].created_at;
        return ts && new Date(ts).getTime() >= cutoff;
      })
      .sort((a, b) => {
        const tA = new Date(a[0].updated_at || a[0].created_at).getTime();
        const tB = new Date(b[0].updated_at || b[0].created_at).getTime();
        return tB - tA;
      })
      .slice(0, 10);
  }, [requisitions]);

  const stockAlertCount = outItems.length + lowItems.length + mediumItems.length;

  const totalAlerts =
    (showStock    ? stockAlertCount : 0) +
    (showApprovals ? pendingBatches.length : 0);

  return (
    <div className="feature-panel">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="feature-panel__header">
        <div>
          <h2>Notifications</h2>
          <p className="section-subtitle">
            {totalAlerts > 0
              ? `${totalAlerts} item${totalAlerts !== 1 ? "s" : ""} need${totalAlerts === 1 ? "s" : ""} your attention.`
              : "You're all caught up."}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={loadRequisitions}
          disabled={isLoading}
        >
          Refresh
        </button>
      </div>

      {error && <StateNotice tone="error">{error}</StateNotice>}

      {/* ── Stock Alerts ────────────────────────────────────────────────── */}
      {showStock && (
        <section className="notif-section" aria-labelledby="notif-stock-heading">
          <h3 className="notif-section__title" id="notif-stock-heading">
            Stock Alerts
            {stockAlertCount > 0 && (
              <span
                className="notif-badge notif-badge--danger"
                aria-label={`${stockAlertCount} stock alerts`}
              >
                {stockAlertCount}
              </span>
            )}
          </h3>

          {inventory.length === 0 ? (
            // Not the same as "everything is fine" — there is simply nothing
            // being tracked, so no conclusion about stock levels is possible.
            <StateNotice tone="warning">
              No inventory items are being tracked yet — nothing to report on.
            </StateNotice>
          ) : stockAlertCount === 0 ? (
            <StateNotice>
              All {inventory.length} tracked item{inventory.length !== 1 ? "s are" : " is"} sufficiently stocked.
            </StateNotice>
          ) : (
            <ul className="notif-list" role="list">
              {outItems.map((item) => (
                <li key={item.id} className="notif-item notif-item--danger">
                  <div className="notif-item__body">
                    <span className="notif-item__title">{item.name}</span>
                    <span className="notif-item__sub">
                      None remaining
                    </span>
                  </div>
                  <StatusBadge variant="danger" color="#a71d2a">Out of Stock</StatusBadge>
                </li>
              ))}
              {lowItems.map((item) => (
                <li key={item.id} className="notif-item notif-item--danger">
                  <div className="notif-item__body">
                    <span className="notif-item__title">{item.name}</span>
                    <span className="notif-item__sub">
                      {item.quantity} {item.unit ?? "unit(s)"} remaining
                    </span>
                  </div>
                  <StatusBadge variant="danger" color="#dc3545">Low Stock</StatusBadge>
                </li>
              ))}
              {mediumItems.map((item) => (
                <li key={item.id} className="notif-item notif-item--warning">
                  <div className="notif-item__body">
                    <span className="notif-item__title">{item.name}</span>
                    <span className="notif-item__sub">
                      {item.quantity} {item.unit ?? "unit(s)"} remaining
                    </span>
                  </div>
                  <StatusBadge variant="warning" color="#ffc107">Medium Stock</StatusBadge>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* ── Pending Approvals ───────────────────────────────────────────── */}
      {showApprovals && (
        <section className="notif-section" aria-labelledby="notif-approvals-heading">
          <h3 className="notif-section__title" id="notif-approvals-heading">
            Pending Approvals
            {pendingBatches.length > 0 && (
              <span
                className="notif-badge notif-badge--warning"
                aria-label={`${pendingBatches.length} batches awaiting approval`}
              >
                {pendingBatches.length}
              </span>
            )}
          </h3>

          {isLoading ? (
            <StateNotice>Loading approvals…</StateNotice>
          ) : pendingBatches.length === 0 ? (
            <StateNotice>No batches awaiting approval.</StateNotice>
          ) : (
            <ul className="notif-list" role="list">
              {pendingBatches.slice(0, 10).map((items) => {
                const meta  = getBatchStatusMeta(items);
                const first = items[0];
                const batchId = first.batch_id;
                return (
                  <li key={batchId} className="notif-item">
                    <div className="notif-item__body">
                      <span className="notif-item__title">
                        Ref: …{batchId?.toString().slice(-6).toUpperCase()}
                      </span>
                      <span className="notif-item__sub">
                        {first.department_name ?? first.department ?? `Dept ${first.department_id}`}
                        {" · "}
                        {items.length} item{items.length !== 1 ? "s" : ""}
                        {first.created_at && ` · ${formatDate(first.created_at)}`}
                      </span>
                    </div>
                    <StatusBadge variant={meta.variant} color={meta.color}>
                      {meta.label}
                    </StatusBadge>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {/* ── Recent Activity ─────────────────────────────────────────────── */}
      <section className="notif-section" aria-labelledby="notif-activity-heading">
        <h3 className="notif-section__title" id="notif-activity-heading">
          Recent Activity
          <span className="notif-section__sub">last {RECENT_DAYS} days</span>
        </h3>

        {isLoading ? (
          <StateNotice>Loading activity…</StateNotice>
        ) : recentActivity.length === 0 ? (
          <StateNotice>No requisition activity in the last {RECENT_DAYS} days.</StateNotice>
        ) : (
          <ul className="notif-list" role="list">
            {recentActivity.map((items) => {
              const meta    = getBatchStatusMeta(items);
              const first   = items[0];
              const batchId = first.batch_id;
              const ts      = first.updated_at || first.created_at;
              return (
                <li key={batchId} className="notif-item">
                  <div className="notif-item__body">
                    <span className="notif-item__title">
                      Ref: …{batchId?.toString().slice(-6).toUpperCase()}
                    </span>
                    <span className="notif-item__sub">
                      {first.department_name ?? first.department ?? `Dept ${first.department_id}`}
                      {" · "}
                      {items.length} item{items.length !== 1 ? "s" : ""}
                      {ts && ` · ${formatDate(ts)}`}
                    </span>
                  </div>
                  <StatusBadge variant={meta.variant} color={meta.color}>
                    {meta.label}
                  </StatusBadge>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
};

NotificationsPanel.propTypes = {
  inventory: PropTypes.array.isRequired,
};

export default NotificationsPanel;
