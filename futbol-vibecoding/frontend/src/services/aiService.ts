/**
 * AI assistant service. Posts a natural-language question to the backend AI
 * endpoint which answers questions about football matches. UI only — no AI
 * logic lives in the frontend.
 */

import { apiPost } from "./apiClient"
import type { ChatMessage } from "@/types/football"

export interface AskResponse {
  answer: string
}

/** POST /ai/ask { question, history } */
export function askAssistant(
  question: string,
  history: ChatMessage[],
  signal?: AbortSignal,
): Promise<AskResponse> {
  return apiPost<AskResponse>("/ai/ask", { question, history }, signal)
}
