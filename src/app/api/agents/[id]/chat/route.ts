import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { CHAT_GENERATION_SETTINGS, chatModel, getAgentById, getAgentTools } from "@/lib/ai/config";
import { describeProviderError } from "@/lib/ai/server-error";

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
      tools: getAgentTools(id),
      ...CHAT_GENERATION_SETTINGS,
    });

    return result.toUIMessageStreamResponse({
      // The AI SDK's default onError returns a generic "An error occurred."
      // for every error, tool-execution failures included, so server details
      // never leak to the client by accident. Two cases get better copy on
      // purpose, in priority order: a recognized provider condition (rate
      // limit / overload — see describeProviderError, FE-08) gets an
      // actionable message; failing that, scoreIncidentSeverity's one designed
      // failure mode (an implausible duration) throws a specific message that
      // should reach the client as-is. Anything else unexpected keeps the
      // generic fallback rather than leaking an internal error's raw text.
      onError: (error) =>
        describeProviderError(error)?.message ?? (error instanceof Error ? error.message : "An error occurred."),
    });
  } catch (error) {
    // Most likely cause here is a missing/invalid ANTHROPIC_API_KEY — the AI SDK
    // throws before any streaming starts in that case, so a normal JSON error
    // response (rather than a broken stream) is the right shape for the client.
    // A rate-limit/overload response from the provider can also land here if
    // it happens on the very first call, before any chunk has streamed.
    console.error(`[agents/${id}/chat] streamText failed:`, error);
    const described = describeProviderError(error);
    if (described) {
      return Response.json({ error: described.message }, { status: described.status });
    }
    return Response.json({ error: "The agent failed to respond. Please try again." }, { status: 500 });
  }
}
