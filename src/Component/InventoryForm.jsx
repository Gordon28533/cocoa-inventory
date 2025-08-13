import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import tonerStock from "../data/tonerStock";
import stationeryStock from "../data/stationeryStock";
import generalStock from "../data/generalStock";

const InventoryForm = ({ setInventory }) => {
  const [item, setItem] = useState({
    id: "",
    name: "",
    category: "",
    type: "",
    quantity: 0,
  });
  const [fetchedItems, setFetchedItems] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const response = await fetch("http://localhost:5000/items", {
          headers: { Authorization: "Bearer " + token },
        });
        if (response.ok) {
          const data = await response.json();
          setFetchedItems(data);
        } else {
          setFetchedItems([]);
        }
      } catch (error) {
        console.error("Error fetching items:", error);
      }
    };

    fetchItems();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    try {
      const response = await fetch("http://localhost:5000/items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify(item),
      });
      
      if (response.ok) {
        const newItem = await response.json();
        setInventory((prev) => [...prev, newItem]);
        setMessage("Item added successfully!");
        setItem({ id: "", name: "", category: "", type: "", quantity: 0 });
        
        // Clear success message after 3 seconds
        setTimeout(() => setMessage(""), 3000);
      } else if (response.status === 401 || response.status === 403) {
        setMessage("Unauthorized. Please log in again.");
      } else {
        setMessage("Failed to add item. Please try again.");
      }
    } catch (error) {
      setMessage("Network error. Please check your connection.");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStockArray = () => {
    if (item.category === "Toner Stock") return tonerStock;
    if (item.category === "Stationery Stock") return stationeryStock;
    if (item.category === "General Stock") return generalStock;
    return [];
  };

  const resetForm = () => {
    setItem({ id: "", name: "", category: "", type: "", quantity: 0 });
    setMessage("");
  };

  return (
    <div>
      {message && (
        <div 
          className={message.includes("successfully") ? "success" : "error"}
          role="alert"
          aria-live="polite"
        >
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} aria-label="Add inventory item form">
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="category">Category *</label>
            <select
              id="category"
              value={item.category}
              onChange={(e) =>
                setItem({ ...item, category: e.target.value, id: "", name: "" })
              }
              required
              disabled={isSubmitting}
            >
              <option value="">Select Category</option>
              <option value="Toner Stock">🖨️ Toner Stock</option>
              <option value="Stationery Stock">📝 Stationery Stock</option>
              <option value="General Stock">📦 General Stock</option>
            </select>
          </div>

          {item.category && (
            <div className="form-group">
              <label htmlFor="itemId">Item ID *</label>
              <select
                id="itemId"
                value={item.id}
                onChange={(e) => {
                  const selected = getStockArray().find(
                    (stockItem) => stockItem.id === e.target.value
                  );
                  setItem({
                    ...item,
                    id: selected ? selected.id : "",
                    name: selected ? selected.name : "",
                  });
                }}
                required
                disabled={isSubmitting}
              >
                <option value="">Select Item ID</option>
                {getStockArray().map((stockItem) => (
                  <option key={stockItem.id} value={stockItem.id}>
                    {stockItem.id} - {stockItem.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="name">Item Name *</label>
            <input
              id="name"
              type="text"
              placeholder="Enter item name"
              value={item.name}
              onChange={(e) => setItem({ ...item, name: e.target.value })}
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
              onChange={(e) => setItem({ ...item, type: e.target.value })}
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
              onChange={(e) =>
                setItem({ ...item, quantity: parseInt(e.target.value) || 0 })
              }
              min="0"
              required
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={isSubmitting}
            style={{ flex: '1' }}
          >
            {isSubmitting ? "Adding Item..." : "Add Item"}
          </button>
          
          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={resetForm}
            disabled={isSubmitting}
            style={{ flex: '1' }}
          >
            Reset Form
          </button>
        </div>
      </form>

      {fetchedItems.length > 0 && (
        <div style={{ marginTop: '30px' }}>
          <h4 style={{ marginBottom: '15px', color: '#2c3e50' }}>
            Current Inventory Items ({fetchedItems.length})
          </h4>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', 
            gap: '10px' 
          }}>
            {fetchedItems.slice(0, 6).map((fetchedItem) => (
              <div 
                key={fetchedItem.id}
                style={{
                  padding: '10px',
                  background: '#f8f9fa',
                  borderRadius: '8px',
                  border: '1px solid #e1e8ed',
                  fontSize: '14px'
                }}
              >
                <strong>{fetchedItem.name}</strong>
                <div style={{ color: '#666', fontSize: '12px' }}>
                  Qty: {fetchedItem.quantity} | {fetchedItem.category}
                </div>
              </div>
            ))}
            {fetchedItems.length > 6 && (
              <div style={{ 
                padding: '10px', 
                background: '#e3f2fd', 
                borderRadius: '8px',
                textAlign: 'center',
                color: '#1976d2',
                fontSize: '14px'
              }}>
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
  setInventory: PropTypes.func.isRequired,
};

export default InventoryForm;
