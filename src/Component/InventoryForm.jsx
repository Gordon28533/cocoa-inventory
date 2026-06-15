import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import tonerStock from "../data/tonerStock";
import stationeryStock from "../data/stationeryStock";
import generalStock from "../data/generalStock";
import { useAuth } from "../Context/AuthContext.js";
import StateNotice from "./ui/StateNotice.jsx";
import BarcodeScanner from "./BarcodeScanner.jsx";
import { api } from "../utils/api.js";
import { ITEM_TYPES } from "../config/constants.js";

const EMPTY_ITEM = { id: "", name: "", category: "", type: "", quantity: 0 };

const normalizeItem = (item = {}) => ({
  id:       item.id       || "",
  name:     item.name     || "",
  category: item.category || "",
  type:     item.type     || "",
  quantity: Number(item.quantity) || 0
});

// All items across every category — used by the barcode scanner lookup
const ALL_STOCK = [...tonerStock, ...stationeryStock, ...generalStock];

// Derive category from item-ID prefix (for barcode auto-detect)
const categoryFromId = (id = "") => {
  const upper = id.toUpperCase();
  if (upper.startsWith("COM-")) return "Toner Stock";
  if (upper.startsWith("STA-")) return "Stationery Stock";
  if (upper.startsWith("GEN-")) return "General Stock";
  return "";
};

/**
 * @param {boolean} showPreview  L-3: Opt-in preview panel. Defaults to false to
 *                               avoid fetching inventory on every add-mode mount.
 */
const InventoryForm = ({
  setInventory   = undefined,
  initialItem    = null,
  onSubmit       = undefined,
  onCancel       = undefined,
  isEdit         = false,
  showPreview    = false
}) => {
  const { token } = useAuth();
  const [item, setItem]               = useState(() => normalizeItem(initialItem || EMPTY_ITEM));
  const [fetchedItems, setFetchedItems] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage]         = useState("");
  const [showScanner, setShowScanner] = useState(false);

  const categoryHelpId = "inventory-form-category-help";
  const quantityHelpId = "inventory-form-quantity-help";
  const messageId      = message ? "inventory-form-message" : undefined;

  useEffect(() => {
    setItem(normalizeItem(initialItem || EMPTY_ITEM));
  }, [initialItem]);

  // L-3: Only fetch the preview list when the caller explicitly opts in
  useEffect(() => {
    if (!token || isEdit || !showPreview) {
      setFetchedItems([]);
      return;
    }

    let isMounted = true;

    const fetchItems = async () => {
      try {
        const data = await api.getItems();
        if (isMounted) setFetchedItems(Array.isArray(data) ? data : []);
      } catch (error) {
        if (isMounted) setFetchedItems([]);
        console.error("Error fetching items:", error);
      }
    };

    fetchItems();
    return () => { isMounted = false; };
  }, [isEdit, showPreview, token]);

  // M-3: Clear the auto-dismiss timer when the component unmounts
  useEffect(() => {
    if (!message.toLowerCase().includes("success")) return;
    const id = setTimeout(() => setMessage(""), 3000);
    return () => clearTimeout(id);
  }, [message]);

  // Items available in the currently-selected category
  const stockOptions = useMemo(() => {
    if (item.category === "Toner Stock")      return tonerStock;
    if (item.category === "Stationery Stock") return stationeryStock;
    if (item.category === "General Stock")    return generalStock;
    return [];
  }, [item.category]);

  // Type options for the currently-selected category
  const typeOptions = useMemo(
    () => ITEM_TYPES[item.category] || [],
    [item.category]
  );

  const updateItem = (field, value) => {
    setItem((current) => ({ ...current, [field]: value }));
  };

  const resetForm = () => {
    setItem(normalizeItem(initialItem || EMPTY_ITEM));
    setMessage("");
  };

  // ── Barcode scanner ────────────────────────────────────────────────────────
  /**
   * Called when the scanner reads a barcode.
   * Strategy:
   *   1. Try exact match against item ID in the stock lists.
   *   2. Detect category from ID prefix and pre-fill category.
   *   3. If no match, put the raw code in the ID field so the user can verify.
   */
  const handleBarcodeScanned = (rawCode) => {
    setShowScanner(false);
    const code  = rawCode.trim().toUpperCase();
    const match = ALL_STOCK.find((s) => s.id === code);

    if (match) {
      setItem((current) => ({
        ...current,
        id:       match.id,
        name:     match.name,
        category: match.category,
        // Reset type so user picks from the now-correct options
        type: "",
      }));
      setMessage(`✓ Barcode matched: ${match.id} — ${match.name}`);
    } else {
      // Unknown barcode — fill ID field, detect category from prefix
      const detectedCategory = categoryFromId(code);
      setItem((current) => ({
        ...current,
        id:       rawCode.trim(),
        name:     "",
        category: detectedCategory || current.category,
        type:     "",
      }));
      setMessage(
        `Barcode "${rawCode.trim()}" not found in stock list. ` +
        "Please verify the Item ID and fill in the remaining fields."
      );
    }
  };

  // ── Name field: sync Item ID when user selects a name from the datalist ────
  const handleNameChange = (event) => {
    const val   = event.target.value;
    const match = stockOptions.find((s) => s.name === val);
    if (match) {
      setItem((current) => ({ ...current, name: match.name, id: match.id }));
    } else {
      updateItem("name", val);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    try {
      if (onSubmit) {
        await onSubmit(item);
      } else {
        const newItem = await api.createItem(item);
        setInventory?.((previous) => [...previous, newItem]);
        setMessage("Item added successfully!");
        setItem(normalizeItem(EMPTY_ITEM));
      }
    } catch (error) {
      setMessage(error.message || "Network error. Please check your connection.");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div>
      {message && (
        <div id="inventory-form-message">
          <StateNotice tone={message.toLowerCase().includes("success") || message.startsWith("✓") ? "success" : "error"}>
            {message}
          </StateNotice>
        </div>
      )}

      {/* ── Barcode Scanner modal ── */}
      {showScanner && (
        <div className="barcode-scanner-modal" role="dialog" aria-modal="true" aria-label="Barcode scanner">
          <BarcodeScanner
            onScan={handleBarcodeScanned}
            onClose={() => setShowScanner(false)}
          />
        </div>
      )}

      <form onSubmit={handleSubmit} aria-label={isEdit ? "Edit inventory item form" : "Add inventory item form"}>

        {/* ── Scan button (add mode only) ── */}
        {!isEdit && (
          <div className="barcode-scan-row">
            <button
              type="button"
              className="btn btn-secondary barcode-scan-btn"
              onClick={() => setShowScanner(true)}
              disabled={isSubmitting || showScanner}
              title="Open camera to scan an item barcode"
            >
              <span aria-hidden="true">📷</span> Scan Barcode
            </button>
            <span className="barcode-scan-hint">
              Scan to auto-fill Item ID &amp; Name
            </span>
          </div>
        )}

        <div className="form-row">
          {/* ── Category ── */}
          <div className="form-group">
            <label htmlFor="category">Category *</label>
            <select
              id="category"
              value={item.category}
              onChange={(event) => setItem((current) => ({
                ...current,
                category: event.target.value,
                id:   isEdit ? current.id   : "",
                name: isEdit ? current.name : "",
                type: "",          // reset type when category changes
              }))}
              required
              disabled={isSubmitting || isEdit}
              aria-describedby={categoryHelpId}
            >
              <option value="">Select Category</option>
              <option value="Toner Stock">Toner Stock</option>
              <option value="Stationery Stock">Stationery Stock</option>
              <option value="General Stock">General Stock</option>
            </select>
            <span id={categoryHelpId} className="field-help">
              Choose a stock category first to unlock the matching item IDs.
            </span>
          </div>

          {/* ── Item ID ── */}
          <div className="form-group">
            <label htmlFor="itemId">Item ID *</label>
            {isEdit ? (
              <input id="itemId" type="text" value={item.id} readOnly disabled />
            ) : (
              <select
                id="itemId"
                value={item.id}
                onChange={(event) => {
                  const selected = stockOptions.find((s) => s.id === event.target.value);
                  setItem((current) => ({
                    ...current,
                    id:   selected ? selected.id   : "",
                    name: selected ? selected.name : "",
                  }));
                }}
                required
                disabled={isSubmitting || !item.category}
              >
                <option value="">Select Item ID</option>
                {stockOptions.map((s) => (
                  <option key={s.id} value={s.id}>{s.id} — {s.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="form-row">
          {/* ── Item Name (searchable datalist) ── */}
          <div className="form-group">
            <label htmlFor="name">Item Name *</label>
            <input
              id="name"
              type="text"
              list="inventory-name-options"
              placeholder={item.category ? "Type or select item name" : "Select a category first"}
              value={item.name}
              onChange={handleNameChange}
              required
              disabled={isSubmitting}
              autoComplete="off"
            />
            {/* Datalist provides filtered suggestions as the user types */}
            <datalist id="inventory-name-options">
              {stockOptions.map((s) => (
                <option key={s.id} value={s.name} label={`${s.id} — ${s.name}`} />
              ))}
            </datalist>
          </div>

          {/* ── Type (per-category dropdown) ── */}
          <div className="form-group">
            <label htmlFor="type">Type *</label>
            {typeOptions.length > 0 ? (
              <select
                id="type"
                value={item.type}
                onChange={(event) => updateItem("type", event.target.value)}
                required
                disabled={isSubmitting || !item.category}
              >
                <option value="">Select Type</option>
                {typeOptions.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            ) : (
              // Fallback free-text when no category is selected yet
              <input
                id="type"
                type="text"
                placeholder="Select a category first"
                value={item.type}
                onChange={(event) => updateItem("type", event.target.value)}
                required
                disabled={isSubmitting || !item.category}
              />
            )}
          </div>
        </div>

        <div className="form-row">
          {/* ── Quantity ── */}
          <div className="form-group">
            <label htmlFor="quantity">Quantity *</label>
            <input
              id="quantity"
              type="number"
              placeholder="Enter quantity"
              value={item.quantity}
              onChange={(event) => updateItem("quantity", Number.parseInt(event.target.value, 10) || 0)}
              min="0"
              required
              disabled={isSubmitting}
              aria-describedby={[quantityHelpId, messageId].filter(Boolean).join(" ") || undefined}
            />
            <span id={quantityHelpId} className="field-help">
              Enter the available stock quantity you want recorded for this item.
            </span>
          </div>
        </div>

        <div className="modal-actions inventory-form__actions">
          <button
            type="submit"
            className="btn btn-primary inventory-form__action-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? (isEdit ? "Saving…" : "Adding Item…") : isEdit ? "Save Changes" : "Add Item"}
          </button>

          <button
            type="button"
            className="btn btn-secondary inventory-form__action-button"
            onClick={isEdit ? onCancel : resetForm}
            disabled={isSubmitting}
          >
            {isEdit ? "Cancel" : "Reset Form"}
          </button>
        </div>
      </form>

      {!isEdit && showPreview && fetchedItems.length > 0 && (
        <section className="inventory-preview" aria-label="Current inventory preview">
          <h4 className="inventory-preview__title">Current Inventory Items ({fetchedItems.length})</h4>
          <div className="inventory-preview__grid">
            {fetchedItems.slice(0, 6).map((fetchedItem) => (
              <div key={fetchedItem.id} className="inventory-preview__card">
                <strong>{fetchedItem.name}</strong>
                <div className="inventory-preview__meta">
                  Qty: {fetchedItem.quantity} | {fetchedItem.category}
                </div>
              </div>
            ))}
            {fetchedItems.length > 6 && (
              <div className="inventory-preview__more">
                +{fetchedItems.length - 6} more items
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
};

InventoryForm.propTypes = {
  setInventory: PropTypes.func,
  initialItem:  PropTypes.object,
  onSubmit:     PropTypes.func,
  onCancel:     PropTypes.func,
  isEdit:       PropTypes.bool,
  showPreview:  PropTypes.bool
};

export default InventoryForm;
