import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ActivityList } from "./activity-list";

const STORAGE_KEY = "flyrank:activity";

describe("ActivityList", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("shows the empty state when nothing is persisted", async () => {
    render(<ActivityList />);

    expect(await screen.findByText("No activity yet.")).toBeInTheDocument();
    expect(
      screen.getByText(/actions you take on your account/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("renders persisted entries most-recent-first", async () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        {
          id: "2",
          message: "Updated settings",
          timestamp: "2026-01-02T10:00:00.000Z",
        },
        {
          id: "1",
          message: "Account created",
          timestamp: "2026-01-01T10:00:00.000Z",
        },
      ]),
    );

    render(<ActivityList />);

    const items = await screen.findAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Updated settings");
    expect(items[1]).toHaveTextContent("Account created");
    expect(
      screen.queryByText("No activity yet."),
    ).not.toBeInTheDocument();
  });
});
