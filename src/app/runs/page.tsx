import type { Metadata } from "next";
import { PlaceholderScreen } from "@/components/placeholder-screen";

export const metadata: Metadata = {
  title: "Runs — Flyrank Console",
  description: "Execution runs across all agents.",
};

export default function RunsPage() {
  return (
    <PlaceholderScreen
      title="Runs"
      description="A list of execution runs across all agents will live here."
    />
  );
}
