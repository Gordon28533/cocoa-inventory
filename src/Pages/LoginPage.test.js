import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import LoginPage from "./LoginPage";
import { MemoryRouter } from "react-router-dom";
import { AuthContext } from "../Context/AuthContext.js";

describe("LoginPage", () => {
  const renderLoginPage = () =>
    render(
      <AuthContext.Provider value={{ login: jest.fn() }}>
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <LoginPage />
        </MemoryRouter>
      </AuthContext.Provider>
    );

  it("renders the login form fields", () => {
    renderLoginPage();

    expect(screen.getByText(/Welcome Back/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Staff Name/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter your password/i)).toBeInTheDocument();
    expect(screen.queryByText(/Go directly to User Management/i)).not.toBeInTheDocument();
    expect(document.title).toBe("Sign In | CMC Inventory");
    expect(screen.getByLabelText(/Staff Name/i)).toHaveAttribute("aria-describedby", expect.stringContaining("login-subtitle"));
    expect(screen.getByPlaceholderText(/Enter your password/i)).toHaveAttribute("aria-describedby", expect.stringContaining("login-help"));
  });

  it("toggles password visibility", () => {
    renderLoginPage();

    const passwordInput = screen.getByPlaceholderText(/Enter your password/i);
    const toggleButton = screen.getByRole("button", { name: /Show password/i });

    expect(passwordInput).toHaveAttribute("type", "password");
    fireEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute("type", "text");
  });
});
