import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ShareButton } from "./share-button";

describe("ShareButton", () => {
  it("copies the URL to the clipboard and shows copied state", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<ShareButton url="https://example.com/clip/123" />);

    const button = screen.getByRole("button", { name: /copy link/i });
    fireEvent.click(button);

    expect(writeText).toHaveBeenCalledWith("https://example.com/clip/123");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /copied/i })).toBeInTheDocument();
    });
  });

  it("falls back to execCommand when clipboard is unavailable", async () => {
    Object.assign(navigator, { clipboard: undefined });
    const execCommand = vi.fn().mockReturnValue(true);
    document.execCommand = execCommand;

    render(<ShareButton url="https://example.com/clip/456" />);

    fireEvent.click(screen.getByRole("button", { name: /copy link/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /copied/i })).toBeInTheDocument();
    });
    expect(execCommand).toHaveBeenCalledWith("copy");
  });
});
