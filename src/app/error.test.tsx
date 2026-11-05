import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import RouteError from "./error";

describe("RouteError (app/error.tsx)", () => {
  it("shows a fallback message and calls retry() when clicked", async () => {
    const user = userEvent.setup();
    const retry = vi.fn();
    render(<RouteError error={new Error("boom")} retry={retry} />);

    expect(screen.getByRole("heading", { name: "Something went wrong" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("links back to the dashboard", () => {
    render(<RouteError error={new Error("boom")} retry={vi.fn()} />);
    expect(screen.getByRole("link", { name: "Back to dashboard" })).toHaveAttribute("href", "/");
  });

  it("shows the error's digest as a reference when present, and omits it when absent", () => {
    const { rerender } = render(
      <RouteError error={Object.assign(new Error("boom"), { digest: "abc123" })} retry={vi.fn()} />,
    );
    expect(screen.getByText(/abc123/)).toBeInTheDocument();

    rerender(<RouteError error={new Error("boom")} retry={vi.fn()} />);
    expect(screen.queryByText(/Reference:/)).not.toBeInTheDocument();
  });
});
