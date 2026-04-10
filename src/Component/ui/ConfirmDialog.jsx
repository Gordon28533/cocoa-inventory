import React from "react";
import PropTypes from "prop-types";
import ModalCard from "./ModalCard.jsx";

const ConfirmDialog = ({
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  isLoading = false,
  onConfirm,
  onCancel
}) => (
  <ModalCard title={title} onClose={onCancel} closeLabel="Close confirmation dialog">
    <p className="confirm-dialog__message">{message}</p>
    <div className="modal-actions">
      <button
        type="button"
        className={`btn ${tone === "danger" ? "btn-danger" : "btn-primary"}`}
        onClick={onConfirm}
        disabled={isLoading}
      >
        {isLoading ? "Working..." : confirmLabel}
      </button>
      <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={isLoading}>
        {cancelLabel}
      </button>
    </div>
  </ModalCard>
);

ConfirmDialog.propTypes = {
  title: PropTypes.string.isRequired,
  message: PropTypes.node.isRequired,
  confirmLabel: PropTypes.string,
  cancelLabel: PropTypes.string,
  tone: PropTypes.oneOf(["danger", "primary"]),
  isLoading: PropTypes.bool,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired
};

export default ConfirmDialog;
