import React from "react";
import { Link, useParams } from "react-router-dom";
import PropTypes from "prop-types";
import useDocumentTitle from "../hooks/useDocumentTitle.js";
import StatusBadge from "./ui/StatusBadge.jsx";
import StateNotice from "./ui/StateNotice.jsx";
import "../styles.css";

const getStockVariant = (quantity) => {
  if (quantity <= 10) {
    return { label: "Low stock", variant: "danger" };
  }

  if (quantity <= 30) {
    return { label: "Medium stock", variant: "warning" };
  }

  return { label: "In stock", variant: "success" };
};

const InventoryDetails = ({ inventory }) => {
  const { id } = useParams();
  const item = inventory.find((entry) => String(entry.id) === String(id));

  useDocumentTitle(item ? `${item.name}` : "Inventory Item");

  if (!item) {
    return (
      <div className="inventory-details inventory-details--missing">
        <div className="page-message-card">
          <h2>Item Not Found</h2>
          <StateNotice>No inventory item with ID {id} is available in the current session.</StateNotice>
          <div className="inventory-details__actions">
            <Link to="/dashboard?tab=inventory" className="btn btn-secondary">
              Back to Inventory
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const stockMeta = getStockVariant(Number(item.quantity) || 0);

  return (
    <div className="inventory-details">
      <section className="inventory-details__card">
        <div className="inventory-details__header">
          <div>
            <p className="inventory-details__eyebrow">Inventory Item</p>
            <h2>{item.name}</h2>
            <p className="inventory-details__subtitle">
              Review the current stock position, category, and last update before returning to the workspace.
            </p>
          </div>
          <StatusBadge label={stockMeta.label} variant={stockMeta.variant} />
        </div>

        <div className="inventory-details__summary">
          <div className="inventory-summary-card">
            <span className="inventory-summary-card__label">Item ID</span>
            <strong>{item.id}</strong>
          </div>
          <div className="inventory-summary-card">
            <span className="inventory-summary-card__label">Category</span>
            <strong>{item.category || "-"}</strong>
          </div>
          <div className="inventory-summary-card">
            <span className="inventory-summary-card__label">Type</span>
            <strong>{item.type || "-"}</strong>
          </div>
          <div className="inventory-summary-card">
            <span className="inventory-summary-card__label">Quantity</span>
            <strong>{item.quantity}</strong>
          </div>
        </div>

        <table className="table-compact inventory-details__table">
          <tbody>
            <tr>
              <th scope="row">Status</th>
              <td>{item.status || stockMeta.label}</td>
            </tr>
            <tr>
              <th scope="row">Last Updated</th>
              <td>{item.updated_at ? new Date(item.updated_at).toLocaleString() : "Not available"}</td>
            </tr>
          </tbody>
        </table>

        <div className="inventory-details__actions">
          <Link to="/dashboard?tab=inventory" className="btn btn-secondary">
            Back to Inventory
          </Link>
        </div>
      </section>
    </div>
  );
};

InventoryDetails.propTypes = {
  inventory: PropTypes.array.isRequired
};

export default InventoryDetails;
