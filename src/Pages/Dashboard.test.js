import React from "react";
import { render, screen } from "@testing-library/react";
import Dashboard from "./Dashboard";

describe("Dashboard", () => {
  beforeEach(() => {
    // Mock localStorage for user and role
    Storage.prototype.getItem = jest.fn((key) => {
      if (key === "user") return "admin";
      if (key === "role") return "admin";
      if (key === "token") return "test-token";
      return null;
    });
  });

  it("renders dashboard and admin tabs", () => {
    render(<Dashboard inventory={[]} setInventory={() => {}} />);
    expect(screen.getByText(/Inventory Dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/Audit Logs/i)).toBeInTheDocument();
    expect(screen.getByText(/Departments/i)).toBeInTheDocument();
  });
}); 