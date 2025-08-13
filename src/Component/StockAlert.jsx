import React from "react";
import PropTypes from "prop-types";

const StockAlert = ({ inventory }) => {
  const lowStockItems = inventory.filter((item) => item.quantity < 5);

  return (
    <div className="stock-alert">
      {lowStockItems.length > 0 ? (
        lowStockItems.map((item) => (
          <p key={item.id || item.name}>{item.name} is running low!</p>
        ))
      ) : (
        <p>All items are sufficiently stocked.</p>
      )}
    </div>
  );
};

StockAlert.propTypes = {
  inventory: PropTypes.array.isRequired,
};

export default StockAlert;
