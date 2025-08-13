import React from "react";
import { useParams, Link } from "react-router-dom";
import PropTypes from "prop-types";

const InventoryDetails = ({ inventory }) => {
  const { id } = useParams();
  const item = inventory.find((item) => String(item.id) === String(id));

  if (!item) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <h2>Item Not Found</h2>
        <p>No inventory item with ID {id}.</p>
        <Link to="/dashboard">Back to Inventory</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", padding: 24, border: "1px solid #e1e8ed", borderRadius: 8 }}>
      <h2>{item.name}</h2>
      <table style={{ width: "100%", marginBottom: 24 }}>
        <tbody>
          <tr><td><strong>ID:</strong></td><td>{item.id}</td></tr>
          <tr><td><strong>Category:</strong></td><td>{item.category}</td></tr>
          <tr><td><strong>Type:</strong></td><td>{item.type}</td></tr>
          <tr><td><strong>Quantity:</strong></td><td>{item.quantity}</td></tr>
          <tr><td><strong>Status:</strong></td><td>{item.status || "-"}</td></tr>
          <tr><td><strong>Last Updated:</strong></td><td>{item.updated_at ? new Date(item.updated_at).toLocaleString() : "N/A"}</td></tr>
        </tbody>
      </table>
      <Link to="/dashboard">Back to Inventory</Link>
    </div>
  );
};

InventoryDetails.propTypes = {
  inventory: PropTypes.array.isRequired,
};

export default InventoryDetails; 