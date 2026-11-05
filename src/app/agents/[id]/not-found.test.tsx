import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AgentNotFound from "./not-found";

describe("AgentNotFound (agents/[id]/not-found.tsx)", () => {
  it("explains the agent wasn't found and links back to the agents list", () => {
    render(<AgentNotFound />);
    expect(screen.getByRole("heading", { name: "Agent not found" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse agents" })).toHaveAttribute("href", "/agents");
  });
});
