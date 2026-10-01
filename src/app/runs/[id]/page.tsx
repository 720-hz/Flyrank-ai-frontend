import type { Metadata } from "next";
import { PlaceholderScreen } from "@/components/placeholder-screen";

export const metadata: Metadata = {
  title: "Run detail — Flyrank Console",
  description: "A single run's input, output, and status.",
};

export default async function RunDetailPage({
  params,
}: PageProps<"/runs/[id]">) {
  const { id } = await params;

  return (
    <PlaceholderScreen
      title={`Run: ${id}`}
      description="This run's input, output, and status will live here."
    />
  );
}
