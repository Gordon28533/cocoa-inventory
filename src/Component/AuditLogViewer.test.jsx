import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { AuthContext } from "../Context/AuthContext.js";
import AuditLogViewer from "./AuditLogViewer.jsx";
import { api } from "../utils/api.js";

jest.mock("../utils/api.js", () => ({
  api: {
    getAuditLogs: jest.fn()
  }
}));

describe("AuditLogViewer", () => {
  const renderViewer = ({ token = "token" } = {}) =>
    render(
      <AuthContext.Provider
        value={{
          token,
          user: "Admin",
          role: "admin",
          departmentId: "",
          currentPath: "/audit-logs",
          setCurrentPath: jest.fn(),
          logout: jest.fn(),
          isAuthChecked: true
        }}
      >
        <AuditLogViewer />
      </AuthContext.Provider>
    );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("loads and displays audit logs for an authenticated session", async () => {
    api.getAuditLogs.mockResolvedValue([
      {
        id: 1,
        staffName: "Admin User",
        action: "Approved requisition",
        requisition_id: "REQ-1",
        timestamp: "2026-04-09T10:00:00.000Z"
      }
    ]);

    renderViewer();

    expect(await screen.findByText(/Admin User/i)).toBeInTheDocument();
    expect(screen.getByText(/Approved requisition/i)).toBeInTheDocument();
    expect(api.getAuditLogs).toHaveBeenCalledTimes(1);
  });

  it("shows the empty state without fetching when there is no session token", async () => {
    renderViewer({ token: null });

    await waitFor(() => {
      expect(screen.getByText(/No audit logs found./i)).toBeInTheDocument();
    });

    expect(api.getAuditLogs).not.toHaveBeenCalled();
  });
});
