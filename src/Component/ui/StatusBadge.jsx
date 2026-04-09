import React from "react";
import PropTypes from "prop-types";

const StatusBadge = ({ label, color, className = "", children }) => (
  <span className={`status-badge ${className}`.trim()} style={{ color }}>
    {children || label}
  </span>
);

StatusBadge.propTypes = {
  label: PropTypes.string,
  color: PropTypes.string,
  className: PropTypes.string,
  children: PropTypes.node
};

export default StatusBadge;
