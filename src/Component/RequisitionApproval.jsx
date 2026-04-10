import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { useAuth } from "../Context/AuthContext.js";
import { useDepartments } from "../Context/DepartmentsContext.js";
import StateNotice from "./ui/StateNotice.jsx";
import StatusBadge from "./ui/StatusBadge.jsx";
import { api } from "../utils/api.js";
import { getBatchStatusMeta } from "../utils/requisitionStatus.js";

const getItemDetails = (inventory, itemId) => {
  const item = inventory.find((entry) => entry.id === itemId);
  return item ? { name: item.name, category: item.category, type: item.type } : { name: itemId, category: "", type: "" };
};

const getVisibleBatchesForRole = (batches, role, departmentId) =>
  batches.filter((batch) => {
    const first = batch[0];

    if (role === "account") {
      return first.status === "pending" && String(first.department_id) === String(departmentId);
    }

    if (role === "account_manager") {
      return (
        (first.status === "branch_account_approved" && first.department !== "Head Office") ||
        (first.status === "hod_approved" && !first.is_it_item) ||
        first.status === "it_approved"
      );
    }

    if (role === "stores") {
      return first.status === "ho_account_approved" && first.department === "Head Office";
    }

    if (role === "hod" || role === "deputy_hod") {
      return first.status === "pending" && String(first.department_id) === String(departmentId);
    }

    if (role === "it_manager") {
      return first.status === "hod_approved" && first.is_it_item;
    }

    return false;
  });

const sortBatches = (batches, sortKey, sortAsc) => {
  if (!sortKey) {
    return batches;
  }

  return [...batches].sort((left, right) => {
    const leftValue = left[0][sortKey] || "";
    const rightValue = right[0][sortKey] || "";

    if (leftValue < rightValue) {
      return sortAsc ? -1 : 1;
    }

    if (leftValue > rightValue) {
      return sortAsc ? 1 : -1;
    }

    return 0;
  });
};

const RequisitionApproval = ({ setNotification, inventory }) => {
  const [requisitions, setRequisitions] = useState([]);
  const [message, setMessage] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [sortKey, setSortKey] = useState("");
  const [sortAsc, setSortAsc] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const { token, role, departmentId } = useAuth();
  const { departments } = useDepartments();

  const showFeedback = (nextMessage) => {
    setMessage(nextMessage);

    if (setNotification) {
      setNotification(nextMessage);
      setTimeout(() => setNotification(""), 3000);
    }
  };

  const fetchRequisitions = async () => {
    setIsLoading(true);

    try {
      const data = await api.getRequisitions();
      setRequisitions(Array.isArray(data) ? data : []);
    } catch (error) {
      setRequisitions([]);
      setMessage(error.message || "Failed to load requisitions.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      setRequisitions([]);
      setIsLoading(false);
      return;
    }

    fetchRequisitions();
  }, [token]);

  const batches = useMemo(() => {
    const grouped = {};

    requisitions.forEach((requisition) => {
      if (!grouped[requisition.batch_id]) {
        grouped[requisition.batch_id] = [];
      }

      grouped[requisition.batch_id].push(requisition);
    });

    return Object.values(grouped);
  }, [requisitions]);

  const filteredBatches = useMemo(() => {
    let visibleBatches = getVisibleBatchesForRole(batches, role, departmentId);

    if (filterDept) {
      visibleBatches = visibleBatches.filter((batch) => batch[0].department === filterDept);
    }

    if (filterStatus) {
      visibleBatches = visibleBatches.filter((batch) => batch[0].status === filterStatus);
    }

    return sortBatches(visibleBatches, sortKey, sortAsc);
  }, [batches, departmentId, filterDept, filterStatus, role, sortAsc, sortKey]);

  const allDepts = useMemo(
    () => Array.from(new Set(requisitions.map((entry) => entry.department))).filter(Boolean),
    [requisitions]
  );
  const allStatuses = useMemo(
    () => Array.from(new Set(requisitions.map((entry) => entry.status))).filter(Boolean),
    [requisitions]
  );

  const getDepartmentName = (id) => {
    const department = departments.find((entry) => String(entry.id) === String(id));
    return department ? department.name : id;
  };

  const handleBatchApprove = async (batchId) => {
    setMessage("");

    try {
      const data = await api.approveRequisition(0, { batch_id: batchId });
      if (data.success) {
        showFeedback("Batch approved successfully.");
        await fetchRequisitions();
      }
    } catch (error) {
      showFeedback(error.message || "Unable to approve the batch. Please try again.");
    }
  };

  const exportBatchToCSV = (batch) => {
    const headers = ["Item", "Category", "Type", "Quantity", "Status"];
    const rows = batch.map((requisition) => {
      const details = getItemDetails(inventory, requisition.item_id);
      return [details.name, details.category, details.type, requisition.quantity, requisition.status];
    });
    const csvContent = `${headers.join(",")}\n${rows
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
      .join("\n")}`;
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `batch_${batch[0].batch_id}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSortChange = (nextSortKey) => {
    setSortKey(nextSortKey);
    setSortAsc((current) => (sortKey === nextSortKey ? !current : true));
  };

  const getAriaSort = (columnKey) => {
    if (sortKey !== columnKey) {
      return "none";
    }

    return sortAsc ? "ascending" : "descending";
  };

  return (
    <div className="feature-panel">
      <div className="feature-panel__header">
        <div>
          <h2>Requisitions to Approve</h2>
          <p className="section-subtitle">
            Review batches waiting at your approval stage, filter by department or status, and export details when needed.
          </p>
        </div>
      </div>

      <div className="filter-toolbar">
        <label className="toolbar-field">
          <span>Department</span>
          <select id="approval-filter-department" value={filterDept} onChange={(event) => setFilterDept(event.target.value)}>
            <option value="">All departments</option>
            {allDepts.map((department) => (
              <option key={department} value={department}>
                {department}
              </option>
            ))}
          </select>
        </label>

        <label className="toolbar-field">
          <span>Status</span>
          <select id="approval-filter-status" value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)}>
            <option value="">All statuses</option>
            {allStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
      </div>

      {message && <StateNotice>{message}</StateNotice>}

      {isLoading ? (
        <StateNotice>Loading requisitions awaiting your review...</StateNotice>
      ) : filteredBatches.length === 0 ? (
        <StateNotice>No requisitions to approve.</StateNotice>
      ) : (
        filteredBatches.map((batch) => {
          const batchStatus = getBatchStatusMeta(batch);

          return (
            <div key={batch[0].batch_id} className="batch-card">
              <div className="batch-card__header">
                <div className="batch-card__meta">
                  <div className="batch-card__title-row">
                    <strong>Batch ID: {batch[0].batch_id}</strong>
                    <StatusBadge variant={batchStatus.variant} color={batchStatus.color} className="batch-card__status">
                      <span className="status-badge__icon">{batchStatus.icon}</span>
                      {batchStatus.label}
                    </StatusBadge>
                  </div>
                  <div className="batch-card__details">
                    <span>Department: {getDepartmentName(batch[0].department_id)}</span>
                    <span>IT Item: {batch[0].is_it_item ? "Yes" : "No"}</span>
                  </div>
                </div>
              </div>

              <table className="table-compact">
                <caption className="sr-only">
                  Requisition batch {batch[0].batch_id} for {getDepartmentName(batch[0].department_id)}.
                </caption>
                <thead>
                  <tr>
                    <th scope="col" aria-sort={getAriaSort("item_id")}>
                      <button type="button" className="table-sort-button" onClick={() => handleSortChange("item_id")}>
                        Item
                      </button>
                    </th>
                    <th scope="col" aria-sort={getAriaSort("category")}>
                      <button type="button" className="table-sort-button" onClick={() => handleSortChange("category")}>
                        Category
                      </button>
                    </th>
                    <th scope="col" aria-sort={getAriaSort("type")}>
                      <button type="button" className="table-sort-button" onClick={() => handleSortChange("type")}>
                        Type
                      </button>
                    </th>
                    <th scope="col" aria-sort={getAriaSort("quantity")}>
                      <button type="button" className="table-sort-button" onClick={() => handleSortChange("quantity")}>
                        Quantity
                      </button>
                    </th>
                    <th scope="col" aria-sort={getAriaSort("status")}>
                      <button type="button" className="table-sort-button" onClick={() => handleSortChange("status")}>
                        Status
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {batch.map((requisition, index) => {
                    const details = getItemDetails(inventory, requisition.item_id);
                    return (
                      <tr key={requisition.id} className={index % 2 === 0 ? "row-alt" : ""}>
                        <td>{details.name}</td>
                        <td>{details.category}</td>
                        <td>{details.type}</td>
                        <td>{requisition.quantity}</td>
                        <td title={`Status: ${requisition.status}`}>{requisition.status}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="batch-card__footer batch-card__footer--leading">
                <button
                  className="btn btn-primary"
                  onClick={() => handleBatchApprove(batch[0].batch_id)}
                  aria-label={`Approve batch ${batch[0].batch_id}`}
                >
                  Approve Batch
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => exportBatchToCSV(batch)}
                  aria-label={`Export batch ${batch[0].batch_id} to CSV`}
                >
                  Export CSV
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

RequisitionApproval.propTypes = {
  setNotification: PropTypes.func,
  inventory: PropTypes.array.isRequired
};

export default RequisitionApproval;
