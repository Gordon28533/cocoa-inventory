import React from "react";
import PropTypes from "prop-types";

const StatusBadge = ({ label, color, variant = "neutral", className = "", children }) => {
  const style = color ? { color } : undefined;
  const classes = ["status-badge", `status-badge--${variant}`, className].filter(Boolean).join(" ");

  return (
    <span className={classes} style={style}>
      {children || label}
    </span>
  );
};

StatusBadge.propTypes = {
  label: PropTypes.string,
  color: PropTypes.string,
  variant: PropTypes.string,
  className: PropTypes.string,
  children: PropTypes.node
};

export default StatusBadge;
