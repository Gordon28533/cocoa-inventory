import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AuthContext } from "../Context/AuthContext.js";
import RequisitionFulfill from "./RequisitionFulfill.jsx";
import { api } from "../utils/api.js";

jest.mock("../utils/api.js", () => ({
  api: {
    getRequisitions: jest.fn(),
    getRequisitionByCode: jest.fn(),
    fulfillBatch: jest.fn()
  }
}));

describe("RequisitionFulfill", () => {
  const inventory = [{ id: "INV-1", name: "Laptop", category: "IT", type: "Electronics" }];
  const requisitions = [
    {
      id: 1,
      batch_id: "READY-1",
      item_id: "INV-1",
      quantity: 2,
      status: "account_approved",
      department: "IT",
      unique_code: "READY123",
      is_it_item: 0
    },
    {
      id: 2,
      batch_id: "WAIT-1",
      item_id: "INV-1",
      quantity: 1,
      status: "pending",
      department: "IT",
      unique_code: "WAIT123",
      is_it_item: 0
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    api.getRequisitions.mockResolvedValue(requisitions);
  });

  const renderFulfill = (setNotification) =>
    render(
      <AuthContext.Provider
        value={{
          token: "token",
          user: "Stores User",
          role: "stores",
          departmentId: "",
          currentPath: "/dashboard",
          setCurrentPath: jest.fn(),
          logout: jest.fn(),
          isAuthChecked: true
        }}
      >
        <RequisitionFulfill inventory={inventory} setNotification={setNotification} />
      </AuthContext.Provider>
    );

  it("separates ready batches from requested batches", async () => {
    renderFulfill(undefined);

    expect(await screen.findByText(/READY-1/i)).toBeInTheDocument();
    expect(screen.getByText(/WAIT-1/i)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Open/i })).toHaveLength(2);
  });

  it("requires both code and receiver id before fulfillment", async () => {
    renderFulfill(undefined);

    fireEvent.click((await screen.findAllByRole("button", { name: /Open/i }))[1]);
    fireEvent.change(screen.getByLabelText(/Enter unique code to confirm/i), { target: { value: "READY123" } });

    expect(screen.getByRole("button", { name: /Fulfill Batch/i })).toBeDisabled();
    expect(api.fulfillBatch).not.toHaveBeenCalled();
  });

  it("fulfills a ready batch with trimmed code and receiver id", async () => {
    const setNotification = jest.fn();
    api.fulfillBatch.mockResolvedValue({ success: true });

    renderFulfill(setNotification);

    fireEvent.click((await screen.findAllByRole("button", { name: /Open/i }))[1]);
    fireEvent.change(screen.getByLabelText(/Enter unique code to confirm/i), { target: { value: " READY123 " } });
    fireEvent.change(screen.getByLabelText(/Receiver Staff ID/i), { target: { value: " RCV-1 " } });
    fireEvent.click(screen.getByRole("button", { name: /Fulfill Batch/i }));

    await waitFor(() => {
      expect(api.fulfillBatch).toHaveBeenCalledWith("READY-1", {
        unique_code: "READY123",
        receiver_id: "RCV-1"
      });
    });

    expect(setNotification).toHaveBeenCalledWith("Batch fulfilled!");
  });
});
