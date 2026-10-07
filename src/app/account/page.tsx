import type { Metadata } from "next";
import { AccountOverview } from "./account-overview";

export const metadata: Metadata = {
  title: "Account — FlyRank Frontend Capstone",
  description: "A summary of your account and preferences.",
};

export default function AccountPage() {
  return (
    <main className="flex flex-1 flex-col items-center gap-8 px-6 py-24">
      <div className="flex w-full max-w-md flex-col gap-2 text-center">
        <h1 className="text-3xl font-semibold text-main">Overview</h1>
        <p className="text-text/80">A quick summary of your account.</p>
      </div>
      <AccountOverview />
    </main>
  );
}
