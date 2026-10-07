import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAgentById } from "@/lib/ai/config";
import { AgentChat } from "./agent-chat";

export async function generateMetadata({
  params,
}: PageProps<"/agents/[id]">): Promise<Metadata> {
  const { id } = await params;
  const agent = getAgentById(id);
  return {
    title: agent ? `${agent.name} — Flyrank Console` : "Agent not found — Flyrank Console",
    description: agent?.description ?? "This agent doesn't exist.",
  };
}

export default async function AgentDetailPage({ params }: PageProps<"/agents/[id]">) {
  const { id } = await params;
  const agent = getAgentById(id);

  if (!agent) {
    notFound();
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-6 py-10">
      <div>
        <h1 className="text-xl font-semibold text-text">{agent.name}</h1>
        <p className="mt-1 text-sm text-text/70">{agent.description}</p>
      </div>
      <AgentChat agentId={agent.id} agentName={agent.name} />
    </main>
  );
}
