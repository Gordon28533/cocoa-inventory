import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { useAuth } from "../Context/AuthContext.js";
import { useDepartments } from "../Context/DepartmentsContext.js";
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
  const { departments, loading: departmentsLoading, error: departmentsError } = useDepartments();
  const { departmentId: userDepartmentId, user: userName } = useAuth();

  useEffect(() => {
    if (userDepartmentId) {
      setDepartmentId(String(userDepartmentId));
    }
  }, [userDepartmentId]);

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
    const inventoryItem = inventory.find((item) => item.id === itemId);

    setSelectedItems((current) => {
      if (current.some((item) => item.id === itemId)) {
        return current.filter((item) => item.id !== itemId);
      }

      return [
        ...current,
        {
          id: itemId,
          quantity: sanitizeQuantity(1, inventoryItem?.quantity)
        }
      ];
    });
  };

  const handleQuantityChange = (itemId, quantity) => {
    const inventoryItem = inventory.find((item) => item.id === itemId);

    setSelectedItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? { ...item, quantity: sanitizeQuantity(quantity, inventoryItem?.quantity) }
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

    const normalizedItems = selectedItems.map((selectedItem) => {
      return {
        ...selectedItem,
        quantity: sanitizeQuantity(selectedItem.quantity)
      };
    });

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

  return (
    <div>
      {uniqueCode && (
        <div
          style={{
            background: "linear-gradient(135deg, #28a745 0%, #20c997 100%)",
            color: "white",
            padding: "20px",
            borderRadius: "12px",
            marginBottom: "24px",
            textAlign: "center",
            boxShadow: "0 4px 15px rgba(40, 167, 69, 0.3)"
          }}
        >
          <h3 style={{ margin: "0 0 12px 0", fontSize: "18px" }}>Requisition Submitted Successfully!</h3>
          <div style={{ fontSize: "16px", marginBottom: "16px" }}>
            Your pickup code: <strong style={{ fontSize: "20px", letterSpacing: "2px" }}>{uniqueCode}</strong>
          </div>
          <button
            type="button"
            aria-label="Copy pickup code"
            onClick={() => {
              navigator.clipboard?.writeText?.(uniqueCode);
              showNotification("Code copied to clipboard!", 2000);
            }}
            style={{
              background: "rgba(255,255,255,0.2)",
              color: "white",
              border: "1px solid rgba(255,255,255,0.3)",
              padding: "8px 16px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px"
            }}
          >
            Copy Code
          </button>
          <button
            type="button"
            aria-label="Clear pickup code"
            onClick={() => setUniqueCode("")}
            style={{
              background: "rgba(255,255,255,0.1)",
              color: "white",
              border: "1px solid rgba(255,255,255,0.2)",
              padding: "8px 16px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px",
              marginLeft: "12px"
            }}
          >
            Clear
          </button>
        </div>
      )}

      {departmentsLoading ? (
        <div style={{ margin: 24, color: "#1976d2", fontWeight: 600 }}>Loading departments...</div>
      ) : departmentsError ? (
        <div style={{ margin: 24, color: "red", fontWeight: 600 }}>Error loading departments: {departmentsError}</div>
      ) : departments.length === 0 ? (
        <div style={{ margin: 24, color: "red", fontWeight: 600 }}>No departments available. Please contact admin.</div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="requester" style={{ fontWeight: 600 }}>
              Requester:
            </label>
            <input
              id="requester"
              name="requester"
              type="text"
              value={userName || ""}
              readOnly
              autoComplete="off"
              style={{
                marginLeft: 10,
                padding: 8,
                borderRadius: 4,
                border: "1px solid #ccc",
                minWidth: 200,
                backgroundColor: "#f5f5f5"
              }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label htmlFor="departmentId" style={{ fontWeight: 600 }}>
              Department:
            </label>
            <select
              id="departmentId"
              name="departmentId"
              value={departmentId}
              onChange={handleDepartmentChange}
              required
              style={{
                marginLeft: 10,
                padding: 8,
                borderRadius: 4,
                border: deptError ? "2px solid #d32f2f" : "1px solid #ccc",
                minWidth: 200,
                backgroundColor: "white"
              }}
            >
              <option value="">Select a department</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
            {deptError && <div style={{ color: "#d32f2f", fontWeight: 600, marginTop: 6 }}>{deptError}</div>}
          </div>

          <div style={{ marginBottom: 16 }}>
            <label htmlFor="isItItem" style={{ fontWeight: 600 }}>
              Is IT Item?
            </label>
            <input
              id="isItItem"
              name="isItItem"
              type="checkbox"
              checked={isItItem}
              onChange={(event) => setIsItItem(event.target.checked)}
              style={{ marginLeft: 10 }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label htmlFor="searchTerm" style={{ fontWeight: 600, display: "block", marginBottom: 8 }}>
              Search Items:
            </label>
            <input
              id="searchTerm"
              name="searchTerm"
              type="text"
              placeholder="Search by item name, category, or type..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              autoComplete="off"
              style={{
                width: "100%",
                padding: 8,
                borderRadius: 4,
                border: "1px solid #ccc",
                marginBottom: 8
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ fontWeight: 600, display: "block", marginBottom: 8 }}>
              Select Items ({filteredInventory.length} available):
            </label>

            {filteredInventory.length === 0 ? (
              <div
                style={{
                  padding: 16,
                  textAlign: "center",
                  color: "#666",
                  backgroundColor: "#f8f9fa",
                  borderRadius: 8
                }}
              >
                {searchTerm ? "No items match your search." : "No items available."}
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  maxHeight: "400px",
                  overflowY: "auto",
                  border: "1px solid #e0e0e0",
                  borderRadius: 8,
                  padding: 8
                }}
              >
                {filteredInventory.map((item) => {
                  const checked = selectedItems.some((selectedItem) => selectedItem.id === item.id);
                  const quantity = selectedItems.find((selectedItem) => selectedItem.id === item.id)?.quantity || 1;

                  return (
                    <div
                      key={item.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                        background: checked ? "#e3f2fd" : "#f8f9fa",
                        borderRadius: 8,
                        padding: "12px 16px",
                        border: checked ? "2px solid #1976d2" : "1px solid #e0e0e0",
                        transition: "all 0.2s ease"
                      }}
                    >
                      <input
                        id={`itemCheckbox_${item.id}`}
                        name={`itemCheckbox_${item.id}`}
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleCheckboxChange(item.id)}
                        aria-label={`Select ${item.name}`}
                        style={{
                          width: 18,
                          height: 18,
                          accentColor: "#1976d2",
                          marginRight: 8
                        }}
                      />

                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500, color: "#333" }}>{item.name}</div>
                        <div style={{ fontSize: 12, color: "#666" }}>
                          {item.category} | {item.type} | Stock: {item.quantity}
                        </div>
                      </div>

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
                        style={{
                          width: 70,
                          marginLeft: 16,
                          padding: 6,
                          borderRadius: 4,
                          border: "1px solid #ccc",
                          textAlign: "center"
                        }}
                      />
                      <span style={{ color: "#888", fontSize: 13, minWidth: 30 }}>Qty</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading || selectedItems.length === 0 || !departmentId || !!deptError}
            style={{
              opacity: isLoading || selectedItems.length === 0 || !departmentId || !!deptError ? 0.6 : 1,
              cursor:
                isLoading || selectedItems.length === 0 || !departmentId || !!deptError
                  ? "not-allowed"
                  : "pointer"
            }}
          >
            {isLoading ? "Submitting..." : "Submit Requisition"}
          </button>
        </form>
      )}
    </div>
  );
};

RequisitionForm.propTypes = {
  inventory: PropTypes.array.isRequired,
  setNotification: PropTypes.func
};

export default RequisitionForm;
