import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ChangePasswordPage from "./ChangePasswordPage.js";
import { api } from "../utils/api.js";

jest.mock("../utils/api.js", () => ({
  api: {
    changePassword: jest.fn()
  }
}));

describe("ChangePasswordPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderPage = () =>
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ChangePasswordPage />
      </MemoryRouter>
    );

  it("sets the page title and validates password confirmation before submitting", async () => {
    renderPage();

    expect(document.title).toBe("Change Password | CMC Inventory");

    fireEvent.change(screen.getByLabelText(/Current Password/i), { target: { value: "old-pass" } });
    fireEvent.change(screen.getByLabelText(/^New Password$/i), { target: { value: "new-pass-123" } });
    fireEvent.change(screen.getByLabelText(/Confirm New Password/i), { target: { value: "mismatch" } });

    fireEvent.click(screen.getByRole("button", { name: /Change Password/i }));

    await waitFor(() => {
      expect(screen.getByText(/New passwords do not match./i)).toBeInTheDocument();
    });

    expect(api.changePassword).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/Confirm New Password/i)).toHaveAttribute("aria-invalid", "true");
  });
});
