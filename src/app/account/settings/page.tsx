import type { Metadata } from "next";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = {
  title: "Settings — FlyRank Frontend Capstone",
  description: "Manage your display name, email, and notification preferences.",
};

export default function SettingsPage() {
  return (
    <main className="flex flex-1 flex-col items-center gap-8 px-6 py-24">
      <div className="flex w-full max-w-md flex-col gap-2 text-center">
        <h1 className="text-3xl font-semibold text-main">Settings</h1>
        <p className="text-text/80">
          Update your profile details and notification preferences.
        </p>
      </div>
      <SettingsForm />
    </main>
  );
}
