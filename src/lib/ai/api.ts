import { VisitorContext } from "./session";
import { takeFormToken } from "@/lib/formToken";

// Same-origin — the AI agent lives in this same Next.js project (src/app/api/ai),
// not a separate backend/subdomain.
const API_BASE = "/api/ai";

export interface ChatMessage {
  id: number;
  role: "visitor" | "assistant" | "agent";
  content: string;
  created_at: string | null;
}

export interface QuickAction {
  label: string;
  message: string;
}

export interface ConversationResponse {
  id: string;
  stage: string;
  status: string;
  messages: ChatMessage[];
  quick_actions: QuickAction[];
  assistant_name: string;
  contact_captured: boolean;
  /** Who we already know (a returning visitor, or details they shared): used to pre-fill booking. */
  contact?: { first_name: string | null; last_name: string | null; email: string | null } | null;
  rating?: number | null;
}

export interface SendMessageResponse {
  message: string;
  needs_human: boolean;
  ai_unavailable: boolean;
  cta: string;
  contact_captured: boolean;
  /** A team member is handling the chat; the reply will arrive via fetchUpdates. */
  human_active?: boolean;
}

export interface UpdatesResponse {
  messages: ChatMessage[];
  human_active: boolean;
  /** A team member is typing a reply right now. */
  agent_typing?: boolean;
  /** The team closed the chat (the widget then asks for feedback). */
  closed?: boolean;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`RaveSoft AI request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function startConversation(context: VisitorContext): Promise<ConversationResponse> {
  // Signed anti-spam token (see src/lib/antispam). If it cannot be fetched the server decides.
  const form_token = await takeFormToken();
  return request<ConversationResponse>("/conversations", {
    method: "POST",
    body: JSON.stringify({ ...context, form_token }),
  });
}

export function fetchConversation(conversationId: string): Promise<ConversationResponse> {
  return request<ConversationResponse>(`/conversations/${conversationId}`);
}

export function sendMessage(
  conversationId: string,
  message: string,
  currentPage: string
): Promise<SendMessageResponse> {
  return request<SendMessageResponse>(`/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({ message, current_page: currentPage }),
  });
}

/** Team replies written after `afterId` (poll). */
export function fetchUpdates(conversationId: string, afterId: number): Promise<UpdatesResponse> {
  return request<UpdatesResponse>(`/conversations/${conversationId}/updates?after=${afterId}`);
}

/** URL of the Server-Sent Events stream (team replies + typing within ~2s). */
export function streamUrl(conversationId: string, afterId: number): string {
  return `${API_BASE}/conversations/${conversationId}/stream?after=${afterId}`;
}

export interface FeedbackInput {
  rating: number;
  comment?: string;
  email?: string;
  sendTranscript?: boolean;
}

export function sendFeedback(conversationId: string, input: FeedbackInput): Promise<{ ok: boolean; transcript_sent: boolean }> {
  return request(`/conversations/${conversationId}/feedback`, {
    method: "POST",
    body: JSON.stringify({
      rating: input.rating,
      comment: input.comment || undefined,
      email: input.email || undefined,
      send_transcript: input.sendTranscript || undefined,
    }),
  });
}
