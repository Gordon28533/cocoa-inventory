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
      type: "Cleaning & Hygiene",
      quantity: 7
    });

    // showPreview is opt-in — the preview panel is not rendered without it,
    // so it must be passed for the assertion below to have anything to find.
    renderForm(<InventoryForm setInventory={setInventory} showPreview />);

    expect(await screen.findByText(/Current Inventory Items/i)).toBeInTheDocument();
    expect(screen.getByText(/Choose a stock category first to unlock the matching item IDs./i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Category/i), {
      target: { value: "General Stock" }
    });
    fireEvent.change(screen.getByLabelText(/Item ID/i), {
      target: { value: "GEN-001" }
    });
    // Type is a <select> populated from ITEM_TYPES, so the value must be one of
    // the options defined for the selected category.
    fireEvent.change(screen.getByLabelText(/Type/i), {
      target: { value: "Cleaning & Hygiene" }
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
        type: "Cleaning & Hygiene",
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
          type: "Record Book",
          quantity: 12
        }}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    );

    expect(api.getItems).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue("STA-007")).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Type/i), {
      target: { value: "Writing Instrument" }
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
        type: "Writing Instrument",
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
