import React, { useState } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { useAuth } from "../Context/AuthContext.js";
import ModalCard from "./ui/ModalCard.jsx";
import { api } from "../utils/api.js";

const INITIAL_ITEM = { id: "", name: "", category: "", type: "", quantity: 0 };

const InventoryList = ({ inventory, setInventory, onEditItem }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const { role: userRole } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);
  const [addItem, setAddItem] = useState(INITIAL_ITEM);
  const [addMsg, setAddMsg] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const filteredInventory = inventory
    .filter((item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.type.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((left, right) => {
      switch (sortBy) {
        case "name":
          return left.name.localeCompare(right.name);
        case "category":
          return left.category.localeCompare(right.category);
        case "quantity":
          return right.quantity - left.quantity;
        case "type":
          return left.type.localeCompare(right.type);
        default:
          return 0;
      }
    });

  const getStockStatus = (quantity) => {
    if (quantity <= 10) return { status: "Low", color: "#dc3545", background: "#f8d7da" };
    if (quantity <= 30) return { status: "Medium", color: "#ffc107", background: "#fff3cd" };
    return { status: "Good", color: "#28a745", background: "#d4edda" };
  };

  const handleAddItem = async (event) => {
    event.preventDefault();
    setAddMsg("");
    setAddLoading(true);

    try {
      const newItem = await api.createItem(addItem);
      setInventory((previous) => [...previous, newItem]);
      setAddMsg("Item added successfully!");
      setAddItem(INITIAL_ITEM);
      window.setTimeout(() => {
        setShowAddModal(false);
        setAddMsg("");
      }, 1000);
    } catch (error) {
      setAddMsg(error.message || "Network error. Please try again.");
    } finally {
      setAddLoading(false);
    }
  };

  const handleDelete = async (id) => {
    setDeleteLoading(true);

    try {
      await api.deleteItem(id);
      setInventory((previous) => previous.filter((item) => item.id !== id));
      setDeleteId(null);
    } catch (error) {
      alert(error.message || "Network error. Please try again.");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="inventory-list">
      <div style={{ padding: "20px", borderBottom: "1px solid #e1e8ed" }}>
        <div className="section-header" style={{ marginBottom: "20px" }}>
          <h2 style={{ margin: 0 }}>Inventory Management</h2>
          <div className="summary-text" style={{ marginBottom: 0 }}>
            Total Items: {inventory.length}
          </div>
        </div>

        {userRole === "stores" && (
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary" style={{ marginBottom: 16 }}>
            + Add Item
          </button>
        )}

        <div className="toolbar-row">
          <div style={{ flex: "1", minWidth: "200px" }}>
            <input
              type="text"
              placeholder="Search items..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              style={{
                width: "100%",
                padding: "10px 15px",
                border: "2px solid #e1e8ed",
                borderRadius: "8px",
                fontSize: "14px"
              }}
            />
          </div>

          <div style={{ minWidth: "150px" }}>
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              style={{
                width: "100%",
                padding: "10px 15px",
                border: "2px solid #e1e8ed",
                borderRadius: "8px",
                fontSize: "14px",
                background: "white"
              }}
            >
              <option value="name">Sort by Name</option>
              <option value="category">Sort by Category</option>
              <option value="type">Sort by Type</option>
              <option value="quantity">Sort by Quantity</option>
            </select>
          </div>
        </div>
      </div>

      {filteredInventory.length === 0 ? (
        <div style={{ padding: "40px", textAlign: "center", color: "#666" }}>
          <h3>No items found</h3>
          <p>Try adjusting your search criteria</p>
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Item Name</th>
              <th>Category</th>
              <th>Type</th>
              <th>Quantity</th>
              <th>Status</th>
              <th>Last Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredInventory.map((item) => {
              const stockStatus = getStockStatus(item.quantity);

              return (
                <tr key={item.id}>
                  <td>
                    <div>
                      <strong>
                        <Link to={`/inventory/${item.id}`}>{item.name}</Link>
                      </strong>
                      <div style={{ fontSize: "12px", color: "#666" }}>ID: {item.id}</div>
                    </div>
                  </td>
                  <td>
                    <span
                      style={{
                        padding: "4px 8px",
                        background: "#e3f2fd",
                        color: "#1976d2",
                        borderRadius: "4px",
                        fontSize: "12px",
                        fontWeight: "500"
                      }}
                    >
                      {item.category}
                    </span>
                  </td>
                  <td>{item.type}</td>
                  <td>
                    <strong style={{ fontSize: "16px" }}>{item.quantity}</strong>
                  </td>
                  <td>
                    <span
                      style={{
                        padding: "4px 8px",
                        background: stockStatus.background,
                        color: stockStatus.color,
                        borderRadius: "4px",
                        fontSize: "12px",
                        fontWeight: "500"
                      }}
                    >
                      {stockStatus.status}
                    </span>
                  </td>
                  <td>{item.updated_at ? new Date(item.updated_at).toLocaleDateString() : "N/A"}</td>
                  <td>
                    {userRole === "stores" && (
                      <>
                        <button
                          onClick={() => onEditItem && onEditItem(item)}
                          style={{ fontSize: 12, padding: "4px 10px", marginRight: 6 }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteId(item.id)}
                          className="btn btn-danger"
                          style={{ fontSize: 12, padding: "4px 10px" }}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {showAddModal && (
        <ModalCard title="Add New Item">
          <form onSubmit={handleAddItem}>
            <input
              type="text"
              placeholder="Item ID"
              value={addItem.id}
              onChange={(event) => setAddItem({ ...addItem, id: event.target.value })}
              required
              style={{ display: "block", marginBottom: 12, width: "100%" }}
            />
            <input
              type="text"
              placeholder="Name"
              value={addItem.name}
              onChange={(event) => setAddItem({ ...addItem, name: event.target.value })}
              required
              style={{ display: "block", marginBottom: 12, width: "100%" }}
            />
            <input
              type="text"
              placeholder="Category"
              value={addItem.category}
              onChange={(event) => setAddItem({ ...addItem, category: event.target.value })}
              required
              style={{ display: "block", marginBottom: 12, width: "100%" }}
            />
            <input
              type="text"
              placeholder="Type"
              value={addItem.type}
              onChange={(event) => setAddItem({ ...addItem, type: event.target.value })}
              required
              style={{ display: "block", marginBottom: 12, width: "100%" }}
            />
            <input
              type="number"
              placeholder="Quantity"
              value={addItem.quantity}
              onChange={(event) => setAddItem({ ...addItem, quantity: Number.parseInt(event.target.value, 10) || 0 })}
              required
              min={0}
              style={{ display: "block", marginBottom: 12, width: "100%" }}
            />
            <button type="submit" disabled={addLoading} className="btn btn-primary" style={{ width: "100%", marginBottom: 10 }}>
              {addLoading ? "Adding..." : "Add Item"}
            </button>
            {addMsg && <div style={{ color: addMsg.includes("success") ? "green" : "red", marginTop: 10 }}>{addMsg}</div>}
          </form>
          <button onClick={() => setShowAddModal(false)} className="btn btn-secondary" style={{ marginTop: 10, width: "100%" }}>
            Cancel
          </button>
        </ModalCard>
      )}

      {deleteId && (
        <ModalCard title="Confirm Delete">
          <p>Are you sure you want to delete this item?</p>
          <div className="dashboard-actions" style={{ marginTop: 18 }}>
            <button onClick={() => handleDelete(deleteId)} disabled={deleteLoading} className="btn btn-danger">
              {deleteLoading ? "Deleting..." : "Yes, Delete"}
            </button>
            <button onClick={() => setDeleteId(null)} className="btn btn-secondary">
              Cancel
            </button>
          </div>
        </ModalCard>
      )}
    </div>
  );
};

InventoryList.propTypes = {
  inventory: PropTypes.array.isRequired,
  setInventory: PropTypes.func,
  onEditItem: PropTypes.func
};

export default InventoryList;
