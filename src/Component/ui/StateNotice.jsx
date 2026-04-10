import React from "react";
import PropTypes from "prop-types";

const StateNotice = ({ children, tone = "neutral" }) => (
  <div
    className={`state-notice state-notice--${tone}`}
    role={tone === "error" ? "alert" : "status"}
    aria-live={tone === "error" ? "assertive" : "polite"}
    aria-atomic="true"
  >
    {children}
  </div>
);

StateNotice.propTypes = {
  children: PropTypes.node.isRequired,
  tone: PropTypes.oneOf(["neutral", "error", "success"])
};

export default StateNotice;
