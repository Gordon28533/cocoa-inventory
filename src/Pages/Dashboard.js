import React, { useState, useEffect } from "react";
import InventoryForm from "../Component/InventoryForm.jsx";
import RequisitionForm from "../Component/RequisitionForm.jsx";
import RequisitionApproval from "../Component/RequisitionApproval.jsx";
import RequisitionFulfill from "../Component/RequisitionFulfill.jsx";
import InventoryList from "../Component/InventoryList.jsx";
import AuditLogViewer from "../Component/AuditLogViewer.jsx";
import MyRequisitions from "../Component/MyRequisitions.jsx";
import DepartmentManager from "../Component/DepartmentManager.jsx";
import "../styles.css";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";

const Dashboard = ({ inventory, setInventory, currentPath, setCurrentPath }) => {
  const [activeTab, setActiveTab] = useState("inventory");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const token = localStorage.getItem("token");
  const user = localStorage.getItem("user");
  const [editItem, setEditItem] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [notification, setNotification] = useState("");
  const userRole = localStorage.getItem("role");
  // Add state for change password
  const [changePwOld, setChangePwOld] = useState("");
  const [changePwNew, setChangePwNew] = useState("");
  const [changePwConfirm, setChangePwConfirm] = useState("");
  const [changePwMsg, setChangePwMsg] = useState("");
  const [changePwLoading, setChangePwLoading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    fetchInventory();
  }, [token]);

  // Update currentPath when activeTab changes
  useEffect(() => {
    if (activeTab && setCurrentPath) {
      const newPath = `/dashboard?tab=${activeTab}`;
      setCurrentPath(newPath);
    }
  }, [activeTab, setCurrentPath]);

  // Restore activeTab from URL params on mount
  useEffect(() => {
    if (currentPath && currentPath.includes('tab=')) {
      const urlParams = new URLSearchParams(currentPath.split('?')[1]);
      const tab = urlParams.get('tab');
      if (tab && ['inventory', 'requisition', 'myreq', 'approval', 'fulfill', 'audit', 'departments'].includes(tab)) {
        setActiveTab(tab);
      }
    }
  }, [currentPath]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (setCurrentPath) {
      const newPath = `/dashboard?tab=${tab}`;
      setCurrentPath(newPath);
    }
  };

  const fetchInventory = async () => {
    try {
      const response = await fetch("http://localhost:5000/items", {
        headers: { Authorization: "Bearer " + token }
      });
      
      if (!response.ok) throw new Error("Unauthorized or failed to fetch");
      
      const data = await response.json();
      setInventory(data);
    } catch (err) {
      setError("Failed to fetch inventory data");
      setInventory([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    window.location.reload();
  };

  const handleEditItem = (item) => {
    setEditItem(item);
    setEditModalOpen(true);
  };

  const handleEditSubmit = async (updatedItem) => {
    const token = localStorage.getItem("token");
    try {
      const response = await fetch(`http://localhost:5000/items/${updatedItem.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify(updatedItem),
      });
      if (response.ok) {
        setInventory((prev) => prev.map((item) => item.id === updatedItem.id ? updatedItem : item));
        setNotification("Item updated successfully!");
        setTimeout(() => setNotification(""), 3000);
        setEditModalOpen(false);
        setEditItem(null);
      } else {
        setNotification("Failed to update item.");
        setTimeout(() => setNotification(""), 3000);
      }
    } catch (error) {
      setNotification("Network error. Please try again.");
      setTimeout(() => setNotification(""), 3000);
    }
  };

  if (isLoading) {
    return (
      <div className="dashboard-container">
        <div className="loading">
          <h2>Loading Dashboard...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h1>Inventory Dashboard</h1>
          <p style={{ color: '#666', marginTop: '5px' }}>
            Welcome back, {user}! Manage your inventory efficiently.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button 
            onClick={() => navigate('/change-password')}
            className="btn btn-primary"
            aria-label="Go to change password page"
          >
            Change Password
          </button>
          <button 
            onClick={handleLogout}
            className="btn btn-secondary"
            aria-label="Logout from the system"
          >
            Logout
          </button>
        </div>
      </div>

      {error && (
        <div className="error">
          {error}
        </div>
      )}

      {notification && (
        <div style={{ position: 'fixed', top: 20, left: 0, right: 0, zIndex: 2000, display: 'flex', justifyContent: 'center' }}>
          <div style={{ background: '#28a745', color: 'white', padding: '12px 32px', borderRadius: 8, fontWeight: 600, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
            {notification}
          </div>
        </div>
      )}

      <div className="nav-tabs">
        <button
          className={`nav-tab ${activeTab === "inventory" ? "active" : ""}`}
          onClick={() => handleTabChange("inventory")}
          aria-label="View inventory list"
          aria-pressed={activeTab === "inventory"}
        >
          📦 Inventory List
        </button>
        {/* Remove Add Item tab for all users */}
        <button
          className={`nav-tab ${activeTab === "requisition" ? "active" : ""}`}
          onClick={() => handleTabChange("requisition")}
        >
          📋 Requisition
        </button>
        <button
          className={`nav-tab ${activeTab === "myreq" ? "active" : ""}`}
          onClick={() => handleTabChange("myreq")}
        >
          🗂 My Requisitions
        </button>
        {/* Approvals tab for hod, deputy_hod, it_manager, account_manager, and elevated roles */}
        {['hod', 'deputy_hod', 'it_manager', 'account_manager'].includes(userRole) && (
          <button
            className={`nav-tab ${activeTab === "approval" ? "active" : ""}`}
            onClick={() => handleTabChange("approval")}
          >
            ✅ Approvals
          </button>
        )}
        {/* Fulfill tab only for stores */}
        {userRole === "stores" && (
          <button
            className={`nav-tab ${activeTab === "fulfill" ? "active" : ""}`}
            onClick={() => handleTabChange("fulfill")}
          >
            🏬 Fulfill
          </button>
        )}
        {/* Admin/elevated tabs (but not for stores) */}
        {userRole !== "user" && userRole !== "stores" && [
          ["audit", "📝 Audit Logs"],
          ["departments", "🏢 Departments"]
        ].map(([tab, label]) => (
          <button
            key={tab}
            className={`nav-tab ${activeTab === tab ? "active" : ""}`}
            onClick={() => handleTabChange(tab)}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "inventory" && (
        <>
          <InventoryList inventory={inventory} setInventory={setInventory} onEditItem={userRole !== 'user' ? handleEditItem : undefined} />
          {editModalOpen && (
            <div style={{
              position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
              background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
            }}>
              <div style={{ background: '#fff', padding: 32, borderRadius: 8, minWidth: 320, boxShadow: '0 2px 16px rgba(0,0,0,0.2)' }}>
                <h3>Edit Inventory Item</h3>
                <InventoryForm
                  setInventory={setInventory}
                  initialItem={editItem}
                  onSubmit={handleEditSubmit}
                  onCancel={() => { setEditModalOpen(false); setEditItem(null); }}
                  isEdit
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* Remove Add Item form for all users */}

      {activeTab === "requisition" && (
        <div className="form-container">
          <h3>Create Requisition</h3>
          <RequisitionForm inventory={inventory} setNotification={setNotification} />
        </div>
      )}
      {activeTab === "approval" && ["hod", "deputy_hod", "it_manager", "account_manager"].includes(userRole) && (
        <div className="form-container">
          <RequisitionApproval setNotification={setNotification} inventory={inventory} />
        </div>
      )}
      {activeTab === "fulfill" && userRole === "stores" && (
        <div className="form-container">
          <RequisitionFulfill setNotification={setNotification} inventory={inventory} />
        </div>
      )}
      {activeTab === "audit" && userRole === "admin" && (
        <div className="form-container">
          <AuditLogViewer />
        </div>
      )}
      {activeTab === "departments" && userRole === "admin" && (
        <div className="form-container">
          <DepartmentManager setNotification={setNotification} />
        </div>
      )}
      {activeTab === "myreq" && (
        <div className="form-container">
          <MyRequisitions inventory={inventory} />
        </div>
      )}
    </div>
  );
};

Dashboard.propTypes = {
  inventory: PropTypes.array.isRequired,
  setInventory: PropTypes.func.isRequired,
  currentPath: PropTypes.string,
  setCurrentPath: PropTypes.func,
};

export default Dashboard;
