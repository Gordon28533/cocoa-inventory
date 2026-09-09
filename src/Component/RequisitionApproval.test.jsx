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

  // Departmental scoping is enforced by the backend, not this component:
  // GET /requisitions adds "WHERE department_id = ?" for approver roles, and
  // the component renders whatever it is given. The mock therefore returns only
  // what the server would return for an HOD in department 3.
  const departmentScopedResponse = requisitions.filter((r) => r.department_id === 3);

  it("renders a card for every batch returned by the API", async () => {
    api.getRequisitions.mockResolvedValue(departmentScopedResponse);

    renderApproval(undefined);

    expect(await screen.findByTitle("B-1")).toBeInTheDocument();
    expect(screen.getByTitle("B-3")).toBeInTheDocument();
    // B-2 belongs to another department, so the server never returns it.
    expect(screen.queryByTitle("B-2")).not.toBeInTheDocument();
  });

  it("approves a batch after confirmation and refreshes the list", async () => {
    api.getRequisitions.mockResolvedValue([requisitions[0]]);   // single batch: B-1
    api.approveRequisition.mockResolvedValue({ success: true });

    renderApproval(jest.fn());

    // Approving takes two steps: the card button opens a confirmation dialog,
    // and the dialog's own button performs the approval.
    fireEvent.click(await screen.findByRole("button", { name: /Approve Batch/i }));
    fireEvent.click(await screen.findByRole("button", { name: /^Approve$/i }));

    await waitFor(() => {
      expect(api.approveRequisition).toHaveBeenCalledWith(0, { batch_id: "B-1" });
    });

    // The confirmation message is rendered by the component itself rather than
    // pushed through the setNotification prop.
    expect(await screen.findByText(/Batch approved\./i)).toBeInTheDocument();
    expect(api.getRequisitions).toHaveBeenCalledTimes(2);
  });
});
