import type { Metadata } from "next";
import { PlaceholderScreen } from "@/components/placeholder-screen";

export const metadata: Metadata = {
  title: "Agent detail — Flyrank Console",
  description: "A single agent's configuration and recent runs.",
};

export default async function AgentDetailPage({
  params,
}: PageProps<"/agents/[id]">) {
  const { id } = await params;

  return (
    <PlaceholderScreen
      title={`Agent: ${id}`}
      description="This agent's configuration and recent runs will live here."
    />
  );
}
