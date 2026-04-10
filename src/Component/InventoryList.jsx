import React, { useState } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { useAuth } from "../Context/AuthContext.js";
import ConfirmDialog from "./ui/ConfirmDialog.jsx";
import ModalCard from "./ui/ModalCard.jsx";
import StateNotice from "./ui/StateNotice.jsx";
import StatusBadge from "./ui/StatusBadge.jsx";
import { api } from "../utils/api.js";

const INITIAL_ITEM = { id: "", name: "", category: "", type: "", quantity: 0 };

const getStockStatus = (quantity) => {
  if (quantity <= 10) {
    return { label: "Low", variant: "danger" };
  }

  if (quantity <= 30) {
    return { label: "Medium", variant: "warning" };
  }

  return { label: "Good", variant: "success" };
};

const InventoryList = ({ inventory, setInventory, onEditItem }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const { role: userRole } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);
  const [addItem, setAddItem] = useState(INITIAL_ITEM);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackTone, setFeedbackTone] = useState("neutral");
  const [addLoading, setAddLoading] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const addItemFeedbackId = feedbackMessage && showAddModal ? "inventory-add-feedback" : undefined;

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

  const showFeedback = (message, tone = "neutral") => {
    setFeedbackMessage(message);
    setFeedbackTone(tone);
  };

  const closeAddModal = () => {
    if (addLoading) {
      return;
    }

    setShowAddModal(false);
    setFeedbackMessage("");
    setAddItem(INITIAL_ITEM);
  };

  const handleAddItem = async (event) => {
    event.preventDefault();
    showFeedback("");
    setAddLoading(true);

    try {
      const newItem = await api.createItem(addItem);
      setInventory((previous) => [...previous, newItem]);
      showFeedback("Item added successfully!", "success");
      setAddItem(INITIAL_ITEM);
      window.setTimeout(() => {
        setShowAddModal(false);
        setFeedbackMessage("");
      }, 1000);
    } catch (error) {
      showFeedback(error.message || "Network error. Please try again.", "error");
    } finally {
      setAddLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) {
      return;
    }

    setDeleteLoading(true);

    try {
      await api.deleteItem(deleteItem.id);
      setInventory((previous) => previous.filter((item) => item.id !== deleteItem.id));
      showFeedback(`Item ${deleteItem.name} deleted successfully.`, "success");
      setDeleteItem(null);
    } catch (error) {
      showFeedback(error.message || "Network error. Please try again.", "error");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="inventory-list">
      <div className="inventory-list__header">
        <div className="section-header">
          <div>
            <h2>Inventory Management</h2>
            <p className="section-subtitle">Review stock levels, open item details, and keep inventory records current.</p>
          </div>
          <div className="summary-text inventory-list__summary">Total Items: {inventory.length}</div>
        </div>

        {feedbackMessage && <StateNotice tone={feedbackTone}>{feedbackMessage}</StateNotice>}

        {userRole === "stores" && (
          <button type="button" onClick={() => setShowAddModal(true)} className="btn btn-primary inventory-list__add-btn">
            Add Item
          </button>
        )}

        <div className="toolbar-row inventory-list__toolbar">
          <label className="toolbar-field inventory-list__toolbar-field">
            <span>Search</span>
            <input
              type="text"
              placeholder="Search items..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>

          <label className="toolbar-field inventory-list__toolbar-field">
            <span>Sort by</span>
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              <option value="name">Name</option>
              <option value="category">Category</option>
              <option value="type">Type</option>
              <option value="quantity">Quantity</option>
            </select>
          </label>
        </div>
      </div>

      {filteredInventory.length === 0 ? (
        <div className="inventory-empty-state">
          <StateNotice>No items match the current search. Try adjusting the filters.</StateNotice>
        </div>
      ) : (
        <div className="table-shell">
          <table>
            <caption className="sr-only">
              Inventory items with category, type, quantity, stock status, and available actions.
            </caption>
            <thead>
              <tr>
                <th scope="col">Item Name</th>
                <th scope="col">Category</th>
                <th scope="col">Type</th>
                <th scope="col">Quantity</th>
                <th scope="col">Status</th>
                <th scope="col">Last Updated</th>
                <th scope="col">Actions</th>
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
                          <Link className="inventory-item-link" to={`/inventory/${item.id}`}>
                            {item.name}
                          </Link>
                        </strong>
                        <div className="inventory-item-meta">ID: {item.id}</div>
                      </div>
                    </td>
                    <td>
                      <span className="inventory-category-chip">{item.category}</span>
                    </td>
                    <td>{item.type}</td>
                    <td>
                      <strong className="inventory-quantity">{item.quantity}</strong>
                    </td>
                    <td>
                      <StatusBadge label={stockStatus.label} variant={stockStatus.variant} />
                    </td>
                    <td>{item.updated_at ? new Date(item.updated_at).toLocaleDateString() : "N/A"}</td>
                    <td>
                      {userRole === "stores" && (
                        <div className="table-actions">
                          <button
                            type="button"
                            onClick={() => onEditItem && onEditItem(item)}
                            className="btn btn-secondary btn-compact"
                            aria-label={`Edit ${item.name}`}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteItem(item)}
                            className="btn btn-danger btn-compact"
                            disabled={deleteLoading}
                            aria-label={`Delete ${item.name}`}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showAddModal && (
        <ModalCard title="Add New Item" onClose={closeAddModal}>
          <form
            className="inventory-modal-form"
            onSubmit={handleAddItem}
            aria-busy={addLoading}
            aria-describedby={addItemFeedbackId}
          >
            <label className="form-group">
              <span>Item ID</span>
              <input
                type="text"
                value={addItem.id}
                onChange={(event) => setAddItem({ ...addItem, id: event.target.value })}
                required
              />
            </label>
            <label className="form-group">
              <span>Name</span>
              <input
                type="text"
                value={addItem.name}
                onChange={(event) => setAddItem({ ...addItem, name: event.target.value })}
                required
              />
            </label>
            <label className="form-group">
              <span>Category</span>
              <input
                type="text"
                value={addItem.category}
                onChange={(event) => setAddItem({ ...addItem, category: event.target.value })}
                required
              />
            </label>
            <label className="form-group">
              <span>Type</span>
              <input
                type="text"
                value={addItem.type}
                onChange={(event) => setAddItem({ ...addItem, type: event.target.value })}
                required
              />
            </label>
            <label className="form-group">
              <span>Quantity</span>
              <input
                type="number"
                value={addItem.quantity}
                onChange={(event) => setAddItem({ ...addItem, quantity: Number.parseInt(event.target.value, 10) || 0 })}
                required
                min={0}
              />
            </label>

            {feedbackMessage && showAddModal && (
              <div id="inventory-add-feedback">
                <StateNotice tone={feedbackTone}>{feedbackMessage}</StateNotice>
              </div>
            )}

            <div className="modal-actions">
              <button type="submit" disabled={addLoading} className="btn btn-primary">
                {addLoading ? "Adding..." : "Add Item"}
              </button>
              <button type="button" onClick={closeAddModal} className="btn btn-secondary" disabled={addLoading}>
                Cancel
              </button>
            </div>
          </form>
        </ModalCard>
      )}

      {deleteItem && (
        <ConfirmDialog
          title="Confirm Delete"
          message={`Are you sure you want to delete ${deleteItem.name}? This action cannot be undone.`}
          confirmLabel="Yes, Delete"
          isLoading={deleteLoading}
          onConfirm={handleDelete}
          onCancel={() => setDeleteItem(null)}
        />
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
