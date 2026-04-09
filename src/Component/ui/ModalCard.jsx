import React from "react";
import PropTypes from "prop-types";

const ModalCard = ({ title, children, minWidth = 320, maxWidth = 520 }) => (
  <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={title}>
    <div className="modal-card" style={{ minWidth, maxWidth }}>
      {title && <h3 className="modal-card-title">{title}</h3>}
      {children}
    </div>
  </div>
);

ModalCard.propTypes = {
  title: PropTypes.string,
  children: PropTypes.node.isRequired,
  minWidth: PropTypes.number,
  maxWidth: PropTypes.number
};

export default ModalCard;
