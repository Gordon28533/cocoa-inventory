import React, { useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { useAuth } from "../Context/AuthContext.js";
import { useDepartments } from "../Context/DepartmentsContext.js";
import StateNotice from "./ui/StateNotice.jsx";
import StatusBadge from "./ui/StatusBadge.jsx";
import { api } from "../utils/api.js";

const sanitizeQuantity = (rawQuantity) => {
  const parsed = Number.parseInt(rawQuantity, 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }

  return parsed;
};

const RequisitionForm = ({ inventory, setNotification }) => {
  const [selectedItems, setSelectedItems] = useState([]);
  const [departmentId, setDepartmentId] = useState("");
  const [isItItem, setIsItItem] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [uniqueCode, setUniqueCode] = useState("");
  const [deptError, setDeptError] = useState("");
  const successCardRef = useRef(null);
  const { departments, loading: departmentsLoading, error: departmentsError } = useDepartments();
  const { departmentId: userDepartmentId, user: userName } = useAuth();
  const departmentHintId = "requisition-department-help";
  const departmentErrorId = deptError ? "requisition-department-error" : undefined;
  const departmentDescription = [departmentHintId, departmentErrorId].filter(Boolean).join(" ");

  useEffect(() => {
    if (userDepartmentId) {
      setDepartmentId(String(userDepartmentId));
    }
  }, [userDepartmentId]);

  useEffect(() => {
    if (uniqueCode) {
      successCardRef.current?.focus();
    }
  }, [uniqueCode]);

  const filteredInventory = useMemo(
    () =>
      inventory.filter((item) => {
        const normalizedSearch = searchTerm.toLowerCase();
        return (
          item.name?.toLowerCase().includes(normalizedSearch) ||
          item.category?.toLowerCase().includes(normalizedSearch) ||
          item.type?.toLowerCase().includes(normalizedSearch)
        );
      }),
    [inventory, searchTerm]
  );

  const showNotification = (message, timeoutMs = 3000) => {
    if (!setNotification) {
      return;
    }

    setNotification(message);
    setTimeout(() => setNotification(""), timeoutMs);
  };

  const handleCheckboxChange = (itemId) => {
    setSelectedItems((current) => {
      if (current.some((item) => item.id === itemId)) {
        return current.filter((item) => item.id !== itemId);
      }

      return [
        ...current,
        {
          id: itemId,
          quantity: sanitizeQuantity(1)
        }
      ];
    });
  };

  const handleQuantityChange = (itemId, quantity) => {
    setSelectedItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? { ...item, quantity: sanitizeQuantity(quantity) }
          : item
      )
    );
  };

  const handleDepartmentChange = (event) => {
    const selectedDepartmentId = event.target.value;
    setDepartmentId(selectedDepartmentId);
    setDeptError("");

    if (!selectedDepartmentId) {
      setDeptError("Please select a department.");
      return;
    }

    if (userDepartmentId && selectedDepartmentId !== userDepartmentId) {
      setDeptError("You can only submit requisitions for your own department.");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (selectedItems.length === 0) {
      showNotification("Please select at least one item.");
      return;
    }

    if (!departmentId) {
      showNotification("Please select a department.");
      return;
    }

    if (userDepartmentId && departmentId !== userDepartmentId) {
      const message = "You can only submit requisitions for your own department.";
      setDeptError(message);
      showNotification(message);
      return;
    }

    const normalizedItems = selectedItems.map((selectedItem) => ({
      ...selectedItem,
      quantity: sanitizeQuantity(selectedItem.quantity)
    }));

    const invalidItem = normalizedItems.find((selectedItem) => {
      const inventoryItem = inventory.find((item) => item.id === selectedItem.id);

      if (!inventoryItem) {
        return true;
      }

      return selectedItem.quantity < 1 || selectedItem.quantity > inventoryItem.quantity;
    });

    if (invalidItem) {
      const inventoryItem = inventory.find((item) => item.id === invalidItem.id);
      showNotification(`Requested quantity exceeds available stock for ${inventoryItem?.name || invalidItem.id}.`);
      return;
    }

    setIsLoading(true);

    try {
      const data = await api.createRequisition({
        items: normalizedItems,
        department_id: Number.parseInt(departmentId, 10),
        is_it_item: isItItem
      });

      if (data.success) {
        showNotification(`Requisition submitted! Your pickup code: ${data.unique_code}`);
        setUniqueCode(data.unique_code || "");
        setSelectedItems([]);
        setDepartmentId(userDepartmentId ? String(userDepartmentId) : "");
        setIsItItem(false);
        setSearchTerm("");
      }
    } catch (error) {
      showNotification(error.message || "Server error.");
    } finally {
      setIsLoading(false);
    }
  };

  if (departmentsLoading) {
    return <StateNotice>Loading departments...</StateNotice>;
  }

  if (departmentsError) {
    return <StateNotice tone="error">Error loading departments: {departmentsError}</StateNotice>;
  }

  if (departments.length === 0) {
    return <StateNotice tone="error">No departments available. Please contact admin.</StateNotice>;
  }

  return (
    <div className="feature-panel">
      {uniqueCode && (
        <div
          className="requisition-success-card"
          ref={successCardRef}
          tabIndex={-1}
          role="status"
          aria-live="polite"
        >
          <div>
            <h3>Requisition Submitted Successfully</h3>
            <p className="requisition-success-card__subtitle">Share this pickup code with stores during collection.</p>
          </div>
          <div className="requisition-success-card__code">
            <span>Your pickup code:</span>
            <strong>{uniqueCode}</strong>
          </div>
          <div className="modal-actions requisition-success-card__actions">
            <button
              type="button"
              aria-label="Copy pickup code"
              className="btn btn-secondary"
              onClick={() => {
                navigator.clipboard?.writeText?.(uniqueCode);
                showNotification("Code copied to clipboard!", 2000);
              }}
            >
              Copy Code
            </button>
            <button type="button" aria-label="Clear pickup code" className="btn btn-secondary" onClick={() => setUniqueCode("")}>
              Clear
            </button>
          </div>
        </div>
      )}

      <div className="feature-panel__header">
        <div>
          <h2>Create Requisition</h2>
          <p className="section-subtitle">
            Select items from available stock, confirm the department, and submit a batch for approval.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="requisition-form">
        <div className="feature-grid feature-grid--2">
          <section className="feature-card">
            <div className="feature-card__header">
              <div>
                <h3>Request Details</h3>
                <p className="section-subtitle">Your requisition will be scoped to your department and approval path.</p>
              </div>
            </div>

            <div className="requisition-form__meta">
              <label className="form-group">
                <span>Requester</span>
                <input id="requester" name="requester" type="text" value={userName || ""} readOnly autoComplete="off" className="field-readonly" />
              </label>

              <label className="form-group">
                <span>Department:</span>
                <select
                  id="departmentId"
                  name="departmentId"
                  value={departmentId}
                  onChange={handleDepartmentChange}
                  required
                  className={deptError ? "field-error" : ""}
                  aria-invalid={Boolean(deptError)}
                  aria-describedby={departmentDescription}
                >
                  <option value="">Select a department</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
                <span id={departmentHintId} className="field-help">
                  Requisitions are limited to the department assigned to your account.
                </span>
              </label>

              {deptError && (
                <div id="requisition-department-error">
                  <StateNotice tone="error">{deptError}</StateNotice>
                </div>
              )}

              <label className="checkbox-row" htmlFor="isItItem">
                <input
                  id="isItItem"
                  name="isItItem"
                  type="checkbox"
                  checked={isItItem}
                  onChange={(event) => setIsItItem(event.target.checked)}
                />
                <span>Mark this batch as an IT requisition</span>
              </label>
            </div>
          </section>

          <section className="feature-card">
            <div className="feature-card__header">
              <div>
                <h3>Search Inventory</h3>
                <p className="section-subtitle">Find matching items by name, category, or type before selecting quantities.</p>
              </div>
            </div>

            <label className="toolbar-field">
              <span>Search Items</span>
              <input
                id="searchTerm"
                name="searchTerm"
                type="text"
                placeholder="Search by item name, category, or type..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                autoComplete="off"
              />
            </label>

            <div className="selection-summary">
              <span>{filteredInventory.length} available</span>
              <span>{selectedItems.length} selected</span>
            </div>
          </section>
        </div>

        <section className="feature-card">
          <div className="feature-card__header">
            <div>
              <h3>Select Items</h3>
              <p className="section-subtitle">Choose one or more items and enter the quantities you want to request.</p>
            </div>
          </div>

          {filteredInventory.length === 0 ? (
            <StateNotice>{searchTerm ? "No items match your search." : "No items available."}</StateNotice>
          ) : (
            <div className="requisition-item-picker">
              {filteredInventory.map((item) => {
                const checked = selectedItems.some((selectedItem) => selectedItem.id === item.id);
                const quantity = selectedItems.find((selectedItem) => selectedItem.id === item.id)?.quantity || 1;

                return (
                  <div key={item.id} className={`requisition-item-row${checked ? " requisition-item-row--selected" : ""}`}>
                    <label className="requisition-item-row__selector" htmlFor={`itemCheckbox_${item.id}`}>
                      <input
                        id={`itemCheckbox_${item.id}`}
                        name={`itemCheckbox_${item.id}`}
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleCheckboxChange(item.id)}
                        aria-label={`Select ${item.name}`}
                      />
                      <div>
                        <div className="requisition-item-row__title">{item.name}</div>
                        <div className="requisition-item-row__meta">
                          <span>{item.category}</span>
                          <span>{item.type}</span>
                          <StatusBadge label={`Stock: ${item.quantity}`} variant={item.quantity <= 10 ? "danger" : item.quantity <= 30 ? "warning" : "success"} />
                        </div>
                      </div>
                    </label>

                    <label className="toolbar-field requisition-item-row__quantity" htmlFor={`itemQty_${item.id}`}>
                      <span>Quantity</span>
                      <input
                        id={`itemQty_${item.id}`}
                        name={`itemQty_${item.id}`}
                        aria-label={`Quantity for ${item.name}`}
                        type="number"
                        min={1}
                        max={item.quantity}
                        value={quantity}
                        disabled={!checked}
                        onChange={(event) => handleQuantityChange(item.id, event.target.value)}
                      />
                    </label>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <div className="modal-actions requisition-form__actions">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading || selectedItems.length === 0 || !departmentId || !!deptError}
          >
            {isLoading ? "Submitting..." : "Submit Requisition"}
          </button>
        </div>
      </form>
    </div>
  );
};

RequisitionForm.propTypes = {
  inventory: PropTypes.array.isRequired,
  setNotification: PropTypes.func
};

export default RequisitionForm;
