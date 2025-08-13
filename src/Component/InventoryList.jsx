import React, { useState } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";

const InventoryList = ({ inventory, setInventory, onEditItem }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const userRole = localStorage.getItem("role");
  // Modal state for adding item
  const [showAddModal, setShowAddModal] = useState(false);
  const [addItem, setAddItem] = useState({ id: "", name: "", category: "", type: "", quantity: 0 });
  const [addMsg, setAddMsg] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  // Delete state
  const [deleteId, setDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Filter and sort inventory
  const filteredInventory = inventory
    .filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.type.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "category":
          return a.category.localeCompare(b.category);
        case "quantity":
          return b.quantity - a.quantity;
        case "type":
          return a.type.localeCompare(b.type);
        default:
          return 0;
      }
    });

  const getStockStatus = (quantity) => {
    if (quantity <= 10) return { status: "Low", color: "#dc3545", bg: "#f8d7da" };
    if (quantity <= 30) return { status: "Medium", color: "#ffc107", bg: "#fff3cd" };
    return { status: "Good", color: "#28a745", bg: "#d4edda" };
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    setAddMsg("");
    setAddLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5000/items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify(addItem),
      });
      if (res.ok) {
        const newItem = await res.json();
        setInventory((prev) => [...prev, newItem]);
        setAddMsg("Item added successfully!");
        setAddItem({ id: "", name: "", category: "", type: "", quantity: 0 });
        setTimeout(() => { setShowAddModal(false); setAddMsg(""); }, 1000);
      } else {
        setAddMsg("Failed to add item. Please check your input.");
      }
    } catch (err) {
      setAddMsg("Network error. Please try again.");
    } finally {
      setAddLoading(false);
    }
  };

  const handleDelete = async (id) => {
    setDeleteLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:5000/items/${id}`, {
        method: "DELETE",
        headers: { Authorization: "Bearer " + token },
      });
      if (res.ok) {
        setInventory((prev) => prev.filter((item) => item.id !== id));
        setDeleteId(null);
      } else {
        alert("Failed to delete item.");
      }
    } catch (err) {
      alert("Network error. Please try again.");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="inventory-list">
      <div style={{ padding: '20px', borderBottom: '1px solid #e1e8ed' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0 }}>Inventory Management</h2>
          <div style={{ fontSize: '14px', color: '#666' }}>
            Total Items: {inventory.length}
          </div>
        </div>
        {/* Add Item button for stores */}
        {userRole === "stores" && (
          <button onClick={() => setShowAddModal(true)} style={{ marginBottom: 16, padding: '8px 20px', borderRadius: 6, background: '#1976d2', color: '#fff', border: 'none', fontWeight: 600 }}>
            + Add Item
          </button>
        )}
        
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1', minWidth: '200px' }}>
            <input
              type="text"
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 15px',
                border: '2px solid #e1e8ed',
                borderRadius: '8px',
                fontSize: '14px'
              }}
            />
          </div>
          
          <div style={{ minWidth: '150px' }}>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 15px',
                border: '2px solid #e1e8ed',
                borderRadius: '8px',
                fontSize: '14px',
                background: 'white'
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
        <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
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
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        ID: {item.id}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{
                      padding: '4px 8px',
                      background: '#e3f2fd',
                      color: '#1976d2',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}>
                      {item.category}
                    </span>
                  </td>
                  <td>{item.type}</td>
                  <td>
                    <strong style={{ fontSize: '16px' }}>{item.quantity}</strong>
                  </td>
                  <td>
                    <span style={{
                      padding: '4px 8px',
                      background: stockStatus.bg,
                      color: stockStatus.color,
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}>
                      {stockStatus.status}
                    </span>
                  </td>
                  <td>
                    {item.updated_at ? 
                      new Date(item.updated_at).toLocaleDateString() : 
                      'N/A'
                    }
                  </td>
                  <td>
                    {userRole === "stores" && (
                      <>
                        <button onClick={() => onEditItem && onEditItem(item)} style={{ fontSize: 12, padding: '4px 10px', marginRight: 6 }}>Edit</button>
                        <button onClick={() => setDeleteId(item.id)} style={{ fontSize: 12, padding: '4px 10px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: 4 }}>Delete</button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {/* Add Item Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: 32, borderRadius: 8, minWidth: 320, boxShadow: '0 2px 16px rgba(0,0,0,0.2)' }}>
            <h3>Add New Item</h3>
            <form onSubmit={handleAddItem}>
              <input type="text" placeholder="Item ID" value={addItem.id} onChange={e => setAddItem({ ...addItem, id: e.target.value })} required style={{ display: 'block', marginBottom: 12, width: '100%' }} />
              <input type="text" placeholder="Name" value={addItem.name} onChange={e => setAddItem({ ...addItem, name: e.target.value })} required style={{ display: 'block', marginBottom: 12, width: '100%' }} />
              <input type="text" placeholder="Category" value={addItem.category} onChange={e => setAddItem({ ...addItem, category: e.target.value })} required style={{ display: 'block', marginBottom: 12, width: '100%' }} />
              <input type="text" placeholder="Type" value={addItem.type} onChange={e => setAddItem({ ...addItem, type: e.target.value })} required style={{ display: 'block', marginBottom: 12, width: '100%' }} />
              <input type="number" placeholder="Quantity" value={addItem.quantity} onChange={e => setAddItem({ ...addItem, quantity: parseInt(e.target.value) || 0 })} required min={0} style={{ display: 'block', marginBottom: 12, width: '100%' }} />
              <button type="submit" disabled={addLoading} style={{ width: '100%', marginBottom: 10 }}>
                {addLoading ? "Adding..." : "Add Item"}
              </button>
              {addMsg && <div style={{ color: addMsg.includes('success') ? 'green' : 'red', marginTop: 10 }}>{addMsg}</div>}
            </form>
            <button onClick={() => setShowAddModal(false)} style={{ marginTop: 10, width: '100%' }}>Cancel</button>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: 32, borderRadius: 8, minWidth: 320, boxShadow: '0 2px 16px rgba(0,0,0,0.2)' }}>
            <h3>Confirm Delete</h3>
            <p>Are you sure you want to delete this item?</p>
            <div style={{ display: 'flex', gap: 12, marginTop: 18 }}>
              <button onClick={() => handleDelete(deleteId)} disabled={deleteLoading} style={{ background: '#dc3545', color: '#fff', padding: '8px 20px', border: 'none', borderRadius: 6 }}>
                {deleteLoading ? 'Deleting...' : 'Yes, Delete'}
              </button>
              <button onClick={() => setDeleteId(null)} style={{ background: '#eee', padding: '8px 20px', borderRadius: 6 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

InventoryList.propTypes = {
  inventory: PropTypes.array.isRequired,
  setInventory: PropTypes.func,
  onEditItem: PropTypes.func,
};

export default InventoryList;
