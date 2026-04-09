/* eslint-disable react/prop-types */
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AdminAddUser from "./AdminAddUser.js";
import { useAuth } from "../Context/AuthContext.js";
import { useDepartments } from "../Context/DepartmentsContext.js";
import { api } from "../utils/api.js";

const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate
}));

jest.mock("../Context/AuthContext.js", () => ({
  useAuth: jest.fn()
}));

jest.mock("../Context/DepartmentsContext.js", () => ({
  useDepartments: jest.fn()
}));

jest.mock("../utils/api.js", () => ({
  api: {
    login: jest.fn(),
    getUsers: jest.fn(),
    createUser: jest.fn(),
    updateUser: jest.fn(),
    changePassword: jest.fn(),
    deleteUser: jest.fn(),
    deactivateUser: jest.fn()
  }
}));

jest.mock("../Component/AuditLogViewer.jsx", () => {
  const AuditLogViewerMock = () => <div>Audit Logs Stub</div>;
  AuditLogViewerMock.displayName = "AuditLogViewerMock";
  return AuditLogViewerMock;
});

jest.mock("../Component/DepartmentManager.jsx", () => {
  const DepartmentManagerMock = () => <div>Department Manager Stub</div>;
  DepartmentManagerMock.displayName = "DepartmentManagerMock";
  return DepartmentManagerMock;
});

describe("AdminAddUser", () => {
  const users = [
    {
      id: 1,
      staffName: "Grace Admin",
      staffId: "ADM001",
      role: "admin",
      department_id: "4",
      isActive: true
    },
    {
      id: 2,
      staffName: "Kojo Stores",
      staffId: "STR002",
      role: "stores",
      department_id: "3",
      isActive: true
    }
  ];

  const departments = [
    { id: 3, name: "IT" },
    { id: 4, name: "Head Office" }
  ];

  const renderPage = () => render(<AdminAddUser />);

  const unlockAdmin = async () => {
    renderPage();

    fireEvent.change(screen.getByPlaceholderText(/Enter your admin password/i), {
      target: { value: "secret123" }
    });
    fireEvent.click(screen.getByRole("button", { name: /Confirm/i }));

    await screen.findByText(/User Management/i);
    await waitFor(() => {
      expect(api.getUsers).toHaveBeenCalled();
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();

    useAuth.mockReturnValue({
      role: "admin",
      user: "Grace Admin"
    });

    useDepartments.mockReturnValue({
      departments,
      loading: false,
      error: ""
    });

    api.login.mockResolvedValue({ success: true });
    api.getUsers.mockResolvedValue(users);
  });

  it("unlocks the admin screen after password confirmation and loads users", async () => {
    await unlockAdmin();

    expect(api.login).toHaveBeenCalledWith({
      staffName: "Grace Admin",
      password: "secret123"
    });
    expect(screen.getByText(/Grace Admin/i)).toBeInTheDocument();
    expect(screen.getByText(/Kojo Stores/i)).toBeInTheDocument();
  });

  it("creates a user and refreshes the user list", async () => {
    api.createUser.mockResolvedValue({ success: true });

    await unlockAdmin();

    fireEvent.change(screen.getByPlaceholderText(/^Staff Name$/i), {
      target: { value: "New User" }
    });
    fireEvent.change(screen.getByPlaceholderText(/^Staff ID$/i), {
      target: { value: "USR003" }
    });

    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[0], { target: { value: "stores" } });
    fireEvent.change(selects[1], { target: { value: "3" } });

    fireEvent.change(screen.getByPlaceholderText(/Password \(leave blank for default\)/i), {
      target: { value: "temp-pass" }
    });
    fireEvent.click(screen.getByRole("button", { name: /Add User/i }));

    await waitFor(() => {
      expect(api.createUser).toHaveBeenCalledWith({
        staffName: "New User",
        staffId: "USR003",
        role: "stores",
        password: "temp-pass",
        department_id: "3"
      });
    });

    expect(api.getUsers).toHaveBeenCalledTimes(2);
    expect(await screen.findByText(/User added successfully!/i)).toBeInTheDocument();
  });

  it("opens the edit modal and saves user changes", async () => {
    api.updateUser.mockResolvedValue({ success: true });

    await unlockAdmin();

    fireEvent.click(screen.getAllByRole("button", { name: /Edit/i })[0]);

    expect(screen.getByText(/Edit User/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Staff Name/i), {
      target: { value: "Grace Updated" }
    });
    fireEvent.change(screen.getByLabelText(/Set new password \(optional\)/i), {
      target: { value: "new-secret" }
    });
    fireEvent.click(screen.getByRole("button", { name: /^Save$/i }));

    await waitFor(() => {
      expect(api.updateUser).toHaveBeenCalledWith(1, {
        staffName: "Grace Updated",
        staffId: "ADM001",
        role: "admin",
        department_id: "4",
        password: "new-secret"
      });
    });

    expect(api.getUsers).toHaveBeenCalledTimes(2);
    await waitFor(() => {
      expect(screen.queryByText(/Edit User/i)).not.toBeInTheDocument();
    });
  });

  it("validates the change-password form before calling the API", async () => {
    await unlockAdmin();

    fireEvent.change(screen.getByPlaceholderText(/Current password/i), {
      target: { value: "old-pass" }
    });
    fireEvent.change(screen.getByPlaceholderText(/^New password$/i), {
      target: { value: "one-pass" }
    });
    fireEvent.change(screen.getByPlaceholderText(/Confirm new password/i), {
      target: { value: "different-pass" }
    });
    fireEvent.click(screen.getByRole("button", { name: /Change Password/i }));

    expect(api.changePassword).not.toHaveBeenCalled();
    expect(await screen.findByText(/New passwords do not match\./i)).toBeInTheDocument();
  });
});
