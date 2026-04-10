import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
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
import useDocumentTitle from "../hooks/useDocumentTitle.js";
import { api } from "../utils/api.js";
import "../styles.css";

const APPROVER_ROLES = ["account", "hod", "deputy_hod", "it_manager", "account_manager"];
const NON_REQUESTER_ROLES = [...APPROVER_ROLES, "stores"];
const DASHBOARD_TABS = ["inventory", "requisition", "myreq", "approval", "fulfill", "audit", "departments"];

const inferNotificationTone = (message) => {
  const normalizedMessage = String(message || "").toLowerCase();

  if (!normalizedMessage) {
    return "success";
  }

  if (
    normalizedMessage.includes("error") ||
    normalizedMessage.includes("failed") ||
    normalizedMessage.includes("invalid") ||
    normalizedMessage.includes("cannot") ||
    normalizedMessage.includes("unauthorized") ||
    normalizedMessage.includes("not ")
  ) {
    return "error";
  }

  if (normalizedMessage.includes("warning") || normalizedMessage.includes("low")) {
    return "warning";
  }

  return "success";
};

const Dashboard = ({
  inventory,
  setInventory,
  isLoading = false
}) => {
  const { token, user, role: userRole, currentPath, setCurrentPath } = useAuth();
  const [activeTab, setActiveTab] = useState("inventory");
  const [editItem, setEditItem] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [notification, setNotification] = useState({ message: "", tone: "success" });
  const isApprover = APPROVER_ROLES.includes(userRole);
  const canRequest = !NON_REQUESTER_ROLES.includes(userRole);
  const isAdmin = userRole === "admin";

  useDocumentTitle("Workspace");

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

  const getTabId = (tab) => `dashboard-tab-${tab}`;
  const getPanelId = (tab) => `dashboard-panel-${tab}`;

  const showNotification = (nextNotification) => {
    if (!nextNotification) {
      setNotification({ message: "", tone: "success" });
      return;
    }

    if (typeof nextNotification === "string") {
      setNotification({
        message: nextNotification,
        tone: inferNotificationTone(nextNotification)
      });
      return;
    }

    const nextMessage = nextNotification.message || "";
    setNotification({
      message: nextMessage,
      tone: nextNotification.tone || inferNotificationTone(nextMessage)
    });
  };

  const handleEditSubmit = async (updatedItem) => {
    try {
      await api.updateItem(updatedItem.id, updatedItem);
      setInventory((previous) => previous.map((item) => (item.id === updatedItem.id ? updatedItem : item)));
      showNotification({ message: "Item updated successfully!", tone: "success" });
      setEditModalOpen(false);
      setEditItem(null);
    } catch (error) {
      showNotification({ message: error.message || "Network error. Please try again.", tone: "error" });
    }
  };

  useEffect(() => {
    if (!notification.message) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setNotification({ message: "", tone: "success" }), 3000);
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
          <p className="dashboard-subtitle">
            Use the tabs below to move between inventory, requisitions, approvals, fulfillment, and administration tasks.
          </p>
        </div>
      </div>

      {notification.message && (
        <div className="notification-banner">
          <div className={`notification-banner__content notification-banner__content--${notification.tone}`}>
            {notification.message}
          </div>
        </div>
      )}

      <div className="nav-tabs" role="tablist" aria-label="Workspace tabs">
        {tabButtons.map((tab) => (
          <button
            key={tab.key}
            id={getTabId(tab.key)}
            className={`nav-tab ${activeTab === tab.key ? "active" : ""}`}
            onClick={() => handleTabChange(tab.key)}
            role="tab"
            aria-selected={activeTab === tab.key}
            aria-controls={getPanelId(tab.key)}
            tabIndex={activeTab === tab.key ? 0 : -1}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "inventory" && (
        <section
          id={getPanelId("inventory")}
          role="tabpanel"
          aria-labelledby={getTabId("inventory")}
          tabIndex={0}
        >
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
            <ModalCard
              title="Edit Inventory Item"
              onClose={() => {
                setEditModalOpen(false);
                setEditItem(null);
              }}
            >
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
        </section>
      )}

      {activeTab === "requisition" && canRequest && (
        <div
          className="form-container"
          id={getPanelId("requisition")}
          role="tabpanel"
          aria-labelledby={getTabId("requisition")}
          tabIndex={0}
        >
          <h3>Create Requisition</h3>
          <RequisitionForm inventory={inventory} setNotification={showNotification} />
        </div>
      )}

      {activeTab === "approval" && isApprover && (
        <div
          className="form-container"
          id={getPanelId("approval")}
          role="tabpanel"
          aria-labelledby={getTabId("approval")}
          tabIndex={0}
        >
          <RequisitionApproval setNotification={showNotification} inventory={inventory} />
        </div>
      )}

      {activeTab === "fulfill" && userRole === "stores" && (
        <div
          className="form-container"
          id={getPanelId("fulfill")}
          role="tabpanel"
          aria-labelledby={getTabId("fulfill")}
          tabIndex={0}
        >
          <RequisitionFulfill setNotification={showNotification} inventory={inventory} />
        </div>
      )}

      {activeTab === "audit" && isAdmin && (
        <div
          className="form-container"
          id={getPanelId("audit")}
          role="tabpanel"
          aria-labelledby={getTabId("audit")}
          tabIndex={0}
        >
          <AuditLogViewer />
        </div>
      )}

      {activeTab === "departments" && isAdmin && (
        <div
          className="form-container"
          id={getPanelId("departments")}
          role="tabpanel"
          aria-labelledby={getTabId("departments")}
          tabIndex={0}
        >
          <DepartmentManager setNotification={showNotification} />
        </div>
      )}

      {activeTab === "myreq" && canRequest && (
        <div
          className="form-container"
          id={getPanelId("myreq")}
          role="tabpanel"
          aria-labelledby={getTabId("myreq")}
          tabIndex={0}
        >
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
