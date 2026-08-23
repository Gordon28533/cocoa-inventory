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

  // Focus the first focusable element on mount; restore focus on unmount.
  // Empty dependency array — intentional. Re-running this on every render
  // (e.g. when the parent passes a new inline `onClose` function) would call
  // firstFocusable.focus() on every keystroke and steal focus from whichever
  // field the user is currently typing in.
  useEffect(() => {
    const modalNode = modalRef.current;
    if (!modalNode) return undefined;

    returnFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const focusable = modalNode.querySelectorAll(FOCUSABLE_SELECTOR);
    focusable[0]?.focus();

    return () => {
      returnFocusRef.current?.focus?.();
    };
  }, []);

  // Keyboard trap: Escape → close; Tab → cycle through focusable elements.
  // Depends on `onClose` so the handler always holds the current callback.
  // Querying focusable inside the handler keeps the list fresh if modal
  // content changes while it is open.
  useEffect(() => {
    const modalNode = modalRef.current;
    if (!modalNode) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && onClose) {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = modalNode.querySelectorAll(FOCUSABLE_SELECTOR);
      if (focusable.length === 0) return;

      const firstFocusable = focusable[0];
      const lastFocusable  = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === firstFocusable) {
        event.preventDefault();
        lastFocusable?.focus();
      } else if (!event.shiftKey && document.activeElement === lastFocusable) {
        event.preventDefault();
        firstFocusable?.focus();
      }
    };

    modalNode.addEventListener("keydown", handleKeyDown);
    return () => modalNode.removeEventListener("keydown", handleKeyDown);
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
