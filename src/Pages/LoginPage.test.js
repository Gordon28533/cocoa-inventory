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
    // Authentication is by employee number, so the field is "Employee ID".
    expect(screen.getByLabelText(/Employee ID/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
    expect(screen.queryByText(/Go directly to User Management/i)).not.toBeInTheDocument();
    expect(document.title).toBe("Sign In | Enterprise Inventory System");

    // The shared description is now carried on the <form> rather than repeated
    // on each input, so one announcement covers the whole form.
    expect(screen.getByRole("form", { name: /Login form/i }))
      .toHaveAttribute("aria-describedby", expect.stringContaining("login-subtitle"));
  });

  it("toggles password visibility", () => {
    renderLoginPage();

    const passwordInput = screen.getByPlaceholderText("Password");
    const toggleButton = screen.getByRole("button", { name: /Show password/i });

    expect(passwordInput).toHaveAttribute("type", "password");
    fireEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute("type", "text");
  });
});
