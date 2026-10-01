import type { Metadata } from "next";
import { ActivityList } from "./activity-list";

export const metadata: Metadata = {
  title: "Activity — FlyRank Frontend Capstone",
  description: "A log of recent activity on your account.",
};

export default function ActivityPage() {
  return (
    <main className="flex flex-1 flex-col items-center gap-8 px-6 py-24">
      <div className="flex w-full max-w-md flex-col gap-2 text-center">
        <h1 className="text-3xl font-semibold text-main">Activity</h1>
        <p className="text-text/80">Recent activity on your account.</p>
      </div>
      <ActivityList />
    </main>
  );
}
