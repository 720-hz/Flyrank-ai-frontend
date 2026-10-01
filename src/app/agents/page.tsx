import type { Metadata } from "next";
import { PlaceholderScreen } from "@/components/placeholder-screen";

export const metadata: Metadata = {
  title: "Agents — Flyrank Console",
  description: "Configured AI agents and automations.",
};

export default function AgentsPage() {
  return (
    <PlaceholderScreen
      title="Agents"
      description="A list of configured AI agents and automations will live here."
    />
  );
}
