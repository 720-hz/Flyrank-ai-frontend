import type { Metadata } from "next";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = {
  title: "Settings — FlyRank Frontend Capstone",
  description: "Manage profile, appearance, and notification preferences.",
};

export default function SettingsPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-10 px-6 py-16">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold text-main">Settings</h1>
        <p className="text-text/70">
          Preferences are saved in this browser. There&apos;s no account
          system behind this yet — that lands once the product is scoped.
        </p>
      </div>
      <SettingsForm />
    </main>
  );
}
