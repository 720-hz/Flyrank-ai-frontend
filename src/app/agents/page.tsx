import type { Metadata } from "next";
import Link from "next/link";
import { CONSOLE_AGENTS } from "@/lib/ai/config";

export const metadata: Metadata = {
  title: "Agents — Flyrank Console",
  description: "Configured AI agents and automations.",
};

export default function AgentsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <h1 className="text-xl font-semibold text-text">Agents</h1>
      <p className="mt-1 text-sm text-text/70">
        Talk to any of these directly — each one streams a real response from Claude.
      </p>

      <ul className="mt-6 flex flex-col gap-3">
        {CONSOLE_AGENTS.map((agent) => (
          <li key={agent.id}>
            <Link
              href={`/agents/${agent.id}`}
              className="block rounded-lg border border-main/10 p-4 transition-colors hover:border-main/30 hover:bg-main/5"
            >
              <p className="font-medium text-text">{agent.name}</p>
              <p className="mt-1 text-sm text-text/70">{agent.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
