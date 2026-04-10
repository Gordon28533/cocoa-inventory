/* eslint-disable react/prop-types */
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "./App.js";
import { api } from "./utils/api.js";

jest.mock("./utils/api.js", () => ({
  api: {
    validateToken: jest.fn(),
    getItems: jest.fn()
  }
}));

jest.mock("./Context/DepartmentsContext.js", () => {
  const DepartmentsProviderMock = ({ children }) => <>{children}</>;
  DepartmentsProviderMock.displayName = "DepartmentsProviderMock";
  return {
    DepartmentsProvider: DepartmentsProviderMock
  };
});

jest.mock("./Pages/LoginPage.js", () => {
  const LoginPageMock = () => <div>Login Page Stub</div>;
  LoginPageMock.displayName = "LoginPageMock";
  return LoginPageMock;
});

jest.mock("./Pages/Dashboard.js", () => {
  const DashboardMock = ({ inventory, isLoading }) => (
    <div>
      Dashboard Stub
      <div>Inventory Count: {inventory.length}</div>
      <div>Dashboard Loading: {String(isLoading)}</div>
    </div>
  );
  DashboardMock.displayName = "DashboardMock";
  return DashboardMock;
});

jest.mock("./Component/InventoryDetails.jsx", () => {
  const InventoryDetailsMock = () => <div>Inventory Details Stub</div>;
  InventoryDetailsMock.displayName = "InventoryDetailsMock";
  return InventoryDetailsMock;
});

jest.mock("./Pages/AdminAddUser.js", () => {
  const AdminAddUserMock = () => <div>Admin Users Stub</div>;
  AdminAddUserMock.displayName = "AdminAddUserMock";
  return AdminAddUserMock;
});

jest.mock("./Pages/ChangePasswordPage.js", () => {
  const ChangePasswordPageMock = () => <div>Change Password Stub</div>;
  ChangePasswordPageMock.displayName = "ChangePasswordPageMock";
  return ChangePasswordPageMock;
});

jest.mock("./Component/StockAlert.jsx", () => {
  const StockAlertMock = ({ inventory }) => <div>Stock Alert Stub ({inventory.length})</div>;
  StockAlertMock.displayName = "StockAlertMock";
  return StockAlertMock;
});

jest.mock("./Component/AuditLogViewer.jsx", () => {
  const AuditLogViewerMock = () => <div>Audit Logs Stub</div>;
  AuditLogViewerMock.displayName = "AuditLogViewerMock";
  return AuditLogViewerMock;
});

describe("App", () => {
  const setSession = ({ token = null, role = null, user = null, departmentId = null, currentPath = null } = {}) => {
    localStorage.clear();

    if (token) localStorage.setItem("token", token);
    if (role) localStorage.setItem("role", role);
    if (user) localStorage.setItem("user", user);
    if (departmentId) localStorage.setItem("department_id", departmentId);
    if (currentPath) localStorage.setItem("currentPath", currentPath);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    window.history.pushState({}, "", "/");
  });

  it("redirects unauthenticated users to the login page", async () => {
    render(<App />);

    expect(await screen.findByText(/Login Page Stub/i)).toBeInTheDocument();
    expect(api.validateToken).not.toHaveBeenCalled();
    expect(screen.queryByText(/Logout/i)).not.toBeInTheDocument();
  });

  it("bootstraps an authenticated admin session and shows admin navigation", async () => {
    setSession({
      token: "admin-token",
      role: "admin",
      user: "Grace Admin",
      currentPath: "/admin/users"
    });
    window.history.pushState({}, "", "/admin/users");

    api.validateToken.mockResolvedValue({
      id: 1,
      staffName: "Grace Admin",
      role: "admin"
    });
    api.getItems.mockResolvedValue([{ id: "INV-1" }, { id: "INV-2" }]);

    render(<App />);

    expect(await screen.findByText(/Admin Users Stub/i)).toBeInTheDocument();
    expect(screen.getByText(/Workspace/i)).toBeInTheDocument();
    expect(screen.getByText(/User Management/i)).toBeInTheDocument();
    expect(screen.getByText(/Logout/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Open navigation menu/i })).toHaveAttribute("aria-expanded", "false");

    expect(api.validateToken).toHaveBeenCalledTimes(1);
    expect(api.getItems).toHaveBeenCalledTimes(1);
  });

  it("toggles the compact navigation menu for authenticated users", async () => {
    setSession({
      token: "admin-token",
      role: "admin",
      user: "Grace Admin",
      currentPath: "/dashboard"
    });
    window.history.pushState({}, "", "/dashboard");

    api.validateToken.mockResolvedValue({
      id: 1,
      staffName: "Grace Admin",
      role: "admin"
    });
    api.getItems.mockResolvedValue([{ id: "INV-1" }]);

    render(<App />);

    await screen.findByText(/Dashboard Stub/i);

    const menuToggle = screen.getByRole("button", { name: /Open navigation menu/i });
    fireEvent.click(menuToggle);

    expect(screen.getByRole("button", { name: /Close navigation menu/i })).toHaveAttribute("aria-expanded", "true");
  });

  it("blocks non-admin users from the admin route and keeps workspace navigation visible", async () => {
    setSession({
      token: "user-token",
      role: "user",
      user: "Ama User",
      currentPath: "/admin/users"
    });
    window.history.pushState({}, "", "/admin/users");

    api.validateToken.mockResolvedValue({
      id: 2,
      staffName: "Ama User",
      role: "user"
    });
    api.getItems.mockResolvedValue([{ id: "INV-1" }]);

    render(<App />);

    expect(await screen.findByText(/Unauthorized/i)).toBeInTheDocument();
    expect(screen.getByText(/Workspace/i)).toBeInTheDocument();
    expect(screen.queryByText(/User Management/i)).not.toBeInTheDocument();
  });

  it("shows the stock alert for stores users after inventory loads", async () => {
    setSession({
      token: "stores-token",
      role: "stores",
      user: "Kojo Stores",
      currentPath: "/dashboard"
    });
    window.history.pushState({}, "", "/dashboard");

    api.validateToken.mockResolvedValue({
      id: 3,
      staffName: "Kojo Stores",
      role: "stores"
    });
    api.getItems.mockResolvedValue([{ id: "INV-1" }, { id: "INV-2" }, { id: "INV-3" }]);

    render(<App />);

    expect(await screen.findByText(/Dashboard Stub/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Stock Alert Stub \(3\)/i)).toBeInTheDocument();
    });

    expect(screen.queryByText(/My Requisitions/i)).not.toBeInTheDocument();
  });
});
