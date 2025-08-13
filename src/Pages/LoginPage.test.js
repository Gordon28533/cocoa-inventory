import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import LoginPage from "./LoginPage";
import { BrowserRouter } from "react-router-dom";

describe("LoginPage", () => {
  it("renders login form and test credentials", () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );
    expect(screen.getByText(/Welcome Back/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Staff Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByText(/Test Credentials/i)).toBeInTheDocument();
  });

  it("shows error on empty submit", () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );
    fireEvent.click(screen.getByRole("button", { name: /Sign In/i }));
    expect(screen.getByText(/Sign in to access your inventory dashboard/i)).toBeInTheDocument();
  });
}); 