import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AuthContext } from "../Context/AuthContext.js";
import InventoryForm from "./InventoryForm.jsx";
import { api } from "../utils/api.js";

jest.mock("../utils/api.js", () => ({
  api: {
    getItems: jest.fn(),
    createItem: jest.fn()
  }
}));

describe("InventoryForm", () => {
  const renderForm = (ui, { token = "token" } = {}) =>
    render(
      <AuthContext.Provider
        value={{
          token,
          user: "Stores User",
          role: "stores",
          departmentId: "",
          currentPath: "/dashboard",
          setCurrentPath: jest.fn(),
          logout: jest.fn(),
          isAuthChecked: true
        }}
      >
        {ui}
      </AuthContext.Provider>
    );

  beforeEach(() => {
    jest.clearAllMocks();
    api.getItems.mockResolvedValue([
      { id: "GEN-001", name: "AIR REFRESHNER", quantity: 5, category: "General Stock" }
    ]);
  });

  it("creates a new item in add mode and shows the inventory preview", async () => {
    const setInventory = jest.fn();
    api.createItem.mockResolvedValue({
      id: "GEN-001",
      name: "AIR REFRESHNER",
      category: "General Stock",
      type: "Cleaning",
      quantity: 7
    });

    renderForm(<InventoryForm setInventory={setInventory} />);

    expect(await screen.findByText(/Current Inventory Items/i)).toBeInTheDocument();
    expect(screen.getByText(/Choose a stock category first to unlock the matching item IDs./i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Category/i), {
      target: { value: "General Stock" }
    });
    fireEvent.change(screen.getByLabelText(/Item ID/i), {
      target: { value: "GEN-001" }
    });
    fireEvent.change(screen.getByLabelText(/Type/i), {
      target: { value: "Cleaning" }
    });
    fireEvent.change(screen.getByLabelText(/Quantity/i), {
      target: { value: "7" }
    });
    fireEvent.click(screen.getByRole("button", { name: /Add Item/i }));

    await waitFor(() => {
      expect(api.createItem).toHaveBeenCalledWith({
        id: "GEN-001",
        name: "AIR REFRESHNER",
        category: "General Stock",
        type: "Cleaning",
        quantity: 7
      });
    });

    expect(setInventory).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(/Item added successfully!/i);
    });

    expect(screen.getByLabelText(/Quantity/i)).toHaveAttribute("aria-describedby", expect.stringContaining("inventory-form-quantity-help"));
  });

  it("supports edit mode through the passed handlers without fetching preview items", async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const onCancel = jest.fn();

    renderForm(
      <InventoryForm
        isEdit
        initialItem={{
          id: "STA-007",
          name: "PEN BLUE",
          category: "Stationery Stock",
          type: "Pen",
          quantity: 12
        }}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    );

    expect(api.getItems).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue("STA-007")).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Type/i), {
      target: { value: "Blue Pen" }
    });
    fireEvent.change(screen.getByLabelText(/Quantity/i), {
      target: { value: "20" }
    });
    fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        id: "STA-007",
        name: "PEN BLUE",
        category: "Stationery Stock",
        type: "Blue Pen",
        quantity: 20
      });
    });

    const cancelButton = screen.getByRole("button", { name: /Cancel/i });

    await waitFor(() => {
      expect(cancelButton).not.toBeDisabled();
    });

    fireEvent.click(cancelButton);
    expect(onCancel).toHaveBeenCalled();
  });
});
