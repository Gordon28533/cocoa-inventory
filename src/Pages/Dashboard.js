import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import InventoryForm from "../Component/InventoryForm.jsx";
import RequisitionForm from "../Component/RequisitionForm.jsx";
import RequisitionApproval from "../Component/RequisitionApproval.jsx";
import RequisitionFulfill from "../Component/RequisitionFulfill.jsx";
import InventoryList from "../Component/InventoryList.jsx";
import AuditLogViewer from "../Component/AuditLogViewer.jsx";
import MyRequisitions from "../Component/MyRequisitions.jsx";
import DepartmentManager from "../Component/DepartmentManager.jsx";
import ModalCard from "../Component/ui/ModalCard.jsx";
import { useAuth } from "../Context/AuthContext.js";
import { api } from "../utils/api.js";
import "../styles.css";

const APPROVER_ROLES = ["account", "hod", "deputy_hod", "it_manager", "account_manager"];
const NON_REQUESTER_ROLES = [...APPROVER_ROLES, "stores"];
const DASHBOARD_TABS = ["inventory", "requisition", "myreq", "approval", "fulfill", "audit", "departments"];

const Dashboard = ({
  inventory,
  setInventory,
  isLoading = false
}) => {
  const navigate = useNavigate();
  const { token, user, role: userRole, currentPath, setCurrentPath, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("inventory");
  const [editItem, setEditItem] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [notification, setNotification] = useState("");
  const isApprover = APPROVER_ROLES.includes(userRole);
  const canRequest = !NON_REQUESTER_ROLES.includes(userRole);
  const isAdmin = userRole === "admin";

  const tabButtons = useMemo(() => {
    const tabs = [{ key: "inventory", label: "Inventory List" }];

    if (canRequest) {
      tabs.push({ key: "requisition", label: "Requisition" });
      tabs.push({ key: "myreq", label: "My Requisitions" });
    }

    if (isApprover) {
      tabs.push({ key: "approval", label: "Approvals" });
    }

    if (userRole === "stores") {
      tabs.push({ key: "fulfill", label: "Fulfill" });
    }

    if (isAdmin) {
      tabs.push({ key: "audit", label: "Audit Logs" });
      tabs.push({ key: "departments", label: "Departments" });
    }

    return tabs;
  }, [canRequest, isAdmin, isApprover, userRole]);

  useEffect(() => {
    if (!activeTab || !setCurrentPath) {
      return;
    }

    setCurrentPath(`/dashboard?tab=${activeTab}`);
  }, [activeTab, setCurrentPath]);

  useEffect(() => {
    if (!currentPath || !currentPath.includes("tab=")) {
      return;
    }

    const urlParams = new URLSearchParams(currentPath.split("?")[1]);
    const tab = urlParams.get("tab");

    if (tab && DASHBOARD_TABS.includes(tab)) {
      setActiveTab(tab);
    }
  }, [currentPath]);

  useEffect(() => {
    const state = window.history.state;

    if (state?.tab && DASHBOARD_TABS.includes(state.tab)) {
      setActiveTab(state.tab);
    }
  }, []);

  useEffect(() => {
    if (tabButtons.some((tab) => tab.key === activeTab)) {
      return;
    }

    setActiveTab("inventory");
  }, [activeTab, tabButtons]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPath(`/dashboard?tab=${tab}`);
  };

  const handleEditSubmit = async (updatedItem) => {
    try {
      await api.updateItem(updatedItem.id, updatedItem);
      setInventory((previous) => previous.map((item) => (item.id === updatedItem.id ? updatedItem : item)));
      setNotification("Item updated successfully!");
      setEditModalOpen(false);
      setEditItem(null);
    } catch (error) {
      setNotification(error.message || "Network error. Please try again.");
    }
  };

  useEffect(() => {
    if (!notification) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setNotification(""), 3000);
    return () => window.clearTimeout(timeoutId);
  }, [notification]);

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
      <div className="dashboard-header">
        <div>
          <h1>Inventory Dashboard</h1>
          <p className="dashboard-welcome">
            Welcome back, {user || "team member"}! Manage your inventory efficiently.
          </p>
        </div>
        <div className="dashboard-actions">
          <button
            onClick={() => navigate("/change-password")}
            className="btn btn-primary"
            aria-label="Go to change password page"
          >
            Change Password
          </button>
          <button onClick={logout} className="btn btn-secondary" aria-label="Logout from the system">
            Logout
          </button>
        </div>
      </div>

      {notification && (
        <div className="notification-banner">
          <div className="notification-banner__content">{notification}</div>
        </div>
      )}

      <div className="nav-tabs">
        {tabButtons.map((tab) => (
          <button
            key={tab.key}
            className={`nav-tab ${activeTab === tab.key ? "active" : ""}`}
            onClick={() => handleTabChange(tab.key)}
            aria-pressed={activeTab === tab.key}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "inventory" && (
        <>
          <InventoryList
            inventory={inventory}
            setInventory={setInventory}
            onEditItem={
              userRole !== "user"
                ? (item) => {
                    setEditItem(item);
                    setEditModalOpen(true);
                  }
                : undefined
            }
          />
          {editModalOpen && (
            <ModalCard title="Edit Inventory Item">
                <InventoryForm
                  setInventory={setInventory}
                  initialItem={editItem}
                  onSubmit={handleEditSubmit}
                  onCancel={() => {
                    setEditModalOpen(false);
                    setEditItem(null);
                  }}
                  isEdit
                />
            </ModalCard>
          )}
        </>
      )}

      {activeTab === "requisition" && canRequest && (
        <div className="form-container">
          <h3>Create Requisition</h3>
          <RequisitionForm inventory={inventory} setNotification={setNotification} />
        </div>
      )}

      {activeTab === "approval" && isApprover && (
        <div className="form-container">
          <RequisitionApproval setNotification={setNotification} inventory={inventory} />
        </div>
      )}

      {activeTab === "fulfill" && userRole === "stores" && (
        <div className="form-container">
          <RequisitionFulfill setNotification={setNotification} inventory={inventory} />
        </div>
      )}

      {activeTab === "audit" && isAdmin && (
        <div className="form-container">
          <AuditLogViewer />
        </div>
      )}

      {activeTab === "departments" && isAdmin && (
        <div className="form-container">
          <DepartmentManager setNotification={setNotification} />
        </div>
      )}

      {activeTab === "myreq" && canRequest && (
        <div className="form-container">
          <MyRequisitions inventory={inventory} />
        </div>
      )}

      {!token && <div className="error">Your session has ended. Please sign in again.</div>}
    </div>
  );
};

Dashboard.propTypes = {
  inventory: PropTypes.array.isRequired,
  setInventory: PropTypes.func.isRequired,
  isLoading: PropTypes.bool
};

export default Dashboard;
