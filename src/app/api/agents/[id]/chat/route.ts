import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { CHAT_GENERATION_SETTINGS, chatModel, getAgentById } from "@/lib/ai/config";

// Streaming responses can run longer than a typical request; raise the route's
// allowed duration above Next.js/Vercel's default so a long generation isn't cut off.
export const maxDuration = 30;

interface ChatRequestBody {
  messages: UIMessage[];
}

export async function POST(request: Request, { params }: RouteContext<"/api/agents/[id]/chat">) {
  const { id } = await params;
  const agent = getAgentById(id);

  if (!agent) {
    return Response.json({ error: `Unknown agent: ${id}` }, { status: 404 });
  }

  let body: ChatRequestBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  if (!Array.isArray(body.messages)) {
    return Response.json({ error: "Request body must include a `messages` array." }, { status: 400 });
  }

  try {
    const result = streamText({
      model: chatModel,
      system: agent.systemPrompt,
      messages: await convertToModelMessages(body.messages),
      ...CHAT_GENERATION_SETTINGS,
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    // Most likely cause here is a missing/invalid ANTHROPIC_API_KEY — the AI SDK
    // throws before any streaming starts in that case, so a normal JSON error
    // response (rather than a broken stream) is the right shape for the client.
    console.error(`[agents/${id}/chat] streamText failed:`, error);
    return Response.json({ error: "The agent failed to respond. Please try again." }, { status: 500 });
  }
}
