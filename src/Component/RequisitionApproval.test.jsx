import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AuthContext } from "../Context/AuthContext.js";
import RequisitionApproval from "./RequisitionApproval.jsx";
import { api } from "../utils/api.js";
import { useDepartments } from "../Context/DepartmentsContext.js";

jest.mock("../utils/api.js", () => ({
  api: {
    getRequisitions: jest.fn(),
    approveRequisition: jest.fn()
  }
}));

jest.mock("../Context/DepartmentsContext.js", () => ({
  useDepartments: jest.fn()
}));

describe("RequisitionApproval", () => {
  const inventory = [{ id: "INV-1", name: "Laptop", category: "IT", type: "Electronics" }];
  const requisitions = [
    { id: 1, batch_id: "B-1", item_id: "INV-1", quantity: 2, status: "pending", department_id: 3, department: "IT", is_it_item: 0 },
    { id: 2, batch_id: "B-2", item_id: "INV-1", quantity: 1, status: "pending", department_id: 4, department: "Accounts", is_it_item: 0 },
    { id: 3, batch_id: "B-3", item_id: "INV-1", quantity: 1, status: "hod_approved", department_id: 3, department: "IT", is_it_item: 1 }
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    useDepartments.mockReturnValue({
      departments: [
        { id: 3, name: "IT" },
        { id: 4, name: "Accounts" }
      ]
    });

    api.getRequisitions.mockResolvedValue(requisitions);
  });

  const renderApproval = (setNotification) =>
    render(
      <AuthContext.Provider
        value={{
          token: "token",
          user: "Grace",
          role: "hod",
          departmentId: "3",
          currentPath: "/dashboard",
          setCurrentPath: jest.fn(),
          logout: jest.fn(),
          isAuthChecked: true
        }}
      >
        <RequisitionApproval inventory={inventory} setNotification={setNotification} />
      </AuthContext.Provider>
    );

  it("shows only approval batches relevant to the current role", async () => {
    renderApproval(undefined);

    expect(await screen.findByText(/Batch ID: B-1/i)).toBeInTheDocument();
    expect(screen.queryByText(/Batch ID: B-2/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Batch ID: B-3/i)).not.toBeInTheDocument();
  });

  it("approves a batch and refreshes the list", async () => {
    const setNotification = jest.fn();
    api.approveRequisition.mockResolvedValue({ success: true });

    renderApproval(setNotification);

    fireEvent.click(await screen.findByRole("button", { name: /Approve Batch/i }));

    await waitFor(() => {
      expect(api.approveRequisition).toHaveBeenCalledWith(0, { batch_id: "B-1" });
    });

    expect(setNotification).toHaveBeenCalledWith("Batch approved successfully.");
    expect(api.getRequisitions).toHaveBeenCalledTimes(2);
  });
});
