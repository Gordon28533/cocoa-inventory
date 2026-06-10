import React from "react";
import PropTypes from "prop-types";
import StatusBadge from "./ui/StatusBadge.jsx";

// ─── Threshold constants (kept in sync with InventoryList) ──────────────────
const LOW_THRESHOLD    = 10;   // ≤ 10  → Low
const MEDIUM_THRESHOLD = 30;   // ≤ 30  → Medium

const SEVERITY = {
  low: {
    label:    "Low Stock",
    variant:  "danger",
    color:    "#dc3545",
    priority: 1,
  },
  medium: {
    label:    "Medium Stock",
    variant:  "warning",
    color:    "#ffc107",
    priority: 2,
  },
};

const getSeverity = (quantity) => {
  if (quantity <= LOW_THRESHOLD)    return "low";
  if (quantity <= MEDIUM_THRESHOLD) return "medium";
  return null;
};

// ── Item row ─────────────────────────────────────────────────────────────────
const AlertRow = ({ item, severityKey }) => {
  const { variant, color } = SEVERITY[severityKey];
  return (
    <li className="stock-alert__item">
      <span className="stock-alert__item-name">{item.name}</span>
      <span className="stock-alert__item-qty">
        {item.quantity} {item.unit ?? "unit(s)"} remaining
      </span>
      <StatusBadge variant={variant} color={color}>
        {SEVERITY[severityKey].label}
      </StatusBadge>
    </li>
  );
};

AlertRow.propTypes = {
  item:        PropTypes.object.isRequired,
  severityKey: PropTypes.oneOf(["low", "medium"]).isRequired,
};

// ── Group ─────────────────────────────────────────────────────────────────────
const AlertGroup = ({ severityKey, items }) => {
  const { label, variant, color } = SEVERITY[severityKey];
  return (
    <section className="stock-alert__group" aria-labelledby={`alert-group-${severityKey}`}>
      <header className="stock-alert__group-header">
        <StatusBadge variant={variant} color={color}>
          {label}
        </StatusBadge>
        <span className="stock-alert__group-count" id={`alert-group-${severityKey}`}>
          {items.length} item{items.length !== 1 ? "s" : ""}
        </span>
      </header>
      <ul className="stock-alert__list" role="list">
        {items.map((item) => (
          <AlertRow key={item.id ?? item.name} item={item} severityKey={severityKey} />
        ))}
      </ul>
    </section>
  );
};

AlertGroup.propTypes = {
  severityKey: PropTypes.oneOf(["low", "medium"]).isRequired,
  items:       PropTypes.array.isRequired,
};

// ── Main component ────────────────────────────────────────────────────────────
const StockAlert = ({ inventory }) => {
  // Partition items into severity buckets, sorted by quantity ascending
  const sorted   = [...inventory].sort((a, b) => a.quantity - b.quantity);
  const lowItems = sorted.filter((i) => getSeverity(i.quantity) === "low");
  const medItems = sorted.filter((i) => getSeverity(i.quantity) === "medium");

  const totalAlerts = lowItems.length + medItems.length;

  if (totalAlerts === 0) {
    return (
      <div className="stock-alert stock-alert--empty" role="status">
        <span className="stock-alert__ok-icon" aria-hidden="true">✓</span>
        <p>All items are sufficiently stocked.</p>
      </div>
    );
  }

  return (
    <div className="stock-alert" role="region" aria-label="Stock alerts">

      {/* ── Heading ─────────────────────────────────────────────────── */}
      <div className="stock-alert__heading">
        <h3 className="stock-alert__title">
          Stock Alerts
          <span className="stock-alert__badge" aria-label={`${totalAlerts} alerts`}>
            {totalAlerts}
          </span>
        </h3>
        <p className="stock-alert__subtitle">
          {lowItems.length > 0 && `${lowItems.length} item${lowItems.length !== 1 ? "s" : ""} critically low. `}
          {medItems.length > 0 && `${medItems.length} item${medItems.length !== 1 ? "s" : ""} at medium stock.`}
        </p>
      </div>

      {/* ── Low stock group (shown first — highest severity) ───────── */}
      {lowItems.length > 0 && (
        <AlertGroup severityKey="low" items={lowItems} />
      )}

      {/* ── Medium stock group ──────────────────────────────────────── */}
      {medItems.length > 0 && (
        <AlertGroup severityKey="medium" items={medItems} />
      )}
    </div>
  );
};

StockAlert.propTypes = {
  inventory: PropTypes.arrayOf(
    PropTypes.shape({
      id:       PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      name:     PropTypes.string.isRequired,
      quantity: PropTypes.number.isRequired,
      unit:     PropTypes.string,
    })
  ).isRequired,
};

export default StockAlert;
