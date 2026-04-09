import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { useDepartments } from "../Context/DepartmentsContext.js";
import { api } from "../utils/api.js";
import { getBatchStatusMeta } from "../utils/requisitionStatus.js";

const PAGE_SIZES = [5, 10, 20];

const normalizeText = (value) => String(value || "").trim().toLowerCase();

const getOldestCreatedAt = (batch) =>
  batch.reduce(
    (oldest, requisition) =>
      new Date(requisition.created_at).getTime() < new Date(oldest).getTime() ? requisition.created_at : oldest,
    batch[0]?.created_at || ""
  );

const groupByBatchId = (requisitions) =>
  requisitions.reduce((groups, requisition) => {
    const existingBatch = groups.get(requisition.batch_id) || [];
    existingBatch.push(requisition);
    groups.set(requisition.batch_id, existingBatch);
    return groups;
  }, new Map());

const sortBatchItems = (batch, inventoryMap, sortConfig) => {
  const sortedBatch = [...batch];
  const direction = sortConfig.direction === "asc" ? 1 : -1;

  sortedBatch.sort((left, right) => {
    const leftDetails = inventoryMap.get(left.item_id) || {};
    const rightDetails = inventoryMap.get(right.item_id) || {};

    const values = {
      item: [leftDetails.name || left.item_id, rightDetails.name || right.item_id],
      category: [leftDetails.category || "", rightDetails.category || ""],
      type: [leftDetails.type || "", rightDetails.type || ""],
      quantity: [Number(left.quantity) || 0, Number(right.quantity) || 0],
      status: [left.status || "", right.status || ""]
    };

    const [leftValue, rightValue] = values[sortConfig.key] || values.item;

    if (leftValue < rightValue) return -1 * direction;
    if (leftValue > rightValue) return 1 * direction;
    return 0;
  });

  return sortedBatch;
};

const exportBatchToCsv = (batch, inventoryMap) => {
  if (!batch.length) {
    return;
  }

  const headers = ["Batch ID", "Item", "Category", "Type", "Quantity", "Status"];
  const rows = batch.map((requisition) => {
    const details = inventoryMap.get(requisition.item_id) || {};

    return [
      requisition.batch_id,
      details.name || requisition.item_id,
      details.category || "",
      details.type || "",
      requisition.quantity,
      requisition.status
    ];
  });

  const csvContent = `${headers.join(",")}\n${rows
    .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
    .join("\n")}`;

  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `my-requisitions-${batch[0].batch_id}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const MyRequisitions = ({ inventory }) => {
  const { departments } = useDepartments();
  const [requisitions, setRequisitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [itemSort, setItemSort] = useState({ key: "item", direction: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);

  useEffect(() => {
    let isMounted = true;

    const loadRequisitions = async () => {
      setLoading(true);
      setError("");

      try {
        const data = await api.getRequisitions();

        if (isMounted) {
          setRequisitions(Array.isArray(data) ? data : []);
        }
      } catch (requestError) {
        if (isMounted) {
          setError(requestError.message || "Unable to load your requisitions.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadRequisitions();

    return () => {
      isMounted = false;
    };
  }, []);

  const inventoryMap = useMemo(
    () => new Map(inventory.map((item) => [String(item.id), item])),
    [inventory]
  );

  const departmentMap = useMemo(
    () => new Map(departments.map((department) => [String(department.id), department.name])),
    [departments]
  );

  const statusOptions = useMemo(
    () => Array.from(new Set(requisitions.map((requisition) => requisition.status).filter(Boolean))).sort(),
    [requisitions]
  );

  const batchList = useMemo(() => {
    const grouped = Array.from(groupByBatchId(requisitions).values());
    const normalizedQuery = normalizeText(searchQuery);

    return grouped
      .filter((batch) => {
        const batchStatus = getBatchStatusMeta(batch);

        if (statusFilter && !batch.some((item) => item.status === statusFilter)) {
          return false;
        }

        if (!normalizedQuery) {
          return true;
        }

        const departmentName = departmentMap.get(String(batch[0].department_id)) || String(batch[0].department_id || "");
        const searchableValues = [
          batch[0].batch_id,
          batch[0].unique_code,
          batchStatus.label,
          departmentName,
          ...batch.flatMap((item) => {
            const details = inventoryMap.get(String(item.item_id)) || {};
            return [item.status, details.name, details.category, details.type];
          })
        ];

        return searchableValues.some((value) => normalizeText(value).includes(normalizedQuery));
      })
      .sort((leftBatch, rightBatch) => new Date(getOldestCreatedAt(rightBatch)) - new Date(getOldestCreatedAt(leftBatch)));
  }, [departmentMap, inventoryMap, requisitions, searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(batchList.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleBatches = batchList.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const rangeStart = batchList.length ? (currentPage - 1) * pageSize + 1 : 0;
  const rangeEnd = Math.min(currentPage * pageSize, batchList.length);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  const handleSortChange = (key) => {
    setItemSort((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc"
    }));
  };

  if (loading) {
    return <div>Loading your requisitions...</div>;
  }

  if (error) {
    return <div style={{ color: "red" }}>{error}</div>;
  }

  return (
    <section style={{ margin: 24 }}>
      <div className="section-header">
        <div>
          <h2 style={{ marginBottom: 8 }}>My Requisitions</h2>
          <p className="section-subtitle">Track your submitted batches, approval progress, and pickup codes.</p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={() => exportBatchToCsv(visibleBatches.flat(), inventoryMap)}
          disabled={!visibleBatches.length}
        >
          Export Visible Results
        </button>
      </div>

      <div className="toolbar-row toolbar-row--spaced">
        <label className="toolbar-field">
          <span>Search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Search batch, item, status, or code"
            aria-label="Search my requisitions"
            style={{ minWidth: 260 }}
          />
        </label>

        <label className="toolbar-field">
          <span>Status</span>
          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
            aria-label="Filter requisitions by status"
            style={{ padding: 8, borderRadius: 4, border: "1px solid #ccc", minWidth: 180 }}
          >
            <option value="">All statuses</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>

        <label className="toolbar-field">
          <span>Rows per page</span>
          <select
            value={pageSize}
            onChange={(event) => {
              setPageSize(Number(event.target.value));
              setPage(1);
            }}
            aria-label="Rows per page"
            style={{ padding: 8, borderRadius: 4, border: "1px solid #ccc", minWidth: 120 }}
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="summary-text">
        Showing {rangeStart}-{rangeEnd} of {batchList.length} batches
      </div>

      {!batchList.length ? (
        <div>No requisitions matched your current filters.</div>
      ) : (
        visibleBatches.map((batch) => {
          const batchStatus = getBatchStatusMeta(batch);
          const oldestCreatedAt = getOldestCreatedAt(batch);
          const departmentName = departmentMap.get(String(batch[0].department_id)) || batch[0].department_id || "Unassigned";
          const sortedBatch = sortBatchItems(batch, inventoryMap, itemSort);

          return (
            <article
              key={batch[0].batch_id}
              className="batch-card"
            >
              <div className="batch-card__header">
                <strong>Batch ID: {batch[0].batch_id}</strong>
                <span>Department: {departmentName}</span>
                <span>Unique Code: {batch[0].unique_code || "Not assigned"}</span>
                <span>Submitted: {oldestCreatedAt ? new Date(oldestCreatedAt).toLocaleString() : "Unknown"}</span>
                <span className="batch-card__status" style={{ color: batchStatus.color }}>
                  {batchStatus.icon} {batchStatus.label}
                </span>
              </div>

              <table className="table-compact">
                <thead>
                  <tr>
                    <th onClick={() => handleSortChange("item")}>
                      Item
                    </th>
                    <th onClick={() => handleSortChange("category")}>
                      Category
                    </th>
                    <th onClick={() => handleSortChange("type")}>
                      Type
                    </th>
                    <th onClick={() => handleSortChange("quantity")}>
                      Quantity
                    </th>
                    <th onClick={() => handleSortChange("status")}>
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedBatch.map((requisition, index) => {
                    const item = inventoryMap.get(String(requisition.item_id));

                    return (
                      <tr key={requisition.id} className={index % 2 === 0 ? "row-alt" : ""}>
                        <td>{item?.name || requisition.item_id}</td>
                        <td>{item?.category || "-"}</td>
                        <td>{item?.type || "-"}</td>
                        <td>{requisition.quantity}</td>
                        <td>{requisition.status}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="batch-card__footer">
                <button className="btn btn-secondary" onClick={() => exportBatchToCsv(batch, inventoryMap)}>
                  Export This Batch
                </button>
              </div>
            </article>
          );
        })
      )}

      {totalPages > 1 && (
        <div className="toolbar-row" style={{ justifyContent: "center", marginTop: 24 }}>
          <button className="btn btn-secondary" onClick={() => setPage(1)} disabled={currentPage === 1}>
            First
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <button
            className="btn btn-secondary"
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
          <button className="btn btn-secondary" onClick={() => setPage(totalPages)} disabled={currentPage === totalPages}>
            Last
          </button>
        </div>
      )}
    </section>
  );
};

MyRequisitions.propTypes = {
  inventory: PropTypes.array.isRequired
};

export default MyRequisitions;
