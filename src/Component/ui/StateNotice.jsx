import React from "react";
import PropTypes from "prop-types";

const StateNotice = ({ children, tone = "neutral" }) => (
  <div className={`state-notice state-notice--${tone}`}>{children}</div>
);

StateNotice.propTypes = {
  children: PropTypes.node.isRequired,
  tone: PropTypes.oneOf(["neutral", "error", "success"])
};

export default StateNotice;
