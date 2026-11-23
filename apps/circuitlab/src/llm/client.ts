/**
 * Circuit Lab: the AI circuit designer is switched OFF.
 *
 * Upstream ohmlet called the Anthropic API straight from the browser with a
 * key the user pasted into localStorage. We never ship that: no provider SDK,
 * no API key and no direct model call lives in client code.
 *
 * TODO(circuitlab-ai): route generation through the platform server's LLM
 * bridge (server/api/ai.js, the same one the games use, key kept server-side),
 * then set AI_AVAILABLE = true and show the AI dock item again (App.tsx).
 */

/** Whether the AI panel may be shown. Off until the server route exists. */
export const AI_AVAILABLE = false

/** The model name the server route will use (informational only). */
export const CLAUDE_MODEL = 'server-routed'

/** The minimal message shape generate.ts reads back from the (future) server route. */
export interface LlmContentBlock {
  type: string
  text?: string
}
export interface LlmMessage {
  content: LlmContentBlock[]
  stop_reason?: string | null
}
export interface LlmRequest {
  system: string
  messages: { role: 'user' | 'assistant'; content: string | LlmContentBlock[] }[]
  schema: unknown
}

/** Placeholder for the server route. Always refuses for now. */
export async function requestCircuitMessage(_req: LlmRequest, _signal?: AbortSignal): Promise<LlmMessage> {
  throw new Error('AI circuit design is not available in Circuit Lab yet.')
}

/** Errors are passed through as-is (the server route will map its own). */
export function friendlyApiError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err))
}
