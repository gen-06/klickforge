import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WaitlistForm } from "./waitlist-form";

const mocks = vi.hoisted(() => ({
  joinWaitlist: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  joinWaitlist: mocks.joinWaitlist,
}));

describe("WaitlistForm", () => {
  it("submits the email and shows a success message", async () => {
    mocks.joinWaitlist.mockResolvedValue({ status: "registered", email: "test@example.com" });

    render(<WaitlistForm />);

    const input = screen.getByPlaceholderText("Enter your email");
    fireEvent.change(input, { target: { value: "test@example.com" } });

    fireEvent.click(screen.getByRole("button", { name: /join waitlist/i }));

    await waitFor(() => {
      expect(screen.getByText(/you're on the waitlist/i)).toBeInTheDocument();
    });

    expect(mocks.joinWaitlist).toHaveBeenCalledWith("test@example.com", "landing");
  });

  it("shows an error message when submission fails", async () => {
    mocks.joinWaitlist.mockRejectedValue(new Error("Network error"));

    render(<WaitlistForm source="footer" />);

    fireEvent.change(screen.getByPlaceholderText("Enter your email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /join waitlist/i }));

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });

    expect(mocks.joinWaitlist).toHaveBeenCalledWith("test@example.com", "footer");
  });
});
