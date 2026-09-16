import { VisitorContext } from "./session";

// Same-origin — the AI agent lives in this same Next.js project (src/app/api/ai),
// not a separate backend/subdomain.
const API_BASE = "/api/ai";

export interface ChatMessage {
  id: number;
  role: "visitor" | "assistant";
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
}

export interface SendMessageResponse {
  message: string;
  needs_human: boolean;
  ai_unavailable: boolean;
  cta: string;
  contact_captured: boolean;
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

export function startConversation(context: VisitorContext): Promise<ConversationResponse> {
  return request<ConversationResponse>("/conversations", {
    method: "POST",
    body: JSON.stringify(context),
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
