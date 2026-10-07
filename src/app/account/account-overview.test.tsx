import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AccountOverview } from "./account-overview";

const STORAGE_KEY = "flyrank:settings";

describe("AccountOverview", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("shows an empty state with a link to Settings when nothing is persisted", async () => {
    render(<AccountOverview />);

    expect(
      await screen.findByText(/haven't set up your account yet/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /go to settings/i }),
    ).toHaveAttribute("href", "/account/settings");

    // No summary cards should render alongside the empty state.
    expect(screen.queryByText(/display name/i)).not.toBeInTheDocument();
  });

  it("shows an empty state when the persisted value is malformed", async () => {
    window.localStorage.setItem(STORAGE_KEY, "{not valid json");
    render(<AccountOverview />);

    expect(
      await screen.findByText(/haven't set up your account yet/i),
    ).toBeInTheDocument();
  });

  it("renders persisted values once localStorage has valid settings", async () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        displayName: "Ada Lovelace",
        email: "ada@example.com",
        theme: "dark",
        emailNotifications: true,
        productUpdates: false,
      }),
    );

    render(<AccountOverview />);

    expect(await screen.findByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
    expect(screen.getByText("Dark")).toBeInTheDocument();
    expect(screen.getByText("On")).toBeInTheDocument();
    expect(screen.getByText("Off")).toBeInTheDocument();
    expect(
      screen.queryByText(/haven't set up your account yet/i),
    ).not.toBeInTheDocument();
  });

  it("falls back to 'Not set yet' for an empty display name or email", async () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        displayName: "",
        email: "",
        theme: "system",
        emailNotifications: false,
        productUpdates: false,
      }),
    );

    render(<AccountOverview />);

    const notSetYet = await screen.findAllByText("Not set yet");
    expect(notSetYet).toHaveLength(2);
  });
});
