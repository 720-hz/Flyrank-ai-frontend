import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsForm } from "./settings-form";

const STORAGE_KEY = "flyrank:settings";

describe("SettingsForm", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("shows a required error and does not persist when display name is empty", async () => {
    const user = userEvent.setup();
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem");
    render(<SettingsForm />);

    await user.type(screen.getByLabelText(/^email$/i), "person@example.com");

    // The submit button is disabled while the form is invalid (display name is
    // still empty), as it should be — so the attempt is simulated by firing the
    // form's submit event directly, the same event a disabled button would
    // otherwise never dispatch.
    const saveButton = screen.getByRole("button", { name: /save settings/i });
    expect(saveButton).toBeDisabled();
    fireEvent.submit(screen.getByRole("form", { name: /settings/i }));

    expect(await screen.findByText(/display name is required/i)).toBeInTheDocument();
    expect(setItemSpy).not.toHaveBeenCalled();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows an email-format error for an invalid email", async () => {
    const user = userEvent.setup();
    render(<SettingsForm />);

    await user.type(screen.getByLabelText(/display name/i), "Ada Lovelace");
    const emailInput = screen.getByLabelText(/^email$/i);
    await user.type(emailInput, "not-an-email");
    await user.tab();

    expect(
      await screen.findByText(/enter a valid email address/i),
    ).toBeInTheDocument();
    expect(emailInput).toHaveAttribute("aria-invalid", "true");
  });

  it("succeeds, persists, and shows a confirmation on a valid submission", async () => {
    const user = userEvent.setup();
    render(<SettingsForm />);

    await user.type(screen.getByLabelText(/display name/i), "Ada Lovelace");
    await user.type(screen.getByLabelText(/^email$/i), "ada@example.com");
    await user.tab();

    const saveButton = await screen.findByRole("button", { name: /save settings/i });
    await waitFor(() => expect(saveButton).toBeEnabled());
    await user.click(saveButton);

    expect(await screen.findByRole("status")).toHaveTextContent(/settings saved/i);

    await waitFor(() => {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      expect(stored).not.toBeNull();
      expect(JSON.parse(stored as string)).toMatchObject({
        displayName: "Ada Lovelace",
        email: "ada@example.com",
        theme: "system",
        emailNotifications: true,
        productUpdates: false,
      });
    });
  });

  it("clears a modified field back to its default on reset", async () => {
    const user = userEvent.setup();
    render(<SettingsForm />);

    const nameInput = screen.getByLabelText(/display name/i) as HTMLInputElement;
    await user.type(nameInput, "Someone Else");
    expect(nameInput.value).toBe("Someone Else");

    await user.click(screen.getByRole("button", { name: /reset to defaults/i }));

    expect(nameInput.value).toBe("");
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
