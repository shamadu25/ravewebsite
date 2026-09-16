// Lightweight event bridge so any page can open the single global ChatWidget
// without prop-drilling or a context provider for what is otherwise a
// self-contained, always-mounted component.
export const OPEN_CHAT_EVENT = "rave:open-chat";

export interface OpenChatDetail {
  /** If provided, sent as the visitor's first message once the chat opens. */
  initialMessage?: string;
}

export function openChatWidget(detail: OpenChatDetail = {}): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<OpenChatDetail>(OPEN_CHAT_EVENT, { detail }));
}
