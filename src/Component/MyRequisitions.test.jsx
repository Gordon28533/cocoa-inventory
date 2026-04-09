import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import MyRequisitions from "./MyRequisitions.jsx";
import { api } from "../utils/api.js";
import { useDepartments } from "../Context/DepartmentsContext.js";

jest.mock("../utils/api.js", () => ({
  api: {
    getRequisitions: jest.fn()
  }
}));

jest.mock("../Context/DepartmentsContext.js", () => ({
  useDepartments: jest.fn()
}));

describe("MyRequisitions", () => {
  const inventory = [
    { id: "INV-1", name: "Laptop", category: "IT", type: "Device" },
    { id: "INV-2", name: "Chair", category: "Office", type: "Furniture" }
  ];

  const requisitions = [
    {
      id: 1,
      batch_id: "B-100",
      item_id: "INV-1",
      quantity: 2,
      status: "pending",
      department_id: 3,
      unique_code: "CODE100",
      created_at: "2026-04-01T08:00:00.000Z"
    },
    {
      id: 2,
      batch_id: "B-200",
      item_id: "INV-2",
      quantity: 1,
      status: "fulfilled",
      department_id: 4,
      unique_code: "CODE200",
      created_at: "2026-04-02T09:00:00.000Z"
    }
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

  it("renders grouped batches from the current user's requisitions", async () => {
    render(<MyRequisitions inventory={inventory} />);

    expect(await screen.findByText(/Batch ID: B-200/i)).toBeInTheDocument();
    expect(screen.getByText(/Department: Accounts/i)).toBeInTheDocument();
    expect(screen.getByText(/Unique Code: CODE200/i)).toBeInTheDocument();
    expect(screen.getByText("Chair")).toBeInTheDocument();
    expect(screen.getByText("Laptop")).toBeInTheDocument();
  });

  it("filters batches by search text and status", async () => {
    render(<MyRequisitions inventory={inventory} />);

    expect(await screen.findByText(/Batch ID: B-200/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Search my requisitions/i), {
      target: { value: "chair" }
    });

    await waitFor(() => {
      expect(screen.getByText(/Batch ID: B-200/i)).toBeInTheDocument();
      expect(screen.queryByText(/Batch ID: B-100/i)).not.toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Search my requisitions/i), {
      target: { value: "" }
    });
    fireEvent.change(screen.getByLabelText(/Filter requisitions by status/i), {
      target: { value: "pending" }
    });

    await waitFor(() => {
      expect(screen.getByText(/Batch ID: B-100/i)).toBeInTheDocument();
      expect(screen.queryByText(/Batch ID: B-200/i)).not.toBeInTheDocument();
    });
  });

  it("shows an empty state when no requisitions are returned", async () => {
    api.getRequisitions.mockResolvedValue([]);

    render(<MyRequisitions inventory={inventory} />);

    expect(await screen.findByText(/No requisitions matched your current filters./i)).toBeInTheDocument();
  });
});
