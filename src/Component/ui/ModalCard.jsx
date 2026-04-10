import React, { useEffect, useRef } from "react";
import PropTypes from "prop-types";

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])"
].join(",");

const ModalCard = ({ title, children, minWidth = 320, maxWidth = 520, onClose, closeLabel = "Close dialog" }) => {
  const modalRef = useRef(null);
  const returnFocusRef = useRef(null);

  useEffect(() => {
    const modalNode = modalRef.current;

    if (!modalNode) {
      return undefined;
    }

    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const focusable = modalNode.querySelectorAll(FOCUSABLE_SELECTOR);
    const firstFocusable = focusable[0];
    const lastFocusable = focusable[focusable.length - 1];

    firstFocusable?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && onClose) {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || focusable.length === 0) {
        return;
      }

      if (event.shiftKey && document.activeElement === firstFocusable) {
        event.preventDefault();
        lastFocusable?.focus();
      } else if (!event.shiftKey && document.activeElement === lastFocusable) {
        event.preventDefault();
        firstFocusable?.focus();
      }
    };

    modalNode.addEventListener("keydown", handleKeyDown);

    return () => {
      modalNode.removeEventListener("keydown", handleKeyDown);
      returnFocusRef.current?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal-card" style={{ minWidth, maxWidth }} ref={modalRef}>
        {onClose && (
          <button type="button" className="modal-card__close" onClick={onClose} aria-label={closeLabel}>
            X
          </button>
        )}
        {title && <h3 className="modal-card-title">{title}</h3>}
        {children}
      </div>
    </div>
  );
};

ModalCard.propTypes = {
  title: PropTypes.string,
  children: PropTypes.node.isRequired,
  minWidth: PropTypes.number,
  maxWidth: PropTypes.number,
  onClose: PropTypes.func,
  closeLabel: PropTypes.string
};

export default ModalCard;
