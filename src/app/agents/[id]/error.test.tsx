import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import AgentDetailError from "./error";

describe("AgentDetailError (agents/[id]/error.tsx)", () => {
  it("shows a fallback message and calls retry() when clicked", async () => {
    const user = userEvent.setup();
    const retry = vi.fn();
    render(<AgentDetailError error={new Error("boom")} retry={retry} />);

    expect(screen.getByRole("heading", { name: "This agent hit a problem" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("links back to the agents list", () => {
    render(<AgentDetailError error={new Error("boom")} retry={vi.fn()} />);
    expect(screen.getByRole("link", { name: "Back to agents" })).toHaveAttribute("href", "/agents");
  });
});
