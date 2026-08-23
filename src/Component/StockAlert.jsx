import React from "react";
import PropTypes from "prop-types";
import StatusBadge from "./ui/StatusBadge.jsx";

// ─── Threshold constants (kept in sync with InventoryList) ──────────────────
const LOW_THRESHOLD    = 10;   // ≤ 10  → Low
const MEDIUM_THRESHOLD = 30;   // ≤ 30  → Medium

const SEVERITY = {
  out: {
    label:    "Out of Stock",
    variant:  "danger",
    color:    "#a71d2a",
    priority: 0,
  },
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

// A quantity of zero is not "low" — the item is unavailable, and saying
// "Low Stock" for it understates the situation to whoever reads the alert.
const getSeverity = (quantity) => {
  if (quantity <= 0)                return "out";
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
  severityKey: PropTypes.oneOf(["out", "low", "medium"]).isRequired,
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
  severityKey: PropTypes.oneOf(["out", "low", "medium"]).isRequired,
  items:       PropTypes.array.isRequired,
};

// ── Main component ────────────────────────────────────────────────────────────
const StockAlert = ({ inventory }) => {
  // Partition items into severity buckets, sorted by quantity ascending
  const sorted   = [...inventory].sort((a, b) => a.quantity - b.quantity);
  const outItems = sorted.filter((i) => getSeverity(i.quantity) === "out");
  const lowItems = sorted.filter((i) => getSeverity(i.quantity) === "low");
  const medItems = sorted.filter((i) => getSeverity(i.quantity) === "medium");

  const totalAlerts = outItems.length + lowItems.length + medItems.length;

  // An empty inventory is NOT a clean bill of health. Reporting "all items are
  // sufficiently stocked" when nothing is tracked tells the reader the opposite
  // of the truth, so the two states get separate messages.
  if (inventory.length === 0) {
    return (
      <div className="stock-alert stock-alert--untracked" role="status">
        <span className="stock-alert__warn-icon" aria-hidden="true">!</span>
        <p>
          No inventory items are being tracked yet — so there is nothing to
          report on. Add items before relying on these alerts.
        </p>
      </div>
    );
  }

  if (totalAlerts === 0) {
    return (
      <div className="stock-alert stock-alert--empty" role="status">
        <span className="stock-alert__ok-icon" aria-hidden="true">✓</span>
        <p>
          All {inventory.length} tracked item{inventory.length !== 1 ? "s are" : " is"} sufficiently stocked.
        </p>
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
          {outItems.length > 0 && `${outItems.length} item${outItems.length !== 1 ? "s" : ""} out of stock. `}
          {lowItems.length > 0 && `${lowItems.length} item${lowItems.length !== 1 ? "s" : ""} critically low. `}
          {medItems.length > 0 && `${medItems.length} item${medItems.length !== 1 ? "s" : ""} at medium stock.`}
        </p>
      </div>

      {/* ── Out of stock group (shown first — highest severity) ────── */}
      {outItems.length > 0 && (
        <AlertGroup severityKey="out" items={outItems} />
      )}

      {/* ── Low stock group ─────────────────────────────────────────── */}
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
