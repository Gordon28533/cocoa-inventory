import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import tonerStock from "../data/tonerStock";
import stationeryStock from "../data/stationeryStock";
import generalStock from "../data/generalStock";
import { useAuth } from "../Context/AuthContext.js";
import { api } from "../utils/api.js";

const EMPTY_ITEM = {
  id: "",
  name: "",
  category: "",
  type: "",
  quantity: 0
};

const normalizeItem = (item = {}) => ({
  id: item.id || "",
  name: item.name || "",
  category: item.category || "",
  type: item.type || "",
  quantity: Number(item.quantity) || 0
});

const InventoryForm = ({
  setInventory = undefined,
  initialItem = null,
  onSubmit = undefined,
  onCancel = undefined,
  isEdit = false
}) => {
  const { token } = useAuth();
  const [item, setItem] = useState(() => normalizeItem(initialItem || EMPTY_ITEM));
  const [fetchedItems, setFetchedItems] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setItem(normalizeItem(initialItem || EMPTY_ITEM));
  }, [initialItem]);

  useEffect(() => {
    if (!token || isEdit) {
      setFetchedItems([]);
      return;
    }

    let isMounted = true;

    const fetchItems = async () => {
      try {
        const data = await api.getItems();

        if (isMounted) {
          setFetchedItems(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        if (isMounted) {
          setFetchedItems([]);
        }

        console.error("Error fetching items:", error);
      }
    };

    fetchItems();

    return () => {
      isMounted = false;
    };
  }, [isEdit, token]);

  const stockOptions = useMemo(() => {
    if (item.category === "Toner Stock") return tonerStock;
    if (item.category === "Stationery Stock") return stationeryStock;
    if (item.category === "General Stock") return generalStock;
    return [];
  }, [item.category]);

  const updateItem = (field, value) => {
    setItem((current) => ({ ...current, [field]: value }));
  };

  const resetForm = () => {
    setItem(normalizeItem(initialItem || EMPTY_ITEM));
    setMessage("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    try {
      if (onSubmit) {
        await onSubmit(item);
      } else {
        const newItem = await api.createItem(item);
        setInventory?.((previous) => [...previous, newItem]);
        setMessage("Item added successfully!");
        setItem(normalizeItem(EMPTY_ITEM));
        window.setTimeout(() => setMessage(""), 3000);
      }
    } catch (error) {
      setMessage(error.message || "Network error. Please check your connection.");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      {message && (
        <div
          className={message.toLowerCase().includes("success") ? "success" : "error"}
          role="alert"
          aria-live="polite"
        >
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} aria-label={isEdit ? "Edit inventory item form" : "Add inventory item form"}>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="category">Category *</label>
            <select
              id="category"
              value={item.category}
              onChange={(event) => setItem((current) => ({
                ...current,
                category: event.target.value,
                id: isEdit ? current.id : "",
                name: isEdit ? current.name : ""
              }))}
              required
              disabled={isSubmitting || isEdit}
            >
              <option value="">Select Category</option>
              <option value="Toner Stock">Toner Stock</option>
              <option value="Stationery Stock">Stationery Stock</option>
              <option value="General Stock">General Stock</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="itemId">Item ID *</label>
            {isEdit ? (
              <input id="itemId" type="text" value={item.id} readOnly disabled />
            ) : (
              <select
                id="itemId"
                value={item.id}
                onChange={(event) => {
                  const selected = stockOptions.find((stockItem) => stockItem.id === event.target.value);
                  setItem((current) => ({
                    ...current,
                    id: selected ? selected.id : "",
                    name: selected ? selected.name : ""
                  }));
                }}
                required
                disabled={isSubmitting || !item.category}
              >
                <option value="">Select Item ID</option>
                {stockOptions.map((stockItem) => (
                  <option key={stockItem.id} value={stockItem.id}>
                    {stockItem.id} - {stockItem.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="name">Item Name *</label>
            <input
              id="name"
              type="text"
              placeholder="Enter item name"
              value={item.name}
              onChange={(event) => updateItem("name", event.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="type">Type *</label>
            <input
              id="type"
              type="text"
              placeholder="Enter item type"
              value={item.type}
              onChange={(event) => updateItem("type", event.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="quantity">Quantity *</label>
            <input
              id="quantity"
              type="number"
              placeholder="Enter quantity"
              value={item.quantity}
              onChange={(event) => updateItem("quantity", Number.parseInt(event.target.value, 10) || 0)}
              min="0"
              required
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: "15px", marginTop: "20px" }}>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ flex: "1" }}>
            {isSubmitting ? (isEdit ? "Saving..." : "Adding Item...") : isEdit ? "Save Changes" : "Add Item"}
          </button>

          <button type="button" className="btn btn-secondary" onClick={isEdit ? onCancel : resetForm} disabled={isSubmitting} style={{ flex: "1" }}>
            {isEdit ? "Cancel" : "Reset Form"}
          </button>
        </div>
      </form>

      {!isEdit && fetchedItems.length > 0 && (
        <div style={{ marginTop: "30px" }}>
          <h4 style={{ marginBottom: "15px", color: "#2c3e50" }}>Current Inventory Items ({fetchedItems.length})</h4>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
              gap: "10px"
            }}
          >
            {fetchedItems.slice(0, 6).map((fetchedItem) => (
              <div
                key={fetchedItem.id}
                style={{
                  padding: "10px",
                  background: "#f8f9fa",
                  borderRadius: "8px",
                  border: "1px solid #e1e8ed",
                  fontSize: "14px"
                }}
              >
                <strong>{fetchedItem.name}</strong>
                <div style={{ color: "#666", fontSize: "12px" }}>
                  Qty: {fetchedItem.quantity} | {fetchedItem.category}
                </div>
              </div>
            ))}
            {fetchedItems.length > 6 && (
              <div
                style={{
                  padding: "10px",
                  background: "#e3f2fd",
                  borderRadius: "8px",
                  textAlign: "center",
                  color: "#1976d2",
                  fontSize: "14px"
                }}
              >
                +{fetchedItems.length - 6} more items
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

InventoryForm.propTypes = {
  setInventory: PropTypes.func,
  initialItem: PropTypes.object,
  onSubmit: PropTypes.func,
  onCancel: PropTypes.func,
  isEdit: PropTypes.bool
};

export default InventoryForm;
