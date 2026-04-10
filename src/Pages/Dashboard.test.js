/* eslint-disable react/prop-types */
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthContext } from "../Context/AuthContext.js";
import { api } from "../utils/api.js";
import Dashboard from "./Dashboard";

jest.mock("../utils/api.js", () => ({
  api: {
    updateItem: jest.fn()
  }
}));

jest.mock("../Component/InventoryList.jsx", () => {
  const InventoryListMock = (props) => (
    <div>
      <div>Inventory List Stub</div>
      {props.onEditItem && (
        <button
          type="button"
          onClick={() =>
            props.onEditItem({
              id: "INV-1",
              name: "Laptop",
              category: "IT",
              type: "Device",
              quantity: 5
            })
          }
        >
          Trigger Edit
        </button>
      )}
    </div>
  );

  InventoryListMock.displayName = "InventoryListMock";

  return InventoryListMock;
});

jest.mock("../Component/InventoryForm.jsx", () => {
  const InventoryFormMock = (props) => (
    <div>
      <div>Inventory Form Stub</div>
      <button
        type="button"
        onClick={() =>
          props.onSubmit?.({
            id: props.initialItem?.id || "INV-1",
            name: "Laptop",
            category: "IT",
            type: "Updated Device",
            quantity: 9
          })
        }
      >
        Submit Inventory Edit
      </button>
      <button type="button" onClick={() => props.onCancel?.()}>
        Cancel Inventory Edit
      </button>
    </div>
  );

  InventoryFormMock.displayName = "InventoryFormMock";

  return InventoryFormMock;
});

jest.mock("../Component/RequisitionForm.jsx", () => {
  const RequisitionFormMock = () => <div>Create Requisition Stub</div>;
  RequisitionFormMock.displayName = "RequisitionFormMock";
  return RequisitionFormMock;
});

jest.mock("../Component/RequisitionApproval.jsx", () => {
  const RequisitionApprovalMock = () => <div>Approvals Stub</div>;
  RequisitionApprovalMock.displayName = "RequisitionApprovalMock";
  return RequisitionApprovalMock;
});

jest.mock("../Component/RequisitionFulfill.jsx", () => {
  const RequisitionFulfillMock = () => <div>Fulfill Stub</div>;
  RequisitionFulfillMock.displayName = "RequisitionFulfillMock";
  return RequisitionFulfillMock;
});

jest.mock("../Component/AuditLogViewer.jsx", () => {
  const AuditLogViewerMock = () => <div>Audit Logs Stub</div>;
  AuditLogViewerMock.displayName = "AuditLogViewerMock";
  return AuditLogViewerMock;
});

jest.mock("../Component/MyRequisitions.jsx", () => {
  const MyRequisitionsMock = () => <div>My Requisitions Stub</div>;
  MyRequisitionsMock.displayName = "MyRequisitionsMock";
  return MyRequisitionsMock;
});

jest.mock("../Component/DepartmentManager.jsx", () => {
  const DepartmentManagerMock = () => <div>Departments Stub</div>;
  DepartmentManagerMock.displayName = "DepartmentManagerMock";
  return DepartmentManagerMock;
});

describe("Dashboard", () => {
  const renderDashboard = ({
    role = "admin",
    user = "admin",
    currentPath = "/dashboard",
    setCurrentPath = jest.fn(),
    logout = jest.fn(),
    inventory = [{ id: "INV-1", name: "Laptop", category: "IT", type: "Device", quantity: 5 }]
  } = {}) => {
    const setInventory = jest.fn();

    const view = render(
      <AuthContext.Provider
        value={{
          token: "test-token",
          user,
          role,
          currentPath,
          setCurrentPath,
          logout,
          isAuthChecked: true
        }}
      >
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Dashboard inventory={inventory} setInventory={setInventory} />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    return { ...view, setInventory, setCurrentPath, logout };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders dashboard and admin tabs", () => {
    renderDashboard();

    expect(screen.getByText(/Inventory Dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/Audit Logs/i)).toBeInTheDocument();
    expect(screen.getByText(/Departments/i)).toBeInTheDocument();
  });

  it("shows the approvals tab for branch account users", () => {
    renderDashboard({ role: "account" });

    expect(screen.getByRole("tab", { name: /^Approvals$/i })).toBeInTheDocument();
    expect(screen.queryByText(/My Requisitions/i)).not.toBeInTheDocument();
  });

  it("switches to the requisition tab for requester roles and updates the saved path", async () => {
    const setCurrentPath = jest.fn();

    renderDashboard({ role: "user", user: "Grace", currentPath: "/dashboard", setCurrentPath });

    fireEvent.click(screen.getByRole("tab", { name: /^Requisition$/i }));

    expect(await screen.findByText(/Create Requisition Stub/i)).toBeInTheDocument();
    expect(setCurrentPath).toHaveBeenCalledWith("/dashboard?tab=requisition");
  });

  it("restores the my requisitions tab from the current path", async () => {
    renderDashboard({ role: "user", user: "Grace", currentPath: "/dashboard?tab=myreq" });

    expect(await screen.findByText(/My Requisitions Stub/i)).toBeInTheDocument();
    expect(screen.queryByText(/Inventory List Stub/i)).not.toBeInTheDocument();
  });

  it("opens the inventory edit modal for stores users and saves changes", async () => {
    const { setInventory } = renderDashboard({ role: "stores", user: "Stores User" });
    api.updateItem.mockResolvedValue({ success: true });

    fireEvent.click(screen.getByRole("button", { name: /Trigger Edit/i }));

    expect(screen.getByText(/Edit Inventory Item/i)).toBeInTheDocument();
    expect(screen.getByText(/Inventory Form Stub/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Submit Inventory Edit/i }));

    await waitFor(() => {
      expect(api.updateItem).toHaveBeenCalledWith("INV-1", {
        id: "INV-1",
        name: "Laptop",
        category: "IT",
        type: "Updated Device",
        quantity: 9
      });
    });

    expect(setInventory).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/Item updated successfully!/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText(/Inventory Form Stub/i)).not.toBeInTheDocument();
    });
  });
});
