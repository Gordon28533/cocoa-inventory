import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AuthContext } from "../Context/AuthContext.js";
import RequisitionForm from "./RequisitionForm.jsx";
import { api } from "../utils/api.js";
import { useDepartments } from "../Context/DepartmentsContext.js";

jest.mock("../utils/api.js", () => ({
  api: {
    createRequisition: jest.fn()
  }
}));

jest.mock("../Context/DepartmentsContext.js", () => ({
  useDepartments: jest.fn()
}));

describe("RequisitionForm", () => {
  const inventory = [
    { id: "INV-1", name: "Laptop", category: "IT", type: "Electronics", quantity: 5 },
    { id: "INV-2", name: "Chair", category: "Office", type: "Furniture", quantity: 8 }
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    useDepartments.mockReturnValue({
      departments: [
        { id: 3, name: "IT" },
        { id: 4, name: "Accounts" }
      ],
      loading: false,
      error: ""
    });
  });

  const renderForm = (setNotification = jest.fn()) =>
    render(
      <AuthContext.Provider
        value={{
          token: "token",
          user: "Grace",
          role: "user",
          departmentId: "3",
          currentPath: "/dashboard",
          setCurrentPath: jest.fn(),
          logout: jest.fn(),
          isAuthChecked: true
        }}
      >
        <RequisitionForm inventory={inventory} setNotification={setNotification} />
      </AuthContext.Provider>
    );

  it("blocks submission when the selected department does not match the logged-in user", async () => {
    const setNotification = jest.fn();

    renderForm(setNotification);

    fireEvent.click(screen.getByLabelText(/Select Laptop/i));
    fireEvent.change(screen.getByLabelText(/Department:/i), { target: { value: "4" } });

    await waitFor(() => {
      expect(screen.getByText(/You can only submit requisitions for your own department./i)).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: /Submit Requisition/i })).toBeDisabled();
    expect(api.createRequisition).not.toHaveBeenCalled();
    expect(setNotification).not.toHaveBeenCalled();
  });

  it("blocks submission when a requested quantity exceeds available stock", async () => {
    const setNotification = jest.fn();

    renderForm(setNotification);

    fireEvent.click(screen.getByLabelText(/Select Laptop/i));
    fireEvent.change(screen.getByLabelText(/Quantity for Laptop/i), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: /Submit Requisition/i }));

    await waitFor(() => {
      expect(setNotification).toHaveBeenCalledWith("Requested quantity exceeds available stock for Laptop.");
    });

    expect(api.createRequisition).not.toHaveBeenCalled();
  });

  it("submits a valid requisition and shows the returned pickup code", async () => {
    const setNotification = jest.fn();
    api.createRequisition.mockResolvedValue({
      success: true,
      unique_code: "PICK1234"
    });

    renderForm(setNotification);

    fireEvent.click(screen.getByLabelText(/Select Laptop/i));
    fireEvent.change(screen.getByLabelText(/Quantity for Laptop/i), { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: /Submit Requisition/i }));

    await waitFor(() => {
      expect(api.createRequisition).toHaveBeenCalledWith({
        items: [{ id: "INV-1", quantity: 3 }],
        department_id: 3,
        is_it_item: false
      });
    });

    expect(setNotification).toHaveBeenCalledWith("Requisition submitted! Your pickup code: PICK1234");

    await waitFor(() => {
      expect(screen.getByText(/Your pickup code:/i)).toBeInTheDocument();
    });

    expect(screen.getByText("PICK1234")).toBeInTheDocument();
  });
});
