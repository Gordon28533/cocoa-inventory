import React, { useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { useAuth } from "../Context/AuthContext.js";
import { useDepartments } from "../Context/DepartmentsContext.js";
import StateNotice from "./ui/StateNotice.jsx";
import { api } from "../utils/api.js";

const sanitizeQuantity = (raw) => {
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
};

const UNIT_OPTIONS = ["Each", "Box", "Pack", "Set", "Ream", "Carton", "Piece"];

const emptyRow = () => ({ _key: Date.now() + Math.random(), itemId: "", quantity: 1, unit: "Each" });

const RequisitionForm = ({ inventory, setNotification }) => {
  const [step, setStep] = useState(1);
  const [departmentId, setDepartmentId] = useState("");
  const [isItItem, setIsItItem] = useState(false);
  const [itemRows, setItemRows] = useState([emptyRow()]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [deptError, setDeptError] = useState("");
  const [uniqueCode, setUniqueCode] = useState("");
  const successRef = useRef(null);

  const { departments, loading: deptLoading, error: deptLoadError } = useDepartments();
  const { departmentId: userDeptId } = useAuth();

  useEffect(() => {
    if (userDeptId) setDepartmentId(String(userDeptId));
  }, [userDeptId]);

  useEffect(() => {
    if (uniqueCode) successRef.current?.focus();
  }, [uniqueCode]);

  const categories = useMemo(
    () => [...new Set(inventory.map((i) => i.category).filter(Boolean))].sort(),
    [inventory]
  );

  const filteredInventory = useMemo(() => {
    let items = inventory;
    if (categoryFilter) items = items.filter((i) => i.category === categoryFilter);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      items = items.filter(
        (i) =>
          i.name?.toLowerCase().includes(q) ||
          i.category?.toLowerCase().includes(q) ||
          i.type?.toLowerCase().includes(q)
      );
    }
    return items;
  }, [inventory, searchTerm, categoryFilter]);

  const filledRows = itemRows.filter((r) => r.itemId);

  const showNotification = (msg, ms = 3000) => {
    if (!setNotification) return;
    setNotification(msg);
    setTimeout(() => setNotification(""), ms);
  };

  const handleDeptChange = (e) => {
    const val = e.target.value;
    setDepartmentId(val);
    setDeptError("");
    if (!val) { setDeptError("Please select a department."); return; }
    if (userDeptId && val !== String(userDeptId)) {
      setDeptError("You can only submit requisitions for your own department.");
    }
  };

  const updateRow = (key, field, value) => {
    setItemRows((rows) =>
      rows.map((r) => (r._key === key ? { ...r, [field]: value } : r))
    );
  };

  const addRow = () => setItemRows((rows) => [...rows, emptyRow()]);

  const removeRow = (key) => {
    setItemRows((rows) => {
      const next = rows.filter((r) => r._key !== key);
      return next.length ? next : [emptyRow()];
    });
  };

  const resetForm = () => {
    setStep(1);
    setIsItItem(false);
    setItemRows([emptyRow()]);
    setSearchTerm("");
    setCategoryFilter("");
    setDeptError("");
    setDepartmentId(userDeptId ? String(userDeptId) : "");
  };

  const handleSubmit = async () => {
    if (!departmentId) { showNotification("Please select a department."); return; }
    if (userDeptId && departmentId !== String(userDeptId)) {
      const msg = "You can only submit requisitions for your own department.";
      setDeptError(msg); showNotification(msg); return;
    }
    if (filledRows.length === 0) { showNotification("Please add at least one item."); return; }

    const normalizedItems = filledRows.map((r) => ({
      id: r.itemId,
      quantity: sanitizeQuantity(r.quantity)
    }));

    const invalidItem = normalizedItems.find((sel) => {
      const inv = inventory.find((i) => i.id === sel.id);
      return !inv || sel.quantity < 1 || sel.quantity > inv.quantity;
    });

    if (invalidItem) {
      const inv = inventory.find((i) => i.id === invalidItem.id);
      showNotification(`Requested quantity exceeds available stock for ${inv?.name || invalidItem.id}.`);
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
        showNotification(`Requisition submitted! Pickup code: ${data.unique_code}`);
        setUniqueCode(data.unique_code || "");
        resetForm();
      }
    } catch (err) {
      showNotification(err.message || "Server error.");
    } finally {
      setIsLoading(false);
    }
  };

  if (deptLoading) return <StateNotice>Loading departments…</StateNotice>;
  if (deptLoadError) return <StateNotice tone="error">Error loading departments: {deptLoadError}</StateNotice>;
  if (departments.length === 0) return <StateNotice tone="error">No departments available. Please contact admin.</StateNotice>;

  return (
    <div className="rq-shell">

      {/* ── Success card ─────────────────────────────────── */}
      {uniqueCode && (
        <div
          className="requisition-success-card"
          ref={successRef}
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
              className="btn btn-secondary"
              onClick={() => { navigator.clipboard?.writeText?.(uniqueCode); showNotification("Code copied!", 2000); }}
            >
              Copy Code
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setUniqueCode("")}>Clear</button>
          </div>
        </div>
      )}

      {/* ── Step tabs ────────────────────────────────────── */}
      <div className="rq-steps" role="tablist" aria-label="Form steps">
        {[{ n: 1, label: "Details" }, { n: 2, label: "Items" }].map(({ n, label }) => (
          <button
            key={n}
            role="tab"
            type="button"
            aria-selected={step === n}
            className={`rq-step${step === n ? " rq-step--active" : ""}${n < step ? " rq-step--done" : ""}`}
            onClick={() => setStep(n)}
          >
            <span className="rq-step__num">{n}</span>
            <span className="rq-step__text">
              <span className="rq-step__label">{label}</span>
              <span className="rq-step__sub">Step {n}</span>
            </span>
          </button>
        ))}
      </div>

      {/* ── Layout: main + sidebar ────────────────────────── */}
      <div className="rq-body">
        <div className="rq-main">

          {/* ── STEP 1 ───────────────────────────────────── */}
          {step === 1 && (
            <>
              <section className="rq-section">
                <h3 className="rq-section__title">Requisition Details</h3>
                <div className="rq-details-grid">
                  <div className="form-group">
                    <label htmlFor="rq-dept">Department</label>
                    <select
                      id="rq-dept"
                      value={departmentId}
                      onChange={handleDeptChange}
                      required
                      className={deptError ? "field-error" : ""}
                      aria-invalid={Boolean(deptError)}
                    >
                      <option value="">Select department</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                    {deptError && <span className="field-help" style={{ color: "var(--color-danger)" }}>{deptError}</span>}
                  </div>
                </div>
              </section>

              <div className="rq-step-nav">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    if (!departmentId) { showNotification("Please select a department first."); return; }
                    if (deptError) return;
                    setStep(2);
                  }}
                >
                  Next: Add Items →
                </button>
              </div>
            </>
          )}

          {/* ── STEP 2 ───────────────────────────────────── */}
          {step === 2 && (
            <>
              <section className="rq-section">
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={isItItem}
                    onChange={(e) => setIsItItem(e.target.checked)}
                  />
                  <span>Mark as IT requisition</span>
                </label>
                <p className="field-help" style={{ marginTop: "4px", paddingLeft: "24px" }}>
                  Check this if any items below are IT equipment or services.
                </p>
              </section>

              <section className="rq-section">
                <h3 className="rq-section__title">Item Selection</h3>
                <div className="rq-filters">
                  <div className="rq-search-wrap">
                    <svg className="rq-search-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.6"/>
                      <path d="M13 13l3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                    </svg>
                    <input
                      type="text"
                      placeholder="Search"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="rq-search"
                      aria-label="Search inventory items"
                    />
                  </div>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="rq-cat-filter"
                    aria-label="Filter by category"
                  >
                    <option value="">All categories</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </section>

              <section className="rq-section">
                <div className="rq-items-header">
                  <h3 className="rq-section__title">Add Items</h3>
                  <button type="button" className="btn btn-primary rq-add-btn" onClick={addRow}>
                    Add
                  </button>
                </div>

                <div className="rq-table-wrap">
                  <table className="rq-table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Quantity</th>
                        <th>Unit</th>
                        <th aria-label="Remove"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {itemRows.map((row) => {
                        const selectedInv = inventory.find((i) => i.id === row.itemId);
                        const maxQty = selectedInv?.quantity ?? 9999;
                        return (
                          <tr key={row._key}>
                            <td>
                              <select
                                value={row.itemId}
                                onChange={(e) => updateRow(row._key, "itemId", e.target.value)}
                                className="rq-select"
                                aria-label="Select item"
                              >
                                <option value="">— select item —</option>
                                {filteredInventory.map((i) => (
                                  <option key={i.id} value={i.id}>{i.name}</option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <input
                                type="number"
                                min={1}
                                max={maxQty}
                                value={row.quantity}
                                onChange={(e) => updateRow(row._key, "quantity", e.target.value)}
                                className="rq-qty"
                                aria-label="Quantity"
                              />
                            </td>
                            <td>
                              <select
                                value={row.unit}
                                onChange={(e) => updateRow(row._key, "unit", e.target.value)}
                                className="rq-select"
                                aria-label="Unit"
                              >
                                {UNIT_OPTIONS.map((u) => (
                                  <option key={u} value={u}>{u}</option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <button
                                type="button"
                                className="rq-remove-btn"
                                onClick={() => removeRow(row._key)}
                                aria-label="Remove row"
                              >
                                ×
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              <div className="rq-step-nav">
                <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}>
                  ← Back
                </button>
              </div>
            </>
          )}
        </div>

        {/* ── Summary sidebar ──────────────────────────── */}
        <aside className="rq-summary" aria-label="Requisition summary">
          <h3 className="rq-summary__title">Summary Items</h3>
          {filledRows.length === 0 ? (
            <p className="rq-summary__empty">No items added yet.</p>
          ) : (
            <ul className="rq-summary__list">
              {filledRows.map((row) => {
                const inv = inventory.find((i) => i.id === row.itemId);
                return (
                  <li key={row._key} className="rq-summary__item">
                    <span className="rq-summary__name">{inv?.name ?? row.itemId}</span>
                    <span className="rq-summary__qty">{row.quantity} {row.unit}</span>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="rq-summary__total">
            <span>Total Line Items</span>
            <span className="rq-summary__total-val">{filledRows.length}</span>
          </div>
        </aside>
      </div>

      {/* ── Actions ──────────────────────────────────────── */}
      <div className="rq-actions">
        <button
          type="button"
          className="btn btn-primary"
          disabled={isLoading || filledRows.length === 0 || !departmentId || !!deptError}
          onClick={handleSubmit}
        >
          {isLoading ? "Submitting…" : "Submit for Approval"}
        </button>
      </div>
    </div>
  );
};

RequisitionForm.propTypes = {
  inventory: PropTypes.array.isRequired,
  setNotification: PropTypes.func
};

export default RequisitionForm;
